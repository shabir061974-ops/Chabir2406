# Faiha Store — Graphic Generation Prompts (Play Store Assets)

**Existing assets found in the project:**
- `frontend/public/faiha-logo.png` (the brand logo — reuse as the icon mark)
- `frontend/public/hero-cafe-bakery-*.webp` (EN + AR hero images — reusable as feature-graphic backdrop / screenshot framing)
- Android adaptive launcher icons (already inside the AAB) — reuse the same mark for the 512 icon.

**Missing (must create):** 512×512 Play icon · 1024×500 feature graphic · phone screenshots · (optional) tablet screenshots.

Below are ready-to-use prompts for an image generator (Midjourney / DALL·E / Firefly / etc.).
Keep the **brand palette**: deep grocery **green** (primary "forest"), warm **terracotta**
accent, clean white. Match the installed app's look. Replace the palette hex with your exact
brand values if you have them.

> **Best practice:** For the **icon**, don't AI-generate a brand-new logo — reuse the real
> `faiha-logo.png` mark and just place it on a 512×512 branded background (a designer or a
> simple canvas export is more reliable than AI here). Use AI mainly for the feature graphic
> and screenshot backdrops. Never fabricate text you can instead screenshot from the real app.

---

## 1. App Icon — 512×512 PNG (square, no rounded corners)

**Preferred (no AI):** Place the existing Faiha logo/mark centered on a solid deep-green
(#1f5e3d-ish "forest") square, mark occupying ~60% width, generous padding, no text, no
shadow. Export 512×512 PNG.

**AI prompt (if regenerating the mark):**
```
A clean, modern app icon for a Kuwaiti grocery cooperative called "Faiha Store". Centered
minimalist emblem combining a fresh green leaf and a shopping bag, flat vector style, deep
forest-green background (#1F5E3D) with a subtle warm terracotta accent. Simple, high-contrast,
instantly recognizable at small sizes. No text, no photorealism, no gradients-heavy, no drop
shadow. Square 1:1, centered, safe margins. Flat 2D logo, professional, trustworthy.
```
Rules: 512×512, PNG, full-bleed square (Google rounds it), no letters/UI, ≤1 MB.

---

## 2. Feature Graphic — 1024×500 PNG/JPEG (no transparency)

```
A wide 1024x500 promotional banner for "Faiha Store", the official grocery shopping app of
AL-FAIHA CO-OPERATIVE SOCIETY in Kuwait. Left third: the Faiha logo and a short tagline
"Your Co-op, Delivered". Right side: an appetizing flat-lay of fresh groceries — vegetables,
bakery, coffee, beverages — in a bright, clean composition. Deep forest-green brand backdrop
(#1F5E3D) with warm terracotta accents and white space. Modern, premium, welcoming. Leave the
central horizontal strip clear of important text (a video play button may overlay it). No
device frames, no fake app screenshots, high resolution, professional marketing quality.
```
Provide an **Arabic variant** too (tagline: «متجرك بين يديك»). Rules: exactly 1024×500, no alpha, ≤15 MB.

---

## 3. Phone Screenshots — 1080×1920 PNG (capture REAL app; frame with AI/design)

Do **not** AI-invent screenshots — **capture the real running app** (device or emulator at
1080×1920), then optionally place each capture in a tasteful branded frame with a one-line
caption. Suggested set (6):

| # | Screen to capture | Caption (EN) | Caption (AR) |
|---|---|---|---|
| 1 | Home / storefront | "Everything from your co-op" | «كل ما تحتاجه من جمعيتك» |
| 2 | Product catalog grid (KD prices) | "Thousands of products" | «آلاف المنتجات» |
| 3 | Product detail (bilingual name) | "Clear prices in KD" | «أسعار واضحة بالدينار» |
| 4 | Cart with coupon applied | "Apply coupons & save" | «استخدم الكوبونات ووفّر» |
| 5 | Checkout (Cash on Delivery) | "Pay on delivery" | «الدفع عند الاستلام» |
| 6 | Order tracking / confirmation | "Track every order" | «تتبّع طلبك» |

**Optional AI prompt for a branded frame/background behind each screenshot:**
```
A clean promotional background for a mobile app screenshot showcase: soft deep-green to white
gradient with subtle terracotta accents, a centered empty phone mockup area (portrait), room
for one short caption at the top. Minimal, premium e-commerce style, no text, 1080x1920.
```
Rules per image: PNG/JPEG, 1080×1920 (portrait 9:16), real data (no "test test"), include ≥1 Arabic screenshot.

---

## 4. (Optional) Tablet Screenshots

Capture the responsive layout on a tablet viewport and frame as above.
- 7-inch: 1200×1920 · 10-inch: 1600×2560. 1–8 each. Same content, wider layout.

---

## Deliverable filenames (suggested)
```
play-assets/
  icon-512.png
  feature-1024x500-en.png
  feature-1024x500-ar.png
  phone-01-home.png ... phone-06-tracking.png
  phone-ar-01.png (at least one Arabic)
  tablet7-01.png / tablet10-01.png   (optional)
```

## Do / Don't
- ✅ Match the app's real colors and logo. ✅ Use real screenshots. ✅ Keep captions short.
- ❌ No "Free/Sale/Best" badges on the icon. ❌ No fake reviews or store badges. ❌ No
  Google Play logo in your graphics. ❌ No misleading screens (e.g. card payment while COD-only).
