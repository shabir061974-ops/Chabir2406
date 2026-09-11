from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import secrets
import random
import asyncio
import subprocess
from io import BytesIO
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional

import bcrypt
import jwt
from PIL import Image
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, UploadFile, File
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from bson import ObjectId
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

import oracle_repo
import oracle_sync
import google_sheets_repo
import seed_data
import addons

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


def _client_ip(request: Request) -> str:
    """Real client IP behind the Caddy→nginx proxy chain (leftmost X-Forwarded-For)."""
    xff = request.headers.get("x-forwarded-for")
    return xff.split(",")[0].strip() if xff else get_remote_address(request)


# Shared storage in the existing MongoDB so limits are enforced across ALL uvicorn workers
# (in-memory would give each worker its own counter). No new service needed. Falls back to
# in-memory if the store is ever unreachable, so rate limiting can never take the API down.
try:
    limiter = Limiter(key_func=_client_ip, storage_uri=mongo_url)
except Exception as _e:  # noqa: BLE001
    logger.warning("Rate-limit Mongo store unavailable (%s); using in-memory fallback.", repr(_e)[:120])
    limiter = Limiter(key_func=_client_ip)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Directory where admin-uploaded product images are stored (persisted via docker volume).
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB (raw upload before optimization)
MAX_IMAGE_DIM = 1200                # longest edge after resize (px)
WEBP_QUALITY = 82                   # good quality / small size balance

# On-demand backups land here — bind-mounted to the host /root/mongo-backups (shared with the nightly cron).
BACKUP_DIR = Path("/backups")

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
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="lax", max_age=3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="lax", max_age=604800, path="/")


def clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc


def clean_guest_order(doc):
    """Clean order data for guest view - remove sensitive customer information."""
    if not doc:
        return doc
    doc = clean(doc)
    # Remove sensitive customer fields guest doesn't need
    if "customer" in doc:
        doc["customer"] = {
            "name": doc["customer"].get("name", "")
        }
    return doc


def gen_order_no():
    return f"FAIHA-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{random.randint(1000, 9999)}"


async def send_otp_sms(phone: str, otp: str) -> bool:
    """Send OTP via SMS. Returns True if sent successfully, False otherwise.

    Requires SMS provider credentials in environment:
    - Option 1 (Twilio): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
    - Option 2 (Vonage): VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_PHONE_NUMBER
    - Option 3 (AWS SNS): AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION

    TODO: Set SMS_PROVIDER environment variable to enable delivery.
    """
    sms_provider = os.environ.get("SMS_PROVIDER", "").lower()

    if not sms_provider:
        # SMS provider not configured - log for debugging only, don't expose OTP
        logger.warning(f"SMS provider not configured. OTP delivery disabled. Configure SMS_PROVIDER env var.")
        return False

    try:
        if sms_provider == "twilio":
            return await _send_otp_twilio(phone, otp)
        elif sms_provider == "vonage":
            return await _send_otp_vonage(phone, otp)
        elif sms_provider == "aws":
            return await _send_otp_aws(phone, otp)
        else:
            logger.error(f"Unknown SMS_PROVIDER: {sms_provider}")
            return False
    except Exception as e:
        logger.error(f"Failed to send OTP: {str(e)}")
        return False


async def _send_otp_twilio(phone: str, otp: str) -> bool:
    """Send OTP via Twilio SMS."""
    try:
        from twilio.rest import Client
        account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
        from_phone = os.environ.get("TWILIO_PHONE_NUMBER")

        if not all([account_sid, auth_token, from_phone]):
            logger.error("Twilio credentials not configured")
            return False

        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=f"Your Faiha Store verification code is: {otp}\n\nValid for 10 minutes.",
            from_=from_phone,
            to=phone
        )
        logger.info(f"OTP sent via Twilio (SID: {message.sid}, phone: ...{phone[-4:]})")
        return True
    except ImportError:
        logger.error("Twilio SDK not installed. Install with: pip install twilio")
        return False


async def _send_otp_vonage(phone: str, otp: str) -> bool:
    """Send OTP via Vonage SMS."""
    try:
        from vonage import Client
        api_key = os.environ.get("VONAGE_API_KEY")
        api_secret = os.environ.get("VONAGE_API_SECRET")
        from_phone = os.environ.get("VONAGE_PHONE_NUMBER")

        if not all([api_key, api_secret, from_phone]):
            logger.error("Vonage credentials not configured")
            return False

        client = Client(key=api_key, secret=api_secret)
        response = client.sms.send_message({
            "to": phone,
            "from": from_phone,
            "text": f"Your Faiha Store verification code is: {otp}\n\nValid for 10 minutes."
        })

        if response["messages"][0]["status"] == "0":
            logger.info(f"OTP sent via Vonage (phone: ...{phone[-4:]})")
            return True
        else:
            logger.error(f"Vonage SMS failed: {response['messages'][0]['error-text']}")
            return False
    except ImportError:
        logger.error("Vonage SDK not installed. Install with: pip install vonage")
        return False


async def _send_otp_aws(phone: str, otp: str) -> bool:
    """Send OTP via AWS SNS SMS."""
    try:
        import boto3
        aws_region = os.environ.get("AWS_REGION", "us-east-1")

        sns_client = boto3.client("sns", region_name=aws_region)
        response = sns_client.publish(
            PhoneNumber=phone,
            Message=f"Your Faiha Store verification code is: {otp}\n\nValid for 10 minutes."
        )
        logger.info(f"OTP sent via AWS SNS (MessageId: {response['MessageId']}, phone: ...{phone[-4:]})")
        return True
    except ImportError:
        logger.error("AWS SDK (boto3) not installed. Install with: pip install boto3")
        return False


async def create_staff_notification(notification_type: str, order_no: str, order_id, customer_name: str,
                                   fulfillment_type: Optional[str] = None, vehicle_number: Optional[str] = None,
                                   vehicle_color: Optional[str] = None, payment_method: Optional[str] = None,
                                   arrival_time: Optional[str] = None):
    """Create a staff notification for important order events. Idempotent: prevents duplicate notifications."""
    # Prevent duplicate notifications
    # Check if a notification of this type already exists for this order within the last 30 seconds
    existing = await db.staff_notifications.find_one({
        "type": notification_type,
        "order_no": order_no,
        "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()}
    })
    if existing:
        return existing

    # Create notification
    notif = {
        "type": notification_type,
        "order_no": order_no,
        "order_id": order_id,
        "customer_name": customer_name,
        "fulfillment_type": fulfillment_type,
        "vehicle_number": vehicle_number,
        "vehicle_color": vehicle_color,
        "payment_method": payment_method,
        "arrival_time": arrival_time,
        "created_at": now_iso(),
        "read": False,
    }
    res = await db.staff_notifications.insert_one(notif)
    notif["_id"] = res.inserted_id
    return notif


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


def _normalize_phone(p: str) -> str:
    return "".join(ch for ch in (p or "") if ch.isdigit())


async def get_current_customer(request: Request) -> dict:
    """Auth for customer accounts — accepts a Bearer token (preferred by the mobile apps) or a cookie."""
    token = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:].strip()
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Not a customer token")
    cust = await db.customers.find_one({"_id": ObjectId(payload["sub"])})
    if not cust:
        raise HTTPException(status_code=401, detail="Customer not found")
    return cust


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


class CustomerRegisterIn(BaseModel):
    phone: str
    password: str = Field(min_length=6)
    name: str


class CustomerLoginIn(BaseModel):
    phone: str
    password: str


class CustomerProfileIn(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    addresses: Optional[List[str]] = None


class RefreshIn(BaseModel):
    refresh_token: str


class CartItemIn(BaseModel):
    # Coerce numeric barcodes (e.g. Coffee items like 79970003) to string so the
    # order request is not rejected by strict string validation.
    model_config = ConfigDict(coerce_numbers_to_str=True)
    product_id: str
    barcode: Optional[str] = None
    name: str
    qty: int
    unit_price: float
    source: str = "local"
    # Selected add-on item ids (e.g. Oat Milk, Extra Espresso). Prices/names are always
    # re-resolved from the DB server-side -- never trusted from the client. Capped well
    # above any real customization (largest configured group set today is a handful of
    # groups) so an oversized array can't be used to inflate query cost.
    addon_item_ids: List[str] = Field(default_factory=list, max_length=20)


class CustomerInfo(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    # Delivery address/area are no longer collected at checkout; kept optional
    # for backward compatibility with older orders/clients.
    address: Optional[str] = ""
    area: Optional[str] = ""
    notes: Optional[str] = None
    shareholder_number: Optional[str] = None


class PlaceOrderInput(BaseModel):
    items: List[CartItemIn]
    customer: CustomerInfo
    payment_method: str  # COD | KNET
    fulfillment_type: str = "PICKUP"  # PICKUP | CAR_SERVICE
    vehicle_number: Optional[str] = None
    vehicle_color: Optional[str] = None
    coupon_code: Optional[str] = None
    delivery_slot: Optional[str] = None
    lang: str = "en"


class KnetCallbackInput(BaseModel):
    order_no: str
    result: str  # CAPTURED | CANCELLED


class GuestOtpRequestInput(BaseModel):
    phone: str


class GuestOtpVerifyInput(BaseModel):
    phone: str
    otp: str


class ProductIn(BaseModel):
    # Google-Sheets-synced products may carry numeric barcodes/values; accept and coerce to str.
    model_config = ConfigDict(coerce_numbers_to_str=True)
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
    expires_at: Optional[str] = None  # inclusive last valid day, ISO date "YYYY-MM-DD"; None = never expires


class CouponValidateIn(BaseModel):
    code: str
    subtotal: float = 0


class DeliveryConfigIn(BaseModel):
    charge: float
    min_order_amount: float
    free_delivery_threshold: float = 0
    time_slots: List[str] = []
    coverage_area: str = ""


class StatusUpdateIn(BaseModel):
    order_status: str


class StaffNotificationOut(BaseModel):
    id: str = Field(..., alias="id")
    type: str
    order_no: str
    customer_name: str
    fulfillment_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_color: Optional[str] = None
    payment_method: Optional[str] = None
    arrival_time: Optional[str] = None
    created_at: str
    read: bool = False

    class Config:
        populate_by_name = True


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


@api.get("/health")
async def health():
    """Lightweight liveness + DB probe for uptime monitoring and mobile connectivity checks."""
    try:
        await db.command("ping")
        db_ok = True
    except Exception:  # noqa: BLE001
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "db": db_ok, "time": now_iso()}


@api.get("/app/config")
async def app_config():
    """Runtime config the mobile apps read on launch — lets you gate versions / pause without a store update."""
    return {
        "min_app_version": "1.0.0",
        "maintenance": False,
        "currency": CURRENCY,
        "contact": {"whatsapp": "96590986000"},
        "features": {"knet": False, "customer_accounts": True},
    }


@api.get("/categories")
async def get_categories():
    # Dynamic + deterministic: active categories ordered by sort_order, then name (stable tie-break).
    cats = await db.categories.find({"is_active": True}).sort([("sort_order", 1), ("name_en", 1)]).to_list(100)
    return [clean(c) for c in cats]


# ------------------------------- Coupons ----------------------------------

def _coupon_ok(coupon):
    """Returns (ok, reason). A coupon is usable only if active, not expired, and not used up."""
    if not coupon.get("is_active", True):
        return False, "inactive"
    exp = coupon.get("expires_at")
    if exp and date.today().isoformat() > str(exp)[:10]:
        return False, "expired"
    if coupon.get("used_count", 0) >= coupon.get("usage_limit", 1000):
        return False, "used_up"
    return True, "ok"


def _coupon_discount(coupon, subtotal):
    subtotal = max(0.0, subtotal or 0.0)
    if coupon["type"] == "percent":
        return round(subtotal * coupon["value"] / 100, 3)
    return round(min(coupon["value"], subtotal), 3)


@api.get("/coupons/active")
async def coupons_active():
    """Whether any usable coupon exists — the storefront hides the coupon box when none do."""
    count = 0
    async for c in db.coupons.find({"is_active": True}):
        ok, _ = _coupon_ok(c)
        if ok:
            count += 1
    return {"has_active": count > 0, "count": count}


@api.post("/coupons/validate")
@limiter.limit("30/minute")
async def validate_coupon(request: Request, payload: CouponValidateIn):
    """Validate a coupon code against the DB and return the discount, or an error message."""
    code = (payload.code or "").strip().upper()
    coupon = await db.coupons.find_one({"code": code}) if code else None
    if not coupon or not _coupon_ok(coupon)[0]:
        return {"valid": False, "message": "Invalid or expired coupon."}
    return {
        "valid": True,
        "code": code,
        "type": coupon["type"],
        "value": coupon["value"],
        "discount": _coupon_discount(coupon, payload.subtotal),
        "message": "Coupon applied",
    }


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
    has_addons_set = await addons.compute_has_addons_set(db, items)
    for it in items:
        it["has_addons"] = it["id"] in has_addons_set

    # Oracle PRODUCT_MASTER products are materialized into products_local by the nightly
    # oracle_sync job (source='oracle'), so they're already in `docs` above — no live merge here.

    # Restrict listings to categories that are currently enabled (is_active).
    # This scopes "All Products" (and every listing) to the active launch categories;
    # enabling a category in the DB automatically surfaces its products — no code change.
    active_slugs = {c["slug"] for c in await db.categories.find({"is_active": True}, {"slug": 1}).to_list(500)}
    items = [i for i in items if i.get("category") in active_slugs]

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
    item["has_addons"] = bool(await addons.get_product_addons(db, item))
    return item


# ============================== Checkout ===================================

async def _validate_items(items):
    """Returns (validated, errors). Live Oracle stock check when source=oracle."""
    validated = []
    errors = []
    # Batch fetch all product overrides (optimization: 1 query instead of N)
    barcodes = [it.barcode for it in items if it.barcode]
    overrides_list = await db.product_overrides.find({"barcode": {"$in": barcodes}}).to_list(None) if barcodes else []
    overrides_by_barcode = {o["barcode"]: o for o in overrides_list}
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
        # Apply product overrides (admin-uploaded images, custom names, etc.) from pre-fetched cache
        if prod.get("barcode") and prod["barcode"] in overrides_by_barcode:
            override = overrides_by_barcode[prod["barcode"]]
            for field in oracle_sync.OVERRIDE_FIELDS:
                v = override.get(field)
                if v not in (None, "", []):
                    prod[field] = v
        # live oracle stock when applicable
        available = prod.get("stock", 0)
        if prod.get("source") == "oracle" and prod.get("barcode") and oracle_repo.is_available():
            res = oracle_repo.check_stock(prod["barcode"], it.qty)
            if res is not None:
                ok, available = res
        if available < it.qty:
            errors.append({"product_id": it.product_id, "name": prod["name_en"], "reason": "insufficient_stock", "available": available})
            continue
        addon_lines, addon_total, addon_errors = await addons.resolve_selected_addons(db, prod, it.addon_item_ids)
        if addon_errors:
            errors.append({"product_id": it.product_id, "name": prod.get("name_en"), "reason": "invalid_addons", "detail": addon_errors})
            continue
        validated.append({
            "prod": prod, "qty": it.qty, "unit_price": _eff_price(prod),
            "addon_lines": addon_lines, "addon_total": addon_total,
        })
    return validated, errors


@api.post("/checkout/validate-stock")
async def validate_stock(payload: PlaceOrderInput):
    _, errors = await _validate_items(payload.items)
    return {"ok": len(errors) == 0, "errors": errors}


async def _apply_coupon(code, subtotal):
    if not code:
        return 0, None
    coupon = await db.coupons.find_one({"code": code.upper()})
    if not coupon or not _coupon_ok(coupon)[0]:
        return 0, None
    return _coupon_discount(coupon, subtotal), coupon


@api.post("/checkout/place-order")
@limiter.limit("15/minute")
async def place_order(payload: PlaceOrderInput, request: Request):
    # Validate fulfillment type
    fulfillment_type = payload.fulfillment_type.upper()
    if fulfillment_type not in ("PICKUP", "CAR_SERVICE"):
        raise HTTPException(status_code=400, detail={"message": "invalid_fulfillment_type"})

    # Validate vehicle details for CAR_SERVICE
    if fulfillment_type == "CAR_SERVICE":
        if not payload.vehicle_number or not payload.vehicle_number.strip():
            raise HTTPException(status_code=400, detail={"message": "vehicle_details_required", "field": "vehicle_number"})
        if not payload.vehicle_color or not payload.vehicle_color.strip():
            raise HTTPException(status_code=400, detail={"message": "vehicle_details_required", "field": "vehicle_color"})

    validated, errors = await _validate_items(payload.items)
    if errors:
        raise HTTPException(status_code=400, detail={"message": "stock_validation_failed", "errors": errors})
    if not validated:
        raise HTTPException(status_code=400, detail={"message": "empty_cart"})

    order_items = []
    subtotal = 0.0
    for v in validated:
        addon_total = v.get("addon_total", 0.0)
        # unit_price is what the customer actually pays per unit (base + add-ons), so
        # every existing consumer of order_items.unit_price/line_total (admin UI,
        # reports, PDF export) keeps working unchanged; base_price/addons are additive.
        effective_unit_price = round(v["unit_price"] + addon_total, 3)
        line = round(effective_unit_price * v["qty"], 3)
        subtotal += line
        order_items.append({
            "product_id": str(v["prod"]["_id"]),
            "barcode": v["prod"].get("barcode"),
            "name_en": v["prod"]["name_en"],
            "name_ar": v["prod"]["name_ar"],
            "image": (v["prod"].get("images") or [None])[0],
            "qty": v["qty"],
            "unit_price": effective_unit_price,
            "base_price": v["unit_price"],
            "addons": v.get("addon_lines", []),
            "addon_total": addon_total,
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

    # Payment method selection for physical collection by Faiha staff
    pm_raw = payload.payment_method.upper()
    if pm_raw in ("COD", "CASH"):
        pm = "Cash"
    elif pm_raw == "KNET":
        pm = "KNET"
    else:
        raise HTTPException(status_code=400, detail={"message": "invalid_payment_method"})

    payment_status = "pending"
    order_status = "NEW"  # New orders start as NEW

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
        "fulfillment_type": fulfillment_type,
        "vehicle_number": (payload.vehicle_number.strip() if payload.vehicle_number else None) if fulfillment_type == "CAR_SERVICE" else None,
        "vehicle_color": (payload.vehicle_color.strip() if payload.vehicle_color else None) if fulfillment_type == "CAR_SERVICE" else None,
        "delivery_slot": payload.delivery_slot,
        "lang": payload.lang,
        "placed_at": now_iso(),
        "updated_at": now_iso(),
    }
    res = await db.orders.insert_one(order_doc)
    if coupon:
        await db.coupons.update_one({"_id": coupon["_id"]}, {"$inc": {"used_count": 1}})
    # Batch decrement local stock (optimization: 1 bulk operation instead of N sequential)
    local_items = [v for v in validated if v["prod"].get("source") == "local"]
    if local_items:
        from pymongo import UpdateOne
        bulk_ops = [UpdateOne({"_id": v["prod"]["_id"]}, {"$inc": {"stock": -v["qty"]}}) for v in local_items]
        await db.products_local.bulk_write(bulk_ops)

    order_doc["id"] = str(res.inserted_id)
    order_doc.pop("_id", None)

    # Fire-and-forget: create staff notification asynchronously without blocking response
    asyncio.create_task(create_staff_notification(
        notification_type="new_order",
        order_no=order_no,
        order_id=res.inserted_id,
        customer_name=payload.customer.name,
        fulfillment_type=fulfillment_type,
        vehicle_number=(payload.vehicle_number.strip() if payload.vehicle_number else None) if fulfillment_type == "CAR_SERVICE" else None,
        vehicle_color=(payload.vehicle_color.strip() if payload.vehicle_color else None) if fulfillment_type == "CAR_SERVICE" else None,
        payment_method=pm
    ))

    return {"order": order_doc}


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
                  "order_status": "CANCELLED" if not captured else order.get("order_status", "NEW"),
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


# DISABLED: Guest OTP feature - not production-ready without SMS provider configuration
# @api.post("/guest/request-otp")
# @limiter.limit("5/minute")
async def _disabled_request_guest_otp(request: Request, payload: GuestOtpRequestInput):
    """Request OTP for guest order history access. Rate-limited strictly."""
    phone = payload.phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number required")

    target = _normalize_phone(phone)
    if not target or len(target) < 8:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    orders = await db.orders.find({"customer.phone": phone}).to_list(1)
    if not orders:
        # Don't reveal if phone has no orders (security: don't leak customer existence)
        return {"message": "If you have orders, you will receive an OTP via SMS"}

    otp = secrets.randbelow(1000000)
    otp_str = f"{otp:06d}"
    otp_expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()

    await db.guest_otp_sessions.update_one(
        {"phone": target},
        {"$set": {
            "phone": target,
            "otp": otp_str,
            "created_at": now_iso(),
            "expires_at": otp_expires_at,
            "attempts": 0,
            "verified": False,
        }},
        upsert=True
    )

    # Attempt to send OTP via SMS
    sms_sent = await send_otp_sms(phone, otp_str)

    if not sms_sent:
        # SMS delivery failed - for production, this should trigger an alert
        logger.error(f"Failed to send OTP for phone ...{target[-4:]}. SMS provider may not be configured.")
        raise HTTPException(status_code=503, detail="SMS delivery temporarily unavailable. Please try again later.")

    return {
        "message": "OTP sent to your phone",
        "phone_masked": f"***-{target[-4:]}",
        "expires_in_minutes": 10
    }


# DISABLED: Guest OTP feature - not production-ready without SMS provider configuration
# @api.post("/guest/verify-otp")
# @limiter.limit("10/minute")
async def _disabled_verify_guest_otp(request: Request, payload: GuestOtpVerifyInput):
    """Verify OTP and return temporary access token for order history."""
    phone = payload.phone.strip()
    otp = payload.otp.strip()

    if not phone or not otp:
        raise HTTPException(status_code=400, detail="Phone and OTP required")

    target = _normalize_phone(phone)
    if not target or len(target) < 8:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    session = await db.guest_otp_sessions.find_one({"phone": target})
    if not session:
        raise HTTPException(status_code=404, detail="No OTP request found. Request a new OTP.")

    if session.get("verified"):
        raise HTTPException(status_code=400, detail="OTP already verified. Use your access token.")

    if session.get("attempts", 0) >= 3:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Request a new OTP.")

    if session.get("expires_at") < now_iso():
        raise HTTPException(status_code=400, detail="OTP expired. Request a new OTP.")

    # Check if OTP is None (was already used or invalidated)
    if not session.get("otp"):
        raise HTTPException(status_code=400, detail="OTP already used or invalid. Request a new OTP.")

    if session.get("otp") != otp:
        await db.guest_otp_sessions.update_one(
            {"phone": target},
            {"$inc": {"attempts": 1}}
        )
        raise HTTPException(status_code=401, detail="Invalid OTP")

    access_token = secrets.token_urlsafe(32)
    token_expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

    await db.guest_otp_sessions.update_one(
        {"phone": target},
        {"$set": {
            "verified": True,
            "access_token": access_token,
            "access_token_expires_at": token_expires_at,
            "verified_at": now_iso(),
            "otp": None,  # Invalidate OTP after successful verification (one-time-use)
        }}
    )

    logger.info(f"OTP verified successfully for phone ending in ...{target[-4:]}")

    return {
        "access_token": access_token,
        "expires_in_hours": 1,
        "message": "Verified. Use this token to access order history."
    }


# DISABLED: Guest OTP feature - not production-ready without SMS provider configuration
# @api.get("/guest/orders")
# @limiter.limit("30/minute")
async def _disabled_guest_order_history(token: str, request: Request):
    """Retrieve order history for verified guest using OTP-based token."""
    if not token or not token.strip():
        raise HTTPException(status_code=401, detail="Access token required")

    session = await db.guest_otp_sessions.find_one({"access_token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not session.get("verified"):
        raise HTTPException(status_code=401, detail="Token not verified")

    if session.get("access_token_expires_at", "") < now_iso():
        raise HTTPException(status_code=401, detail="Token expired")

    target_phone = session.get("phone")
    docs = await db.orders.find({}).sort("placed_at", -1).to_list(200)
    docs = [d for d in docs if _normalize_phone((d.get("customer") or {}).get("phone", "")) == target_phone]

    logger.info(f"Guest accessed order history with token (phone ending in ...{target_phone[-4:]})")

    return [clean_guest_order(d) for d in docs]


@api.post("/orders/{order_no}/car-service-arrival")
async def mark_car_service_arrival(order_no: str, phone: Optional[str] = None):
    """Mark that a car service customer has arrived at the parking area."""
    order = await db.orders.find_one({"order_no": order_no})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Verify phone matches for security
    if phone and order["customer"].get("phone") != phone:
        raise HTTPException(status_code=403, detail="Phone does not match order")

    # Only CAR_SERVICE orders can mark arrival
    if order.get("fulfillment_type") != "CAR_SERVICE":
        raise HTTPException(status_code=400, detail={
            "message": "arrival_only_for_car_service",
            "fulfillment_type": order.get("fulfillment_type")
        })

    # Only READY orders can mark arrival
    if order.get("order_status") != "READY":
        raise HTTPException(status_code=400, detail={
            "message": "arrival_only_when_ready",
            "order_status": order.get("order_status")
        })

    # If already marked as arrived, don't update (idempotent)
    if order.get("car_service_arrived"):
        return clean(order)

    # Mark arrival
    arrival_time = now_iso()
    await db.orders.update_one(
        {"order_no": order_no},
        {"$set": {
            "car_service_arrived": True,
            "car_service_arrived_at": arrival_time,
            "updated_at": arrival_time
        }}
    )

    order = await db.orders.find_one({"order_no": order_no})

    # Create staff notification for car service arrival
    await create_staff_notification(
        notification_type="customer_arrived",
        order_no=order_no,
        order_id=order["_id"],
        customer_name=order["customer"]["name"],
        fulfillment_type="CAR_SERVICE",
        vehicle_number=order.get("vehicle_number"),
        vehicle_color=order.get("vehicle_color"),
        payment_method=order.get("payment_method"),
        arrival_time=arrival_time
    )

    return clean(order)


# ============================== Auth =======================================

@api.post("/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginInput, response: Response):
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
        response.set_cookie("access_token", access, httponly=True, secure=True, samesite="lax", max_age=3600, path="/")
        return clean(user)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ============================== Customer accounts ==========================

@api.post("/customer/register")
@limiter.limit("5/minute")
async def customer_register(request: Request, payload: CustomerRegisterIn):
    phone = _normalize_phone(payload.phone)
    if len(phone) < 6:
        raise HTTPException(status_code=400, detail="Enter a valid phone number")
    if await db.customers.find_one({"phone": phone}):
        raise HTTPException(status_code=400, detail="An account with this phone number already exists")
    doc = {"phone": phone, "password_hash": hash_password(payload.password),
           "name": (payload.name or "").strip(), "email": None, "addresses": [],
           "created_at": now_iso()}
    res = await db.customers.insert_one(doc)
    cid = str(res.inserted_id)
    return {"access_token": create_access_token(cid, phone, "customer"),
            "refresh_token": create_refresh_token(cid), "token_type": "bearer",
            "customer": clean({**doc, "_id": res.inserted_id})}


@api.post("/customer/login")
@limiter.limit("10/minute")
async def customer_login(request: Request, payload: CustomerLoginIn):
    phone = _normalize_phone(payload.phone)
    cust = await db.customers.find_one({"phone": phone})
    if not cust or not verify_password(payload.password, cust["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    cid = str(cust["_id"])
    return {"access_token": create_access_token(cid, phone, "customer"),
            "refresh_token": create_refresh_token(cid), "token_type": "bearer",
            "customer": clean(cust)}


@api.post("/customer/refresh")
@limiter.limit("30/minute")
async def customer_refresh(request: Request, payload: RefreshIn):
    try:
        p = jwt.decode(payload.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if p.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        cust = await db.customers.find_one({"_id": ObjectId(p["sub"])})
        if not cust:
            raise HTTPException(status_code=401, detail="Customer not found")
        return {"access_token": create_access_token(str(cust["_id"]), cust["phone"], "customer"),
                "token_type": "bearer"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api.get("/customer/me")
async def customer_me(customer: dict = Depends(get_current_customer)):
    return clean(customer)


@api.put("/customer/profile")
async def customer_update_profile(payload: CustomerProfileIn, customer: dict = Depends(get_current_customer)):
    upd = {}
    if payload.name is not None:
        upd["name"] = payload.name.strip()
    if payload.email is not None:
        upd["email"] = payload.email.strip() or None
    if payload.addresses is not None:
        upd["addresses"] = [a.strip() for a in payload.addresses if a and a.strip()]
    if upd:
        await db.customers.update_one({"_id": customer["_id"]}, {"$set": upd})
    return clean(await db.customers.find_one({"_id": customer["_id"]}))


@api.get("/customer/orders")
async def customer_orders(customer: dict = Depends(get_current_customer)):
    """A customer's own order history — matched by phone, so prior guest orders on that number show too."""
    target = _normalize_phone(customer.get("phone", ""))
    docs = await db.orders.find({}).sort("created_at", -1).to_list(1000)
    mine = [clean(d) for d in docs if _normalize_phone((d.get("customer") or {}).get("phone", "")) == target]
    return mine[:200]


# ============================== Admin ======================================

@api.get("/admin/dashboard/summary")
async def admin_summary(admin: dict = Depends(require_admin)):
    orders = await db.orders.find({}).to_list(5000)
    total_orders = len(orders)
    revenue = sum(o["net_payable"] for o in orders if o.get("payment_status") == "paid" or o.get("payment_method") == "Cash")
    pending = sum(1 for o in orders if o.get("order_status") in ("NEW", "PREPARING", "READY"))
    delivered = sum(1 for o in orders if o["order_status"] == "COMPLETED")
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
    valid_statuses = {"NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"}
    if payload.order_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    order = await db.orders.find_one({"order_no": order_no})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    current_status = order.get("order_status", "NEW")
    new_status = payload.order_status

    # Define allowed status transitions
    allowed_transitions = {
        "NEW": {"PREPARING", "CANCELLED"},
        "PREPARING": {"READY", "CANCELLED"},
        "READY": {"COMPLETED"},
        "COMPLETED": set(),  # No transitions from completed
        "CANCELLED": set(),  # No transitions from cancelled
    }

    # Check if transition is allowed
    if new_status not in allowed_transitions.get(current_status, set()):
        raise HTTPException(status_code=400, detail={
            "message": "invalid_transition",
            "current_status": current_status,
            "requested_status": new_status
        })

    await db.orders.update_one({"order_no": order_no}, {"$set": {"order_status": new_status, "updated_at": now_iso()}})
    await audit(admin, "update_status", "order", order_no, request, {"status": current_status}, {"status": new_status})
    order = await db.orders.find_one({"order_no": order_no})
    return clean(order)


@api.get("/admin/notifications")
async def get_staff_notifications(admin: dict = Depends(require_admin)):
    """Fetch recent staff notifications (unread + last 50 read). Returns newest first."""
    # Get all unread notifications
    unread = await db.staff_notifications.find({"read": False}).sort("created_at", -1).to_list(1000)
    # Get last 50 read notifications for context
    read = await db.staff_notifications.find({"read": True}).sort("created_at", -1).to_list(50)
    # Combine and deduplicate by keeping unread priority
    all_notifs = unread + read
    seen_orders = set()
    result = []
    for n in all_notifs:
        order_no = n["order_no"]
        if order_no not in seen_orders:
            result.append(clean(n))
            seen_orders.add(order_no)
    return result[:100]  # Return max 100 notifications


@api.patch("/admin/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, admin: dict = Depends(require_admin)):
    """Mark a single notification as read."""
    try:
        await db.staff_notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"read": True}}
        )
        notif = await db.staff_notifications.find_one({"_id": ObjectId(notification_id)})
        return clean(notif)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID")


@api.patch("/admin/notifications/read-all")
async def mark_all_notifications_read(admin: dict = Depends(require_admin)):
    """Mark all notifications as read."""
    result = await db.staff_notifications.update_many(
        {"read": False},
        {"$set": {"read": True}}
    )
    return {"modified_count": result.modified_count}


@api.post("/admin/upload")
@limiter.limit("30/minute")
async def admin_upload_image(request: Request, file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP or GIF images are allowed")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large (max 8 MB)")
    try:
        img = Image.open(BytesIO(data))
        img.load()
    except Exception:
        raise HTTPException(status_code=400, detail="File is not a valid image")
    # Keep transparency where present, otherwise flatten to RGB.
    img = img.convert("RGBA") if img.mode in ("RGBA", "LA", "P") else img.convert("RGB")
    # Shrink oversized photos to fit within MAX_IMAGE_DIM (never upscales small images).
    img.thumbnail((MAX_IMAGE_DIM, MAX_IMAGE_DIM), Image.LANCZOS)
    fname = f"{uuid.uuid4().hex}.webp"
    buf = BytesIO()
    img.save(buf, format="WEBP", quality=WEBP_QUALITY, method=6)
    (UPLOAD_DIR / fname).write_bytes(buf.getvalue())
    # Relative URL served by StaticFiles below; same-origin in production so <img src> just works.
    return {"url": f"/api/uploads/{fname}"}


@api.get("/admin/products")
async def admin_list_products(admin: dict = Depends(require_admin)):
    docs = await db.products_local.find({}).to_list(2000)
    return [clean(d) for d in docs]


async def _persist_override(doc):
    """Save admin-managed fields to product_overrides (keyed by barcode) so the nightly
    Oracle full-overwrite re-applies them. No-op for products without a barcode."""
    bc = doc.get("barcode")
    if not bc:
        return
    ov = {k: doc.get(k) for k in oracle_sync.OVERRIDE_FIELDS}
    ov["barcode"] = str(bc)
    ov["updated_at"] = now_iso()
    await db.product_overrides.update_one({"barcode": str(bc)}, {"$set": ov}, upsert=True)


@api.post("/admin/products")
async def admin_create_product(payload: ProductIn, request: Request, admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["source"] = "local"
    res = await db.products_local.insert_one(doc)
    await _persist_override(doc)
    await audit(admin, "create", "product", res.inserted_id, request, None, doc)
    return clean(await db.products_local.find_one({"_id": res.inserted_id}))


@api.put("/admin/products/{pid}")
async def admin_update_product(pid: str, payload: ProductIn, request: Request, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(pid):
        raise HTTPException(status_code=400, detail="Invalid id")
    doc = payload.model_dump()
    # Do NOT force source here: oracle-synced products must keep source='oracle' so the
    # nightly sync keeps managing them (otherwise a stale 'local' duplicate would appear).
    await db.products_local.update_one({"_id": ObjectId(pid)}, {"$set": doc})
    await _persist_override(doc)
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
    docs = await db.categories.find({}).sort([("sort_order", 1), ("name_en", 1)]).to_list(200)
    return [clean(d) for d in docs]


@api.post("/admin/categories")
async def admin_create_category(payload: CategoryIn, request: Request, admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["slug"] = (doc.get("slug") or "").strip().lower()  # slugs are always lowercase & URL-safe
    res = await db.categories.insert_one(doc)
    await audit(admin, "create", "category", res.inserted_id, request)
    return clean(await db.categories.find_one({"_id": res.inserted_id}))


@api.put("/admin/categories/{cid}")
async def admin_update_category(cid: str, payload: CategoryIn, request: Request, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(cid):
        raise HTTPException(status_code=400, detail="Invalid id")
    doc = payload.model_dump()
    doc["slug"] = (doc.get("slug") or "").strip().lower()
    await db.categories.update_one({"_id": ObjectId(cid)}, {"$set": doc})
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


@api.get("/admin/reports/sales")
async def admin_sales_report(date_from: str, date_to: str, admin: dict = Depends(require_admin)):
    """Sales report for an arbitrary [date_from, date_to] range (inclusive, both YYYY-MM-DD).

    Unlike /admin/reports above (kept as-is), this only ever pulls orders whose placed_at
    falls in the requested range -- a direct indexed range query on orders.placed_at, not a
    full-collection load filtered in Python -- so it stays fast regardless of total order
    history size. Revenue/products-sold/avg-order figures exclude cancelled orders (no real
    sale happened); the four order-status counts and total_customers count every order in
    range regardless of status, since those are about order volume, not revenue.
    """
    try:
        start = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
        end = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc) + timedelta(days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="date_from/date_to must be YYYY-MM-DD")
    if end <= start:
        raise HTTPException(status_code=400, detail="date_to must be on or after date_from")

    orders = await db.orders.find(
        {"placed_at": {"$gte": start.isoformat(), "$lt": end.isoformat()}}
    ).sort("placed_at", 1).to_list(50000)

    completed = sum(1 for o in orders if o["order_status"] == "COMPLETED")
    cancelled = sum(1 for o in orders if o["order_status"] == "CANCELLED")
    pending = sum(1 for o in orders if o.get("order_status") in ("NEW", "PREPARING", "READY"))
    revenue_orders = [o for o in orders if o.get("order_status") != "CANCELLED"]
    total_revenue = round(sum(o["net_payable"] for o in revenue_orders), 3)
    avg_order_value = round(total_revenue / len(revenue_orders), 3) if revenue_orders else 0
    total_products_sold = sum(it["qty"] for o in revenue_orders for it in o["items"])
    total_customers = len({(o["customer"].get("phone") or o["customer"].get("name")) for o in orders})

    prod_stats = {}
    for o in revenue_orders:
        for it in o["items"]:
            s = prod_stats.setdefault(it["name_en"], {"name": it["name_en"], "qty": 0, "amount": 0.0})
            s["qty"] += it["qty"]
            s["amount"] += it["line_total"]
    top_products = sorted(prod_stats.values(), key=lambda x: x["qty"], reverse=True)[:10]
    for p in top_products:
        p["amount"] = round(p["amount"], 3)

    pm_stats = {}
    for o in revenue_orders:
        pm = o.get("payment_method") or "Other"
        s = pm_stats.setdefault(pm, {"method": pm, "count": 0, "amount": 0.0})
        s["count"] += 1
        s["amount"] += o["net_payable"]
    payment_summary = [{"method": k, "count": v["count"], "amount": round(v["amount"], 3)} for k, v in pm_stats.items()]

    daily = {}
    for o in revenue_orders:
        day = o.get("placed_at", "")[:10]
        d = daily.setdefault(day, {"date": day, "revenue": 0.0, "orders": 0})
        d["revenue"] += o["net_payable"]
        d["orders"] += 1
    daily_trend = sorted(daily.values(), key=lambda x: x["date"])
    for d in daily_trend:
        d["revenue"] = round(d["revenue"], 3)

    status_counts = {}
    for o in orders:
        status_counts[o["order_status"]] = status_counts.get(o["order_status"], 0) + 1
    status_distribution = [{"status": k, "count": v} for k, v in status_counts.items()]

    sales_details = []
    for o in orders:
        sales_details.append({
            "order_no": o["order_no"],
            "placed_at": o.get("placed_at"),
            "customer_name": o["customer"].get("name"),
            "customer_phone": o["customer"].get("phone"),
            "payment_method": o.get("payment_method"),
            "order_status": o.get("order_status"),
            "products": ", ".join(f"{it['name_en']} x{it['qty']}" for it in o["items"]),
            "qty": sum(it["qty"] for it in o["items"]),
            "subtotal": o.get("subtotal", 0),
            "delivery_charge": o.get("delivery_charge", 0),
            "discount_amount": o.get("discount_amount", 0),
            "net_payable": o.get("net_payable", 0),
        })

    return {
        "date_from": date_from,
        "date_to": date_to,
        "currency": CURRENCY,
        "summary": {
            "total_orders": len(orders),
            "completed_orders": completed,
            "cancelled_orders": cancelled,
            "pending_orders": pending,
            "total_revenue": total_revenue,
            "avg_order_value": avg_order_value,
            "total_products_sold": total_products_sold,
            "total_customers": total_customers,
        },
        "top_products": top_products,
        "payment_summary": payment_summary,
        "daily_trend": daily_trend,
        "status_distribution": status_distribution,
        "sales_details": sales_details,
    }


@api.get("/admin/audit-logs")
async def admin_audit_logs(admin: dict = Depends(require_admin)):
    docs = await db.audit_logs.find({}).sort("created_at", -1).to_list(300)
    return [clean(d) for d in docs]


@api.get("/admin/sync/status")
async def sync_status(admin: dict = Depends(require_admin)):
    last = await db.sync_state.find_one({"_id": "oracle"})
    last_oracle_sync = None
    if last:
        last_oracle_sync = {k: last.get(k) for k in (
            "ok", "synced", "removed", "at", "started_at", "ended_at", "duration_seconds",
            "inserted", "updated", "unchanged", "removed_action", "errors",
        )}
    return {
        "oracle_available": oracle_repo.is_available(),
        "google_sheets_available": google_sheets_repo.is_available(),
        "google_sheet_id": os.environ.get("GOOGLE_SHEET_ID", "not-configured"),
        "last_oracle_sync": last_oracle_sync,
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


@api.post("/admin/sync/oracle-to-mongo")
async def sync_oracle_to_mongo_endpoint(admin: dict = Depends(require_admin)):
    """Manually trigger the Oracle -> MongoDB product sync (same job the nightly cron runs)."""
    if not oracle_repo.is_available():
        raise HTTPException(status_code=503, detail="Oracle not available")
    try:
        return await oracle_sync.run_sync(db)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Sync failed: {repr(e)[:120]}")


def _do_backup():
    """Blocking: mongodump the DB + tar the uploads folder into BACKUP_DIR. Run via to_thread."""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M")
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    db_file = BACKUP_DIR / f"faiha-manual-{ts}.gz"
    up_file = BACKUP_DIR / f"uploads-manual-{ts}.tgz"
    with open(db_file, "wb") as f:
        subprocess.run(
            ["mongodump", f"--uri={mongo_url}", "--db", os.environ["DB_NAME"], "--gzip", "--archive"],
            check=True, stdout=f, stderr=subprocess.DEVNULL,
        )
    subprocess.run(["tar", "-czf", str(up_file), "-C", str(UPLOAD_DIR.parent), UPLOAD_DIR.name], check=True)
    return {"_id": "last", "trigger": "manual", "at": now_iso(),
            "db_file": db_file.name, "db_size": db_file.stat().st_size,
            "uploads_file": up_file.name, "uploads_size": up_file.stat().st_size}


@api.post("/admin/backup/now")
async def backup_now(admin: dict = Depends(require_admin)):
    """On-demand backup: DB dump + uploads archive into the shared backup folder."""
    try:
        res = await asyncio.to_thread(_do_backup)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Backup failed: {repr(e)[:150]}")
    await db.backup_state.update_one({"_id": "last"}, {"$set": res}, upsert=True)
    return res


@api.get("/admin/backup/status")
async def backup_status(admin: dict = Depends(require_admin)):
    last = await db.backup_state.find_one({"_id": "last"})
    if not last:
        return {"last_backup": None}
    return {"last_backup": {k: last.get(k) for k in ("trigger", "at", "db_file", "db_size", "uploads_file", "uploads_size")}}


# ============================== Product Add-ons =============================
# Business logic + Mongo access lives in addons.py (new collections only, Oracle
# untouched); these are thin routes reusing this file's own auth/audit/clean helpers.

@api.get("/products/{product_id}/addons")
async def product_addons(product_id: str):
    if not ObjectId.is_valid(product_id):
        return []
    product = await db.products_local.find_one({"_id": ObjectId(product_id)})
    if not product:
        return []
    return await addons.get_product_addons(db, clean(product))


@api.get("/admin/addon-groups")
async def admin_list_addon_groups(admin: dict = Depends(require_admin)):
    docs = await db.addon_groups.find({}).sort([("display_order", 1), ("name_en", 1)]).to_list(500)
    return [clean(d) for d in docs]


@api.post("/admin/addon-groups")
async def admin_create_addon_group(payload: addons.AddonGroupIn, request: Request, admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["created_at"] = doc["updated_at"] = now_iso()
    res = await db.addon_groups.insert_one(doc)
    await audit(admin, "create", "addon_group", res.inserted_id, request)
    return clean(await db.addon_groups.find_one({"_id": res.inserted_id}))


@api.put("/admin/addon-groups/{gid}")
async def admin_update_addon_group(gid: str, payload: addons.AddonGroupIn, request: Request, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(gid):
        raise HTTPException(status_code=400, detail="Invalid id")
    doc = payload.model_dump()
    doc["updated_at"] = now_iso()
    await db.addon_groups.update_one({"_id": ObjectId(gid)}, {"$set": doc})
    await audit(admin, "update", "addon_group", gid, request)
    return clean(await db.addon_groups.find_one({"_id": ObjectId(gid)}))


@api.delete("/admin/addon-groups/{gid}")
async def admin_delete_addon_group(gid: str, request: Request, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(gid):
        raise HTTPException(status_code=400, detail="Invalid id")
    # Historical orders embed a full snapshot of each add-on line (name/price at the
    # time of purchase), so they never depend on this group/its items still existing --
    # but we still avoid hard-deleting something referenced by a past order, so admin
    # tooling and audit trails can still resolve "what group was this order line part
    # of" rather than pointing at a vanished id. Deactivate instead in that case.
    if await db.orders.find_one({"items.addons.group_id": gid}):
        await db.addon_groups.update_one({"_id": ObjectId(gid)}, {"$set": {"is_active": False, "updated_at": now_iso()}})
        await db.addon_items.update_many({"group_id": gid}, {"$set": {"is_active": False, "updated_at": now_iso()}})
        await audit(admin, "deactivate", "addon_group", gid, request)
        return {"ok": True, "soft_deleted": True, "message": "This group is used in past orders, so it was deactivated instead of deleted."}
    await db.addon_groups.delete_one({"_id": ObjectId(gid)})
    await db.addon_items.delete_many({"group_id": gid})
    # Cleanup: drop the now-dangling id out of any category/product mapping that referenced it.
    await db.category_addon_groups.update_many({}, {"$pull": {"group_ids": gid}})
    await db.product_addon_groups.update_many({}, {"$pull": {"group_ids": gid}})
    await audit(admin, "delete", "addon_group", gid, request)
    return {"ok": True, "soft_deleted": False}


@api.get("/admin/addon-items")
async def admin_list_addon_items(group_id: Optional[str] = None, admin: dict = Depends(require_admin)):
    query = {"group_id": group_id} if group_id else {}
    docs = await db.addon_items.find(query).sort([("display_order", 1), ("name_en", 1)]).to_list(2000)
    return [clean(d) for d in docs]


@api.post("/admin/addon-items")
async def admin_create_addon_item(payload: addons.AddonItemIn, request: Request, admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["created_at"] = doc["updated_at"] = now_iso()
    res = await db.addon_items.insert_one(doc)
    await audit(admin, "create", "addon_item", res.inserted_id, request)
    return clean(await db.addon_items.find_one({"_id": res.inserted_id}))


@api.put("/admin/addon-items/{iid}")
async def admin_update_addon_item(iid: str, payload: addons.AddonItemIn, request: Request, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(iid):
        raise HTTPException(status_code=400, detail="Invalid id")
    doc = payload.model_dump()
    doc["updated_at"] = now_iso()
    await db.addon_items.update_one({"_id": ObjectId(iid)}, {"$set": doc})
    await audit(admin, "update", "addon_item", iid, request)
    return clean(await db.addon_items.find_one({"_id": ObjectId(iid)}))


@api.delete("/admin/addon-items/{iid}")
async def admin_delete_addon_item(iid: str, request: Request, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(iid):
        raise HTTPException(status_code=400, detail="Invalid id")
    if await db.orders.find_one({"items.addons.item_id": iid}):
        await db.addon_items.update_one({"_id": ObjectId(iid)}, {"$set": {"is_active": False, "updated_at": now_iso()}})
        await audit(admin, "deactivate", "addon_item", iid, request)
        return {"ok": True, "soft_deleted": True, "message": "This item is used in past orders, so it was deactivated instead of deleted."}
    await db.addon_items.delete_one({"_id": ObjectId(iid)})
    await audit(admin, "delete", "addon_item", iid, request)
    return {"ok": True, "soft_deleted": False}


@api.get("/admin/categories/{slug}/addon-groups")
async def admin_get_category_addons(slug: str, admin: dict = Depends(require_admin)):
    doc = await db.category_addon_groups.find_one({"category_slug": slug})
    return {"category_slug": slug, "group_ids": doc.get("group_ids", []) if doc else []}


@api.put("/admin/categories/{slug}/addon-groups")
async def admin_set_category_addons(slug: str, payload: addons.GroupIdsIn, request: Request, admin: dict = Depends(require_admin)):
    await db.category_addon_groups.update_one({"category_slug": slug}, {"$set": {"group_ids": payload.group_ids}}, upsert=True)
    await audit(admin, "update", "category_addon_groups", slug, request)
    return {"category_slug": slug, "group_ids": payload.group_ids}


@api.get("/admin/products/{pid}/addon-groups")
async def admin_get_product_addons(pid: str, admin: dict = Depends(require_admin)):
    doc = await db.product_addon_groups.find_one({"product_id": pid})
    return {"product_id": pid, "override": doc is not None, "group_ids": doc.get("group_ids", []) if doc else []}


@api.put("/admin/products/{pid}/addon-groups")
async def admin_set_product_addons(pid: str, payload: addons.GroupIdsIn, request: Request, admin: dict = Depends(require_admin)):
    await db.product_addon_groups.update_one({"product_id": pid}, {"$set": {"group_ids": payload.group_ids}}, upsert=True)
    await audit(admin, "update", "product_addon_groups", pid, request)
    return {"product_id": pid, "override": True, "group_ids": payload.group_ids}


@api.delete("/admin/products/{pid}/addon-groups")
async def admin_clear_product_addons(pid: str, request: Request, admin: dict = Depends(require_admin)):
    await db.product_addon_groups.delete_one({"product_id": pid})
    await audit(admin, "delete", "product_addon_groups", pid, request)
    return {"ok": True}


# ============================== Startup ====================================

app.include_router(api)
# Serve uploaded product images. Mounted under /api so nginx proxies it to the backend.
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "faihait@faihacoopkw.com")
    pwd = os.environ.get("ADMIN_PASSWORD")
    if not pwd:
        logger.warning("ADMIN_PASSWORD not set — skipping admin seed/sync")
        return
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
    await db.customers.create_index("phone", unique=True)
    await db.orders.create_index("order_no", unique=True)
    await db.orders.create_index("placed_at")
    await db.products_local.create_index("barcode")
    await db.products_local.create_index("category")
    # Compound, covers the group_id-only lookups too (Mongo compound-index prefix rule),
    # so a separate single-field group_id index would just be redundant write overhead.
    await db.addon_items.create_index([("group_id", 1), ("is_active", 1), ("display_order", 1)])
    await db.addon_groups.create_index([("display_order", 1), ("is_active", 1)])
    await db.category_addon_groups.create_index("category_slug", unique=True)
    await db.product_addon_groups.create_index("product_id", unique=True)
    # Staff notifications indexes
    await db.staff_notifications.create_index("created_at")
    await db.staff_notifications.create_index([("order_no", 1), ("type", 1)])
    await db.staff_notifications.create_index("read")
    await seed_admin()
    await seed_catalog()
    logger.info("Faiha API startup complete. Oracle live=%s", oracle_repo.is_available())


@app.on_event("shutdown")
async def shutdown():
    oracle_repo.close_pool()
    google_sheets_repo.close()
    client.close()
