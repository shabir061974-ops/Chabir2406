# 🟡 PREPARED CHANGE — Offline Banner (Option B) — **NOT APPLIED**

> **STATUS: STAGED ONLY. NOT written to `frontend/src`. NOT built. NOT deployed.**
> The Alpha build is deliberately frozen while the closed test runs.
> This file lives in `docs/` which is outside the CRA build path, so it cannot affect the app.
>
> **Prepared:** 21 July 2026 · **Apply when:** approved after tester feedback review

---

## Decision record

**Why deferred:** The Alpha closed test went live 21 Jul 16:33 and the 12-tester threshold has
been met, so the 14-day clock is running. The build is being held stable to avoid introducing
variables while feedback is collected.

**Trigger to apply:** testers report offline/connectivity confusion, OR the planned post-test
bundled update.

**Impact if applied:** frontend-only. No AAB rebuild. No effect on the 14-day clock (no new
release goes to the track). Testers receive it on next app open with no reinstall.

---

## File 1 of 3 — NEW: `frontend/src/components/storefront/OfflineBanner.jsx`

Create this file with exactly this content:

```jsx
import { useEffect, useState, useCallback } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

/**
 * Branded offline notice. Replaces the bare WebView error the Android app would
 * otherwise show when connectivity drops mid-session.
 *
 * Note: navigator.onLine reports the device's network interface only — it cannot
 * detect that the server itself is unreachable.
 */
export default function OfflineBanner() {
    const { t } = useLang();
    const [offline, setOffline] = useState(
        () => typeof navigator !== "undefined" && !navigator.onLine
    );

    useEffect(() => {
        const goOffline = () => setOffline(true);
        const goOnline = () => setOffline(false);
        window.addEventListener("offline", goOffline);
        window.addEventListener("online", goOnline);
        return () => {
            window.removeEventListener("offline", goOffline);
            window.removeEventListener("online", goOnline);
        };
    }, []);

    const retry = useCallback(() => {
        if (navigator.onLine) window.location.reload();
    }, []);

    if (!offline) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            data-testid="offline-banner"
            className="fixed inset-x-0 bottom-0 z-[100] bg-forest text-white px-4 py-3 shadow-lg"
        >
            <div className="mx-auto max-w-3xl flex items-center gap-3">
                <WifiOff className="w-5 h-5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{t("offline_title")}</p>
                    <p className="text-white/80 text-xs">{t("offline_body")}</p>
                </div>
                <button
                    type="button"
                    onClick={retry}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm font-semibold"
                >
                    <RefreshCw className="w-4 h-4" /> {t("offline_retry")}
                </button>
            </div>
        </div>
    );
}
```

---

## File 2 of 3 — MODIFY: `frontend/src/App.js`

Two additions. Nothing removed.

**Add after the `StoreLayout` import (currently line 8):**
```js
import OfflineBanner from "@/components/storefront/OfflineBanner";
```

**Add immediately after the `<Toaster ... />` line:**
```jsx
<OfflineBanner />
```

Resulting context:
```jsx
<BrowserRouter>
    <Toaster position="top-center" richColors />
    <OfflineBanner />
    <Routes>
```

Placement rationale: inside `LanguageProvider` so `t()` resolves; outside `<Routes>` so it
renders on every screen including admin.

---

## File 3 of 3 — MODIFY: `frontend/src/i18n/translations.js`

Additive only — 3 keys per language.

**In the `en:` block:**
```js
offline_title: "You're offline",
offline_body: "Check your internet connection. Your cart is saved.",
offline_retry: "Retry",
```

**In the `ar:` block:**
```js
offline_title: "أنت غير متصل بالإنترنت",
offline_body: "تحقق من اتصالك بالإنترنت. سلّتك محفوظة.",
offline_retry: "إعادة المحاولة",
```

---

## Apply procedure (when approved)

1. Create File 1; apply the two edits in Files 2 and 3.
2. Verify locally: `yarn start`, then in DevTools → Network → set **Offline**. Banner should
   appear; switch back to **Online** and it should disappear.
3. Check both languages and RTL layout.
4. Confirm zero console errors.
5. Deploy frontend-only (do **not** use `deploy.ps1` — it overwrites production `backend/.env`):
   ```bash
   # backup first
   ssh -i ~/.ssh/faiha_vps root@200.97.161.12 \
     "cd /root/faiha-ecom && mkdir -p /root/ob-backup && cp frontend/src/App.js frontend/src/i18n/translations.js /root/ob-backup/"
   # upload the 3 files, then:
   ssh -i ~/.ssh/faiha_vps root@200.97.161.12 \
     "cd /root/faiha-ecom && docker compose build frontend && docker compose up -d --no-deps frontend"
   ```
   `--no-deps` is essential — without it the backend container is recreated too.

## Rollback
Restore the two modified files from the backup dir, delete `OfflineBanner.jsx`, rebuild frontend.

---

## Known limitations (unchanged from the proposal)

| Scenario | Covered? |
|---|---|
| Connection drops while app is open | ✅ Yes |
| Connection restored | ✅ Yes, banner auto-hides |
| **Cold start with no network** | ❌ **No** — WebView fails before React loads. Needs Option A (`errorPath` + bundled page + AAB rebuild) |
| Server down but phone online | ❌ No — `navigator.onLine` only reports the device radio |

---

## Backlog: items to bundle into ONE future AAB rebuild

Do not do these piecemeal — each rebuild is a new Alpha release. Batch them.

| ID | Item | Type |
|---|---|---|
| P1-1(A) | Offline `errorPath` + bundled offline page — fixes cold start | capacitor config + asset |
| P2-1 | `allowBackup="false"` — stops auth tokens reaching Google Drive backups | Android manifest |
| P3-1 | `GENERATE_SOURCEMAP=false` — removes 8.5 MB of source maps, ~halves AAB | build config |
| P3-2 | Remove dead cleartext rule for staging IP `200.97.161.12` | network security config |

**Reminder: pushing a new build to Alpha does NOT reset the 14-day clock.** These can ship any
time during or after the test window.
