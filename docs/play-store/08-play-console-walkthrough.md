# Google Play Console — Section-by-Section Walkthrough (Faiha Store)

Everything you must enter in Play Console, in order, with the **exact recommended answer** and
**why**. Work top-to-bottom; the "Dashboard → Start" checklist in Console mirrors this.

Legend: **[ENTER]** = you type/upload · **[CHOOSE]** = pick an option · **[DECISION]** = needs your confirmation.

---

## A. App setup → "App content" (Policy declarations)

### 1. Privacy policy
- **[ENTER]** `https://www.faihacoopkw.com/privacy`
- **Why:** Mandatory for any app with accounts/personal data. The page is now Play-complete
  (collection, use, retention, **deletion/rights**, children, changes, contact). **Deploy the
  updated site first** so the new sections are live before you paste the URL.

### 2. App access
- **[CHOOSE]** "All or some functionality is restricted."
- **[ENTER]** Reviewer instructions + a working **demo customer login**:
  > "Browsing is open. To test account + checkout: open the app → My Account → sign in with
  > phone `[demo phone]`, password `[demo password]`. Payment is Cash on Delivery. The /admin
  > area is staff-only and not part of the consumer app."
- **Why:** Reviewers must reach gated screens (account, order history, checkout). No login =
  possible rejection. **[DECISION]** Create a demo customer in your production DB and paste
  those exact credentials. (Only you can create it — I won't create accounts.)

### 3. Ads
- **[CHOOSE]** "No, my app does not contain ads."
- **Why:** No ad SDKs in the build (verified). Store shows a "No ads" badge.

### 4. Content rating (IARC questionnaire)
- **[CHOOSE]** Category: Shopping/Utility. Answer **No** to all questions on violence, sexual
  content, drugs, gambling, profanity, hate, and user-to-user communication.
- **Result:** Everyone / PEGI 3.
- **Why:** A grocery store app has no mature content and no user-generated social features
  (the WhatsApp button contacts the business, not other users).

### 5. Target audience and content
- **[CHOOSE]** Target age: **18+** (or 18 and over).
- **[CHOOSE]** "Appeals to children?" → **No**.
- **Why:** Commerce app for account-holding customers; selecting 18+ keeps you out of the
  stricter Families program while remaining truthful.

### 6. Data safety
- **[ENTER]** Complete per **03-data-safety.md**. Summary: collects Name, Phone, Email (opt),
  Address (opt), Purchase history; encrypted in transit; **not shared**; deletion available
  (email). **Data deletion URL:** `https://www.faihacoopkw.com/privacy`.
- **Why:** Legal declaration; must match the app + privacy policy.

### 7. Government apps / Financial features / Health / News / COVID-19
- **[CHOOSE]** **No** to each.
- **Why:** None apply — it's a retail grocery app with Cash on Delivery (not a financial product).

### 8. Advertising ID
- **[CHOOSE]** App does **not** use an Advertising ID.
- **Why:** No ad/analytics SDK; `AD_ID` permission is not in the manifest.

---

## B. "Store presence" → Main store listing

### 9. App details (English – US, default)
- **[ENTER] App name:** `Faiha Store`
- **[ENTER] Short description:** (80 chars) — from `01-store-listing.md`
- **[ENTER] Full description:** — from `01-store-listing.md`
- **Why:** Must match actual functionality (COD, not card) to avoid "misrepresentation" flags.

### 10. Graphics
- **[ENTER] App icon:** 512×512 PNG
- **[ENTER] Feature graphic:** 1024×500
- **[ENTER] Phone screenshots:** 2–8 (recommend 4–6)
- **[ENTER] (optional) Tablet screenshots**
- **Why:** Icon + feature graphic + ≥2 phone screenshots are **required** to publish. See
  `02-graphic-assets-spec.md` and `10-graphic-generation-prompts.md`.

### 11. (Recommended) Add Arabic (ar) translation
- **[ENTER]** Arabic title/short/full/screenshots.
- **Why:** Audience is Kuwait; the app is bilingual. Big conversion win.

---

## C. "Store settings"

### 12. App category & tags
- **[CHOOSE]** Category: **Shopping**; Tags: Groceries / Food & Drink / Shopping.

### 13. Contact details
- **[ENTER]** Email: `info@faihacoopkw.com` (required, public); Website:
  `https://www.faihacoopkw.com`; Phone: `+965 1861000` (optional).

### 14. External marketing
- **[CHOOSE]** Off, unless you run Google Ads for the app.

---

## D. Countries, pricing, distribution

### 15. Pricing
- **[CHOOSE]** **Free.**
- **Why:** No paid download; goods are paid via COD outside Google Play billing.

### 16. In-app purchases
- **[CHOOSE]** **No in-app products** (no Google Play digital IAP).
- **Why:** You sell physical groceries, not digital goods — Play billing is not used/allowed here.

### 17. Countries / regions
- **[CHOOSE]** **Kuwait** (add more only where you actually deliver).

### 18. Consents (US export laws, Play policies, content guidelines)
- **[CHOOSE]** Accept all standard consents truthfully.

---

## E. Release

### 19. Choose a track
- **[DECISION]** If your developer account is **new/personal**: you must run **Closed testing
  (≥12 testers, 14 days)** before Production. If it's an **organization** account: you can go
  straight to Production. **Confirm your account type.**
- Upload the **same** `app-release.aab` to whichever track.

### 20. App integrity / Play App Signing
- **[CHOOSE]** **Enroll in Play App Signing** (recommended). Upload key = your
  `faiha-release.jks` (CN=Faiha Co-operative Society). Keep it + passwords backed up.
- Upload-key fingerprints (for records / key-reset):
  - SHA-1 `AF:C5:A9:E8:93:78:5B:5D:9D:3E:FE:C6:D8:81:33:6D:EC:68:95:35`
  - SHA-256 `B3:23:CB:D4:AF:74:73:AB:26:BF:17:D7:8B:7F:2E:D3:E0:00:B6:04:C7:AA:23:DC:81:5E:8D:BF:CB:42:E5:7B`

### 21. Release details
- **[ENTER]** Release name: `1.0.0 (1)`; Release notes from `01-store-listing.md`.

### 22. Review & roll out
- Resolve any errors on the release dashboard → **Send for review**.

---

## Quick "what only YOU can provide" list
1. Demo customer login (phone + password) for App access.
2. Confirmation `info@faihacoopkw.com` is monitored (contact + deletion channel).
3. The 512 icon, feature graphic, and screenshots (or approve the generation prompts).
4. Your developer **account type** (personal vs organization) → decides closed-testing.
5. Deploy the updated website so `/privacy` shows the new sections before you submit.
