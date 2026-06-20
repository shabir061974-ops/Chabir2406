# Faiha Co-operative Society — E-Commerce Platform (PRD)

## Original Problem Statement
Bilingual (EN/AR + RTL) supermarket e-commerce platform for Faiha Co-operative Society, Kuwait.
Customer storefront (guest checkout, COD + KNET) + Admin dashboard. Integrates Oracle `PRODUCT_MASTER`
(read-only, host 83.96.72.89:1521 / service DW / schema COOP_POS_BO_DB) for live product/stock/price,
with MongoDB for app data. Currency KD (3 decimals).

## User Decisions
- Oracle: credentials provided; DW is firewalled to the production VPS → app uses MongoDB-seeded fallback
  catalog in this environment, live Oracle activates automatically on the whitelisted VPS.
- Email: deferred (Phase 3 later).
- Auth: customers shop via guest checkout (no account); admin uses JWT login.
- Payments: COD now + simulated KNET hosted-payment page (real merchant creds to be wired later).
- Checkout: guest checkout allowed.

## Architecture
- Frontend: React (CRA + craco) + TailwindCSS + shadcn/ui + React Query + framer-motion. Custom
  Language/Cart/Auth contexts. RTL via `dir` switching + logical Tailwind utilities.
- Backend: FastAPI + Motor (MongoDB). `oracle_repo.py` = python-oracledb thin-mode pool with graceful
  fallback. JWT (cookie) admin auth + RBAC. `seed_data.py` = 8 categories + 34 bilingual products.
- Payments: COD (auto-confirm) + KNET strategy (simulated `/payments/knet/callback`).

## Personas
- Customer (guest) — browse, search, cart, checkout, track orders.
- Admin / Super Admin (admin@faiha.coop) — products, orders, categories, coupons, delivery, reports.

## Implemented (2026-06-20)
- Storefront: home (hero, categories, featured, promotions), catalog (filter/search/sort), product detail.
- Cart (localStorage) + slide-out drawer; KD 3-decimal pricing; discount badges.
- Guest checkout: delivery form, COD/KNET, coupon (FAIHA10), min-order + free-delivery logic.
- Order confirmation + status tracker; track-order page.
- Simulated KNET hosted payment page (capture/cancel) → updates order + payment.
- Admin: dashboard KPIs+charts, orders (status update + detail), products CRUD, categories CRUD,
  coupons, delivery config, customers, reports (daily/weekly/monthly + CSV export), audit logging.
- Oracle integration layer (read-only list/stock-check) with live-stock validation at checkout.
- Backend tested 27/27 pytest; frontend e2e flows verified.

## Backlog
- P0: Wire real KNET merchant creds (Tranportal ID, Resource Key, terminal URL); activate Oracle on VPS.
- P1: Email notifications (SendGrid/Resend) on order status transitions; PDF invoices (WeasyPrint).
- P1: Customer accounts + order history (optional login); password reset.
- P2: Excel (.xlsx) report export; product image uploads to object storage; audit-log admin viewer UI.
- P2: Rate limiting (slowapi) on auth/checkout; refresh-token rotation; secure cookies in prod.

## Next Tasks
1. Provide KNET test credentials → replace simulated gateway with real hosted payment page.
2. Deploy to Hostinger VPS (whitelist IP) to enable live Oracle PRODUCT_MASTER.
3. Add email + PDF invoices (Phase 3).
