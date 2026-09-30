"""Hermetic tests for customer self-service account deletion (no network, no real database).

Mongo is replaced by mongomock-motor and the rate limiter is disabled.
Run:  pytest backend/tests/test_account_deletion.py
"""
import asyncio
import os
import sys
from pathlib import Path

# Never let these tests reach a real database: set dummy settings before importing the app.
os.environ["MONGO_URL"] = "mongodb://127.0.0.1:1"
os.environ["DB_NAME"] = "faiha_test"
os.environ["JWT_SECRET"] = "test-secret"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

import server

PHONE = "96599991111"
PASSWORD = "secret123"


@pytest.fixture
def db(monkeypatch):
    mock = AsyncMongoMockClient()["faiha_test"]
    monkeypatch.setattr(server, "db", mock)
    monkeypatch.setattr(server.limiter, "enabled", False)
    return mock


@pytest.fixture
def client(db):
    # Not a context manager on purpose: that would run the app's startup hooks (Oracle/Sheets, seeding).
    return TestClient(server.app)


def run(coro):
    return asyncio.run(coro)


def register(client, phone="+965 9999 1111", name="Test User"):
    r = client.post("/api/customer/register", json={"phone": phone, "password": PASSWORD, "name": name})
    assert r.status_code == 200, r.text
    d = r.json()
    return d["access_token"], d["refresh_token"], {"Authorization": f"Bearer {d['access_token']}"}


def order(order_no, phone, status="COMPLETED", **extra):
    doc = {
        "order_no": order_no, "order_status": status, "payment_method": "Cash", "payment_status": "paid",
        "fulfillment_type": "CAR_SERVICE", "vehicle_number": "KW-1234", "vehicle_color": "red",
        "items": [{"name_en": "Latte", "qty": 2, "unit_price": 1.5, "line_total": 3.0}],
        "subtotal": 3.0, "net_payable": 3.0, "currency": "KD", "placed_at": "2026-09-01T10:00:00+00:00",
        "customer": {"name": "Test User", "phone": phone, "email": "t@example.com", "address": "Block 1",
                     "area": "Salmiya", "notes": "ring bell", "shareholder_number": "SH-77"},
    }
    doc.update(extra)
    return doc


def delete(client, headers, password=PASSWORD, **body):
    return client.post("/api/customer/delete-account", json={"password": password, **body}, headers=headers)


def test_delete_removes_account_anonymizes_orders_and_keeps_business_data(client, db):
    _, _, h = register(client)
    other_tok = register(client, phone="55555555", name="Other Person")
    run(db.orders.insert_many([
        order("FAIHA-1", "+965 9999 1111"),                        # formatted phone
        order("FAIHA-2", "99991111", status="CANCELLED"),          # local format, no country code prefix in digits
        order("FAIHA-3", PHONE),                                    # digits with country code
        order("FAIHA-OTHER", "55555555", customer_extra=None),      # someone else's
    ]))
    # FAIHA-2 uses the 8-digit local form, which is a different digits-only string than the account's
    # 11-digit number: it must NOT be claimed (same rule as /customer/orders).
    run(db.staff_notifications.insert_many([
        {"order_no": "FAIHA-1", "customer_name": "Test User", "vehicle_number": "KW-1234", "vehicle_color": "red", "type": "new_order"},
        {"order_no": "FAIHA-OTHER", "customer_name": "Other Person", "vehicle_number": "KW-9", "vehicle_color": "blue", "type": "new_order"},
    ]))
    run(db.guest_otp_sessions.insert_many([{"phone": PHONE, "otp": "123456"}, {"phone": "55555555", "otp": "654321"}]))

    r = delete(client, h)
    assert r.status_code == 200 and r.json() == {"deleted": True}

    assert run(db.customers.find_one({"phone": PHONE})) is None
    for no in ("FAIHA-1", "FAIHA-3"):
        o = run(db.orders.find_one({"order_no": no}))
        c = o["customer"]
        assert c["name"] == "Deleted customer" and c["phone"] == "" and c["email"] is None
        assert c["address"] == "" and c["area"] == "" and c["notes"] is None and c["shareholder_number"] is None
        assert o["vehicle_number"] is None and o["vehicle_color"] is None
        # business / payment information preserved
        assert o["items"][0]["name_en"] == "Latte" and o["net_payable"] == 3.0
        assert o["payment_method"] == "Cash" and o["payment_status"] == "paid" and o["order_status"] == "COMPLETED"
        assert o["fulfillment_type"] == "CAR_SERVICE" and o["placed_at"] == "2026-09-01T10:00:00+00:00"
        assert o["customer_anonymized_at"]
    # non-matching orders untouched (other customer, and the different-digits local-format order)
    assert run(db.orders.find_one({"order_no": "FAIHA-OTHER"}))["customer"]["name"] == "Test User"
    assert run(db.orders.find_one({"order_no": "FAIHA-2"}))["customer"]["shareholder_number"] == "SH-77"
    n1 = run(db.staff_notifications.find_one({"order_no": "FAIHA-1"}))
    assert n1["customer_name"] == "Deleted customer" and n1["vehicle_number"] is None and n1["vehicle_color"] is None
    assert run(db.staff_notifications.find_one({"order_no": "FAIHA-OTHER"}))["customer_name"] == "Other Person"
    # guest OTP sessions: only the deleted phone's are removed
    assert run(db.guest_otp_sessions.count_documents({"phone": PHONE})) == 0
    assert run(db.guest_otp_sessions.count_documents({"phone": "55555555"})) == 1
    # non-PII audit event
    ev = run(db.audit_logs.find_one({"action": "customer_self_delete"}))
    assert ev["after"] == {"orders_anonymized": 2} and ev["ip"] is None
    assert PHONE not in str(ev) and "Test User" not in str(ev)
    # the other customer is untouched and can still sign in
    assert run(db.customers.find_one({"phone": "55555555"})) is not None
    assert client.post("/api/customer/login", json={"phone": "55555555", "password": PASSWORD}).status_code == 200


def test_wrong_password_changes_nothing(client, db):
    _, _, h = register(client)
    run(db.orders.insert_one(order("FAIHA-1", PHONE)))
    r = delete(client, h, password="not-the-password")
    assert r.status_code == 403 and r.json()["detail"] == {"message": "incorrect_password"}
    assert run(db.customers.find_one({"phone": PHONE})) is not None
    assert run(db.orders.find_one({"order_no": "FAIHA-1"}))["customer"]["name"] == "Test User"
    assert client.get("/api/customer/me", headers=h).status_code == 200


def test_requires_customer_authentication(client, db):
    assert client.post("/api/customer/delete-account", json={"password": PASSWORD}).status_code == 401
    assert client.post("/api/customer/delete-account", json={"password": PASSWORD},
                       headers={"Authorization": "Bearer garbage"}).status_code == 401
    admin_token = server.create_access_token("507f1f77bcf86cd799439011", "admin@example.com", "admin")
    r = delete(client, {"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 403


def test_tokens_unusable_after_deletion(client, db):
    access, refresh, h = register(client)
    assert client.get("/api/customer/me", headers=h).status_code == 200
    assert delete(client, h).status_code == 200
    assert client.get("/api/customer/me", headers=h).status_code == 401
    assert client.get("/api/customer/orders", headers=h).status_code == 401
    assert client.post("/api/customer/refresh", json={"refresh_token": refresh}).status_code == 401
    assert delete(client, h).status_code == 401  # cannot be repeated with the dead token
    assert client.post("/api/customer/login", json={"phone": PHONE, "password": PASSWORD}).status_code == 401


@pytest.mark.parametrize("status", ["NEW", "PREPARING", "READY"])
def test_blocked_while_order_is_open(client, db, status):
    _, _, h = register(client)
    run(db.orders.insert_many([order("FAIHA-OPEN", "+965 9999 1111", status=status),
                               order("FAIHA-DONE", PHONE, status="COMPLETED")]))
    r = delete(client, h)
    assert r.status_code == 409
    assert r.json()["detail"] == {"message": "open_orders", "order_nos": ["FAIHA-OPEN"]}
    # nothing changed
    assert run(db.customers.find_one({"phone": PHONE})) is not None
    assert run(db.orders.find_one({"order_no": "FAIHA-DONE"}))["customer"]["name"] == "Test User"
    assert client.get("/api/customer/me", headers=h).status_code == 200
    # once the order is finished, deletion succeeds
    run(db.orders.update_one({"order_no": "FAIHA-OPEN"}, {"$set": {"order_status": "COMPLETED"}}))
    assert delete(client, h).status_code == 200
    assert run(db.orders.find_one({"order_no": "FAIHA-OPEN"}))["customer"]["name"] == "Deleted customer"


def test_cancelled_order_does_not_block(client, db):
    _, _, h = register(client)
    run(db.orders.insert_one(order("FAIHA-C", PHONE, status="CANCELLED")))
    assert delete(client, h).status_code == 200


def test_open_order_of_another_customer_does_not_block(client, db):
    _, _, h = register(client)
    run(db.orders.insert_one(order("FAIHA-X", "55555555", status="NEW")))
    assert delete(client, h).status_code == 200


def test_cannot_target_another_account_by_supplying_an_id(client, db):
    _, _, h = register(client)
    register(client, phone="55555555", name="Victim")
    victim = run(db.customers.find_one({"phone": "55555555"}))
    r = delete(client, h, customer_id=str(victim["_id"]), phone="55555555")
    assert r.status_code == 200
    assert run(db.customers.find_one({"phone": "55555555"})) is not None   # victim untouched
    assert run(db.customers.find_one({"phone": PHONE})) is None            # caller deleted


def test_reregistering_same_phone_starts_fresh(client, db):
    _, _, h = register(client)
    run(db.orders.insert_one(order("FAIHA-1", PHONE)))
    assert delete(client, h).status_code == 200
    _, _, h2 = register(client)
    assert client.get("/api/customer/orders", headers=h2).json() == []   # old (anonymized) orders not reclaimed
    assert client.get("/api/customer/me", headers=h).status_code == 401  # old tokens stay dead


def test_account_without_orders_deletes_cleanly(client, db):
    _, _, h = register(client)
    assert delete(client, h).status_code == 200
    assert run(db.customers.count_documents({})) == 0
