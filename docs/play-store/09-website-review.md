# Website Review for Google Play Readiness — faihacoopkw.com

Verified against the **live** site (rendered in a real browser, since it's a client-rendered
React SPA) on 20 July 2026.

## Summary

| Requirement | Status | Notes |
|---|---|---|
| **HTTPS** | ✅ Ready | Site loads over `https://` with a valid certificate. |
| **Privacy Policy** | ✅ Ready (after deploy) | `/privacy` exists and now includes all Play-required sections (see below). Must **deploy** the update to go live. |
| **Terms & Conditions** | ✅ Ready | `/terms` exists (usage, orders, delivery, returns, payments, responsibilities, IP). |
| **Contact information** | ✅ Ready | `/contact` page + footer: email `info@faihacoopkw.com`, phone `+965 1861000`, WhatsApp `+965 90986000`, map, contact form. |
| **Company information** | ✅ Ready | `/about` describes AL-FAIHA CO-OPERATIVE SOCIETY. Footer shows legal name. |
| **Footer navigation** | ✅ Ready | Links to About, Contact, Privacy, Terms, Products, Track Order all present. |

**Verdict: the website meets Google Play's linked-content requirements.** The only action is
to **deploy the updated Privacy Policy** so the new sections are live before you paste the URL
into Play Console.

---

## What was live before vs. after the update

**Before** — Privacy Policy had 6 sections: Commitment, Info We Collect, Cookies, Payment
Security, Data Protection, Contact. It was **missing** the Play-mandatory: data **deletion /
user rights**, data **retention**, **children's privacy**, and a **"last updated"** date.

**After** (source updated in `frontend/src`, pending deploy) — Privacy Policy now has, in order:
1. Our Privacy Commitment
2. Customer Information We Collect
3. **Information We Do Not Collect** *(new — aligns with Data Safety: no location/contacts/etc.)*
4. Cookies
5. Payment Security
6. Data Protection
7. **How Long We Keep Your Information** *(new — retention)*
8. **Your Rights & Account Deletion** *(new — deletion via email/WhatsApp, 30-day, required by Play)*
9. **Children's Privacy** *(new)*
10. **Changes to This Policy** *(new)*
11. Contact Information *(now includes WhatsApp)*
+ **"Last updated: 20 July 2026"** in the header.

Both **English and Arabic** were updated. Verified rendering locally with **zero console
errors**.

---

## Findings / recommendations (non-blocking)

1. ⚠️ **Deploy required.** The privacy changes are in `frontend/src` only. They are **not live**
   until you rebuild the frontend and redeploy to the VPS (your `deploy.ps1` / Docker flow).
   Play needs the live URL to show the new content. **This is the top action.**

2. ℹ️ **SPA rendering / SEO.** The site is client-rendered, so a plain HTTP fetch (and some
   crawlers) see only the shell. Google Play's reviewer uses a real browser, so this is **not**
   a Play blocker — but for search-engine discoverability of the policy/terms you may later
   consider prerendering/SSR. Optional.

3. ℹ️ **Privacy "Payment Security" wording** mentions card/KNET gateways, while the app is
   currently **Cash on Delivery only**. This is acceptable (it describes handling *when* card
   payment is offered) and does **not** conflict with Play — but keep the **Data Safety** form
   set to "no financial info collected" until KNET is actually enabled.

4. ✅ **Contact reachability.** `info@faihacoopkw.com` is used for contact **and** as the
   account-deletion channel — confirm it's actively monitored (it's now load-bearing for
   compliance).

5. ✅ **Terms already cover** returns/refunds and payments — good for a commerce app; no change
   needed for Play.
