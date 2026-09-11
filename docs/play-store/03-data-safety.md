# Faiha Store — Google Play Data Safety Questionnaire (Answer Key)

> # ✅ VERIFIED ACCURATE — PostHog removed 21 July 2026
> PostHog analytics was found active in production on 21 July 2026 and has since been
> **completely removed** (script deleted from `frontend/public/index.html`, redeployed and
> verified live: no `us.i.posthog.com` requests, no `window.posthog`, no PostHog
> cookies/localStorage). See `12-CRITICAL-posthog-analytics.md` (resolved).
>
> The answers below — **no analytics, no Device or other IDs, no data shared with third
> parties** — are therefore accurate and safe to submit.

These answers are derived from the app's **actual** code and behavior (customer accounts by
phone + password, optional email + delivery address, order history, Cash-on-Delivery only,
INTERNET permission only, **no analytics/ads/third-party SDKs**). Answer the Play Console
form exactly as below. If you later add KNET card payment, push notifications, analytics or
ads, this questionnaire **must be updated** before that version is published.

> Golden rule: Data Safety describes what YOUR app + your backend collect. It is a legal
> declaration. Under-declaring can get the app removed; over-declaring hurts conversion.
> Everything below is stated conservatively-accurate.

---

## Section A — Overview questions

| Question | Answer | Reason |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | Accounts collect name, phone, (optional) email + address; orders collect purchase details. |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | App and API run over **HTTPS** (`https://www.faihacoopkw.com`). |
| Do you provide a way for users to request that their data be deleted? | **Yes — if you add a deletion path** (see note). Otherwise **No** today. | Play requires a deletion method. **Action item**: add in-app "Delete my account" or a public deletion-request URL/email, then answer Yes and provide the URL. |

> **Data deletion (important):** Google requires either (a) an in-app account/data deletion
> option, or (b) a **publicly documented deletion request method** (a URL/form/email). The app
> currently has account creation but no visible self-service deletion. Simplest compliant fix:
> add a line to the Privacy Policy + a `delete@faihacoopkw.com` (or a web form) and register
> that URL in Play Console → Data safety → "Data deletion". See checklist item.

---

## Section B — Data types collected

For **each** type below, the sub-answers are:
- **Collected:** Yes
- **Shared:** No (data is sent only to Faiha's own backend; not sold or shared with third parties)
- **Processed ephemerally:** No (it is stored)
- **Required or optional:** as noted
- **Purpose:** as noted (Play's allowed purposes)

### Personal info

| Data type | Collected | Required? | Purpose(s) |
|---|---|---|---|
| **Name** | Yes | Required (account + checkout) | App functionality; Account management |
| **Phone number** | Yes | Required (used as the login identifier) | App functionality; Account management |
| **Email address** | Yes | **Optional** | App functionality (order contact) |
| **Physical / mailing address** | Yes | **Optional** (delivery address in profile / checkout) | App functionality (order delivery) |
| Other personal info (e.g. DOB, gender) | **No** | — | Not collected |

### Financial info

| Data type | Collected | Notes |
|---|---|---|
| **Payment / card info** | **No** | Payment is **Cash on Delivery only**. KNET card gateway is disabled in this build — no card data touches the app. **If KNET is enabled later, this becomes "Yes" (or handled entirely by the KNET/processor — declare accordingly).** |
| Purchase history | **Yes** | See "App activity" below (order history is stored). |

### Location
| Data type | Collected | Notes |
|---|---|---|
| Approximate location | **No** | No location permission; delivery address is typed, not from GPS. |
| Precise location | **No** | — |

### App activity

| Data type | Collected | Required? | Purpose(s) |
|---|---|---|---|
| **Purchase / order history** | Yes | Required to place & track orders | App functionality; Account management |
| In-app search history | **No** (declare No unless you persist searches server-side) | — | — |
| Other user-generated content | **No** | — | — |

### Other data types — declare **No / Not collected**

- Web browsing history — **No**
- Contacts — **No**
- Photos / videos / audio / files — **No**
- Calendar — **No**
- Health & fitness — **No**
- Device or other IDs (advertising ID, etc.) — **No** (no analytics/ad SDKs found)
- App info & performance (crash logs, diagnostics) — **No** (no crash/analytics SDK bundled)
- Messages (SMS/email content) — **No**

---

## Section C — Security practices (declare these)

| Practice | Declaration |
|---|---|
| Data encrypted in transit | **Yes** (HTTPS) |
| Users can request data deletion | **Yes** — after you add the deletion method (see Section A note) |
| Committed to Play Families Policy | **No** (app is not targeting children — see 05-console-declarations.md) |
| Independent security review | Optional — leave unchecked unless you have one |

---

## Section D — Summary of what the store's "Data safety" card will show

If answered as above, your public Data Safety card will read approximately:

- **Data this app may collect:** Name, Phone number, Email address, Address, Purchase history
- **Data shared with third parties:** None
- **Security:** Data is encrypted in transit; you can request that data be deleted

This is a clean, trust-building card — exactly what you want for a co-op retail app.

---

## Re-declare when any of these change
- KNET / online card payment is enabled → add Financial info (payment info).
- Push notifications via Firebase (FCM) added → likely adds Device IDs / app activity.
- Any analytics (GA4, Firebase Analytics), crash reporting, or ad SDK added → new data types + possibly "Data shared".
