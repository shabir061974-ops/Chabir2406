"""Faiha Co-operative E-commerce — Backend API tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bilingual-store-5.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "faihait@faihacoopkw.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    raise RuntimeError("ADMIN_PASSWORD env var is required to run backend tests")


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


# ---------------- Public catalog ----------------
class TestPublic:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        body = r.json()
        assert "oracle" in body

    def test_settings(self, session):
        r = session.get(f"{API}/settings")
        assert r.status_code == 200
        body = r.json()
        assert body["currency"] == "KD"
        assert "en" in body["languages"] and "ar" in body["languages"]
        assert body["delivery"].get("min_order_amount") == 2.000

    def test_categories(self, session):
        r = session.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list) and len(cats) >= 1
        assert {"name_en", "name_ar", "slug"}.issubset(cats[0].keys())

    def test_products_list(self, session):
        r = session.get(f"{API}/products")
        assert r.status_code == 200
        body = r.json()
        assert "items" in body and "total" in body
        assert body["total"] >= 1
        p = body["items"][0]
        assert "id" in p and "effective_price" in p and "name_en" in p

    def test_products_filter_promo(self, session):
        r = session.get(f"{API}/products", params={"promo": "true"})
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it.get("is_promotional") is True

    def test_products_search(self, session):
        r = session.get(f"{API}/products", params={"q": "milk"})
        assert r.status_code == 200
        assert isinstance(r.json()["items"], list)

    def test_product_detail(self, session):
        items = session.get(f"{API}/products").json()["items"]
        pid = items[0]["id"]
        r = session.get(f"{API}/products/{pid}")
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_product_404(self, session):
        r = session.get(f"{API}/products/nonexistent-xyz")
        assert r.status_code == 404


# ---------------- Auth ----------------
class TestAuth:
    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": "bad@x.com", "password": "wrong"})
        assert r.status_code == 401

    def test_login_success_and_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        cookies = s.cookies.get_dict()
        assert "access_token" in cookies
        assert "refresh_token" in cookies
        body = r.json()
        assert body["email"] == ADMIN_EMAIL
        assert body["role"] in ("admin", "super_admin")
        assert "password_hash" not in body

    def test_me_requires_auth(self, session):
        plain = requests.Session()
        r = plain.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_admin(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_refresh(self, admin_session):
        r = admin_session.post(f"{API}/auth/refresh")
        assert r.status_code == 200


# ---------------- Checkout ----------------
class TestCheckout:
    def _get_items(self, session, qty=1):
        items = session.get(f"{API}/products").json()["items"][:2]
        return [{
            "product_id": p["id"], "barcode": p.get("barcode"),
            "name": p["name_en"], "qty": qty, "unit_price": p["effective_price"],
            "source": p.get("source", "local"),
        } for p in items]

    def _customer(self):
        return {"name": "TEST Buyer", "phone": "+96599999999",
                "address": "Block 1, Street 1, House 1", "area": "Faiha"}

    def test_validate_stock(self, session):
        payload = {"items": self._get_items(session), "customer": self._customer(),
                   "payment_method": "COD", "lang": "en"}
        r = session.post(f"{API}/checkout/validate-stock", json=payload)
        assert r.status_code == 200
        assert r.json()["ok"] in (True, False)

    def test_below_min_order(self, session):
        # Use 1 qty of cheapest product to potentially fall below 2.000
        items = session.get(f"{API}/products", params={"sort": "price_asc"}).json()["items"]
        cheapest = items[0]
        payload = {
            "items": [{"product_id": cheapest["id"], "barcode": cheapest.get("barcode"),
                       "name": cheapest["name_en"], "qty": 1,
                       "unit_price": cheapest["effective_price"], "source": "local"}],
            "customer": self._customer(), "payment_method": "COD", "lang": "en",
        }
        if cheapest["effective_price"] >= 2.0:
            pytest.skip("cheapest product already exceeds min order")
        r = session.post(f"{API}/checkout/place-order", json=payload)
        assert r.status_code == 400
        detail = r.json().get("detail", {})
        assert detail.get("message") == "below_min_order"

    def test_place_order_cod_with_coupon(self, session):
        # Buy 10 of cheapest to safely exceed 2.000 KD
        items = session.get(f"{API}/products", params={"sort": "price_asc"}).json()["items"]
        prod = next((p for p in items if p["effective_price"] > 0), items[0])
        payload = {
            "items": [{"product_id": prod["id"], "barcode": prod.get("barcode"),
                       "name": prod["name_en"], "qty": 20,
                       "unit_price": prod["effective_price"], "source": "local"}],
            "customer": self._customer(), "payment_method": "COD",
            "coupon_code": "FAIHA10", "lang": "en",
        }
        r = session.post(f"{API}/checkout/place-order", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        order = body["order"]
        assert order["order_no"].startswith("FAIHA-")
        assert order["payment_method"] == "COD"
        assert order["order_status"] == "confirmed"
        assert order["coupon_code"] == "FAIHA10"
        assert order["discount_amount"] > 0
        assert order["currency"] == "KD"
        # 3-decimal currency
        assert round(order["net_payable"], 3) == order["net_payable"]
        # Track it
        track = session.get(f"{API}/orders/{order['order_no']}")
        assert track.status_code == 200
        assert track.json()["order_no"] == order["order_no"]
        pytest.cod_order_no = order["order_no"]

    def test_place_order_knet_then_callback(self, session):
        items = session.get(f"{API}/products", params={"sort": "price_asc"}).json()["items"]
        prod = items[0]
        payload = {
            "items": [{"product_id": prod["id"], "barcode": prod.get("barcode"),
                       "name": prod["name_en"], "qty": 25,
                       "unit_price": prod["effective_price"], "source": "local"}],
            "customer": self._customer(), "payment_method": "KNET", "lang": "en",
        }
        r = session.post(f"{API}/checkout/place-order", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["knet_redirect"] is not None
        order_no = body["order"]["order_no"]
        assert body["order"]["order_status"] == "pending"

        cb = session.post(f"{API}/payments/knet/callback",
                          json={"order_no": order_no, "result": "CAPTURED"})
        assert cb.status_code == 200
        cb_body = cb.json()
        assert cb_body["success"] is True
        assert cb_body["order"]["payment_status"] == "paid"
        assert cb_body["order"]["order_status"] == "confirmed"
        assert "tran_id" in cb_body
        pytest.knet_order_no = order_no

    def test_track_order_404(self, session):
        r = session.get(f"{API}/orders/UNKNOWN-XYZ")
        assert r.status_code == 404


# ---------------- Admin ----------------
class TestAdmin:
    def test_dashboard_summary(self, admin_session):
        r = admin_session.get(f"{API}/admin/dashboard/summary")
        assert r.status_code == 200
        body = r.json()
        for k in ("total_orders", "revenue", "products_count", "revenue_series",
                  "status_breakdown", "recent_orders"):
            assert k in body
        assert len(body["revenue_series"]) == 7

    def test_admin_requires_auth(self, session):
        r = session.get(f"{API}/admin/dashboard/summary")
        assert r.status_code == 401

    def test_orders_list_and_status(self, admin_session):
        r = admin_session.get(f"{API}/admin/orders")
        assert r.status_code == 200
        orders = r.json()
        assert isinstance(orders, list)
        order_no = getattr(pytest, "cod_order_no", None) or (orders[0]["order_no"] if orders else None)
        if order_no:
            up = admin_session.patch(f"{API}/admin/orders/{order_no}/status",
                                     json={"order_status": "processing"})
            assert up.status_code == 200
            assert up.json()["order_status"] == "processing"

    def test_product_crud(self, admin_session):
        cats = admin_session.get(f"{API}/categories").json()
        slug = cats[0]["slug"]
        payload = {"name_en": "TEST_Prod", "name_ar": "اختبار", "category": slug,
                   "price": 1.500, "stock": 100, "images": ["https://x/img.jpg"],
                   "is_active": True, "is_featured": False, "is_promotional": False, "discount": 0}
        r = admin_session.post(f"{API}/admin/products", json=payload)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        # GET to verify persistence
        g = admin_session.get(f"{API}/products/{pid}")
        assert g.status_code == 200
        assert g.json()["name_en"] == "TEST_Prod"

        # Update
        payload["price"] = 2.250
        u = admin_session.put(f"{API}/admin/products/{pid}", json=payload)
        assert u.status_code == 200
        assert abs(u.json()["price"] - 2.250) < 1e-6

        # Delete
        d = admin_session.delete(f"{API}/admin/products/{pid}")
        assert d.status_code == 200
        g2 = admin_session.get(f"{API}/products/{pid}")
        assert g2.status_code == 404

    def test_category_crud(self, admin_session):
        payload = {"name_en": "TEST_Cat", "name_ar": "تجريبي", "slug": f"test-cat-{int(time.time())}",
                   "sort_order": 99, "is_active": True}
        r = admin_session.post(f"{API}/admin/categories", json=payload)
        assert r.status_code == 200
        cid = r.json()["id"]
        d = admin_session.delete(f"{API}/admin/categories/{cid}")
        assert d.status_code == 200

    def test_coupon_create_delete(self, admin_session):
        code = f"TEST{int(time.time())}"
        r = admin_session.post(f"{API}/admin/coupons",
                               json={"code": code, "type": "percent", "value": 5,
                                     "usage_limit": 10, "is_active": True})
        assert r.status_code == 200
        cid = r.json()["id"]
        # Duplicate should 400
        dup = admin_session.post(f"{API}/admin/coupons",
                                 json={"code": code, "type": "percent", "value": 5,
                                       "usage_limit": 10, "is_active": True})
        assert dup.status_code == 400
        assert admin_session.delete(f"{API}/admin/coupons/{cid}").status_code == 200

    def test_delivery_config_save(self, admin_session):
        cur = admin_session.get(f"{API}/admin/delivery-config").json()
        payload = {
            "charge": cur.get("charge", 0.500),
            "min_order_amount": cur.get("min_order_amount", 2.000),
            "free_delivery_threshold": cur.get("free_delivery_threshold", 15.0),
            "time_slots": cur.get("time_slots", []),
            "coverage_area": cur.get("coverage_area", "Kuwait"),
        }
        r = admin_session.put(f"{API}/admin/delivery-config", json=payload)
        assert r.status_code == 200
        assert r.json()["min_order_amount"] == payload["min_order_amount"]

    def test_customers(self, admin_session):
        r = admin_session.get(f"{API}/admin/customers")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_reports(self, admin_session):
        for period in ("daily", "weekly", "monthly"):
            r = admin_session.get(f"{API}/admin/reports", params={"period": period})
            assert r.status_code == 200
            body = r.json()
            assert body["period"] == period
            assert "total_revenue" in body and "top_products" in body
