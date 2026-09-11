# Faiha Store — Graphic Assets Specification (Google Play)

This is the exact spec for every image Google Play requires or recommends, plus concrete
art direction based on the app's existing brand (the "forest" green + "terracotta" accent
used in the app, and the existing `faiha-logo.png`).

> I cannot generate the final binary images here, but every dimension, format and content
> rule below is production-accurate. Hand these to a designer or an image tool.

---

## Brand reference (from the app itself)

| Token | Value | Where it's used |
|---|---|---|
| Primary green ("forest") | deep grocery green | buttons, headers, brand |
| Accent ("terracotta") | warm clay/orange | highlights, secondary CTAs |
| Logo | `frontend/public/faiha-logo.png` (250 KB) | header / splash |
| Typeface feel | clean modern heading + readable body | matches in-app fonts |

Keep all Play graphics visually consistent with the app so the store page and the installed app feel like one product.

---

## 1. App Icon  *(REQUIRED)*

| Property | Requirement |
|---|---|
| Dimensions | **512 × 512 px** |
| Format | **32‑bit PNG** (with alpha allowed, but design on a solid background) |
| Max file size | 1024 KB |
| Shape | Full square — **Google applies the rounded mask automatically**. Do NOT pre-round corners or add your own shadow. |
| Safe zone | Keep the logo/mark within the central ~66% (Play may crop to a circle/squircle on some surfaces). |
| Content | The Faiha mark on the brand green background. No text screenshots, no "Free", no store badges, no promotional text. |

> The **in-app launcher icon is already set** (adaptive icon in the AAB). This 512×512 is the separate **Play listing icon** and should match it.

---

## 2. Feature Graphic  *(REQUIRED)*

| Property | Requirement |
|---|---|
| Dimensions | **1024 × 500 px** |
| Format | PNG or JPEG (no alpha/transparency) |
| Max file size | 15 MB |
| Content | Brand banner: Faiha logo + tagline (e.g. "Your Co‑op, Delivered" / "متجرك الآن بين يديك"), product imagery, brand green background. |
| Safe zone | Keep logo and text away from edges and **out of the horizontal center strip** — Play overlays a ▶ play button here if you add a promo video. Center ~1/3 should be clear of critical text. |
| Text | Minimal — a short tagline only. Avoid long paragraphs; they become unreadable when scaled. |

---

## 3. Phone Screenshots  *(REQUIRED — minimum 2, up to 8)*

| Property | Requirement |
|---|---|
| Count | **2–8** (provide **4–6** for a strong listing) |
| Format | PNG or JPEG (24‑bit, no alpha) |
| Aspect ratio | 16:9 or 9:16 |
| Dimensions | Each side **min 320 px, max 3840 px**; longer side ≤ 2× shorter side. **Recommended: 1080 × 1920 px** (portrait). |

**Recommended screenshot sequence (capture from the running app):**
1. **Home / storefront** — hero + categories (shows it's a real store).
2. **Product catalog** — grid of products with KD prices.
3. **Product detail** — a single product with bilingual name and price.
4. **Cart / checkout** — basket with a coupon applied.
5. **Order tracking / confirmation** — proves the delivery flow.
6. **Account** — sign-in / order history (optional).

**Tips:**
- Use real, clean data (no "test test", no placeholder Lorem).
- You may add a thin caption bar per screenshot (e.g. "Browse thousands of products") — keep captions short and on-brand.
- Capture at least one **Arabic** screenshot to signal bilingual support.
- Capture on a device or emulator at 1080×1920 for crispness.

---

## 4. Tablet Screenshots  *(OPTIONAL — recommended since layout is responsive)*

Only needed if you want the app featured well on tablets. The app is a responsive web
layout, so it renders fine on tablets — providing these improves tablet store presence.

| Type | Dimensions (recommended) | Count |
|---|---|---|
| 7‑inch tablet | 1200 × 1920 px (portrait) | 1–8 |
| 10‑inch tablet | 1600 × 2560 px (portrait) | 1–8 |

Format/ratio rules are the same as phone screenshots (PNG/JPEG, 16:9 or 9:16, side 320–3840 px).

> If you don't provide tablet screenshots, Play may show your phone screenshots to tablet users and can flag the app as "not designed for tablets." For a co‑op grocery app that's acceptable for launch — add them later if you target tablets.

---

## 5. Optional but nice-to-have

| Asset | Spec | Notes |
|---|---|---|
| Promo video | YouTube URL | 30–120 s app walkthrough; shows in listing above screenshots. |
| Chromebook/Wear/TV | — | **Not applicable** — this is a phone/tablet app. Leave those form factors unchecked. |

---

## Quick production checklist

- [ ] `icon-512.png` — 512×512, square, brand green, no rounded corners
- [ ] `feature-graphic-1024x500.png` — center strip kept clear
- [ ] `phone-01.png` … `phone-06.png` — 1080×1920, real data, ≥1 Arabic
- [ ] (optional) `tablet7-*.png`, `tablet10-*.png`
- [ ] All images spell-checked and free of placeholder content
- [ ] Colors consistent with the installed app
