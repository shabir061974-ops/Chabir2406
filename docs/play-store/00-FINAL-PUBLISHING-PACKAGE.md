# 📦 FINAL GOOGLE PLAY PUBLISHING PACKAGE — Faiha Store

**This is the authoritative, copy-paste-ready package. It supersedes earlier drafts in this folder.**

| | |
|---|---|
| **App name** | Faiha Store |
| **Package** | `com.faihacoopkw.store` |
| **Version** | 1.0.0 (versionCode 1) |
| **Artifact** | `frontend/android/app/build/outputs/bundle/release/app-release.aab` |
| **Size / SHA-256** | 6,796,321 B (6.5 MB) · `b1648652b2ac52501c0dad10065ed28b72da28115af17e00d43da7c3daa49da6` |
| **Signed by** | CN=Faiha Co-operative Society (valid to 2053) |
| **Privacy Policy** | https://www.faihacoopkw.com/privacy ✅ live |
| **Status** | Verified PostHog-free, no trackers, no debug flags, INTERNET permission only |

---

# 1. FINAL STORE LISTING

| Field | Value to enter |
|---|---|
| **App name** | `Faiha Store` |
| **Default language** | English (United States) |
| **App or game** | App |
| **Free or paid** | **Free** |
| **Category** | **Shopping** |
| **Tags** | Groceries · Food & Drink · Shopping |
| **Contact email** | `info@faihacoopkw.com` *(public — must be monitored)* |
| **Contact phone** | `+965 1861000` *(optional)* |
| **Contact website** | `https://www.faihacoopkw.com` |
| **Privacy Policy URL** | `https://www.faihacoopkw.com/privacy` |
| **Countries / regions** | **Kuwait** (add others only where you deliver) |
| **In-app purchases** | **No** (physical goods, paid Cash on Delivery — not Play Billing) |
| **Contains ads** | **No** |

**Graphics to upload** (still to be produced — see `10-graphic-generation-prompts.md`):
- App icon **512×512** PNG (square, no rounded corners)
- Feature graphic **1024×500** PNG/JPEG (no alpha)
- **2–8 phone screenshots**, recommend 4–6 @ **1080×1920**, incl. ≥1 Arabic
- *(Optional)* 7″ tablet 1200×1920 · 10″ tablet 1600×2560

**Recommended:** add an **Arabic (ar)** store listing — the app is bilingual and the market is Kuwait.

---

# 2. FINAL SHORT DESCRIPTION  *(80 char max)*

```
Shop Faiha Co-op groceries online in Kuwait — fresh deals, easy home delivery.
```
*(78 characters)*

---

# 3. FINAL FULL DESCRIPTION  *(4000 char max)*

```
Faiha Store is the official shopping app of Faiha Co-operative Society in Kuwait. Browse our full range of groceries and everyday essentials, discover the latest offers, and place your order for home delivery — all in a fast, simple app in both English and Arabic.

WHY SHOP WITH FAIHA STORE

• Full product catalog — fresh food, pantry staples, household items and more, updated regularly from our stores.
• Real prices in Kuwaiti Dinar — clear pricing with no surprises at checkout.
• Bilingual — switch instantly between English and العربية.
• Offers & coupons — apply promo codes at checkout and save on your basket.
• Cash on Delivery — pay conveniently when your order arrives.
• Order tracking — follow your order status from confirmation to delivery.
• Your account, your history — create an account with your phone number to save your details and review past orders.

HOW IT WORKS

1. Browse categories or search for the products you need.
2. Add items to your cart and review your basket.
3. Enter your delivery details and choose Cash on Delivery.
4. Confirm your order and track it until it reaches your door.

PRIVACY YOU CAN TRUST

We keep data collection to a minimum. Faiha Store does not use advertising, analytics, or third-party tracking technologies, and we never sell your personal information.

MADE FOR KUWAIT

Faiha Store is built for members and customers of Faiha Co-operative Society, with delivery across our service areas in Kuwait. Prices, products and availability reflect our physical stores.

NEED HELP?

Reach our team directly from the app for any question about products, orders or delivery.

Download Faiha Store today and enjoy a smarter, faster way to shop your co-op.
```

> Accuracy note: says **Cash on Delivery** only (KNET is disabled in this build). The privacy claim is now **true** following PostHog removal. Update this text if either changes.

---

# 4. FINAL RELEASE NOTES  *(500 char max — "What's new")*

```
Welcome to the first release of Faiha Store!

• Browse the full Faiha Co-op product catalog in English and Arabic
• Add items to your cart and apply coupon codes
• Create an account with your phone number
• Place orders with Cash on Delivery
• Track your order status and view your order history

Thank you for shopping with us. We'd love your feedback!
```

---

# 5. FINAL DATA SAFETY ANSWERS

> ⚠️ **Correction vs. earlier draft:** under Google's taxonomy **"Purchase history" belongs to
> *Financial info*, not *App activity*.** The table below is the corrected, final version.
> These answers are accurate for the verified PostHog-free AAB.

### Overview
| Question | Answer |
|---|---|
| Does your app collect or share required user data types? | **Yes** |
| Is all user data encrypted in transit? | **Yes** (HTTPS) |
| Do you provide a way to request data deletion? | **Yes** → URL: `https://www.faihacoopkw.com/privacy` |

### Data types — declare **Collected = Yes, Shared = No, Processed ephemerally = No** for each

**Personal info**
| Type | Collected | Required? | Purposes |
|---|---|---|---|
| Name | Yes | Required | App functionality; Account management |
| Phone number | Yes | Required (login identifier) | App functionality; Account management |
| Email address | Yes | **Optional** | App functionality |
| Address (physical/mailing) | Yes | **Optional** | App functionality (delivery) |
| User IDs | Yes | Required | Account management *(an account record ID is created)* |
| Race/ethnicity, beliefs, sexual orientation, other | **No** | — | — |

**Financial info**
| Type | Collected | Required? | Purposes |
|---|---|---|---|
| **Purchase history** | **Yes** | Required | App functionality; Account management |
| User payment info | **No** | — | Cash on Delivery only; no card data in app |
| Credit score / other financial info | **No** | — | — |

**Everything else — declare NOT collected**
Location (approximate & precise) · Health & fitness · Messages · Photos & videos · Audio ·
Files & docs · Calendar · Contacts · **App activity** (app interactions, in-app search history,
installed apps, other UGC) · Web browsing history · **App info & performance** (crash logs,
diagnostics) · **Device or other IDs**

### Security practices
| Practice | Declaration |
|---|---|
| Encrypted in transit | **Yes** |
| Users can request data deletion | **Yes** |
| Committed to Play Families Policy | **No** |
| Independent security review | Leave unchecked |

### Resulting public card
> **Data collected:** Name, Phone number, Email address, Address, User IDs, Purchase history
> **Data shared with third parties:** None
> **Security:** Encrypted in transit · You can request that data be deleted

---

# 6. FINAL APP ACCESS ANSWERS

**Answer:** *"All or some functionality is restricted"* → add one access instruction set.

| Field | Value |
|---|---|
| Name | `Customer account` |
| Username / phone | `[DEMO PHONE — you must create this]` |
| Password | `[DEMO PASSWORD]` |
| Any other instructions | see below |

```
Browsing the catalog is open and requires no login.

To review the account and ordering flow:
1. Open the app and tap "My Account".
2. Sign in with the phone number and password above.
3. You can view profile details and order history.
4. To test checkout: add any product to the cart, open the cart, tap Checkout,
   enter a name and phone, and select "Cash" (Cash on Delivery). KNET card payment
   is intentionally disabled in this release.

Note: the /admin area is staff-only and is not part of the consumer app experience.
```

> ⛔ **Action required from you:** create this demo customer in production (phone + password) and
> paste the real values in. Reviewers must be able to sign in, or the app can be rejected.

---

# 7. FINAL CONTENT RATING ANSWERS (IARC questionnaire)

| Question | Answer |
|---|---|
| Email address for the certificate | `info@faihacoopkw.com` |
| Category | **Utility, Productivity, Communication, or Other** (Shopping app — *not* Game) |
| Violence (realistic/fantasy/blood/gore) | **No** |
| Sexual content or nudity | **No** |
| Profanity or crude humour | **No** |
| Controlled substances (drugs, alcohol, tobacco) references | **No** |
| Gambling / simulated gambling | **No** |
| Horror / fear content | **No** |
| Hate speech or discrimination | **No** |
| Does the app allow users to interact or communicate with each other? | **No** *(the WhatsApp button contacts the business, not other users)* |
| Does the app allow users to share their location with other users? | **No** |
| Does the app allow purchase of **digital** goods? | **No** *(physical groceries only)* |
| Does the app share user-provided personal info with third parties? | **No** |
| Does the app collect/share precise location? | **No** |
| Is the app a web browser or search engine? | **No** |
| Does the app contain user-generated content? | **No** |

**Expected outcome:** **Everyone** (ESRB) · **PEGI 3** · rated for all ages.

---

# 8. FINAL ADS DECLARATION

| Question | Answer |
|---|---|
| Does your app contain ads? | **No** |
| Advertising ID (`AD_ID`) used? | **No** — permission is not declared in the manifest |
| Data Safety → Device or other IDs collected? | **No** |

**Verified:** the final AAB contains **zero** ad/analytics SDKs — scanned for AdMob, DoubleClick,
Google Ad Manager, Facebook, AppsFlyer, Adjust, Firebase/Crashlytics, GA/GTM, Mixpanel, Segment,
Amplitude, Hotjar, FullStory, Sentry, Clarity, and PostHog. All absent.

**Result:** your listing will show the **"No ads"** badge.

---

# 9. FINAL TARGET AUDIENCE ANSWERS

| Question | Answer | Why |
|---|---|---|
| Target age groups | **18 and over** (select only 18+) | Commerce app for account-holding customers; keeps you out of the stricter Families programme while remaining truthful |
| Could your app appeal to children? | **No** | No child-oriented themes, characters, or content |
| Store presence for children | **N/A** (18+ selected) | — |
| Designed for Families programme | **Not enrolled** | Correct for a grocery retail app |

**Related declarations:**
| Section | Answer |
|---|---|
| News app | **No** |
| COVID-19 contact tracing / status app | **No** |
| Government app | **No** |
| Financial features | **No** *(selling groceries ≠ a financial product)* |
| Health apps | **No** |
| Data safety — Families policy commitment | **No** |

---

# 10. FINAL PUBLICATION CHECKLIST

### ✅ Complete
- [x] Signed production AAB built & verified (`b1648652…`, 6.5 MB, versionCode 1)
- [x] Package `com.faihacoopkw.store`, no debug flags, INTERNET permission only
- [x] PostHog removed; AAB and live site verified tracker-free
- [x] Privacy Policy live at `/privacy` (EN + AR) with retention, **deletion/rights**, children, changes, last-updated
- [x] Account deletion method decided & documented (email/WhatsApp, 30 days)
- [x] Website: HTTPS, Terms, Contact, About, footer links all present
- [x] All listing copy, Data Safety, App Access, Content Rating, Ads, Target Audience answers finalised (this document)

### ❌ Blockers — must be done before "Send for review"
- [ ] **1. App icon 512×512**
- [ ] **2. Feature graphic 1024×500**
- [ ] **3. Phone screenshots ×2–8** (recommend 4–6, incl. ≥1 Arabic)
- [ ] **4. Create the demo customer account** → fill into App Access (§6)
- [ ] **5. Upload `app-release.aab`** to a release track
- [ ] **6. Enrol in Play App Signing** (recommended)
- [ ] **7. Complete every App content declaration** using §5–§9
- [ ] **8. Enter Store listing text** using §1–§4

### ⚠️ Confirm / decide
- [ ] **Developer account type** — if *personal/new*, Google requires **closed testing, 12 testers, 14 days** before production. **Start this first; it is the longest lead time.** Organisation accounts are exempt.
- [ ] **`info@faihacoopkw.com` is actively monitored** — it is now both the public contact *and* the data-deletion channel
- [ ] **Back up `faiha-release.jks` + passwords** off-machine (currently `D:\FaihaWebsite\Emergent\keystore\`). Losing it blocks all future updates.
- [ ] **Site must be up during review** — the app is a WebView of `www.faihacoopkw.com`; if the site or API is down, the reviewer sees a broken app

### Upload key fingerprints (keep for your records)
```
SHA-1   : AF:C5:A9:E8:93:78:5B:5D:9D:3E:FE:C6:D8:81:33:6D:EC:68:95:35
SHA-256 : B3:23:CB:D4:AF:74:73:AB:26:BF:17:D7:8B:7F:2E:D3:E0:00:B6:04:C7:AA:23:DC:81:5E:8D:BF:CB:42:E5:7B
```

### Recommended order of work
1. Confirm account type → if personal, **start closed testing immediately** (14-day clock)
2. Produce the 3 graphics (longest creative lead time)
3. Create the demo customer account
4. Fill Store listing text (§1–§4)
5. Complete all App content declarations (§5–§9)
6. Upload AAB, enrol in Play App Signing
7. Final read-through for accuracy → **Send for review**

---

*Package finalised 21 July 2026. Do not alter the app without re-verifying §5 (Data Safety) — adding analytics, push notifications, or KNET card payment all require updated declarations before publishing that version.*
