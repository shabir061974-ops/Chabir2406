from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import secrets
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId

import oracle_repo
import google_sheets_repo
import seed_data

# ----------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("faiha")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
CURRENCY = os.environ.get("CURRENCY", "KD")

app = FastAPI(title="Faiha Co-operative E-Commerce API")
api = APIRouter(prefix="/api")

# ============================== Helpers ====================================

def now_iso():
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")


def clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc


def gen_order_no():
    return f"FAIHA-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{random.randint(1000, 9999)}"


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return clean(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def audit(actor, action, entity, entity_id, request: Request = None, before=None, after=None):
    await db.audit_logs.insert_one({
        "actor_id": actor.get("id") if actor else None,
        "actor_email": actor.get("email") if actor else None,
        "action": action, "entity": entity, "entity_id": str(entity_id),
        "before": before, "after": after,
        "ip": request.client.host if request and request.client else None,
        "created_at": now_iso(),
    })


# ============================== Models =====================================

class LoginInput(BaseModel):
    email: EmailStr
    password: str


class CartItemIn(BaseModel):
    product_id: str
    barcode: Optional[str] = None
    name: str
    qty: int
    unit_price: float
    source: str = "local"


class CustomerInfo(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: str
    area: str
    notes: Optional[str] = None


class PlaceOrderInput(BaseModel):
    items: List[CartItemIn]
    customer: CustomerInfo
    payment_method: str  # COD | KNET
    coupon_code: Optional[str] = None
    delivery_slot: Optional[str] = None
    lang: str = "en"


class KnetCallbackInput(BaseModel):
    order_no: str
    result: str  # CAPTURED | CANCELLED


class ProductIn(BaseModel):
    name_en: str
    name_ar: str
    category: str
    price: float
    stock: int = 0
    images: List[str] = []
    unit_en: Optional[str] = "each"
    unit_ar: Optional[str] = "حبة"
    barcode: Optional[str] = None
    is_featured: bool = False
    is_promotional: bool = False
    discount: float = 0
    is_active: bool = True


class CategoryIn(BaseModel):
    name_en: str
    name_ar: str
    slug: str
    image: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class CouponIn(BaseModel):
    code: str
    type: str = "percent"  # percent | fixed
    value: float
    usage_limit: int = 1000
    is_active: bool = True


class DeliveryConfigIn(BaseModel):
    charge: float
    min_order_amount: float
    free_delivery_threshold: float = 0
    time_slots: List[str] = []
    coverage_area: str = ""


class StatusUpdateIn(BaseModel):
    order_status: str


# ============================== Catalog ====================================

def _eff_price(p):
    disc = p.get("discount", 0) or 0
    if disc > 0:
        return round(p["price"] * (1 - disc / 100), 3)
    return round(p["price"], 3)


@api.get("/")
async def root():
    return {
        "message": "Faiha Co-operative API",
        "oracle": oracle_repo.is_available(),
        "google_sheets": google_sheets_repo.is_available()
    }


@api.get("/settings")
async def get_settings():
    dc = await db.delivery_config.find_one({}, {"_id": 0})
    return {
        "currency": CURRENCY,
        "languages": ["en", "ar"],
        "oracle_live": oracle_repo.is_available(),
        "delivery": dc or {},
    }


@api.get("/categories")
async def get_categories():
    cats = await db.categories.find({"is_active": True}).sort("sort_order", 1).to_list(100)
    return [clean(c) for c in cats]


@api.get("/products")
async def get_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    promo: Optional[bool] = None,
    featured: Optional[bool] = None,
    sort: Optional[str] = "featured",
    page: int = 1,
    page_size: int = 24,
):
    query = {"is_active": True}
    if category:
        query["category"] = category
    if promo:
        query["is_promotional"] = True
    if featured:
        query["is_featured"] = True
    if q:
        query["$or"] = [
            {"name_en": {"$regex": q, "$options": "i"}},
            {"name_ar": {"$regex": q, "$options": "i"}},
            {"barcode": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.products_local.find(query).to_list(1000)
    items = [clean(d) for d in docs]
    for it in items:
        it["effective_price"] = _eff_price(it)

    # Merge live Oracle PRODUCT_MASTER products (read-only, cached). Empty until the
    # co-op populates PRODUCT_MASTER; appears automatically once data exists.
    if not promo and not featured:
        try:
            ora = oracle_repo.list_products()
            for op in ora:
                if category and op["category"] != category:
                    continue
                if q:
                    ql = q.lower()
                    if ql not in (op["name_en"] or "").lower() and ql not in (op.get("barcode") or ""):
                        continue
                items.append(op)
        except Exception as e:  # noqa: BLE001
            logger.error("Oracle merge error: %s", repr(e)[:120])

    if price_min is not None:
        items = [i for i in items if i["effective_price"] >= price_min]
    if price_max is not None:
        items = [i for i in items if i["effective_price"] <= price_max]
    if sort == "price_asc":
        items.sort(key=lambda x: x["effective_price"])
    elif sort == "price_desc":
        items.sort(key=lambda x: x["effective_price"], reverse=True)
    elif sort == "name":
        items.sort(key=lambda x: x["name_en"])
    else:
        items.sort(key=lambda x: (not x.get("is_featured"), x["name_en"]))
    total = len(items)
    start = (page - 1) * page_size
    return {"total": total, "page": page, "page_size": page_size, "items": items[start:start + page_size]}


@api.get("/products/{id_or_barcode}")
async def get_product(id_or_barcode: str):
    # Oracle product (id like "ora-<barcode>") or live barcode lookup
    if id_or_barcode.startswith("ora-"):
        op = oracle_repo.get_by_barcode(id_or_barcode[4:])
        if op:
            return op
        raise HTTPException(status_code=404, detail="Product not found")
    doc = None
    if ObjectId.is_valid(id_or_barcode):
        doc = await db.products_local.find_one({"_id": ObjectId(id_or_barcode)})
    if not doc:
        doc = await db.products_local.find_one({"barcode": id_or_barcode})
    if not doc:
        op = oracle_repo.get_by_barcode(id_or_barcode)
        if op:
            return op
        raise HTTPException(status_code=404, detail="Product not found")
    item = clean(doc)
    item["effective_price"] = _eff_price(item)
    return item


# ============================== Checkout ===================================

async def _validate_items(items):
    """Returns (validated, errors). Live Oracle stock check when source=oracle."""
    validated = []
    errors = []
    for it in items:
        prod = None
        is_oracle = (it.source == "oracle") or str(it.product_id).startswith("ora-")
        if is_oracle and it.barcode:
            prod = oracle_repo.get_by_barcode(it.barcode)
            if prod:
                prod = {**prod, "_id": prod["id"]}  # normalize for downstream
        if prod is None and ObjectId.is_valid(it.product_id):
            prod = await db.products_local.find_one({"_id": ObjectId(it.product_id)})
        if prod is None and it.barcode:
            prod = await db.products_local.find_one({"barcode": it.barcode})
        if not prod:
            errors.append({"product_id": it.product_id, "reason": "not_found"})
            continue
        # live oracle stock when applicable
        available = prod.get("stock", 0)
        if prod.get("source") == "oracle" and prod.get("barcode") and oracle_repo.is_available():
            res = oracle_repo.check_stock(prod["barcode"], it.qty)
            if res is not None:
                ok, available = res
        if available < it.qty:
            errors.append({"product_id": it.product_id, "name": prod["name_en"], "reason": "insufficient_stock", "available": available})
            continue
        validated.append({"prod": prod, "qty": it.qty, "unit_price": _eff_price(prod)})
    return validated, errors


@api.post("/checkout/validate-stock")
async def validate_stock(payload: PlaceOrderInput):
    _, errors = await _validate_items(payload.items)
    return {"ok": len(errors) == 0, "errors": errors}


async def _apply_coupon(code, subtotal):
    if not code:
        return 0, None
    coupon = await db.coupons.find_one({"code": code.upper(), "is_active": True})
    if not coupon:
        return 0, None
    if coupon.get("used_count", 0) >= coupon.get("usage_limit", 1000):
        return 0, None
    if coupon["type"] == "percent":
        amt = round(subtotal * coupon["value"] / 100, 3)
    else:
        amt = round(min(coupon["value"], subtotal), 3)
    return amt, coupon


@api.post("/checkout/place-order")
async def place_order(payload: PlaceOrderInput, request: Request):
    validated, errors = await _validate_items(payload.items)
    if errors:
        raise HTTPException(status_code=400, detail={"message": "stock_validation_failed", "errors": errors})
    if not validated:
        raise HTTPException(status_code=400, detail={"message": "empty_cart"})

    order_items = []
    subtotal = 0.0
    for v in validated:
        line = round(v["unit_price"] * v["qty"], 3)
        subtotal += line
        order_items.append({
            "product_id": str(v["prod"]["_id"]),
            "barcode": v["prod"].get("barcode"),
            "name_en": v["prod"]["name_en"],
            "name_ar": v["prod"]["name_ar"],
            "image": (v["prod"].get("images") or [None])[0],
            "qty": v["qty"],
            "unit_price": v["unit_price"],
            "line_total": line,
            "source": v["prod"].get("source", "local"),
        })
    subtotal = round(subtotal, 3)

    discount_amount, coupon = await _apply_coupon(payload.coupon_code, subtotal)

    dc = await db.delivery_config.find_one({}) or {}
    min_order = dc.get("min_order_amount", 0)
    if subtotal < min_order:
        raise HTTPException(status_code=400, detail={"message": "below_min_order", "min_order_amount": min_order})
    delivery_charge = dc.get("charge", 0)
    free_threshold = dc.get("free_delivery_threshold", 0)
    if free_threshold and subtotal >= free_threshold:
        delivery_charge = 0

    net_payable = round(subtotal - discount_amount + delivery_charge, 3)

    pm = payload.payment_method.upper()
    payment_status = "pending"
    order_status = "pending"
    if pm == "COD":
        order_status = "confirmed"

    order_no = gen_order_no()
    while await db.orders.find_one({"order_no": order_no}):
        order_no = gen_order_no()

    order_doc = {
        "order_no": order_no,
        "customer": payload.customer.model_dump(),
        "items": order_items,
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "coupon_code": (coupon["code"] if coupon else None),
        "delivery_charge": delivery_charge,
        "net_payable": net_payable,
        "currency": CURRENCY,
        "payment_method": pm,
        "payment_status": payment_status,
        "order_status": order_status,
        "delivery_slot": payload.delivery_slot,
        "lang": payload.lang,
        "placed_at": now_iso(),
        "updated_at": now_iso(),
    }
    res = await db.orders.insert_one(order_doc)
    if coupon:
        await db.coupons.update_one({"_id": coupon["_id"]}, {"$inc": {"used_count": 1}})
    # decrement local stock
    for v in validated:
        if v["prod"].get("source") == "local":
            await db.products_local.update_one({"_id": v["prod"]["_id"]}, {"$inc": {"stock": -v["qty"]}})

    order_doc["id"] = str(res.inserted_id)
    order_doc.pop("_id", None)

    knet_redirect = None
    if pm == "KNET":
        await db.payments.insert_one({
            "order_id": str(res.inserted_id), "order_no": order_no, "gateway": "KNET",
            "amount": net_payable, "result": "PENDING", "created_at": now_iso(),
        })
        knet_redirect = f"/payment/knet/{order_no}"

    return {"order": order_doc, "knet_redirect": knet_redirect}


@api.post("/payments/knet/callback")
async def knet_callback(payload: KnetCallbackInput):
    """Simulated KNET hosted-payment-page return handler."""
    order = await db.orders.find_one({"order_no": payload.order_no})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    captured = payload.result.upper() == "CAPTURED"
    tran_id = "KNET" + secrets.token_hex(6).upper()
    await db.payments.update_one(
        {"order_no": payload.order_no},
        {"$set": {"result": payload.result.upper(), "tran_id": tran_id,
                  "knet_ref": secrets.token_hex(4).upper(), "updated_at": now_iso()}},
    )
    await db.orders.update_one(
        {"order_no": payload.order_no},
        {"$set": {"payment_status": "paid" if captured else "failed",
                  "order_status": "confirmed" if captured else "cancelled",
                  "updated_at": now_iso()}},
    )
    order = await db.orders.find_one({"order_no": payload.order_no})
    return {"success": captured, "order": clean(order), "tran_id": tran_id}


@api.get("/orders/{order_no}")
async def track_order(order_no: str, phone: Optional[str] = None):
    order = await db.orders.find_one({"order_no": order_no})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if phone and order["customer"].get("phone") != phone:
        raise HTTPException(status_code=403, detail="Phone does not match order")
    return clean(order)


# ============================== Auth =======================================

@api.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    uid = str(user["_id"])
    access = create_access_token(uid, email, user["role"])
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return clean(user)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"], user["role"])
        response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return clean(user)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ============================== Admin ======================================

@api.get("/admin/dashboard/summary")
async def admin_summary(admin: dict = Depends(require_admin)):
    orders = await db.orders.find({}).to_list(5000)
    total_orders = len(orders)
    revenue = sum(o["net_payable"] for o in orders if o.get("payment_status") == "paid" or o.get("payment_method") == "COD")
    pending = sum(1 for o in orders if o["order_status"] == "pending")
    delivered = sum(1 for o in orders if o["order_status"] == "delivered")
    products_count = await db.products_local.count_documents({"is_active": True})
    # revenue last 7 days
    today = datetime.now(timezone.utc).date()
    series = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.isoformat()
        day_rev = sum(o["net_payable"] for o in orders if o.get("placed_at", "").startswith(day_str))
        day_count = sum(1 for o in orders if o.get("placed_at", "").startswith(day_str))
        series.append({"date": day.strftime("%a"), "revenue": round(day_rev, 3), "orders": day_count})
    # status breakdown
    statuses = {}
    for o in orders:
        statuses[o["order_status"]] = statuses.get(o["order_status"], 0) + 1
    status_breakdown = [{"name": k, "value": v} for k, v in statuses.items()]
    recent = sorted(orders, key=lambda x: x.get("placed_at", ""), reverse=True)[:8]
    return {
        "total_orders": total_orders,
        "revenue": round(revenue, 3),
        "pending_orders": pending,
        "delivered_orders": delivered,
        "products_count": products_count,
        "currency": CURRENCY,
        "revenue_series": series,
        "status_breakdown": status_breakdown,
        "recent_orders": [clean(o) for o in recent],
    }


@api.get("/admin/orders")
async def admin_orders(status: Optional[str] = None, q: Optional[str] = None, admin: dict = Depends(require_admin)):
    query = {}
    if status and status != "all":
        query["order_status"] = status
    if q:
        query["$or"] = [
            {"order_no": {"$regex": q, "$options": "i"}},
            {"customer.name": {"$regex": q, "$options": "i"}},
            {"customer.phone": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.orders.find(query).sort("placed_at", -1).to_list(2000)
    return [clean(d) for d in docs]


@api.patch("/admin/orders/{order_no}/status")
async def update_order_status(order_no: str, payload: StatusUpdateIn, request: Request, admin: dict = Depends(require_admin)):
    valid = {"pending", "confirmed", "processing", "delivered", "cancelled"}
    if payload.order_status not in valid:
        raise HTTPException(status_code=400, detail="Invalid status")
    order = await db.orders.find_one({"order_no": order_no})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one({"order_no": order_no}, {"$set": {"order_status": payload.order_status, "updated_at": now_iso()}})
    await audit(admin, "update_status", "order", order_no, request, {"status": order["order_status"]}, {"status": payload.order_status})
    order = await db.orders.find_one({"order_no": order_no})
    return clean(order)


@api.get("/admin/products")
async def admin_list_products(admin: dict = Depends(require_admin)):
    docs = await db.products_local.find({}).to_list(2000)
    return [clean(d) for d in docs]


@api.post("/admin/products")
async def admin_create_product(payload: ProductIn, request: Request, admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["source"] = "local"
    res = await db.products_local.insert_one(doc)
    await audit(admin, "create", "product", res.inserted_id, request, None, doc)
    return clean(await db.products_local.find_one({"_id": res.inserted_id}))


@api.put("/admin/products/{pid}")
async def admin_update_product(pid: str, payload: ProductIn, request: Request, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(pid):
        raise HTTPException(status_code=400, detail="Invalid id")
    doc = payload.model_dump()
    doc["source"] = "local"
    await db.products_local.update_one({"_id": ObjectId(pid)}, {"$set": doc})
    await audit(admin, "update", "product", pid, request, None, doc)
    return clean(await db.products_local.find_one({"_id": ObjectId(pid)}))


@api.delete("/admin/products/{pid}")
async def admin_delete_product(pid: str, request: Request, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(pid):
        raise HTTPException(status_code=400, detail="Invalid id")
    await db.products_local.delete_one({"_id": ObjectId(pid)})
    await audit(admin, "delete", "product", pid, request)
    return {"ok": True}


@api.get("/admin/categories")
async def admin_list_categories(admin: dict = Depends(require_admin)):
    docs = await db.categories.find({}).sort("sort_order", 1).to_list(200)
    return [clean(d) for d in docs]


@api.post("/admin/categories")
async def admin_create_category(payload: CategoryIn, request: Request, admin: dict = Depends(require_admin)):
    res = await db.categories.insert_one(payload.model_dump())
    await audit(admin, "create", "category", res.inserted_id, request)
    return clean(await db.categories.find_one({"_id": res.inserted_id}))


@api.put("/admin/categories/{cid}")
async def admin_update_category(cid: str, payload: CategoryIn, request: Request, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(cid):
        raise HTTPException(status_code=400, detail="Invalid id")
    await db.categories.update_one({"_id": ObjectId(cid)}, {"$set": payload.model_dump()})
    return clean(await db.categories.find_one({"_id": ObjectId(cid)}))


@api.delete("/admin/categories/{cid}")
async def admin_delete_category(cid: str, request: Request, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(cid):
        raise HTTPException(status_code=400, detail="Invalid id")
    await db.categories.delete_one({"_id": ObjectId(cid)})
    return {"ok": True}


@api.get("/admin/coupons")
async def admin_list_coupons(admin: dict = Depends(require_admin)):
    docs = await db.coupons.find({}).to_list(500)
    return [clean(d) for d in docs]


@api.post("/admin/coupons")
async def admin_create_coupon(payload: CouponIn, request: Request, admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["code"] = doc["code"].upper()
    doc["used_count"] = 0
    if await db.coupons.find_one({"code": doc["code"]}):
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    res = await db.coupons.insert_one(doc)
    await audit(admin, "create", "coupon", res.inserted_id, request)
    return clean(await db.coupons.find_one({"_id": res.inserted_id}))


@api.delete("/admin/coupons/{cid}")
async def admin_delete_coupon(cid: str, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(cid):
        raise HTTPException(status_code=400, detail="Invalid id")
    await db.coupons.delete_one({"_id": ObjectId(cid)})
    return {"ok": True}


@api.get("/admin/delivery-config")
async def admin_get_delivery(admin: dict = Depends(require_admin)):
    dc = await db.delivery_config.find_one({})
    return clean(dc) if dc else {}


@api.put("/admin/delivery-config")
async def admin_update_delivery(payload: DeliveryConfigIn, request: Request, admin: dict = Depends(require_admin)):
    existing = await db.delivery_config.find_one({})
    if existing:
        await db.delivery_config.update_one({"_id": existing["_id"]}, {"$set": payload.model_dump()})
    else:
        await db.delivery_config.insert_one(payload.model_dump())
    await audit(admin, "update", "delivery_config", "global", request)
    return clean(await db.delivery_config.find_one({}))


@api.get("/admin/customers")
async def admin_customers(admin: dict = Depends(require_admin)):
    orders = await db.orders.find({}).to_list(5000)
    by_phone = {}
    for o in orders:
        c = o["customer"]
        key = c.get("phone")
        if key not in by_phone:
            by_phone[key] = {"name": c.get("name"), "phone": c.get("phone"), "email": c.get("email"),
                             "area": c.get("area"), "orders": 0, "total_spent": 0.0, "last_order": o.get("placed_at")}
        by_phone[key]["orders"] += 1
        by_phone[key]["total_spent"] = round(by_phone[key]["total_spent"] + o["net_payable"], 3)
        if o.get("placed_at", "") > by_phone[key]["last_order"]:
            by_phone[key]["last_order"] = o.get("placed_at")
    return sorted(by_phone.values(), key=lambda x: x["total_spent"], reverse=True)


@api.get("/admin/reports")
async def admin_reports(period: str = "weekly", admin: dict = Depends(require_admin)):
    orders = await db.orders.find({}).sort("placed_at", -1).to_list(5000)
    now = datetime.now(timezone.utc)
    days = {"daily": 1, "weekly": 7, "monthly": 30}.get(period, 7)
    cutoff = (now - timedelta(days=days)).isoformat()
    in_range = [o for o in orders if o.get("placed_at", "") >= cutoff]
    total_revenue = round(sum(o["net_payable"] for o in in_range), 3)
    total_orders = len(in_range)
    avg = round(total_revenue / total_orders, 3) if total_orders else 0
    # top products
    prod_count = {}
    for o in in_range:
        for it in o["items"]:
            k = it["name_en"]
            prod_count[k] = prod_count.get(k, 0) + it["qty"]
    top = sorted([{"name": k, "qty": v} for k, v in prod_count.items()], key=lambda x: x["qty"], reverse=True)[:10]
    pm = {}
    for o in in_range:
        pm[o["payment_method"]] = pm.get(o["payment_method"], 0) + 1
    return {
        "period": period,
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "avg_order_value": avg,
        "currency": CURRENCY,
        "top_products": top,
        "payment_methods": [{"name": k, "value": v} for k, v in pm.items()],
        "orders": [clean(o) for o in in_range[:200]],
    }


@api.get("/admin/audit-logs")
async def admin_audit_logs(admin: dict = Depends(require_admin)):
    docs = await db.audit_logs.find({}).sort("created_at", -1).to_list(300)
    return [clean(d) for d in docs]


@api.get("/admin/sync/status")
async def sync_status(admin: dict = Depends(require_admin)):
    return {
        "oracle_available": oracle_repo.is_available(),
        "google_sheets_available": google_sheets_repo.is_available(),
        "google_sheet_id": os.environ.get("GOOGLE_SHEET_ID", "not-configured"),
    }


@api.post("/admin/sync/oracle-to-sheets")
async def sync_oracle_to_sheets(admin: dict = Depends(require_admin)):
    if not google_sheets_repo.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets not available")
    if not oracle_repo.is_available():
        raise HTTPException(status_code=503, detail="Oracle not available")
    try:
        products = oracle_repo.list_products()
        success = google_sheets_repo.sync_from_oracle(products)
        return {"success": success, "products_synced": len(products) if success else 0}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Sync failed: {repr(e)[:100]}")


# ============================== Startup ====================================

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@faiha.coop")
    pwd = os.environ.get("ADMIN_PASSWORD", "Faiha@2026")
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({"email": email, "password_hash": hash_password(pwd),
                                   "name": "Faiha Admin", "role": "super_admin", "is_active": True,
                                   "created_at": now_iso()})
        logger.info("Seeded admin user %s", email)
    elif not verify_password(pwd, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pwd)}})


async def seed_catalog():
    if await db.categories.count_documents({}) == 0:
        for c in seed_data.CATEGORIES:
            await db.categories.insert_one({**c, "is_active": True})
        logger.info("Seeded %d categories", len(seed_data.CATEGORIES))
    if await db.products_local.count_documents({}) == 0:
        for p in seed_data.PRODUCTS:
            await db.products_local.insert_one(dict(p))
        logger.info("Seeded %d products", len(seed_data.PRODUCTS))
    if await db.delivery_config.count_documents({}) == 0:
        await db.delivery_config.insert_one({
            "charge": 0.500, "min_order_amount": 2.000, "free_delivery_threshold": 15.000,
            "time_slots": ["09:00 - 12:00", "12:00 - 15:00", "15:00 - 18:00", "18:00 - 21:00"],
            "coverage_area": "Faiha & surrounding areas, Kuwait",
        })
    if await db.coupons.count_documents({}) == 0:
        await db.coupons.insert_one({"code": "FAIHA10", "type": "percent", "value": 10,
                                     "usage_limit": 1000, "used_count": 0, "is_active": True})


@app.on_event("startup")
async def startup():
    oracle_repo.init_pool()
    google_sheets_repo.init_sheets()
    await db.users.create_index("email", unique=True)
    await db.orders.create_index("order_no", unique=True)
    await db.orders.create_index("placed_at")
    await db.products_local.create_index("barcode")
    await db.products_local.create_index("category")
    await seed_admin()
    await seed_catalog()
    logger.info("Faiha API startup complete. Oracle live=%s", oracle_repo.is_available())


@app.on_event("shutdown")
async def shutdown():
    oracle_repo.close_pool()
    google_sheets_repo.close()
    client.close()
