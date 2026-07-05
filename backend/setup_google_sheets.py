#!/usr/bin/env python3
"""
Setup script to create Google Sheet for PRODUCT_MASTER.

Steps:
1. Create a Google Cloud Project
2. Create a Service Account
3. Download the JSON credentials
4. Run this script to create the sheet

Usage:
    python setup_google_sheets.py <path-to-credentials-json>
"""
import sys
import os
import json
from pathlib import Path
import io

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def setup_google_sheets(credentials_path: str) -> dict:
    """Create a new Google Sheet for PRODUCT_MASTER.

    Args:
        credentials_path: Path to Google service account JSON file

    Returns:
        Dict with sheet_id and sheet_url
    """
    if not os.path.exists(credentials_path):
        print(f"❌ Credentials file not found: {credentials_path}")
        return None

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        print("❌ Google libraries not installed. Run: pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client")
        return None

    try:
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=[
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive",
            ],
        )

        sheets_service = build("sheets", "v4", credentials=credentials)
        drive_service = build("drive", "v3", credentials=credentials)

        # Create spreadsheet
        print("📝 Creating Google Sheet...")
        spreadsheet = {
            "properties": {
                "title": "Faiha PRODUCT_MASTER",
                "locale": "en_US",
                "autoRecalc": "ON_CHANGE",
                "timeZone": "Asia/Kuwait",
            }
        }

        result = sheets_service.spreadsheets().create(body=spreadsheet).execute()
        sheet_id = result.get("spreadsheetId")
        print(f"✅ Created sheet: {sheet_id}")

        # Add headers
        print("📋 Adding headers...")
        headers = [
            "PRODUCT_ID",
            "CATEGORY",
            "ITEM_NAME",
            "BARCODE",
            "PRICE",
            "AVAILABLE_QUANTITY",
            "CREATED_DATE",
            "UPDATED_DATE",
        ]

        sheets_service.spreadsheets().values().append(
            spreadsheetId=sheet_id,
            range="Sheet1!A1",
            valueInputOption="RAW",
            body={"values": [headers]},
        ).execute()
        print("✅ Headers added")

        # Format header row (bold, colored background)
        print("🎨 Formatting headers...")
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=sheet_id,
            body={
                "requests": [
                    {
                        "repeatCell": {
                            "range": {"sheetId": 0, "startRowIndex": 0, "endRowIndex": 1},
                            "cell": {
                                "userEnteredFormat": {
                                    "textFormat": {"bold": True, "fontSize": 11},
                                    "backgroundColor": {"red": 0.2, "green": 0.4, "blue": 0.7},
                                    "textFormat": {"foregroundColor": {"red": 1, "green": 1, "blue": 1}},
                                }
                            },
                            "fields": "userEnteredFormat",
                        }
                    }
                ]
            },
        ).execute()

        # Set column widths
        print("📐 Setting column widths...")
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=sheet_id,
            body={
                "requests": [
                    {
                        "updateDimensionProperties": {
                            "range": {"sheetId": 0, "dimension": "COLUMNS", "startIndex": i, "endIndex": i + 1},
                            "properties": {"pixelSize": width},
                            "fields": "pixelSize",
                        }
                    }
                    for i, width in enumerate([100, 120, 150, 120, 80, 100, 150, 150])
                ]
            },
        ).execute()

        # Make sheet readable by the owner (optional)
        print("🔐 Setting permissions...")
        try:
            drive_service.permissions().create(
                fileId=sheet_id,
                body={
                    "role": "reader",
                    "type": "user",
                    "emailAddress": "alfaihacoop26@gmail.com",
                },
            ).execute()
        except:
            pass  # Permissions might fail, but sheet is created

        sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}"

        print("\n" + "=" * 60)
        print("✅ SETUP COMPLETE!")
        print("=" * 60)
        print(f"Sheet ID:  {sheet_id}")
        print(f"Sheet URL: {sheet_url}")
        print("\n📝 Add these to your .env file:")
        print(f"GOOGLE_SHEETS_ENABLED=true")
        print(f"GOOGLE_SHEET_ID={sheet_id}")
        print(f"GOOGLE_CREDENTIALS_PATH=<path-to-your-credentials-json>")
        print("=" * 60)

        return {
            "sheet_id": sheet_id,
            "sheet_url": sheet_url,
            "credentials_path": credentials_path,
        }

    except Exception as e:
        print(f"❌ Error: {repr(e)}")
        return None


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python setup_google_sheets.py <path-to-credentials.json>")
        print("\nExample:")
        print("  python setup_google_sheets.py ./google-credentials.json")
        sys.exit(1)

    creds_path = sys.argv[1]
    result = setup_google_sheets(creds_path)

    if result:
        print("\n✨ You can now sync Oracle products to Google Sheets!")
        sys.exit(0)
    else:
        sys.exit(1)
