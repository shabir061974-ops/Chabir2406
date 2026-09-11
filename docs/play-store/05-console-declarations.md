# Faiha Store — Play Console "App content" Declarations (Recommended Answers)

Play Console → **App content** has a list of declarations that must all be completed before
you can roll out to production. Below is the recommended answer for each, with reasoning based
on the actual app. Confirm each against reality before submitting.

---

## 1. Privacy Policy
- **Answer:** Provide URL `https://www.faihacoopkw.com/privacy` (see 04-privacy-policy.md).
- **Required:** Yes.

---

## 2. App access
Google asks whether all functionality is available without special access (login), or if
parts are behind a login. This app **can be browsed** but **placing an order and viewing
account/order history require actions**, and there is an **admin area** behind login.

- **Answer:** **"All or some functionality is restricted"** → provide access instructions.
- **Provide test credentials** so Google's reviewers can reach gated areas:
  - **Customer account:** create a demo customer (phone + password) and give those exact
    credentials. Instructions: "Open the app → Account → sign in with phone `[demo phone]`
    and password `[demo password]` to view account and order history."
  - **Admin area (if reachable from the app URL):** Google generally reviews the consumer
    experience; you usually do **not** need to expose admin. If the admin route is publicly
    reachable, add a note: "The `/admin` area is staff-only and not part of the consumer app."
- **Why:** If reviewers can't reach a screen, they may reject the app. Give working demo login.

---

## 3. Ads
- **Answer:** **"No, my app does not contain ads."**
- **Reason:** No ad SDKs (AdMob/Meta/etc.) — confirmed in code. The store card will show "No ads".

---

## 4. Content rating (IARC questionnaire)
- **Answer:** Complete the IARC questionnaire honestly. For a grocery/shopping app with **no**
  violence, sexual content, gambling, drugs, profanity, or user-to-user communication:
  - Category: **Utility / Productivity / Shopping** (choose "Reference, News, or Educational" is
    wrong — pick the shopping/utility path when offered; if the flow asks a generic category,
    answer the content questions truthfully — all "No").
  - Answer **No** to all questions about violence, sexuality, controlled substances, gambling,
    hate, and user-generated content sharing.
- **Expected result:** **Everyone / PEGI 3 / rated for all ages.**
- **Note:** Does the app let users communicate with each other or share content? **No** (only a
  WhatsApp/contact button to the store — that's contacting the business, not user-to-user).
  Answer "No" to social/interactive-features questions.

---

## 5. Target audience and content (Families policy)
- **Target age group:** **18 and over** (or "18+"). Even though the content is safe for all
  ages, the app is a **shopping/commerce** app intended for account-holding customers, not a
  kids' app. Selecting 18+ keeps you out of the stricter **Families / Designed for Families**
  requirements.
- **Is your app designed for children / appeals to children?** **No.**
- **Result:** App is **not** in the Families program. This is correct for a grocery store app.
- **Store presence to children:** Not applicable (target 18+).

---

## 6. News app
- **Answer:** **No**, this is not a news app.

---

## 7. COVID-19 / contact-tracing & status apps
- **Answer:** **No.**

---

## 8. Data safety
- Complete per **03-data-safety.md**. Required before rollout.

---

## 9. Government apps
- **Answer:** **No** (a co-operative society retail app is not a government app).

---

## 10. Financial features
- Play may ask if the app provides financial features (loans, banking, crypto, etc.).
- **Answer:** **No.** Cash-on-Delivery for groceries is not a "financial product/service".
- **If KNET online payment is enabled later**, you still typically answer No to "financial
  products," but re-check the wording — buying goods ≠ financial services.

---

## 11. Health apps
- **Answer:** **No.**

---

## 12. Advertising ID permission (`com.google.android.gms.permission.AD_ID`)
- The app does **not** use the Advertising ID (no ad/analytics SDK). Ensure the AD_ID
  permission is **not** declared. (It is **not** in your manifest — good.)
- In the Data Safety "Advertising ID" question, answer that you do **not** collect it.

---

## 13. Store settings
| Field | Recommendation |
|---|---|
| App category | **Shopping** |
| Tags | Groceries / Shopping / Food & Drink |
| Contact details | Public support email (required) + website; phone optional |
| Countries / regions | **Kuwait** (add others only if you deliver there) |
| Pricing | **Free** app |
| Contains in-app purchases | **No** (payment is for physical goods via COD, handled off-Play; there are no Google Play digital IAPs) |

---

## 14. Google Play App Signing (strongly recommended)
- **Enroll in Play App Signing** when you upload the AAB.
- Your uploaded AAB is signed with your **upload key** (`faiha-release.jks`, `CN=Faiha
  Co-operative Society`). Google re-signs with a managed app-signing key for distribution.
- **Keep `faiha-release.jks` + its passwords backed up** — it's your upload key for all future
  updates. Losing it (without Play App Signing key reset) blocks updates.
- Upload-key fingerprints (for your records / any reset request):
  - SHA-1: `AF:C5:A9:E8:93:78:5B:5D:9D:3E:FE:C6:D8:81:33:6D:EC:68:95:35`
  - SHA-256: `B3:23:CB:D4:AF:74:73:AB:26:BF:17:D7:8B:7F:2E:D3:E0:00:B6:04:C7:AA:23:DC:81:5E:8D:BF:CB:42:E5:7B`
