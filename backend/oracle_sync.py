"""Nightly sync: Oracle PRODUCT_MASTER -> MongoDB products_local (full overwrite).

Oracle is the source of truth for price, stock, barcode, and both the Arabic (ITEM_NAME)
and English (ITEM_NAME_ENG) names. Admin-managed presentation fields (images, category,
Featured/On-Sale, discount, and an optional manual name_en override) live in the
barcode-keyed `product_overrides` collection and are re-applied on every sync, so the
nightly full overwrite never wipes them.

Run standalone from cron:  python oracle_sync.py
Or from the API:           await run_sync(db)
"""
import os
import asyncio
import logging
from datetime import datetime, timezone

import oracle_repo

logger = logging.getLogger("oracle_sync")

# Fields the admin owns. Preserved across the nightly full overwrite, keyed by barcode.
OVERRIDE_FIELDS = ["images", "name_en", "category", "is_featured", "is_promotional", "discount"]

# Products whose category is not an active category are hidden on the storefront, so
# freshly-synced products stay hidden until the admin assigns a real category.
DEFAULT_CATEGORY = "uncategorized"


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _base_doc(row):
    """Build a product doc from an Oracle row (before overrides are layered on)."""
    return {
        "barcode": row["barcode"],
        "product_id": row["product_id"],
        "name_en": row.get("name_en") or row["name_ar"],  # Oracle's ITEM_NAME_ENG; Arabic as last-resort fallback
        "name_ar": row["name_ar"],
        "category": DEFAULT_CATEGORY,
        "price": row["price"],
        "stock": row["stock"],
        "images": [],
        "unit_en": "each",
        "unit_ar": "حبة",
        "is_featured": False,
        "is_promotional": False,
        "discount": 0,
        "is_active": True,
        "source": "oracle",
        "synced_at": _now_iso(),
    }


async def run_sync(db):
    """Full-overwrite the oracle-sourced products in products_local, re-applying overrides.

    Returns a summary dict. Aborts (without touching the catalog) if Oracle returns no rows,
    so a transient Oracle hiccup can never empty the storefront.
    """
    rows = await asyncio.to_thread(oracle_repo.fetch_product_master)
    if not rows:
        logger.warning("Oracle returned 0 rows; aborting sync to avoid wiping the catalog.")
        return {"ok": False, "reason": "no_rows", "synced": 0}

    overrides = {}
    async for ov in db.product_overrides.find({}):
        overrides[str(ov.get("barcode"))] = ov

    docs = []
    applied = 0
    for r in rows:
        doc = _base_doc(r)
        ov = overrides.get(str(r["barcode"]))
        if ov:
            applied += 1
            for f in OVERRIDE_FIELDS:
                v = ov.get(f)
                if v not in (None, "", []):
                    doc[f] = v
        docs.append(doc)

    # Full overwrite of oracle-sourced products. Also clears the older Google-Sheets
    # 'product_master' docs (and any duplicates). Manually-added source='local' products stay.
    deleted = await db.products_local.delete_many({"source": {"$in": ["oracle", "product_master"]}})
    if docs:
        await db.products_local.insert_many(docs)

    res = {"ok": True, "synced": len(docs), "overrides_applied": applied,
           "removed": deleted.deleted_count, "at": _now_iso()}
    # Record for the admin "last sync" indicator (written by both the cron and the API).
    await db.sync_state.update_one({"_id": "oracle"}, {"$set": res}, upsert=True)
    logger.info("Oracle->Mongo sync complete: %s", res)
    return res


async def _main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    if not oracle_repo.init_pool():
        print(_now_iso(), "ERROR: Oracle not available (check ORACLE_ENABLED / connectivity).")
        client.close()
        raise SystemExit(1)
    res = await run_sync(db)
    print(_now_iso(), "oracle sync result:", res)
    oracle_repo.close_pool()
    client.close()


if __name__ == "__main__":
    asyncio.run(_main())
