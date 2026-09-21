"""Public sitemap.xml generation.

Pure logic module (mirrors addons.py / oracle_repo.py): server.py owns the actual
FastAPI route (GET /api/sitemap.xml, proxied at the public https://.../sitemap.xml
by frontend/nginx.conf) and calls into this module for the Mongo access + XML
building. Kept separate so the XML-building logic is unit-testable without a
database.

Active-only rule mirrors GET /api/products exactly (see get_products in server.py):
a product is listed only if its own is_active flag is true AND its category's
is_active flag is true -- same two collections (products_local, categories) and
the same predicate, so this sitemap can never disagree with the live catalog
about what counts as "active". (The product query below applies that predicate
in a single Mongo query via `category: {"$in": active_slugs}` rather than
server.py's fetch-all-then-filter-in-Python shape, so the SITEMAP_URL_LIMIT cap
is applied AFTER filtering, not before -- see _fetch_active_product_ids.)
Out-of-stock products ARE included (matches the storefront's own policy of
keeping out-of-stock product pages live rather than hiding them).

/track is intentionally excluded from STATIC_PAGES (no unique SEO metadata yet).
Admin/checkout/account/order/payment/api paths are never reachable here at all --
this module only ever builds URLs from BASE_URL + STATIC_PAGES, active category
slugs, or active product ids.

Product ids and category slugs are sorted before the XML is built, so the
document is byte-for-byte identical run to run and worker to worker for the
same underlying data -- Mongo's natural document order is not guaranteed
stable across connections/workers and must not leak into the output.
"""
import logging
import time
from xml.etree.ElementTree import Element, SubElement, tostring

logger = logging.getLogger("faiha")

BASE_URL = "https://www.faihacoopkw.com"

# https://www.sitemaps.org/protocol.html hard limit: a sitemap file must not
# contain more than 50,000 URLs. Static pages + category pages + product pages
# together must stay within this.
SITEMAP_URL_LIMIT = 50000

# Hand-verified against frontend/src/App.js routes. Keep in sync manually if
# routes change -- this list is deliberately small and static.
STATIC_PAGES = [
    ("/", "daily", "1.0"),
    ("/products", "daily", "0.9"),
    ("/about", "monthly", "0.7"),
    ("/contact", "monthly", "0.7"),
    ("/privacy", "yearly", "0.3"),
    ("/terms", "yearly", "0.3"),
]

_CACHE_TTL_SECONDS = 1800  # 30 minutes
_cache = {"xml": None, "generated_at": 0.0}


def build_sitemap_xml(category_slugs, product_ids):
    """Pure XML builder -- no DB access, safe to unit test directly.

    ElementTree.tostring() escapes element text automatically, so a slug or id
    can never produce malformed or injected XML.
    """
    urlset = Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

    def add_url(path, changefreq, priority):
        u = SubElement(urlset, "url")
        SubElement(u, "loc").text = f"{BASE_URL}{path}"
        SubElement(u, "changefreq").text = changefreq
        SubElement(u, "priority").text = priority

    for path, changefreq, priority in STATIC_PAGES:
        add_url(path, changefreq, priority)
    for slug in sorted(category_slugs):
        add_url(f"/category/{slug}", "daily", "0.8")
    for pid in sorted(product_ids):
        add_url(f"/product/{pid}", "daily", "0.6")

    return '<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(urlset, encoding="unicode")


async def _fetch_active_category_slugs(db):
    # Mirrors get_products() in server.py:
    #   active_slugs = {c["slug"] for c in await db.categories.find({"is_active": True}, {"slug": 1}).to_list(500)}
    cats = await db.categories.find({"is_active": True}, {"slug": 1}).to_list(500)
    return {c["slug"] for c in cats if c.get("slug")}


async def _fetch_active_product_ids(db, active_slugs, limit):
    # Same predicate as get_products() in server.py -- is_active AND category in
    # the active-category set -- applied directly in the query (rather than
    # server.py's fetch-then-Python-filter) so `limit` bounds the number of
    # already-filtered documents returned, never a superset that then gets
    # trimmed before filtering. That keeps the SITEMAP_URL_LIMIT cap accurate
    # even if the catalog someday grows into the tens of thousands.
    if limit <= 0:
        return []
    query = {"is_active": True, "category": {"$in": sorted(active_slugs)}}
    # Sort by _id at the database level (not just the Python-side sorted() in
    # build_sitemap_xml) so that once the catalog exceeds `limit`, every worker's
    # to_list(limit) truncates the SAME subset -- otherwise an unsorted cursor's
    # natural order isn't guaranteed stable across workers/connections, and two
    # workers could each pick a different (correctly-ordered) slice of documents.
    cursor = db.products_local.find(query, {"_id": 1}).sort("_id", 1)
    docs = await cursor.to_list(limit)
    return [str(d["_id"]) for d in docs]


async def get_sitemap_xml(db):
    """Returns cached/fresh sitemap XML. Never raises: on any DB failure it logs
    and falls back to the last known-good XML, or a static-only skeleton if
    nothing has ever been generated successfully yet.
    """
    now = time.time()
    if _cache["xml"] and (now - _cache["generated_at"]) < _CACHE_TTL_SECONDS:
        return _cache["xml"]

    try:
        active_slugs = await _fetch_active_category_slugs(db)
        # Reserve room for the static pages and category pages first, then give
        # every remaining slot (up to the 50,000 protocol limit) to products.
        product_limit = SITEMAP_URL_LIMIT - len(STATIC_PAGES) - len(active_slugs)
        product_ids = await _fetch_active_product_ids(db, active_slugs, product_limit)
        xml = build_sitemap_xml(active_slugs, product_ids)
        _cache["xml"] = xml
        _cache["generated_at"] = now
        return xml
    except Exception:
        logger.exception("sitemap: generation failed, serving fallback")
        if _cache["xml"]:
            return _cache["xml"]
        return build_sitemap_xml([], [])
