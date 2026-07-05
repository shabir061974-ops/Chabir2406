# Google Sheets PRODUCT_MASTER Integration

## Overview
This integrates Google Sheets with your Oracle PRODUCT_MASTER table, allowing you to:
- Sync product data from Oracle to Google Sheets
- Read products from Google Sheets
- Keep data synchronized

## Security Note ⚠️
**Never share Gmail passwords in plaintext.** This integration uses Google Service Accounts (secure API authentication) instead.

---

## Step 1: Create Google Cloud Project & Service Account

### 1a. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click "NEW PROJECT"
4. Name it: `Faiha E-Commerce`
5. Click "CREATE"

### 1b. Enable APIs
1. In the Cloud Console, go to **APIs & Services** > **Library**
2. Search for and enable:
   - **Google Sheets API**
   - **Google Drive API**

### 1c. Create Service Account
1. Go to **APIs & Services** > **Credentials**
2. Click **"+ CREATE CREDENTIALS"** > **Service Account**
3. Fill in:
   - Service account name: `faiha-sheets-sync`
   - Click "CREATE AND CONTINUE"
4. Grant roles (optional):
   - Skip this step, click "CONTINUE"
5. Click "CREATE KEY"
   - Choose **JSON**
   - Download the file (keep it safe!)

---

## Step 2: Obtain Credentials JSON

The JSON file you downloaded contains sensitive credentials. Save it as:
```
backend/google-credentials.json
```

**Never commit this file to git!** Add to `.gitignore`:
```
backend/google-credentials.json
```

---

## Step 3: Create the Google Sheet

Run the setup script:

```bash
cd backend
python setup_google_sheets.py ./google-credentials.json
```

This will:
- Create a new Google Sheet named "Faiha PRODUCT_MASTER"
- Add proper column headers
- Format the headers (bold, blue background)
- Set column widths
- Print the Sheet ID

**Output example:**
```
Sheet ID:  1a2b3c4d5e6f7g8h9i0j
Sheet URL: https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j
```

---

## Step 4: Configure Environment Variables

Update `.env` file with:

```env
# Google Sheets Configuration
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEET_ID=<your-sheet-id-from-step-3>
GOOGLE_CREDENTIALS_PATH=./google-credentials.json
```

---

## Step 5: Update Backend Code

The `google_sheets_repo.py` module is ready to use. Add to your `server.py`:

```python
import google_sheets_repo

# In startup function:
@app.on_event("startup")
async def startup():
    oracle_repo.init_pool()
    google_sheets_repo.init_sheets()  # ← Add this
    # ... rest of startup code
```

---

## Usage Examples

### Sync Oracle Products to Google Sheets

```python
import oracle_repo
import google_sheets_repo

# Get products from Oracle
products = oracle_repo.list_products()

# Sync to Google Sheets
google_sheets_repo.sync_from_oracle(products)
```

### Read from Google Sheets

```python
import google_sheets_repo

products = google_sheets_repo.list_products_from_sheets()
for p in products:
    print(p)
```

### Append a Single Product

```python
import google_sheets_repo

product = {
    "PRODUCT_ID": "123",
    "CATEGORY": "Groceries",
    "ITEM_NAME": "Fresh Milk",
    "BARCODE": "1234567890",
    "PRICE": 1.250,
    "AVAILABLE_QUANTITY": 50,
    "CREATED_DATE": "2026-07-05",
    "UPDATED_DATE": "2026-07-05",
}

google_sheets_repo.append_product(product)
```

### Create New Sheet Programmatically

```python
import google_sheets_repo

sheet_id = google_sheets_repo.create_sheet("PRODUCT_BACKUP")
print(f"Created sheet: {sheet_id}")
```

---

## API Endpoints (Optional)

You can add endpoints to sync via HTTP:

```python
@api.post("/admin/sync/oracle-to-sheets")
async def sync_oracle_to_sheets(admin: dict = Depends(require_admin)):
    """Sync Oracle products to Google Sheets."""
    products = oracle_repo.list_products()
    success = google_sheets_repo.sync_from_oracle(products)
    return {"success": success, "products_synced": len(products)}


@api.get("/admin/sync/sheets-to-api")
async def sync_sheets_to_api(admin: dict = Depends(require_admin)):
    """Read products from Google Sheets."""
    products = google_sheets_repo.list_products_from_sheets()
    return {"products": products, "count": len(products)}
```

---

## Troubleshooting

### "GOOGLE_CREDENTIALS_PATH not set"
- Add `GOOGLE_CREDENTIALS_PATH` to your `.env` file

### "Cannot access Google Sheet"
- Verify the Sheet ID is correct
- Make sure the service account has access to the sheet
- Check that the service account was added as an editor

### "Credentials file not found"
- Ensure `google-credentials.json` is in the `backend/` directory
- Use absolute path if relative path doesn't work

### "403 Permission Denied"
- The service account needs access to the sheet
- Add the service account email (from JSON file) to the sheet as an editor
- Or create the sheet while authenticated as that service account

### Rate Limiting
- Google Sheets API has quotas (500 requests/100 seconds per user)
- Batch operations when syncing large datasets
- Use caching between sync operations

---

## Security Best Practices

✅ **DO:**
- Store credentials JSON outside git
- Use service accounts for automation
- Rotate credentials periodically
- Use environment variables for secrets
- Restrict sheet access to needed users

❌ **DON'T:**
- Share credentials JSON files
- Commit credentials to git
- Use personal Gmail accounts
- Store passwords in code
- Share credentials in chat/email

---

## Testing

Test the integration:

```bash
cd backend

# Test sheet creation
python setup_google_sheets.py ./google-credentials.json

# Test in Python REPL
python
>>> import google_sheets_repo
>>> google_sheets_repo.init_sheets()
>>> google_sheets_repo.is_available()
True
>>> products = google_sheets_repo.list_products_from_sheets()
```

---

## Files Created

- `google_sheets_repo.py` - Main integration module
- `setup_google_sheets.py` - Setup script
- `GOOGLE_SHEETS_SETUP.md` - This file (documentation)

---

## Next Steps

1. ✅ Create Google Cloud Project
2. ✅ Download credentials JSON
3. ✅ Run setup script
4. ✅ Update .env file
5. ✅ Integrate with server.py
6. ✅ Test the connection
7. ✅ Set up sync schedule (optional)

---

## Support

For issues:
- Check Google Cloud Console for API errors
- Review service account permissions
- Verify .env configuration
- Check logs in `google_sheets_repo.py`
