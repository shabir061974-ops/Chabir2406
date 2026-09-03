"""Product Add-on / Customization system (generic: coffee, bakery, meals, beverages).

New MongoDB collections only -- never touches Oracle or products_local's existing shape.
Pure logic module (models + async helpers taking `db` as a parameter), mirroring how
oracle_repo/oracle_sync are used: server.py owns the actual FastAPI routes (so it can
reuse its own auth/audit dependencies without a circular import) and calls into this
module for the business logic and Mongo access.

Collections:
  addon_groups           {_id, name_en, name_ar, selection_type, is_required,
                           display_order, is_active, created_at, updated_at}
  addon_items             {_id, group_id, name_en, name_ar, price, display_order,
                           is_active, is_default, created_at, updated_at}
  category_addon_groups   one doc per category: {_id, category_slug, group_ids: [...]}
  product_addon_groups    one doc per product:  {_id, product_id, group_ids: [...]}
                           Presence of a doc = override active (even an empty list means
                           "explicitly no add-ons"); absence = inherit from the product's
                           category. A newly-synced Oracle product therefore inherits its
                           category's add-ons automatically -- no sync-time code needed,
                           resolution happens at read time.

Deleting a group/item in server.py: hard-deletes and cleans up dangling group_ids out of
category_addon_groups/product_addon_groups -- UNLESS it's referenced by a past order, in
which case it's deactivated (is_active=False) instead, never hard-deleted, so admin
tooling can still resolve historical order lines back to a real group/item record.
"""
from datetime import datetime, timezone
from typing import List, Literal, Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, field_validator


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def clean(doc):
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


# ============================== Models ======================================

class AddonGroupIn(BaseModel):
    name_en: str
    name_ar: str
    selection_type: Literal["single", "multiple"] = "single"  # radio | checkboxes
    is_required: bool = False
    display_order: int = 0
    is_active: bool = True


class AddonItemIn(BaseModel):
    model_config = ConfigDict(coerce_numbers_to_str=True)
    group_id: str
    name_en: str
    name_ar: str
    price: float = 0
    display_order: int = 0
    is_active: bool = True
    is_default: bool = False


class GroupIdsIn(BaseModel):
    group_ids: List[str] = []

    @field_validator("group_ids")
    @classmethod
    def _validate_object_ids(cls, v):
        for gid in v:
            if not ObjectId.is_valid(gid):
                raise ValueError(f"'{gid}' is not a valid add-on group id")
        return v


# ============================== Resolution ===================================

async def get_effective_group_ids(db, product) -> List[str]:
    """Product-level override (even if empty) wins; otherwise inherit from category."""
    pid = str(product.get("_id") or product.get("id"))
    override = await db.product_addon_groups.find_one({"product_id": pid})
    if override is not None:
        return override.get("group_ids", [])
    cat = await db.category_addon_groups.find_one({"category_slug": product.get("category")})
    return cat.get("group_ids", []) if cat else []


async def get_product_addons(db, product) -> list:
    """Public shape for the storefront: ordered list of active groups with active items.
    A group with no active items is dropped -- avoids showing an empty customization
    section. Returns [] when nothing is configured (frontend hides the section)."""
    group_ids = await get_effective_group_ids(db, product)
    if not group_ids:
        return []
    oids = [ObjectId(g) for g in group_ids if ObjectId.is_valid(g)]
    if not oids:
        return []
    groups = await db.addon_groups.find({"_id": {"$in": oids}, "is_active": True}).to_list(200)
    groups_by_id = {str(g["_id"]): g for g in groups}
    items = await db.addon_items.find(
        {"group_id": {"$in": list(groups_by_id.keys())}, "is_active": True}
    ).sort("display_order", 1).to_list(1000)
    items_by_group = {}
    for it in items:
        items_by_group.setdefault(it["group_id"], []).append(it)

    result = []
    for gid in group_ids:  # preserve the admin-configured order
        g = groups_by_id.get(gid)
        if not g:
            continue
        group_items = items_by_group.get(gid, [])
        if not group_items:
            continue
        result.append({
            "id": gid,
            "name_en": g["name_en"],
            "name_ar": g["name_ar"],
            "selection_type": g.get("selection_type", "single"),
            "is_required": g.get("is_required", False),
            "items": [{
                "id": str(it["_id"]),
                "name_en": it["name_en"],
                "name_ar": it["name_ar"],
                "price": it.get("price", 0),
                "is_default": it.get("is_default", False),
            } for it in group_items],
        })
    return result


async def compute_has_addons_set(db, items) -> set:
    """Cheap per-listing flag: which product ids (from a /products page of results)
    resolve to at least one configured add-on group. Two aggregate queries total,
    never one query per product."""
    cats_with_addons = set()
    async for c in db.category_addon_groups.find(
        {"group_ids": {"$exists": True, "$ne": []}}, {"category_slug": 1}
    ):
        cats_with_addons.add(c["category_slug"])

    pids = [str(i["id"]) for i in items]
    overrides = {}
    if pids:
        async for o in db.product_addon_groups.find({"product_id": {"$in": pids}}):
            overrides[o["product_id"]] = o.get("group_ids", [])

    result = set()
    for i in items:
        pid = str(i["id"])
        if pid in overrides:
            if overrides[pid]:
                result.add(pid)
        elif i.get("category") in cats_with_addons:
            result.add(pid)
    return result


async def resolve_selected_addons(db, product, addon_item_ids: Optional[List[str]]):
    """Re-derives price/validity of a customer's add-on selection from the DB -- the
    client's own prices/names are never trusted, same trust model as the base product
    price in server.py's _validate_items.

    Returns (lines, addon_total, errors):
      lines       list of {group_id, group_name_en, group_name_ar, item_id,
                  item_name_en, item_name_ar, price} -- stored on the order line.
      addon_total sum of selected item prices (per unit; multiplied by qty by the caller).
      errors      list of {reason, ...} -- non-empty means the selection is invalid
                  (unknown/inactive item, item not offered for this product, more than
                  one pick in a single-select group, or a required group left unpicked).
    """
    effective_group_ids = await get_effective_group_ids(db, product)
    if not effective_group_ids:
        return [], 0.0, []

    addon_item_ids = [str(i) for i in (addon_item_ids or [])]
    oids = [ObjectId(i) for i in addon_item_ids if ObjectId.is_valid(i)]
    docs = await db.addon_items.find({"_id": {"$in": oids}, "is_active": True}).to_list(200) if oids else []
    docs_by_id = {str(d["_id"]): d for d in docs}

    group_oids = [ObjectId(g) for g in effective_group_ids if ObjectId.is_valid(g)]
    groups = await db.addon_groups.find({"_id": {"$in": group_oids}}).to_list(200) if group_oids else []
    groups_by_id = {str(g["_id"]): g for g in groups}
    effective_set = set(effective_group_ids)

    errors = []
    lines = []
    selected_by_group = {}
    for iid in addon_item_ids:
        d = docs_by_id.get(iid)
        if not d or d["group_id"] not in effective_set:
            errors.append({"addon_item_id": iid, "reason": "addon_not_available"})
            continue
        g = groups_by_id.get(d["group_id"])
        selected_by_group.setdefault(d["group_id"], []).append(d)
        lines.append({
            "group_id": d["group_id"],
            "group_name_en": g["name_en"] if g else "",
            "group_name_ar": g["name_ar"] if g else "",
            "item_id": str(d["_id"]),
            "item_name_en": d["name_en"],
            "item_name_ar": d["name_ar"],
            "price": d.get("price", 0),
        })

    for gid, sel in selected_by_group.items():
        g = groups_by_id.get(gid)
        if g and g.get("selection_type") == "single" and len(sel) > 1:
            errors.append({"group_id": gid, "reason": "multiple_not_allowed"})

    for gid in effective_group_ids:
        g = groups_by_id.get(gid)
        if g and g.get("is_active", True) and g.get("is_required") and gid not in selected_by_group:
            errors.append({"group_id": gid, "reason": "required_not_selected"})

    addon_total = round(sum(l["price"] for l in lines), 3)
    return lines, addon_total, errors
