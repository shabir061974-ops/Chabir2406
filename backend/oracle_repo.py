"""Oracle PRODUCT_MASTER read-only repository (python-oracledb thin mode).

The Faiha Oracle DW is typically firewalled to the production VPS, so this module
fails gracefully: if the pool cannot be created (network/credentials), the app
falls back to MongoDB-seeded products. When deployed on a whitelisted VPS the
pool initializes and live product/stock/price data flows automatically.
"""
import os
import logging
import time

logger = logging.getLogger("oracle")

_pool = None
_available = False


def init_pool():
    global _pool, _available
    if os.environ.get("ORACLE_ENABLED", "false").lower() != "true":
        logger.info("Oracle disabled via env; using MongoDB fallback catalog.")
        return False
    try:
        import oracledb
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
            timeout=30,
            getmode=oracledb.POOL_GETMODE_TIMEDWAIT,
            wait_timeout=5000,
        )
        # smoke test
        with _pool.acquire() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1 FROM DUAL")
            cur.fetchone()
        _available = True
        logger.info("Oracle pool initialized and reachable.")
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


def _schema():
    return os.environ.get("ORA_SCHEMA", "COOP_POS_BO_DB")


def _table():
    return f'{_schema()}."PRODUCT_MASTER"'


def list_products(q=None, limit=200):
    """READ-ONLY parameterized SELECT on PRODUCT_MASTER."""
    if not _available:
        return []
    sql = (
        f'SELECT "Category","Item Name","Barcode","Price","Available Quantity" '
        f'FROM {_table()} WHERE ROWNUM <= :lim'
    )
    binds = {"lim": limit}
    try:
        with _pool.acquire() as conn:
            cur = conn.cursor()
            t0 = time.time()
            cur.execute(sql, binds)
            rows = cur.fetchall()
            logger.info("Oracle list_products rows=%d dur=%.3fs", len(rows), time.time() - t0)
            out = []
            for cat, name, barcode, price, qty in rows:
                out.append({
                    "source": "oracle",
                    "category": cat,
                    "name_en": name,
                    "name_ar": name,
                    "barcode": str(barcode) if barcode is not None else None,
                    "price": float(price or 0),
                    "stock": int(qty or 0),
                })
            return out
    except Exception as e:  # noqa: BLE001
        logger.error("Oracle list_products error: %s", repr(e)[:160])
        return []


def check_stock(barcode, qty):
    """Live stock check; never cached. Returns (ok, available)."""
    if not _available:
        return None
    sql = (
        f'SELECT "Available Quantity" FROM {_table()} WHERE "Barcode" = :bc'
    )
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
