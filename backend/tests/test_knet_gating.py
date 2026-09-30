"""Hermetic tests for the KNET feature gate (no network, no real database).

The simulated KNET flow must stay unusable while features.knet is off, while Cash ordering is
unaffected. Mongo is replaced by mongomock-motor and the rate limiter is disabled.
Run:  pytest backend/tests/test_knet_gating.py
"""
import os
import sys
from pathlib import Path

# Never let these tests reach a real database: set dummy settings before importing the app.
os.environ["MONGO_URL"] = "mongodb://127.0.0.1:1"
os.environ["DB_NAME"] = "faiha_test"
os.environ["JWT_SECRET"] = "test-secret"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

import server


@pytest.fixture
def env(monkeypatch):
    db = AsyncMongoMockClient()["faiha_test"]
    monkeypatch.setattr(server, "db", db)
    monkeypatch.setattr(server.limiter, "enabled", False)
    return db


@pytest.fixture
def client(env):
    # Deliberately not used as a context manager: that would run the app's startup hooks
    # (Oracle/Sheets sync, seeding), and these tests must stay isolated.
    return TestClient(server.app)


def _enable_knet(monkeypatch):
    monkeypatch.setattr(server, "get_features", lambda: {"knet": True, "customer_accounts": True})


def _seed_product(db):
    import asyncio
    pid = ObjectId()
    asyncio.run(db.products_local.insert_one({
        "_id": pid, "name_en": "Test Item", "name_ar": "منتج", "price": 1.5, "stock": 10,
        "barcode": "TEST-1", "source": "local", "images": [],
    }))
    return str(pid)


def _order_payload(pid, payment_method):
    return {
        "items": [{"product_id": pid, "barcode": "TEST-1", "name": "Test Item", "qty": 1, "unit_price": 1.5, "source": "local"}],
        "customer": {"name": "Test Customer", "phone": "99999999"},
        "payment_method": payment_method,
        "fulfillment_type": "PICKUP",
    }


def _count_orders(db):
    import asyncio
    return asyncio.run(db.orders.count_documents({}))


def _seed_order(db, order_no="FAI-TEST-1"):
    import asyncio
    asyncio.run(db.orders.insert_one({
        "order_no": order_no, "payment_method": "KNET", "payment_status": "pending", "order_status": "NEW",
    }))
    asyncio.run(db.payments.insert_one({"order_no": order_no}))


def _order(db, order_no="FAI-TEST-1"):
    import asyncio
    return asyncio.run(db.orders.find_one({"order_no": order_no}))


def test_config_reports_knet_off_by_default(client):
    assert client.get("/api/app/config").json()["features"]["knet"] is False


# 1. Cash order still accepted (KNET disabled, the release configuration).
@pytest.mark.parametrize("method", ["Cash", "COD", "cash"])
def test_cash_order_accepted_when_knet_disabled(client, env, method):
    pid = _seed_product(env)
    r = client.post("/api/checkout/place-order", json=_order_payload(pid, method))
    assert r.status_code == 200, r.text
    order = r.json()["order"]
    assert order["payment_method"] == "Cash"
    assert order["payment_status"] == "pending"
    assert _count_orders(env) == 1


# 2. KNET order rejected when disabled, with no order created and no stock used.
def test_knet_order_rejected_when_disabled(client, env):
    pid = _seed_product(env)
    r = client.post("/api/checkout/place-order", json=_order_payload(pid, "KNET"))
    assert r.status_code == 400
    assert r.json()["detail"] == {"message": "knet_disabled"}
    assert _count_orders(env) == 0
    import asyncio
    assert asyncio.run(env.products_local.find_one({"_id": ObjectId(pid)}))["stock"] == 10


# 3. Callback cannot change payment/order status when disabled.
@pytest.mark.parametrize("result", ["CAPTURED", "CANCELLED"])
def test_knet_callback_blocked_when_disabled(client, env, result):
    _seed_order(env)
    r = client.post("/api/payments/knet/callback", json={"order_no": "FAI-TEST-1", "result": result})
    assert r.status_code == 403
    assert r.json()["detail"] == {"message": "knet_disabled"}
    o = _order(env)
    assert o["payment_status"] == "pending" and o["order_status"] == "NEW"


# 4. Existing behaviour remains available when KNET is explicitly enabled.
def test_knet_order_accepted_when_enabled(client, env, monkeypatch):
    _enable_knet(monkeypatch)
    pid = _seed_product(env)
    r = client.post("/api/checkout/place-order", json=_order_payload(pid, "KNET"))
    assert r.status_code == 200, r.text
    assert r.json()["order"]["payment_method"] == "KNET"
    assert client.get("/api/app/config").json()["features"]["knet"] is True


def test_knet_callback_works_when_enabled(client, env, monkeypatch):
    _enable_knet(monkeypatch)
    _seed_order(env)
    r = client.post("/api/payments/knet/callback", json={"order_no": "FAI-TEST-1", "result": "CAPTURED"})
    assert r.status_code == 200 and r.json()["success"] is True
    assert _order(env)["payment_status"] == "paid"
    _seed_order(env, "FAI-TEST-2")
    r = client.post("/api/payments/knet/callback", json={"order_no": "FAI-TEST-2", "result": "CANCELLED"})
    assert r.json()["success"] is False
    o = _order(env, "FAI-TEST-2")
    assert o["payment_status"] == "failed" and o["order_status"] == "CANCELLED"


def test_invalid_payment_method_still_rejected(client, env):
    pid = _seed_product(env)
    r = client.post("/api/checkout/place-order", json=_order_payload(pid, "BITCOIN"))
    assert r.status_code == 400 and r.json()["detail"] == {"message": "invalid_payment_method"}
