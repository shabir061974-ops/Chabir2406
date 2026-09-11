# Account Deletion — Analysis & Recommendation (for your approval)

> **Nothing has been implemented.** This is analysis + a proposal. No account-deletion code,
> endpoint, or UI has been added. Await your decision before any implementation.

---

## 1. Does the app/website already provide account deletion?

**No.** I reviewed the code:

- Customer accounts exist: register/login by **phone + password**, profile with name/email/
  addresses, and order history (`CustomerAuthContext.jsx`, `Account.jsx`).
- The account UI supports **sign in, sign out, update profile** — but there is **no "Delete my
  account" action**, and there is **no `DELETE /customer` (or equivalent) endpoint** in the
  backend (`server.py`).
- So today a customer has **no way to delete their account or personal data**.

This is a **compliance gap** for Google Play (and good-practice/privacy law generally).

---

## 2. Does Google Play accept email-based deletion, or is in-app deletion required?

**Google Play accepts a documented off-app request channel (email or web form). An in-app
"delete account" button is recommended but NOT strictly mandatory.**

Google's "Data deletion" / Account deletion requirements (Play Console → App content → Data
safety) require that you provide, at minimum:

1. A way for users to **request deletion of the account and associated data**, and
2. If an account can be created in the app, a way to request deletion that is **reachable
   without re-installing** — a **publicly accessible URL** works.

Specifically, Google's policy allows either:
- **In-app deletion**, and/or
- A **web resource / request mechanism** (e.g. a deletion request page or a clearly stated
  email address) that you register in the Play Console "Data deletion" field.

> **Bottom line:** A clearly documented **email-based deletion request** (which we've now
> written into the Privacy Policy → "Your Rights & Account Deletion", using
> `info@faihacoopkw.com` + WhatsApp) **satisfies the Play requirement**. You do **not** have to
> ship an in-app delete button to submit. However, apps that *only* offer email deletion but
> can delete in-app easily are increasingly expected to add the in-app path, and it reduces
> support load. Recommended end state: **both**.

---

## 3. Options (pick one)

### Option A — Email-based deletion only *(fastest, zero code, Play-compliant)* ✅ recommended for launch
- **What:** Publish the deletion process in the Privacy Policy (done in the updated page) and
  register the method in Play Console.
- **Process:** Customer emails `info@faihacoopkw.com` (or WhatsApp +965 90986000) → staff
  verify identity (registered phone/email) → staff delete the account/data from the database
  within 30 days.
- **Pros:** No code change, no Android change, unblocks submission immediately.
- **Cons:** Manual staff effort; needs an internal SOP so requests are actually honored.
- **Requires from you:** Confirm `info@faihacoopkw.com` is monitored and assign someone to
  process deletions; optionally add a simple internal runbook.

### Option B — In-app self-service deletion *(best UX, needs code — NOT Android)*
- **What:** Add a "Delete my account" button in the Account page + a backend
  `DELETE /api/customer/me` endpoint that removes/anonymises the customer and their PII.
- **Scope:** This is **website/backend** work (`frontend/src` + `backend/server.py`) — it is
  **NOT** an Android source change and would **not** require rebuilding the AAB (the app is a
  WebView of the site). Still, it is app functionality, so **I will not implement it without
  your explicit approval.**
- **Pros:** Cleanest for users and reviewers; fully automated.
- **Cons:** Requires implementing + testing a destructive endpoint (must handle orders,
  auth tokens, and "soft delete vs hard delete" carefully).

### Option C — Web deletion request form
- A simple public page/form (e.g. `/delete-account`) that collects the request and emails
  staff. Middle ground; still manual fulfilment.

---

## 4. My recommendation

**Launch with Option A (email-based) now** — it is Play-compliant, requires no code, and
unblocks submission. The updated Privacy Policy already documents it. **Then, as a fast
follow, add Option B (in-app deletion)** for better UX and lower support load.

If you approve **Option B**, tell me and I will propose the exact endpoint + UI design first
(still without touching Android source), and implement only after you approve that design.

---

## 5. What you must do for Play regardless of option
- In **Play Console → App content → Data safety → "Data deletion"**, choose that users **can
  request account deletion**, and provide the **URL** where the method is documented:
  `https://www.faihacoopkw.com/privacy` (the "Your Rights & Account Deletion" section).
- Make sure the mailbox/WhatsApp used for requests is **actively monitored**.
