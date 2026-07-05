# Google Sheets Integration - Quick Start

## What Was Created

✅ **`google_sheets_repo.py`** (211 lines)
- Module similar to `oracle_repo.py` for Google Sheets operations
- Functions: `init_sheets()`, `sync_from_oracle()`, `list_products_from_sheets()`, `append_product()`, etc.

✅ **`setup_google_sheets.py`** (161 lines)
- Automated script to create Google Sheet with proper structure
- Formats headers, sets column widths, manages permissions

✅ **`GOOGLE_SHEETS_SETUP.md`**
- Comprehensive setup guide with step-by-step instructions
- Troubleshooting section
- Security best practices

✅ **Updated `requirements.txt`**
- Added `google-auth-oauthlib` for proper authentication

---

## Quick Setup (3 Steps)

### Step 1: Create Service Account (5 minutes)
```
Go to: https://console.cloud.google.com/
1. Create new project: "Faiha E-Commerce"
2. Enable APIs: Google Sheets API + Google Drive API
3. Create Service Account
4. Generate and download JSON credentials
5. Save as: backend/google-credentials.json
```

### Step 2: Create the Sheet (1 minute)
```bash
cd backend
python setup_google_sheets.py ./google-credentials.json
```

Copy the `GOOGLE_SHEET_ID` from output.

### Step 3: Configure .env (30 seconds)
```env
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEET_ID=<paste-id-from-step-2>
GOOGLE_CREDENTIALS_PATH=./google-credentials.json
```

---

## Issues Fixed

| Issue | Solution |
|-------|----------|
| ❌ No Google authentication | ✅ Service Account JSON credentials |
| ❌ No sheet structure | ✅ Auto-created with headers |
| ❌ Data format mismatch | ✅ Transform Oracle → Sheets format |
| ❌ No error handling | ✅ Try-catch, logging, fallback to MongoDB |
| ❌ No rate limiting | ✅ Built-in quota handling |
| ❌ Credentials exposed | ✅ Secure service account method |

---

## Integration with Your Backend

Add to `server.py` startup:

```python
import google_sheets_repo

@app.on_event("startup")
async def startup():
    oracle_repo.init_pool()
    google_sheets_repo.init_sheets()  # ← Add this line
    await db.users.create_index("email", unique=True)
    # ... rest of code
```

---

## Usage Examples

### Sync Oracle → Google Sheets
```python
products = oracle_repo.list_products()
google_sheets_repo.sync_from_oracle(products)
```

### Read from Google Sheets
```python
products = google_sheets_repo.list_products_from_sheets()
```

### Add to Checkout Flow
The Oracle integration already merges products. Google Sheets follows the same pattern.

---

## Column Mapping

| Oracle PRODUCT_MASTER | Google Sheet | Type |
|----------------------|--------------|------|
| PRODUCT_ID | PRODUCT_ID | String |
| CATEGORY | CATEGORY | String |
| ITEM_NAME | ITEM_NAME | String |
| BARCODE | BARCODE | String |
| PRICE | PRICE | Number |
| AVAILABLE_QUANTITY | AVAILABLE_QUANTITY | Number |
| CREATED_DATE | CREATED_DATE | Date |
| UPDATED_DATE | UPDATED_DATE | Date |

---

## Verify It Works

```bash
python
>>> import google_sheets_repo
>>> google_sheets_repo.init_sheets()
True  # ✅ Connected
>>> google_sheets_repo.is_available()
True  # ✅ Sheet accessible
```

---

## Next: Optional Admin Endpoints

Add to `server.py` for manual sync via UI:

```python
@api.post("/admin/sync/oracle-to-sheets")
async def sync_oracle_to_sheets(admin: dict = Depends(require_admin)):
    """Sync Oracle products to Google Sheets."""
    if not google_sheets_repo.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets not available")
    products = oracle_repo.list_products()
    success = google_sheets_repo.sync_from_oracle(products)
    return {"success": success, "products_synced": len(products)}
```

---

## Security Checklist

- [ ] `google-credentials.json` in `.gitignore`
- [ ] Never commit credentials to git
- [ ] Use service account (not personal Gmail)
- [ ] Restrict sheet access to needed users
- [ ] Store `GOOGLE_CREDENTIALS_PATH` in `.env` (not hardcoded)
- [ ] Change the Gmail password you shared earlier
- [ ] Rotate service account keys regularly

---

## Troubleshooting

**Sheet not found?**
- Verify `GOOGLE_SHEET_ID` in `.env`

**Authentication fails?**
- Check credentials JSON file exists
- Verify file is readable

**Permission denied?**
- Add service account email to sheet editors
- Check API quotas in Cloud Console

**Empty sheet?**
- Run `google_sheets_repo.sync_from_oracle(oracle_repo.list_products())`

---

## Files Modified

```
backend/
├── google_sheets_repo.py          (NEW - 211 lines)
├── setup_google_sheets.py         (NEW - 161 lines)
├── GOOGLE_SHEETS_SETUP.md         (NEW - Full guide)
├── GOOGLE_SHEETS_QUICK_START.md   (NEW - This file)
├── requirements.txt               (UPDATED - Added google-auth-oauthlib)
└── .env                          (TO UPDATE - Add 3 vars)
```

---

## Questions?

1. Read `GOOGLE_SHEETS_SETUP.md` for detailed explanations
2. Check logs in `google_sheets_repo.py` for errors
3. Verify Google Cloud Console settings
4. Test connection with Python REPL

---

**Status: ✅ Ready to Deploy**

All code is in place. You just need:
1. Google Service Account credentials
2. Run setup script
3. Add 3 lines to .env
4. Optional: add to server.py startup
