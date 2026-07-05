# Google Sheets Integration - Implementation Steps

## STEP 1: Create Google Cloud Project

### 1.1 Go to Google Cloud Console
```
URL: https://console.cloud.google.com/
```

### 1.2 Create New Project
- Click the **project dropdown** at the top (near your name)
- Click **"NEW PROJECT"**
- Project name: `Faiha E-Commerce`
- Click **"CREATE"** (wait 30 seconds)

### 1.3 Verify Project Created
- Top dropdown should now show "Faiha E-Commerce"
- You're now in your new project

---

## STEP 2: Enable Required APIs

### 2.1 Open APIs Library
- Left menu → **APIs & Services** → **Library**

### 2.2 Enable Google Sheets API
- Search: `google sheets api`
- Click **Google Sheets API** result
- Click **ENABLE** button
- Wait for confirmation

### 2.3 Enable Google Drive API
- Search: `google drive api`
- Click **Google Drive API** result
- Click **ENABLE** button
- Wait for confirmation

**Status:** ✅ Both APIs enabled

---

## STEP 3: Create Service Account

### 3.1 Go to Credentials
- Left menu → **APIs & Services** → **Credentials**

### 3.2 Create Service Account
- Click **"+ CREATE CREDENTIALS"** (top button)
- Select **"Service Account"**

### 3.3 Fill Service Account Form

**Page 1: Service account details**
- Service account name: `faiha-sheets-sync`
- Service account ID: (auto-filled, keep default)
- Service account description: `Syncs Faiha products to Google Sheets`
- Click **"CREATE AND CONTINUE"**

**Page 2: Grant this service account access to project**
- Select role: `Editor` (or `Basic > Editor`)
- Click **"CONTINUE"**

**Page 3: Grant users access to this service account**
- Skip (click **"DONE"**)

### 3.4 Verify Service Account Created
- You should be back at Credentials page
- Under "Service Accounts" section, you should see `faiha-sheets-sync`

**Status:** ✅ Service account created

---

## STEP 4: Generate & Download JSON Credentials

### 4.1 Click Service Account
- Under "Service Accounts", click `faiha-sheets-sync`

### 4.2 Go to Keys Tab
- Click **"KEYS"** tab (top of page)

### 4.3 Create JSON Key
- Click **"Add Key"** → **"Create new key"**
- Select **JSON**
- Click **"CREATE"**
- Browser will auto-download a JSON file
- **Save this file!**

### 4.4 Move JSON to Project
```bash
# The downloaded file is named something like:
# faiha-e-commerce-abc123def456.json

# Move it to your backend folder:
Move-Item "C:\Users\<YOUR_USER>\Downloads\faiha-e-commerce-*.json" `
          "d:\FaihaWebsite\Emergent\Chabir2406\backend\google-credentials.json"
```

Or simply copy/paste via File Explorer.

### 4.5 Verify File
```bash
cd d:\FaihaWebsite\Emergent\Chabir2406\backend
ls google-credentials.json  # Should show the file
```

**Status:** ✅ Credentials downloaded and saved

---

## STEP 5: Run Setup Script

### 5.1 Open Terminal
```bash
cd d:\FaihaWebsite\Emergent\Chabir2406\backend
```

### 5.2 Install Dependencies (if needed)
```bash
pip install -r requirements.txt
```

### 5.3 Run Setup Script
```bash
python setup_google_sheets.py ./google-credentials.json
```

### 5.4 Expected Output
```
📝 Creating Google Sheet...
✅ Created sheet: 1a2b3c4d5e6f7g8h9i0j
📋 Adding headers...
✅ Headers added
🎨 Formatting headers...
✅ Formatted
📐 Setting column widths...
✅ Set column widths
🔐 Setting permissions...

============================================================
✅ SETUP COMPLETE!
============================================================
Sheet ID:  1a2b3c4d5e6f7g8h9i0j
Sheet URL: https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j

📝 Add these to your .env file:
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEET_ID=1a2b3c4d5e6f7g8h9i0j
GOOGLE_CREDENTIALS_PATH=./google-credentials.json
============================================================
```

**⚠️ IMPORTANT:** Copy the `GOOGLE_SHEET_ID` value (1a2b3c4d5e6f7g8h9i0j in example)

**Status:** ✅ Google Sheet created

---

## STEP 6: Update .env File

### 6.1 Open .env File
```bash
# Open with your editor:
# d:\FaihaWebsite\Emergent\Chabir2406\backend\.env
```

### 6.2 Add Google Sheets Config
Paste at the end of the file:

```env
# Google Sheets Configuration
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEET_ID=1a2b3c4d5e6f7g8h9i0j
GOOGLE_CREDENTIALS_PATH=./google-credentials.json
```

**Replace `1a2b3c4d5e6f7g8h9i0j` with your actual GOOGLE_SHEET_ID from Step 5**

### 6.3 Save File

**Status:** ✅ Environment configured

---

## STEP 7: Add .gitignore Entry

### 7.1 Open .gitignore
```bash
# If no .gitignore exists, create one
```

### 7.2 Add Credentials
```
# Google Sheets credentials (NEVER commit)
backend/google-credentials.json
```

**Status:** ✅ Credentials protected from git

---

## STEP 8: Integrate with Backend (Optional)

### 8.1 Update server.py
Open `d:\FaihaWebsite\Emergent\Chabir2406\backend\server.py`

Find this section (around line 22):
```python
import oracle_repo
import seed_data
```

Add this line:
```python
import oracle_repo
import google_sheets_repo  # ← ADD THIS
import seed_data
```

### 8.2 Update Startup Function
Find the `@app.on_event("startup")` function (around line 823).

Update it to:
```python
@app.on_event("startup")
async def startup():
    oracle_repo.init_pool()
    google_sheets_repo.init_sheets()  # ← ADD THIS LINE
    await db.users.create_index("email", unique=True)
    # ... rest of code
```

### 8.3 Update Shutdown Function
Find `@app.on_event("shutdown")` (around line 836).

Update to:
```python
@app.on_event("shutdown")
async def shutdown():
    oracle_repo.close_pool()
    google_sheets_repo.close()  # ← ADD THIS LINE
    client.close()
```

### 8.4 Save File

**Status:** ✅ Backend integrated

---

## STEP 9: Test Connection

### 9.1 Python REPL Test
```bash
cd backend
python
```

```python
>>> import google_sheets_repo
>>> google_sheets_repo.init_sheets()
True

>>> google_sheets_repo.is_available()
True

>>> print("✅ Connection successful!")
```

If you see `True` for both, you're good! ✅

### 9.2 Check Google Sheet
- Go to your Sheet URL (from Step 5)
- You should see 8 column headers (blue background)
- PRODUCT_ID, CATEGORY, ITEM_NAME, BARCODE, PRICE, AVAILABLE_QUANTITY, CREATED_DATE, UPDATED_DATE

**Status:** ✅ Connection verified

---

## STEP 10: Sync Oracle Products (Optional)

### 10.1 Sync Products
```python
>>> import oracle_repo
>>> import google_sheets_repo
>>> 
>>> # Get products from Oracle
>>> products = oracle_repo.list_products()
>>> print(f"Found {len(products)} products")
>>>
>>> # Sync to Google Sheets
>>> google_sheets_repo.sync_from_oracle(products)
True
>>>
>>> print("✅ Sync complete!")
```

### 10.2 Verify in Google Sheets
- Refresh your Sheet URL (Step 5)
- You should see products in rows below the headers
- Each row = 1 product with all 8 columns filled

**Status:** ✅ Data synchronized

---

## STEP 11: Start Backend

### 11.1 Run Backend
```bash
cd backend
python -m uvicorn server:app --reload
```

### 11.2 Check Logs
You should see:
```
Google Sheets initialized and accessible (Sheet ID: 1a2b...)
```

### 11.3 API Endpoint
Test the root endpoint:
```bash
curl http://localhost:8000/api/
# Should show:
# {"message": "Faiha Co-operative API", "oracle": false, "google_sheets": true}
```

**Status:** ✅ Backend running with Google Sheets

---

## Troubleshooting

### Error: "Credentials file not found"
- ✅ Verify file exists: `d:\FaihaWebsite\Emergent\Chabir2406\backend\google-credentials.json`
- ✅ Check file name spelling exactly matches

### Error: "GOOGLE_SHEET_ID not set"
- ✅ Check .env has: `GOOGLE_SHEET_ID=<your-id>`
- ✅ No quotes around the ID

### Error: "Cannot access Google Sheet"
- ✅ Verify Sheet ID in .env matches output from Step 5
- ✅ Check credentials JSON is valid (not corrupted)
- ✅ Refresh Google Cloud Console to verify service account exists

### Error: "403 Permission Denied"
- ✅ The service account needs access to the sheet
- ✅ In Google Sheet, click Share
- ✅ Add service account email: (visible in google-credentials.json as "client_email")
- ✅ Give "Editor" permission

### Sheet Empty After Sync
- ✅ Check Oracle is enabled and has data
- ✅ Run sync again: `google_sheets_repo.sync_from_oracle(oracle_repo.list_products())`

---

## Verification Checklist

- [ ] Google Cloud Project created
- [ ] Google Sheets API enabled
- [ ] Google Drive API enabled
- [ ] Service account created
- [ ] JSON credentials downloaded
- [ ] `google-credentials.json` saved in backend folder
- [ ] `setup_google_sheets.py` ran successfully
- [ ] Sheet ID copied from output
- [ ] `.env` file updated with 3 variables
- [ ] `server.py` updated (optional)
- [ ] `.gitignore` updated
- [ ] Python test passed (both `True`)
- [ ] Google Sheet visible with headers
- [ ] Products synced (optional)
- [ ] Backend starts without errors

---

## Success! 🎉

You now have:
✅ Google Sheets connected to your Oracle database
✅ PRODUCT_MASTER structure replicated in Google Sheets
✅ Automatic sync capability
✅ Secure authentication with service accounts
✅ Logging and error handling

---

## Next Features (Optional)

Add these endpoints to `server.py` for manual syncing:

```python
@api.post("/admin/sync/oracle-to-sheets")
async def sync_oracle_to_sheets(admin: dict = Depends(require_admin)):
    """Admin endpoint to sync Oracle to Google Sheets."""
    if not google_sheets_repo.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets not available")
    products = oracle_repo.list_products()
    success = google_sheets_repo.sync_from_oracle(products)
    return {"success": success, "products_synced": len(products)}

@api.get("/admin/sync/sheets-status")
async def sheets_sync_status(admin: dict = Depends(require_admin)):
    """Check Google Sheets connection status."""
    return {
        "available": google_sheets_repo.is_available(),
        "sheet_id": os.environ.get("GOOGLE_SHEET_ID"),
    }
```

---

## Support

Having issues? Check:
1. GOOGLE_SHEETS_SETUP.md (detailed guide)
2. Logs in google_sheets_repo.py
3. Google Cloud Console for API errors
4. Service account permissions in Cloud Console
