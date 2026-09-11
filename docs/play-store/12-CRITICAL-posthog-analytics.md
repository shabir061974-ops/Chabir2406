# ✅ RESOLVED — PostHog analytics removed from production

**Discovered:** 21 July 2026, during post-deployment verification of the live site.
**Resolved:** 21 July 2026 — **Option A (complete removal) approved and executed.**

## Resolution summary
- Deleted the entire PostHog `<script>` block (71 lines) from `frontend/public/index.html`.
- Confirmed PostHog was **not** an npm dependency (`package.json` / `yarn.lock`: 0 matches) —
  nothing to uninstall; no tracking calls existed anywhere in `frontend/src`.
- Updated the Privacy Policy (EN + AR) so the Cookies section no longer implies analytics, and
  the "Information We Do Not Collect" section explicitly rules out analytics, advertising,
  tracking, profiling, and session recording. "Last updated" bumped to 21 July 2026.
- Redeployed frontend only; verified live: **no requests to `us.i.posthog.com`, no PostHog
  JavaScript, no `window.posthog`, no PostHog cookies or localStorage entries.**
- Data Safety key (`03-data-safety.md`) is accurate again: no analytics, no Device IDs,
  no third-party sharing.

**No further action required.** The original analysis is retained below for the record.

---

## (Historical record — the original finding)

---

## What was found

`frontend/public/index.html` (lines ~143–207) contains a hardcoded **PostHog** analytics
snippet — almost certainly leftover scaffolding from the Emergent platform (an
`emergent-main.js` script tag sits commented-out just above it).

Verified **live on www.faihacoopkw.com** in a real browser:

| Property | Value |
|---|---|
| Loaded | `true` |
| Opt-out / disabled | `false` — **actively capturing** |
| Project key | `phc_xAvL2Iq4tFmANRE7kzbKwaSqp1HJjN7x48s3vr0CMjs` |
| Endpoint | `https://us.i.posthog.com` (PostHog Inc., **United States**) |
| Persistent identifiers | `distinct_id`, `$device_id`, `$sesid` (session id) |
| Persistence | `localStorage + cookie` |
| Server-configurable features present | autocapture, **session recording/replay**, heatmaps, web vitals, exception capture, dead clicks, feature flags |

Because the Android app is a WebView that loads this exact site, **the Play app inherits all of
this**. It is not just a website concern.

---

## Why this is critical

### 1. The Privacy Policy I deployed now contains an inaccurate statement
The new "Information We Do Not Collect" section says:

> "...and it does not use third-party advertising or **tracking technologies**."

With PostHog active, **that clause is false.** (The rest of the sentence — no GPS, contacts,
photos, camera, microphone, files — remains true.) An inaccurate privacy policy is both a Google
Play policy problem and a legal/regulatory exposure. **This needs fixing either way.**

### 2. The Data Safety answer key (`03-data-safety.md`) would be a false declaration
It currently says: no analytics, **no Device or other IDs**, and **no data shared with third
parties**. With PostHog live, a truthful Data Safety form would instead need to declare:

- **Device or other IDs** — collected (`distinct_id`, `$device_id`)
- **App activity** — app interactions / page views (autocapture)
- **Approximate location** — likely, PostHog derives coarse geo from IP by default
- **Data shared with a third party** — data is transmitted to PostHog Inc. (US)
- Possibly **session recording** implications if replay is enabled server-side

Submitting the current (no-analytics) declaration while PostHog runs = **false Data Safety
declaration**, one of the most common causes of app **suspension/removal**.

### 3. Session replay + autocapture on a checkout page is a real PII risk
PostHog's autocapture and session-recording features can capture clicks and, depending on
server-side config and masking, form interactions — on pages where customers enter **name,
phone, and delivery address**. This deserves scrutiny regardless of Play.

---

## Your options (pick one — I will not change anything without approval)

### ✅ Option A — Remove PostHog (RECOMMENDED)
- **Change:** delete the PostHog `<script>` block from `frontend/public/index.html`, redeploy frontend.
- **Result:** the deployed Privacy Policy becomes **accurate as written**; Data Safety stays the
  clean "no data shared / no device IDs" card; strongest privacy posture; simplest review.
- **Cost:** you lose product analytics (which appears unused — it's leftover scaffolding, and
  the tracking key belongs to an Emergent-generated project, not a Faiha account you manage).
- **Effort:** one small frontend edit + one frontend-only redeploy (same safe process as today).

### Option B — Keep PostHog, and make everything truthful
- Amend the Privacy Policy: remove/reword the "no tracking technologies" clause and add an
  "Analytics" section naming PostHog, what it collects, US transfer, and how to opt out.
- Update Data Safety to declare Device IDs + App activity (+ approx. location) and third-party sharing.
- Update the Cookies section to disclose third-party analytics cookies.
- Consider a cookie/analytics **consent banner** (advisable for tracking cookies).
- **Cost:** weaker store privacy card, more review surface, ongoing obligation to keep it accurate.

### Option C — Keep PostHog but disable capture
- Set `opt_out_capturing_by_default: true` (or gate behind consent). Middle ground; still
  requires policy/Data-Safety accuracy if it can ever be enabled.

---

## My recommendation

**Option A — remove it.** This is leftover platform scaffolding sending your customers' behavioural
data to a third-party US service under a key you don't control. Removing it makes the
already-deployed Privacy Policy correct, keeps the Data Safety declaration clean and simple, and
removes an entire category of review risk — at essentially no cost to the business.

---

## Until this is resolved

- ⛔ **Do not submit the Data Safety form** using `03-data-safety.md` as-is.
- ⛔ **Do not paste the privacy URL into Play Console** as "final" while it contains the
  inaccurate tracking clause.
- Everything else from the deployment is fine and verified.

Tell me which option you want and I'll prepare the exact change for your approval.
