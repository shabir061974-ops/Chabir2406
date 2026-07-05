# Google Sheets Integration - Quick Reference Card

## 🎯 Your Action Items (In Order)

### Phase 1: Google Cloud Setup (10 minutes)
```
1. Go to: https://console.cloud.google.com/
2. Create project: "Faiha E-Commerce"
3. Enable APIs:
   - Google Sheets API
   - Google Drive API
4. Create Service Account: "faiha-sheets-sync"
5. Generate JSON key
6. Download and save as: backend/google-credentials.json
```

### Phase 2: Create Google Sheet (2 minutes)
```bash
cd backend
python setup_google_sheets.py ./google-credentials.json

# Copy the GOOGLE_SHEET_ID from output
```

### Phase 3: Configure Backend (1 minute)
Edit `backend/.env`:
```env
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEET_ID=<paste-your-id>
GOOGLE_CREDENTIALS_PATH=./google-credentials.json
```

### Phase 4: Test (1 minute)
```bash
cd backend
python
>>> import google_sheets_repo
>>> google_sheets_repo.init_sheets()
True
>>> google_sheets_repo.is_available()
True
```

### Phase 5: Start Backend
```bash
python -m uvicorn server:app --reload
```

---

## 📝 What's Already Done

✅ `google_sheets_repo.py` - Ready to use
✅ `setup_google_sheets.py` - Ready to run
✅ `server.py` - Already updated with:
   - `import google_sheets_repo`
   - `google_sheets_repo.init_sheets()` in startup
   - `google_sheets_repo.close()` in shutdown
   - 2 new admin endpoints for sync

✅ `requirements.txt` - Google libraries added

---

## 📋 Column Structure

Your Google Sheet will have these headers:

| # | Column | Type | Oracle Source |
|---|--------|------|----------------|
| A | PRODUCT_ID | Text | PRODUCT_ID |
| B | CATEGORY | Text | CATEGORY |
| C | ITEM_NAME | Text | ITEM_NAME |
| D | BARCODE | Text | BARCODE |
| E | PRICE | Number | PRICE |
| F | AVAILABLE_QUANTITY | Number | AVAILABLE_QUANTITY |
| G | CREATED_DATE | Date | CREATED_DATE |
| H | UPDATED_DATE | Date | UPDATED_DATE |

---

## 🔗 New Admin Endpoints

```bash
# Check sync status
GET /api/admin/sync/status

# Manually sync Oracle → Google Sheets
POST /api/admin/sync/oracle-to-sheets
```

---

## 🐛 Quick Troubleshoot

| Error | Fix |
|-------|-----|
| "Credentials file not found" | Save JSON in `backend/google-credentials.json` |
| "GOOGLE_SHEET_ID not set" | Add to `.env` with correct ID from setup script |
| "Cannot access Google Sheet" | Verify Sheet ID is correct, run setup script again |
| "403 Permission Denied" | Add service account email to Sheet (Share button) |
| Connection fails at startup | Check Google Cloud Project has APIs enabled |

---

## 💾 Files Modified

```
backend/
├── server.py                      ✏️ UPDATED (import + 2 functions + endpoints)
├── requirements.txt               ✏️ UPDATED (google-auth-oauthlib added)
├── .env                          ✏️ TO UPDATE (add 3 variables)
├── .gitignore                    ✏️ TO UPDATE (add credentials entry)
├── google_sheets_repo.py         ✨ NEW (main module)
├── setup_google_sheets.py        ✨ NEW (setup script)
├── IMPLEMENTATION_STEPS.md       ✨ NEW (step-by-step guide)
├── GOOGLE_SHEETS_SETUP.md        ✨ NEW (detailed guide)
└── GOOGLE_SHEETS_QUICK_START.md  ✨ NEW (quick reference)
```

---

## 🚀 Usage Examples

### Sync Products Programmatically
```python
import oracle_repo
import google_sheets_repo

products = oracle_repo.list_products()
google_sheets_repo.sync_from_oracle(products)
```

### Read Products from Sheet
```python
import google_sheets_repo

products = google_sheets_repo.list_products_from_sheets()
for p in products:
    print(p['ITEM_NAME'], p['PRICE'])
```

### Add Single Product
```python
import google_sheets_repo

product = {
    "PRODUCT_ID": "123",
    "CATEGORY": "Groceries",
    "ITEM_NAME": "Milk",
    "BARCODE": "1234567890",
    "PRICE": 1.250,
    "AVAILABLE_QUANTITY": 50,
    "CREATED_DATE": "2026-07-05",
    "UPDATED_DATE": "2026-07-05",
}
google_sheets_repo.append_product(product)
```

---

## 🔐 Security Checklist

- [ ] `google-credentials.json` added to `.gitignore`
- [ ] Never commit credentials to git
- [ ] Change Gmail password you shared earlier
- [ ] Service account (not personal Gmail) used
- [ ] Credentials file stored securely
- [ ] Access restricted to team members only

---

## 📞 Support Resources

1. **Detailed Setup**: Read `IMPLEMENTATION_STEPS.md`
2. **Comprehensive Guide**: Read `GOOGLE_SHEETS_SETUP.md`
3. **Quick Start**: Read `GOOGLE_SHEETS_QUICK_START.md`
4. **API Reference**: Check `google_sheets_repo.py` docstrings
5. **Troubleshooting**: See troubleshooting section above or in guides

---

## ✨ You're Ready!

All code is in place. You just need to:
1. Create Google Cloud credentials (10 min)
2. Run setup script (2 min)
3. Update `.env` (1 min)
4. Test it (1 min)

**Total time: ~15 minutes**

Then you can start syncing! 🎉
