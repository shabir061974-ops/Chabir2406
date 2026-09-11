"""Incremental sync: Oracle PRODUCT_MASTER -> MongoDB products_local.

Keyed by PRODUCT_ID (Oracle's own identifier), not barcode or Mongo's _id. For every
Oracle row:
  - PRODUCT_ID not seen before       -> insert a new document.
  - PRODUCT_ID exists, fields differ -> update ONLY the changed fields.
  - PRODUCT_ID exists, nothing differs -> no database write at all.
Compared fields: oracle_category_code (raw CATEGORY, tracked but never used to set the
storefront category -- see note below), name_ar (ITEM_NAME), name_en (ITEM_NAME_ENG,
subject to admin override), barcode, price, stock (AVAILABLE_QUANTITY).

A product that existed before but is no longer returned by Oracle is NOT deleted: it's
marked is_active=False (hides it from the storefront everywhere, since every public listing
query filters on is_active) so its Mongo _id -- and therefore its /product/:id URL, and any
past order line item referencing it -- stays valid. Set ORACLE_REMOVED_ACTION=delete in the
environment to hard-delete instead. If the product reappears in a later sync, it's
reactivated automatically.

Full delete-and-reinsert of the whole catalog is no longer used anywhere in this file.

Why CATEGORY is tracked but not applied: Oracle's CATEGORY column is a raw POS code with no
lookup table (verified live: a single value, 1, across every current row). It cannot be
mapped to the storefront's real category slugs (coffee, cold-coffee, ...). The storefront
category has always been -- and remains -- fully admin/override-owned, defaulting to
"uncategorized" for a brand-new product until an admin assigns a real one. Change-tracking
happens on oracle_category_code so the compare-list in the spec is honored precisely,
without a meaningless numeric code overwriting real admin categorization work on every run.

Run standalone from cron:  python oracle_sync.py
Or from the API:           await run_sync(db)
"""
import os
import asyncio
import logging
from datetime import datetime, timezone

from pymongo import InsertOne, UpdateOne, DeleteOne
from pymongo.errors import BulkWriteError

import oracle_repo

logger = logging.getLogger("oracle_sync")

# Admin-owned fields, keyed by barcode in `product_overrides`. Only ever applied to a
# document if the override actually provides that field -- an update never resets an
# override-owned field back to a "no override" default (that would silently blow away
# admin work, e.g. wiping uploaded images because no override happens to mention them).
OVERRIDE_FIELDS = ["images", "name_en", "category", "is_featured", "is_promotional", "discount"]

DEFAULT_CATEGORY = "uncategorized"

# Oracle-native fields compared to decide whether an existing product needs updating.
# name_en/category are compared against their *effective* value (Oracle's, unless an
# override pins them) so an override is never clobbered, and a removed override is
# correctly picked back up from Oracle.
COMPARE_FIELDS = ["oracle_category_code", "name_ar", "name_en", "barcode", "price", "stock", "category"]


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _effective_new_doc(row, override):
    """What this product's Oracle-driven fields *should* be right now, override applied."""
    doc = {
        "product_id": row["product_id"],
        "barcode": row["barcode"],
        "name_ar": row["name_ar"],
        "name_en": row["name_en"],
        "oracle_category_code": row["oracle_category_code"],
        "price": row["price"],
        "stock": row["stock"],
        "oracle_created_date": row.get("created_date"),
        "oracle_updated_date": row.get("updated_date"),
        "category": DEFAULT_CATEGORY,
        "images": [],
        "is_featured": False,
        "is_promotional": False,
        "discount": 0,
    }
    if override:
        for f in OVERRIDE_FIELDS:
            v = override.get(f)
            if v not in (None, "", []):
                doc[f] = v
    return doc


def _new_product_doc(row, override):
    """Full document for a PRODUCT_ID never seen before."""
    doc = _effective_new_doc(row, override)
    doc.update({
        "unit_en": "each",
        "unit_ar": "حبة",
        "is_active": True,
        "source": "oracle",
        "synced_at": _now_iso(),
    })
    return doc


async def run_sync(db):
    """Incrementally reconcile products_local with the current Oracle PRODUCT_MASTER.

    Returns a summary dict (also written to db.sync_state for the admin "last sync"
    indicator). Aborts without writing anything if Oracle returns no rows, so a transient
    Oracle hiccup can never empty or wipe the catalog.
    """
    start = datetime.now(timezone.utc)
    # Idempotent: safe to call every run. Keeps the source+product_id lookup this sync
    # depends on fast as the catalog grows well past today's small row count.
    await db.products_local.create_index([("source", 1), ("product_id", 1)])
    rows = await asyncio.to_thread(oracle_repo.fetch_product_master)
    if not rows:
        logger.warning("Oracle returned 0 rows; aborting sync (no changes made).")
        return {"ok": False, "reason": "no_rows", "inserted": 0, "updated": 0,
                "unchanged": 0, "removed": 0, "errors": [], "at": _now_iso()}

    overrides = {}
    async for ov in db.product_overrides.find({}):
        overrides[str(ov.get("barcode"))] = ov

    existing_by_pid = {}
    async for doc in db.products_local.find({"source": "oracle"}):
        pid = doc.get("product_id")
        if pid is not None:
            existing_by_pid[str(pid)] = doc

    remove_action = os.environ.get("ORACLE_REMOVED_ACTION", "deactivate").strip().lower()

    ops = []
    op_pids = []  # parallel to ops, so a bulk_write failure can be traced back to a PRODUCT_ID
    inserted = updated = unchanged = 0
    errors = []
    seen_pids = set()

    for row in rows:
        pid = str(row["product_id"])
        seen_pids.add(pid)
        try:
            override = overrides.get(str(row["barcode"]))
            existing = existing_by_pid.get(pid)

            if existing is None:
                ops.append(InsertOne(_new_product_doc(row, override)))
                op_pids.append(pid)
                inserted += 1
                continue

            new_doc = _effective_new_doc(row, override)
            changes = {}
            for f in COMPARE_FIELDS:
                if new_doc.get(f) != existing.get(f):
                    changes[f] = new_doc[f]
            # Override-only presentation fields: only ever touched if an override
            # explicitly supplies them and the value actually differs -- never reset to
            # a "no override" default on an existing document (protects images especially).
            if override:
                for f in ("images", "is_featured", "is_promotional", "discount"):
                    if f in override and override[f] not in (None, "", []) and new_doc[f] != existing.get(f):
                        changes[f] = new_doc[f]
            if existing.get("is_active") is False:
                changes["is_active"] = True  # reappeared in Oracle

            if changes:
                # CREATED_DATE/UPDATED_DATE aren't part of the change-trigger comparison
                # (the spec's compare-list is exactly the 6 fields above), but since we're
                # already writing this document for another reason, piggyback a refresh of
                # these informational fields at zero extra write cost.
                changes["oracle_created_date"] = new_doc["oracle_created_date"]
                changes["oracle_updated_date"] = new_doc["oracle_updated_date"]
                changes["synced_at"] = _now_iso()
                ops.append(UpdateOne({"_id": existing["_id"]}, {"$set": changes}))
                op_pids.append(pid)
                updated += 1
            else:
                unchanged += 1
        except Exception as e:  # noqa: BLE001 -- one bad row must never abort the whole sync
            errors.append({"product_id": pid, "error": repr(e)[:200]})
            logger.error("Sync error on PRODUCT_ID=%s: %s", pid, repr(e)[:200])

    removed = 0
    for pid, doc in existing_by_pid.items():
        if pid in seen_pids:
            continue
        if remove_action == "delete":
            ops.append(DeleteOne({"_id": doc["_id"]}))
        elif doc.get("is_active") is not False:
            ops.append(UpdateOne({"_id": doc["_id"]}, {"$set": {"is_active": False, "synced_at": _now_iso()}}))
        else:
            continue  # already inactive, nothing to do
        op_pids.append(pid)
        removed += 1

    if ops:
        try:
            await db.products_local.bulk_write(ops, ordered=False)
        except BulkWriteError as e:
            # ordered=False means every op was still attempted; write_errors tells us
            # exactly which ones failed (by index into `ops`), so map each back to its
            # PRODUCT_ID for precise logging instead of one opaque batch-level error.
            for we in e.details.get("writeErrors", []):
                idx = we.get("index")
                failed_pid = op_pids[idx] if idx is not None and idx < len(op_pids) else None
                errors.append({"product_id": failed_pid, "error": we.get("errmsg", repr(e))[:200]})
                logger.error("Sync bulk_write failure on PRODUCT_ID=%s: %s", failed_pid, we.get("errmsg"))
        except Exception as e:  # noqa: BLE001
            errors.append({"product_id": None, "error": f"bulk_write: {repr(e)[:200]}"})
            logger.error("Oracle sync bulk_write error: %s", repr(e)[:200])

    end = datetime.now(timezone.utc)
    res = {
        "ok": True,
        "started_at": start.isoformat(),
        "ended_at": end.isoformat(),
        "duration_seconds": round((end - start).total_seconds(), 3),
        "inserted": inserted,
        "updated": updated,
        "unchanged": unchanged,
        "removed": removed,
        "removed_action": remove_action,
        "errors": errors,
        "at": end.isoformat(),
        # Kept for the existing admin "last sync" UI, which reads .synced:
        "synced": inserted + updated + unchanged,
    }
    await db.sync_state.update_one({"_id": "oracle"}, {"$set": res}, upsert=True)
    logger.info("Oracle->Mongo incremental sync complete: %s", res)
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
