"""Google Sheets PRODUCT_MASTER integration.

Syncs product data from Oracle PRODUCT_MASTER to a Google Sheet.
Uses service account authentication for secure API access.
"""
import os
import logging
import json
from typing import List, Dict, Optional
from datetime import datetime, timezone

logger = logging.getLogger("google_sheets")

_sheets_service = None
_drive_service = None
_sheet_id = None
_available = False

PRODUCT_MASTER_HEADERS = [
    "PRODUCT_ID",
    "CATEGORY",
    "ITEM_NAME",
    "BARCODE",
    "PRICE",
    "AVAILABLE_QUANTITY",
    "CREATED_DATE",
    "UPDATED_DATE",
]


def init_sheets():
    """Initialize Google Sheets and Drive API with service account credentials."""
    global _sheets_service, _drive_service, _sheet_id, _available

    if os.environ.get("GOOGLE_SHEETS_ENABLED", "false").lower() != "true":
        logger.info("Google Sheets disabled via env.")
        return False

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        creds_path = os.environ.get("GOOGLE_CREDENTIALS_PATH")
        if not creds_path:
            logger.warning("GOOGLE_CREDENTIALS_PATH not set. Google Sheets disabled.")
            return False

        if not os.path.exists(creds_path):
            logger.warning("Credentials file not found at %s", creds_path)
            return False

        credentials = service_account.Credentials.from_service_account_file(
            creds_path,
            scopes=[
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive",
            ],
        )

        _sheets_service = build("sheets", "v4", credentials=credentials)
        _drive_service = build("drive", "v3", credentials=credentials)
        _sheet_id = os.environ.get("GOOGLE_SHEET_ID")

        if not _sheet_id:
            logger.warning("GOOGLE_SHEET_ID not set. Google Sheets disabled.")
            return False

        # Verify access to the sheet
        try:
            _sheets_service.spreadsheets().get(spreadsheetId=_sheet_id).execute()
            _available = True
            logger.info("Google Sheets initialized and accessible (Sheet ID: %s)", _sheet_id[:20] + "...")
            return True
        except Exception as e:
            logger.warning("Cannot access Google Sheet (%s). Disabling Google Sheets.", repr(e)[:160])
            return False

    except Exception as e:
        _available = False
        logger.warning("Google Sheets initialization failed (%s). Disabling.", repr(e)[:160])
        return False


def is_available():
    """Check if Google Sheets is available and authenticated."""
    return _available


def create_sheet(sheet_name: str = "PRODUCT_MASTER") -> Optional[str]:
    """Create a new Google Sheet with PRODUCT_MASTER structure.

    Returns the spreadsheet ID if successful, None otherwise.
    """
    if not _drive_service or not _sheets_service:
        logger.error("Google Sheets not initialized")
        return None

    try:
        # Create new spreadsheet
        spreadsheet = {
            "properties": {
                "title": f"Faiha {sheet_name}",
                "locale": "en_US",
                "autoRecalc": "ON_CHANGE",
                "timeZone": "Asia/Kuwait",
            }
        }

        result = _sheets_service.spreadsheets().create(body=spreadsheet).execute()
        new_sheet_id = result.get("spreadsheetId")

        # Share with the service account's owner email (optional, for visibility)
        _drive_service.permissions().create(
            fileId=new_sheet_id,
            body={"role": "reader", "type": "anyone"},
        ).execute()

        # Add headers
        _sheets_service.spreadsheets().values().append(
            spreadsheetId=new_sheet_id,
            range="Sheet1!A1",
            valueInputOption="RAW",
            body={"values": [PRODUCT_MASTER_HEADERS]},
        ).execute()

        logger.info("Created Google Sheet: %s (ID: %s)", sheet_name, new_sheet_id)
        return new_sheet_id

    except Exception as e:
        logger.error("Failed to create Google Sheet: %s", repr(e)[:160])
        return None


def sync_from_oracle(oracle_products: List[Dict]) -> bool:
    """Sync Oracle products to Google Sheets.

    Args:
        oracle_products: List of product dicts from oracle_repo.list_products()

    Returns:
        True if sync successful, False otherwise.
    """
    if not _available or not _sheets_service:
        return False

    if not oracle_products:
        logger.info("No products to sync")
        return True

    try:
        # Transform Oracle format to Google Sheets rows
        rows = []
        for p in oracle_products:
            rows.append([
                p.get("id", ""),
                p.get("category_raw", ""),
                p.get("name_en", ""),
                p.get("barcode", ""),
                p.get("price", 0),
                p.get("stock", 0),
                p.get("created_date", ""),
                p.get("updated_date", datetime.now(timezone.utc).isoformat()),
            ])

        # Clear existing data (keep headers)
        _sheets_service.spreadsheets().values().clear(
            spreadsheetId=_sheet_id,
            range="Sheet1!A2:H",
        ).execute()

        # Append new data
        _sheets_service.spreadsheets().values().append(
            spreadsheetId=_sheet_id,
            range="Sheet1!A2",
            valueInputOption="RAW",
            body={"values": rows},
        ).execute()

        logger.info("Synced %d products to Google Sheets", len(rows))
        return True

    except Exception as e:
        logger.error("Failed to sync products: %s", repr(e)[:160])
        return False


def list_products_from_sheets() -> List[Dict]:
    """Read products from Google Sheets and return as list of dicts.

    Returns:
        List of product dictionaries matching the PRODUCT_MASTER schema.
    """
    if not _available or not _sheets_service:
        return []

    try:
        result = _sheets_service.spreadsheets().values().get(
            spreadsheetId=_sheet_id,
            range="Sheet1",
        ).execute()

        rows = result.get("values", [])
        if not rows or len(rows) < 2:
            return []

        headers = rows[0]
        products = []

        for row in rows[1:]:
            if len(row) < len(PRODUCT_MASTER_HEADERS):
                continue

            product = {}
            for i, header in enumerate(PRODUCT_MASTER_HEADERS):
                product[header] = row[i] if i < len(row) else ""
            products.append(product)

        logger.info("Read %d products from Google Sheets", len(products))
        return products

    except Exception as e:
        logger.error("Failed to read products from sheets: %s", repr(e)[:160])
        return []


def append_product(product: Dict) -> bool:
    """Append a single product to Google Sheets.

    Args:
        product: Product dict with keys matching PRODUCT_MASTER_HEADERS

    Returns:
        True if successful, False otherwise.
    """
    if not _available or not _sheets_service:
        return False

    try:
        row = [product.get(h, "") for h in PRODUCT_MASTER_HEADERS]

        _sheets_service.spreadsheets().values().append(
            spreadsheetId=_sheet_id,
            range="Sheet1!A:H",
            valueInputOption="RAW",
            body={"values": [row]},
        ).execute()

        logger.info("Appended product: %s", product.get("ITEM_NAME", ""))
        return True

    except Exception as e:
        logger.error("Failed to append product: %s", repr(e)[:160])
        return False


def close():
    """Cleanup resources."""
    global _sheets_service, _drive_service, _available
    _sheets_service = None
    _drive_service = None
    _available = False
