"""Oracle PRODUCT_MASTER read-only repository.

Faiha's Oracle DW is **Oracle 11g (11.2.0.1.0)**, which python-oracledb 'thin' mode does
NOT support. We therefore use **thick mode** via the Oracle Instant Client (ORA_CLIENT_LIB).
If the client lib or the server is unreachable, the app fails gracefully and the storefront
falls back to the MongoDB catalog.

Live PRODUCT_MASTER columns (verified): PRODUCT_ID, CATEGORY, ITEM_NAME, BARCODE, PRICE,
AVAILABLE_QUANTITY, CREATED_DATE, UPDATED_DATE.
"""
import os
import time
import logging

logger = logging.getLogger("oracle")

_pool = None
_available = False
_thick_initialized = False

# simple in-memory TTL cache for product listing (stock check is never cached)
_cache = {"data": None, "ts": 0}
_CACHE_TTL = 90  # seconds

GENERIC_IMG = "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"


def _init_thick():
    global _thick_initialized
    if _thick_initialized:
        return True
    import oracledb
    lib = os.environ.get("ORA_CLIENT_LIB")
    try:
        oracledb.init_oracle_client(lib_dir=lib if lib else None)
    except Exception as e:  # noqa: BLE001
        # "already initialized" is fine; anything else is fatal for thick mode
        if "DPI-1072" in str(e) or "already" in str(e).lower():
            pass
        else:
            logger.warning("Oracle thick-client init failed: %s", repr(e)[:160])
            return False
    _thick_initialized = True
    return True


def init_pool():
    global _pool, _available
    if os.environ.get("ORACLE_ENABLED", "false").lower() != "true":
        logger.info("Oracle disabled via env; using MongoDB fallback catalog.")
        return False
    try:
        import oracledb
        if not _init_thick():
            _available = False
            return False
        dsn = oracledb.makedsn(
            os.environ["ORA_HOST"],
            int(os.environ.get("ORA_PORT", "1521")),
            service_name=os.environ["ORA_SERVICE"],
        )
        _pool = oracledb.create_pool(
            user=os.environ["ORA_USER"],
            password=os.environ["ORA_PASSWORD"],
            dsn=dsn,
            min=1,
            max=5,
            increment=1,
        )
        with _pool.acquire() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1 FROM DUAL")
            cur.fetchone()
        _available = True
        logger.info("Oracle pool initialized and reachable (thick mode, 11g).")
        return True
    except Exception as e:  # noqa: BLE001
        _available = False
        logger.warning("Oracle unavailable (%s). Falling back to MongoDB catalog.", repr(e)[:160])
        return False


def is_available():
    return _available


def close_pool():
    global _pool
    if _pool is not None:
        try:
            _pool.close()
        except Exception:  # noqa: BLE001
            pass
        _pool = None


def _table():
    schema = os.environ.get("ORA_SCHEMA")
    return f"{schema}.PRODUCT_MASTER" if schema else "PRODUCT_MASTER"


def _slugify(cat):
    return str(cat if cat is not None else "uncategorized").strip().lower().replace(" ", "-").replace("&", "and")


def list_products(limit=1000):
    """READ-ONLY parameterized SELECT on PRODUCT_MASTER, cached for _CACHE_TTL seconds."""
    if not _available:
        return []
    now = time.time()
    if _cache["data"] is not None and (now - _cache["ts"]) < _CACHE_TTL:
        return _cache["data"]
    sql = (
        "SELECT PRODUCT_ID, CATEGORY, ITEM_NAME, BARCODE, PRICE, AVAILABLE_QUANTITY "
        f"FROM {_table()} WHERE ROWNUM <= :lim"
    )
    try:
        with _pool.acquire() as conn:
            cur = conn.cursor()
            t0 = time.time()
            cur.execute(sql, {"lim": limit})
            rows = cur.fetchall()
            logger.info("Oracle list_products rows=%d dur=%.3fs", len(rows), time.time() - t0)
            out = []
            for pid, cat, name, barcode, price, qty in rows:
                name = str(name or "").strip()
                out.append({
                    "id": f"ora-{barcode or pid}",
                    "source": "oracle",
                    "category": _slugify(cat),
                    "category_raw": cat,
                    "name_en": name,
                    "name_ar": name,
                    "barcode": str(barcode) if barcode is not None else None,
                    "price": round(float(price or 0), 3),
                    "effective_price": round(float(price or 0), 3),
                    "stock": int(qty or 0),
                    "images": [GENERIC_IMG],
                    "unit_en": "each",
                    "unit_ar": "حبة",
                    "is_featured": False,
                    "is_promotional": False,
                    "discount": 0,
                    "is_active": True,
                })
            _cache["data"] = out
            _cache["ts"] = now
            return out
    except Exception as e:  # noqa: BLE001
        logger.error("Oracle list_products error: %s", repr(e)[:160])
        return []


def get_by_barcode(barcode):
    for p in list_products():
        if p.get("barcode") == str(barcode):
            return p
    return None


def check_stock(barcode, qty):
    """Live stock check; never cached. Returns (ok, available) or None on error."""
    if not _available:
        return None
    sql = f"SELECT AVAILABLE_QUANTITY FROM {_table()} WHERE BARCODE = :bc AND ROWNUM = 1"
    try:
        with _pool.acquire() as conn:
            cur = conn.cursor()
            cur.execute(sql, {"bc": barcode})
            row = cur.fetchone()
            if not row:
                return (False, 0)
            available = int(row[0] or 0)
            return (available >= qty, available)
    except Exception as e:  # noqa: BLE001
        logger.error("Oracle check_stock error: %s", repr(e)[:160])
        return None
