# Faiha Store — Pre-Submission Checklist (Google Play)

Everything still required before you click **"Send for review"**. Grouped by priority.
Item states: ☐ = to do, ✅ = already done.

---

## ✅ Already done
- ✅ Signed production **App Bundle** built: `app-release.aab` (4.8 MB, versionCode 1, versionName 1.0.0).
- ✅ Correct package name `com.faihacoopkw.store`, no debug flag, INTERNET-only permission.
- ✅ Play Console app created (Faiha Store / com.faihacoopkw.store).
- ✅ Listing copy drafted (01), asset specs (02), Data Safety key (03), Privacy Policy draft (04), declarations (05).

---

## ☐ BLOCKERS — must complete before you can submit

### Account & policy
- ☐ **Publish the Privacy Policy** at `https://www.faihacoopkw.com/privacy` (public, no login) and enter the URL in Play Console. *(04-privacy-policy.md)*
- ☐ **Add a data-deletion method** (in-app "Delete account" OR a public request URL/email) and register it in Data safety → Data deletion. Then answer "Yes" to deletion. *(03 §A)*
- ☐ **Provide App access test credentials** — create a demo customer account (phone + password) and enter login instructions in App content → App access. *(05 §2)*

### Graphic assets (upload in Store listing)
- ☐ **App icon** 512×512 PNG. *(02 §1)*
- ☐ **Feature graphic** 1024×500. *(02 §2)*
- ☐ **2–8 phone screenshots** (recommend 4–6 @ 1080×1920, incl. ≥1 Arabic). *(02 §3)*
- ☐ (Optional) Tablet screenshots. *(02 §4)*

### Text listing (Store listing)
- ☐ Enter **Title**, **Short description**, **Full description**. *(01)*
- ☐ Enter **Release notes** for 1.0.0. *(01)*
- ☐ Set **contact email** (public) + website.

### App content declarations (all must be green)
- ☐ Privacy policy ✔ (URL)
- ☐ App access ✔ (test login)
- ☐ Ads → **No** *(05 §3)*
- ☐ **Content rating** — complete IARC questionnaire → expect Everyone. *(05 §4)*
- ☐ **Target audience** → 18+ , not designed for children. *(05 §5)*
- ☐ News app → No · COVID → No · Government → No · Financial features → No · Health → No
- ☐ **Data safety** form completed per 03. *(03)*
- ☐ Advertising ID → not collected. *(05 §12)*

### Release setup
- ☐ Create a **Production** (or start with **Closed testing**, see risks) release and **upload `app-release.aab`**.
- ☐ **Enroll in Play App Signing** (recommended) and **back up `faiha-release.jks` + passwords**. *(05 §14)*
- ☐ Set **countries/regions** = Kuwait (+ any others you deliver to).
- ☐ Confirm **Free** app, **no in-app purchases**, **no ads**.
- ☐ Pricing & distribution consent, US export laws, Play content policies — accept.

---

## ⚠️ RISKS / things to verify (read before submitting)

1. **WebView / "minimum functionality" policy.**
   The app loads the live site `https://www.faihacoopkw.com` inside a Capacitor WebView.
   Google can reject apps that are *just* a website wrapper. **Mitigation:** the listing and
   screenshots should emphasize the app-specific value (fast catalog, account, cart, order
   tracking, offline shell, bilingual). Ensure the app does **not** feel like a raw browser
   (no visible URL bar — it doesn't). This is usually fine for a real store, but be aware it's
   the most likely rejection reason for wrapper apps. Have native-feeling behavior ready to
   point to if challenged.

2. **New-developer closed-testing requirement.**
   If this is a **personal** developer account created recently, Google requires **closed
   testing with at least 12 testers for 14 days** before you can publish to production.
   **Organization** accounts are typically exempt. **Action:** check your account type; if
   personal, plan a closed test track first (upload the same AAB there).

3. **Server availability = app availability.**
   Because the app depends on `www.faihacoopkw.com`, the site/API must be up and HTTPS-valid
   during Google's review, or the reviewer sees a broken app → rejection. Confirm the domain,
   SSL cert, and backend are live and stable before/through review.

4. **KNET payment is disabled.** Keep listing copy to **Cash on Delivery** until KNET is live,
   or the app won't match its description (policy: functionality must match listing).

5. **Deep-link / login flows work from a cold install.** Test the signed AAB on a real device
   (install via internal testing) — register, log in, add to cart, place a COD order, track it.
   Fix anything broken before submission.

6. **Data safety must match reality.** If you add analytics, push, or card payment in a later
   version, update Data safety **before** publishing that version.

---

## Suggested order of operations
1. Publish Privacy Policy + deletion method → 2. Prepare graphics → 3. Fill Store listing text →
4. Complete all App content declarations + Data safety → 5. (If personal account) run Closed
testing 14 days → 6. Create Production release, upload AAB, enroll in App Signing →
7. Review everything → 8. **Send for review.**

---

## Reference — the deliverables in this folder
| File | Covers |
|---|---|
| `01-store-listing.md` | Title, short/full description, release notes |
| `02-graphic-assets-spec.md` | Icon, feature graphic, screenshots specs |
| `03-data-safety.md` | Data Safety questionnaire answers |
| `04-privacy-policy.md` | Ready-to-publish Privacy Policy |
| `05-console-declarations.md` | App access, content rating, target audience, ads, etc. |
| `06-submission-checklist.md` | This checklist |
