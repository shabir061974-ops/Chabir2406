# Faiha Store — QA Test Plan & Risk Register (Alpha Closed Test)

**Prepared 21 July 2026** · Release under test: **1 (1.0.0)** · Track: Closed testing – Alpha

---

# PART 1 — Live status

| Item | Status |
|---|---|
| Closed testing release | ✅ Active, "Available to selected testers", published 21 Jul 16:33 |
| Countries | Kuwait, India, UAE (+ Canada, France) — covers all tester locations |
| Testers invited | 13 |
| **Testers opted in** | 🔴 **11 — ONE SHORT of the required 12** |
| 14-day clock | ⛔ **NOT STARTED** |
| Google requirement 1 | ✅ Publish a closed testing release — complete |

---

# PART 2 — Risk register (prioritised by severity × impact)

## 🔴 P0 — Blocks production approval. Fix today.

### P0-1 — Only 11 of 12 required testers have opted in
**Impact:** The 14-day clock is not running. Every day at 11 is a wasted day.
**Why it happens:** invited ≠ opted in. Two of your 13 haven't completed the flow.
**Fix:**
1. Identify the 2 who haven't opted in and chase them personally (phone call, not email).
2. Common causes to check with them:
   - Used a **different Gmail** than the one you registered
   - Their **Google Play account country** isn't Kuwait/India/UAE/Canada/France
   - They clicked the link on **desktop**, not their Android phone
   - They tapped "Become a tester" but never **installed** the app
3. **Recruit 4–5 more immediately.** At 12/12 you have zero margin — one uninstall breaks the requirement and may reset progress.
**Target:** ≥16 opted in.

---

## 🟠 P1 — Realistic rejection / severe UX risk

### P1-1 — No offline fallback. App shows a raw browser error with no network.
**Confirmed:** `capacitor.config.json` has `server.url` pointing at the live site and **no `errorPath`**. There is **no** `navigator.onLine` handling anywhere in the React source.

**What the user sees with no connectivity:** the bare Chrome WebView error page — *"webpage not available / ERR_INTERNET_DISCONNECTED"* — with no Faiha branding, no retry button, and no explanation. It looks like a broken app, not an offline state.

**Why this matters for approval:** Google reviewers routinely test on poor/no connectivity and airplane mode. An app that renders a raw error screen can be failed under minimum-functionality expectations. This is the **single biggest technical risk** in the current build, and it's a direct consequence of the WebView-wrapper architecture.

**Test it yourself right now:** enable airplane mode → open the app → observe.

**Options (all require your approval — no code has been changed):**
- **A (smallest):** add a branded offline HTML page to the bundled assets and set `errorPath` in `capacitor.config.json`. Requires an AAB rebuild. ~30 min.
- **B:** add an `navigator.onLine` listener in the web app that shows a branded "No connection — retry" overlay. Deploys via website; **no AAB rebuild needed**.
- **C:** do nothing and accept the risk.

> **Recommendation: B, then A.** B is deployable today through your existing frontend pipeline and covers the common case (connection drops while using the app). A covers cold-start with no network, which B cannot.

### P1-2 — Total dependency on `www.faihacoopkw.com` uptime
If the site or API is down during Google's review or the 14-day test, the app is simply broken for everyone. There is no cached/offline mode.
**Action:** treat the site as production-critical for the next 3 weeks. Avoid deploys during review. Consider uptime monitoring (UptimeRobot/Better Stack) with SMS alerts.

---

## 🟡 P2 — Security / privacy. Should fix before production.

### P2-1 — Auth tokens in `localStorage` + `allowBackup="true"`
**Confirmed:** `authToken.js` stores access and refresh tokens in `localStorage`. The manifest has `android:allowBackup="true"`.

**Consequence:** Android Auto Backup can copy the WebView's data — **including refresh tokens** — to the user's Google Drive. On restore to a *new device*, that token may authenticate the session silently. The tokens also sit in plain text in app-private storage (readable on a rooted device).

The code itself flags this — the file's own comment says it's "the single place to swap in encrypted secure storage (Keychain / Keystore)". It was designed for this fix and never completed.

**Options:** (a) set `allowBackup="false"` (Android manifest change → AAB rebuild), (b) exclude the WebView data dir via `fullBackupContent` rules, (c) move tokens to Capacitor Secure Storage.
**Lowest-effort meaningful fix:** (a). **Not a Play blocker**, but it is a genuine finding.

### P2-2 — No phone-number verification at registration
**Confirmed:** `customer_register` normalises the phone, rejects duplicates, hashes the password — but there is **no OTP/SMS verification**. Anyone can register using a phone number they don't own, blocking the real owner from ever registering it.
**Mitigations already present:** ✅ passwords are properly hashed, ✅ rate limiting exists on auth endpoints (14 references).
**Not a Play issue** — a business/abuse risk. Worth an OTP step post-launch.

---

## 🔵 P3 — Hygiene. Fix at next rebuild, not urgent.

- **P3-1 — 8.5 MB of source maps shipped inside the AAB.** Four `.js.map` files; largest 8.3 MB. Inflates download size and exposes readable source to anyone who unzips the bundle. Fix: `GENERATE_SOURCEMAP=false` for the app build — roughly halves the AAB.
- **P3-2 — Dead cleartext exception still shipped.** `network_security_config.xml` still permits HTTP to staging IP `200.97.161.12`. Unused in production (app is HTTPS-only) and harmless for Play, but it's dead attack surface in a shipped artifact.
- **P3-3 — KNET disabled.** Checkout is Cash on Delivery only. Ensure listing/screenshots never imply card payment while this is true.

---

# PART 3 — Comprehensive test checklist

Have testers work through these. Mark ✅ / ❌ / ⚠️ and record device + Android version.

## 1. Install & first launch
- [ ] Installs from the opt-in link without error
- [ ] Launches within ~3 s on a mid-range phone
- [ ] Splash screen displays correctly (no stretch/distortion)
- [ ] Launcher icon looks correct on the home screen and app drawer
- [ ] App name shows as "Faiha Store"
- [ ] No crash on first open

## 2. Login / account
- [ ] Register a new account (name, phone, password)
- [ ] Rejects invalid/short phone numbers
- [ ] Rejects duplicate phone with a clear message
- [ ] Log out, then log back in
- [ ] **Session persists after force-closing and reopening the app**
- [ ] Wrong password shows a clear error (not a blank screen)
- [ ] Profile edit (name/email/address) saves and persists
- [ ] Order history displays past orders

## 3. Product browsing
- [ ] Home screen loads categories and featured products
- [ ] Product images load (no broken/placeholder images)
- [ ] Prices display in **KD** with correct decimals
- [ ] Product detail opens; description, price, image correct
- [ ] Scrolling is smooth; no blank tiles on fast scroll
- [ ] Out-of-stock items are clearly marked

## 4. Search
- [ ] Search returns relevant results (English)
- [ ] Search returns relevant results (**Arabic**)
- [ ] No-results state shows a friendly message, not a blank page
- [ ] Partial words / misspellings behave sensibly
- [ ] Clearing search restores the normal listing

## 5. Categories
- [ ] All categories open and load products
- [ ] Category names correct in both languages
- [ ] Empty categories handled gracefully
- [ ] Back navigation returns to the previous list, not the home screen

## 6. Cart
- [ ] Add to cart works from listing **and** detail page
- [ ] Cart badge count updates immediately
- [ ] Increase / decrease quantity works
- [ ] Remove item works
- [ ] **Cart persists after closing and reopening the app**
- [ ] Subtotal maths is correct
- [ ] Valid coupon applies and reduces the total correctly
- [ ] Invalid/expired coupon shows a clear error

## 7. Checkout (Cash on Delivery)
- [ ] Checkout opens with a non-empty cart
- [ ] Requires name and phone; blocks submission without them
- [ ] Email optional and accepted when blank
- [ ] **Cash on Delivery** selectable
- [ ] **KNET correctly shown as unavailable** (must not be selectable)
- [ ] Order submits and returns an order number
- [ ] Confirmation screen displays correct totals
- [ ] Order appears in Order History
- [ ] Order tracking shows the correct status

## 8. Language / RTL
- [ ] Switch English → Arabic; layout flips to RTL correctly
- [ ] No clipped, overlapping, or reversed text
- [ ] Arabic product names render correctly (no mojibake/boxes)
- [ ] Numbers and prices readable in both modes
- [ ] Language choice persists after restart

## 9. Performance
- [ ] Cold start under ~5 s on a low-end device
- [ ] No visible jank scrolling long product lists
- [ ] Images load progressively, not all-at-once freeze
- [ ] Battery/heat normal after 10 minutes of use
- [ ] App size acceptable on-device

## 10. Crashes & stability
- [ ] No crash during a 15-minute session
- [ ] Rotate the device on each major screen — no crash/layout break
- [ ] Background the app 10+ minutes, return — state preserved, no crash
- [ ] Rapid back-button presses don't crash or exit unexpectedly
- [ ] **Android back button behaves sensibly** (navigates back, doesn't dead-end)

## 11. Permissions
- [ ] App requests **NO** runtime permissions (correct — INTERNET only)
- [ ] ⚠️ **Flag immediately** if any permission dialog appears (location, contacts, storage, camera) — that would contradict the Data Safety declaration

## 12. Network handling ⚠️ *highest-risk area*
- [ ] **Airplane mode on cold start** — record exactly what appears *(expected: raw browser error — see P1-1)*
- [ ] **Lose connection mid-session** — what happens?
- [ ] **Reconnect** — does the app recover without a manual restart?
- [ ] Slow 3G — does it load or hang indefinitely?
- [ ] Switch WiFi → mobile data mid-use
- [ ] Submit an order with a flaky connection — **is a duplicate order created?**

## 13. Security
- [ ] All traffic HTTPS (no mixed-content warnings)
- [ ] Password never visible in plain text
- [ ] Logging out clears the session (back button can't reach the account)
- [ ] Another user's order not visible by changing an order number
- [ ] No sensitive data in screenshots of the app switcher

---

# PART 4 — Feedback to collect for the Production Access questionnaire

Google asks three questions. Vague answers get refused. Collect **specific, quotable** data.

### Q1 — "How did you recruit testers?"
Record for each tester: relationship (staff / board member / family / customer), country, and how you contacted them.
> *Target answer: "13 testers recruited from within Al-Faiha Co-operative Society — staff, board members, their families, and regular customers of our physical stores — contacted personally by email and WhatsApp. Testers are in Kuwait, India and the UAE, and represent our actual customer base."*

### Q2 — "What feedback did you receive, and how did you apply it?"
**This is the one that fails applications.** You need concrete items. Track in a table:

| # | Tester | Device / Android | Issue reported | Severity | Action taken |
|---|---|---|---|---|---|
| 1 | | | | Blocker / Minor / Cosmetic | Fixed / Won't fix / Noted |

Aim for **at least 5–8 real entries**, including things you *didn't* change and why. "No issues reported" is a weak answer and reads as if no testing happened.

Specifically ask testers to report on: Arabic rendering, image loading, checkout completion, and **what happened with a poor connection**.

### Q3 — "How did you decide the app is ready for production?"
Gather:
- Number of testers who completed a full purchase journey
- Range of devices and Android versions covered
- Crash count (target: zero)
- Average ease-of-use score from the feedback form
- Confirmation the 14-day period ran with ≥12 testers throughout

> Use the bilingual form in `14-tester-feedback-form.md`. Even 5–6 responses transform these answers from generic to evidence-based.

---

# PART 5 — Recommended action order

| Priority | Action | Owner | When |
|---|---|---|---|
| 🔴 P0 | Chase the 2 non-opted-in testers; recruit 4–5 more | You | **Today** |
| 🔴 P0 | Add `info@faihacoopkw.com` to the track's Feedback URL field | You | Today |
| 🟠 P1 | Test airplane-mode behaviour and report what you see | Testers | Today |
| 🟠 P1 | Decide on offline-handling fix (Option A / B / C) | You + me | This week |
| 🟠 P1 | Put uptime monitoring on www.faihacoopkw.com | You | This week |
| 🟡 P2 | Decide on `allowBackup="false"` | You + me | Before production |
| 🔵 P3 | `GENERATE_SOURCEMAP=false`; remove dead cleartext rule | Me, on approval | Next rebuild |
| ⚪ — | Collect structured tester feedback throughout | You | Days 1–14 |

> Any fix requiring an **AAB rebuild** (P1-1 Option A, P2-1, P3-1, P3-2) can be bundled into **one** new build and pushed to the Alpha track. **Pushing a new build does NOT reset the 14-day clock.** Website-only fixes (P1-1 Option B) need no rebuild at all.
