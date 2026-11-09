# Backend changes — order system, pagination, and the invoicing/debt/printing roadmap

**Status note (2026-11-09):** §1 (pagination) and §2 (order-system phase 1) are live in production (confirmed via `GET /restaurants?page=1&limit=2` and `GET /stores?page=1&limit=2`, both returning the exact `{ items, meta }` shape asked for below). The frontend's admin restaurants/stores/agents consoles now fetch real server-paginated pages instead of the old "fetch everything, slice in the browser" approach — confirmed by type-checking and linting the whole project clean; a full logged-in admin-console click-through still hasn't been done against production (no admin credentials available in the environment that did this pass), so please do one pass of that before calling §1 fully closed. Two deliberate scope notes from the backend implementation pass, carried over here:

- `GET /restaurants` (the public directory list) didn't exist before this pass and was added fresh — please double-check it against `GET /restaurants/featured` and the known pre-existing routing bug where `restaurants/:slug` actually calls `getStoreBySlug` (that bug is untouched, out of scope here, just flagging it's still live).
- `/admin/agents`' new `q` search matches name and referral code only, not phone — intentional, to avoid duplicate rows from the agent↔region one-to-many relation.
- **New gap found while wiring this up, not yet fixed**: `GET /me/orders` still never returns `selectedOptions` per line — a pre-existing gap, unrelated to this handoff's asks, worth its own pass later.

**Update (2026-11-09, later same day):** the backend shared a full `/customers` + `/invoices` + `/invoices/:id/payments` API reference (deploy confirmed live — `GET /customers` on production answers 401, not 404) ahead of the §4/§5 spec below actually being finalized here. The frontend has now been built directly against *that* real reference rather than the §4/§5 proposal — a full dashboard section: a customer book (`/dashboard/customers`), "issue invoice" from any `delivered` order (`/dashboard/invoices`, plus the same panel surfaced inline wherever delivered orders show up), per-invoice payment recording, and a WhatsApp debt-reminder link built client-side from the invoice's own `remaining`/`customerPhone` — no separate endpoint needed for that last part, same as every other `wa.me` link already in the app. §4/§5 below are now superseded by what was actually shipped (the real field names won, as expected) — kept only as the historical record of what was asked for before the reference came back. Scope notes from building this pass:
  - No `GET /invoices?orderId=` filter exists, so the "which delivered orders are already invoiced" check client-side fetches up to 100 invoices and cross-references `orderId` locally — fine at today's per-business scale, but if `GET /invoices` grows an `orderId` filter later the frontend would happily switch to it.
  - `POST /customers`' 409 (phone already in use) and `POST /invoices/:id/payments`' 400 (amount over remaining) are both shown as toasts using whatever message the backend sends — same `extractErrorMessage` convention as every other write in the app, so no explicit 1:1 mapping was needed here.
  - Not done yet: the actual 80mm thermal-print template (§6) — building against this real invoice shape is now unblocked, just not started.

This is a separate handoff from `update.md` (which stays for the ongoing day-to-day asks) because everything here traces back to one internal report ("نظام الطلبات على منيو سوريا", تشرين الثاني 2026) that audited the whole order flow end to end and laid out a 4-phase plan. §1–§2 below are asks the frontend has already built against (mock data today, real data the moment these ship). §3 is the next phase, not yet built on our side — documented now so it can be scoped in parallel. §4–§5 (invoicing, debt) are superseded by the "Update" note above — the real API already exists and the frontend is built against it. §6 (printing) remains **not started on the frontend at all**.

---

## 🆕 New ask: pagination, filtering and sorting as real query parameters on every list endpoint

**Why:** every list in the console (admin's users/restaurants/stores/registration-requests, the agent's own restaurants/stores, the public restaurants/stores directory) fetches the *entire* table in one request today (`?limit=100` on the admin side, no limit at all on the public directory) and does every bit of searching/filtering/sorting/paging in the browser. That was fine at the current size; it won't be once any of these lists grows past a few hundred rows — `?limit=100` already silently drops anything past row 100, and the public directory ships the full restaurant list to every visitor's browser on every page load. We've already started moving the frontend to real server-side paging (see `GET /admin/subscriptions`, which already works this way) and want to extend the same contract everywhere.

### Read — every list endpoint below, `GET` with query params

```
GET /admin/users?page=1&limit=24&q=&role=&status=
GET /admin/restaurants?page=1&limit=24&q=&governorateId=&regionId=
GET /admin/stores?page=1&limit=24&q=&governorateId=&regionId=
GET /admin/agents?page=1&limit=24&q=&governorateId=&regionId=
GET /registration-requests?page=1&limit=24
GET /restaurants?page=1&limit=12&q=&governorateId=&regionId=        // public directory
GET /stores?page=1&limit=12&q=&governorateId=&regionId=             // public directory
```

- `page` — 1-based, defaults to 1 when absent.
- `limit` — defaults to 24 for admin/agent lists, 12 for the public directory; please accept whatever we send rather than silently capping below what we ask for (we'll keep limits reasonable).
- `q` — free-text search, same fields currently matched in our client-side filter (name, phone where applicable).
- `role`/`status`/`governorateId`/`regionId` — exact-match filters, same values already used elsewhere (e.g. `status=active|banned` for users, `status=active|inactive|suspended` for businesses).
- Response shape, same as `GET /admin/subscriptions` already returns:

```jsonc
{
  "items": [ /* same row shape each endpoint already returns */ ],
  "meta": { "page": 1, "limit": 24, "total": 142, "totalPages": 6 }
}
```

A plain array response (today's shape) still works everywhere on our side — we only switch a given list over to server paging once its endpoint actually returns `{ items, meta }`, so this can ship endpoint by endpoint, in any order, with no coordination needed on exact timing.

**Frontend's own half, already done:** every one of these list pages now keeps its filters/sort/page in the URL's own query string (`?q=...&governorateId=...&page=2`) instead of component state, using `nuqs`. That means a filtered link is now shareable and survives browser back/forward — no backend dependency, just worth knowing the frontend is already structured to hand these exact same param names straight through once each endpoint accepts them server-side.

---

## 🆕 New ask: order-system phase 1 (per the internal report's own priority order)

**Why:** the report's own audit found the order *pricing/state-machine* core already correct and safe (server-computed price, no skipped states), but everything *around* an order missing: nobody is told a new order arrived except by refreshing the page, delivery orders collect an address/fee on our side that never reaches the real order record, there's no way to leave a note on one specific item, and there's no simplified kitchen-facing view. These four are what the report flags as "before commercial launch."

### 1. Two new notification types: `new_order`, `order_status_changed`

Same shape as every other notification already on `GET /notifications` (`AppNotification` — `id`, `userId`, `businessId`, `type`, `message`, `referenceId`, `isRead`, `createdAt`). The notification pipeline itself is fully built and working on both sides already (in-app polling + Firebase push); this is purely "please also fire it when an order is created or an order's `status` changes," scoped to the order's own business owner (and any `STAFF` account on that business, if that's how staff visibility already works for other notification types).

```jsonc
// GET /notifications — one row
{
  "id": "...",
  "userId": "...",
  "businessId": "...",
  "type": "new_order",                 // or "order_status_changed"
  "message": "طلب جديد رقم #1042",      // ready-made, like every other type
  "subscriptionId": null,
  "referenceId": "the order's own id",  // the frontend links new_order/order_status_changed to /dashboard/orders
  "isRead": false,
  "createdAt": "2026-11-09T10:00:00.000Z"
}
```

### 2. Real delivery fields on the real order record — `fulfillmentMode`, `deliveryAddress`, `deliveryFee`

The cart already collects all three (fulfillment mode, delivery address, delivery fee) and already uses them to build the WhatsApp fallback message — they just never reach `POST /public/businesses/:slug/orders` today. The frontend now sends them on every platform order:

```jsonc
// POST /public/businesses/:slug/orders — new optional fields alongside the existing body
{
  "customerName": "...",
  "customerPhone": "...",
  "notes": "...",
  "branchId": "...",
  "fulfillmentMode": "delivery",   // "dineIn" | "pickup" | "delivery" — same spelling as the existing WhatsApp-order-log endpoint's "fulfillment" field, please reuse it rather than a fourth spelling
  "deliveryAddress": "...",        // only meaningful when fulfillmentMode is "delivery"
  "deliveryFee": 8000,             // only meaningful when fulfillmentMode is "delivery"; please fold it into the order's own totalAmount server-side the same way item prices already are
  "items": [ /* unchanged */ ]
}
```

And read back the same three fields on `GET /me/orders` / `GET /orders/:id`:

```jsonc
{
  "id": "...",
  // ...every field already there...
  "fulfillmentMode": "delivery",
  "deliveryAddress": "...",
  "deliveryFee": 8000
}
```

### 3. Activate the per-item `notes` column

The report confirms this column already exists on the order-item row but nothing writes or reads it. The frontend now collects it (a small "add a note" field under each cart line, separate from the order-level notes field that already works) and sends it per item:

```jsonc
// POST /public/businesses/:slug/orders — one item
{ "itemId": "...", "quantity": 2, "options": [...], "notes": "بدون بصل" }
```

Read back on each order line the same way (`GET /me/orders`, `GET /orders/:id`):

```jsonc
{ "itemId": "...", "name": {...}, "quantity": 2, "price": 25000, "selectedOptions": [...], "notes": "بدون بصل" }
```

### 4. Confirm the status enum spelling

The frontend's board now talks to the real 7-state machine directly — `pending`, `confirmed`, `preparing`, `ready`, `delivered`, `cancelled`, `refunded` — sent and read verbatim on `PATCH /orders/:id/status` and everywhere an order's `status` is read, with no more frontend-side relabeling (we used to rename `pending` to `new` for display only; that's gone now, the board shows all four live states — `pending`/`confirmed`/`preparing`/`ready` — as its own columns and treats `delivered`/`cancelled`/`refunded` as off-board). Please confirm these exact seven spellings are what the API already uses — the report's own tables suggest so, but we're relying on it being pixel-exact now rather than just display text.

**Already live, no backend change needed:** the "simple kitchen screen" (`/dashboard/kitchen`) is a pure frontend view — it just filters the same `GET /me/orders` response down to `confirmed`/`preparing` and renders bigger cards. Nothing new to build for it beyond items 1–4 above.

---

## Phase 2 (not yet built on our side — next after phase 1 ships)

Not implemented in the frontend yet; listed here only so it can be scoped ahead of time, per the report's own §3 "الأشهر الأولى بعد الإطلاق":

- **Customer order-tracking page** — a public, no-login endpoint for a single order's current status by some unguessable reference (its id is probably enough, but please say if a separate tracking token is preferred over the raw order id being guessable).
- **Edit an order while still `pending`** — change quantities/remove lines, with the total recomputed server-side the same way initial placement already is.
- **Driver assignment** — no concept of a delivery driver exists anywhere in the data model today (confirmed by the report); needs a `STAFF`-type account flagged as a driver, plus a delivery-status field independent of the order's own prep status.
- **Timed table reservation + auto-release** — `DiningTable.status` today is a flat `available`/`occupied`/`reserved` with no start/end time; needs a start/end timestamp on a reservation and a scheduled job (or lazy check-on-read) to flip it back to `available` once an order's last active line reaches `delivered`.

---

## Phase 3 — invoicing (proposal, not yet built on our side)

**Why:** per the report's §4, a store's order has no natural endpoint today — no `paid`/`invoice` concept anywhere in the schema. This section is the report's own proposed shape, carried over verbatim as a starting point; nothing here is final until confirmed back and forth, and no frontend UI exists against it yet (deliberately — building screens against field names that might still change would mean redoing that work).

```jsonc
// proposed Invoice entity — one per order, 1:1
{
  "id": "...",
  "number": 1,                       // sequential per business (1, 2, 3…), not a random id
  "orderId": "...",                  // 1:1 with the order
  "lines": [                          // frozen copy of the order's lines/prices at issue time
    { "name": "...", "quantity": 2, "unitPrice": 25000, "lineTotal": 50000 }
  ],
  "totalAmount": 50000,
  "currency": "SYP",
  "paymentStatus": "unpaid",         // "paid" | "unpaid" | "partially_paid"
  "paymentMethod": "cash",           // free text initially, per the report
  "businessName": "...",
  "businessAddress": "...",
  "customerName": "...",
  "customerPhone": "...",
  "issuedAt": "2026-11-09T10:00:00.000Z"
}
```

Natural entry point per the report: created manually from the store owner's dashboard once an order reaches `delivered`, not auto-generated — please confirm that's still the intended flow before building it.

---

## Phase 4 — customer ledger / debt, and WhatsApp payment reminders (proposal, not yet built on our side)

**Why:** per the report's §5, `customerName`/`customerPhone` are free text on every order today with no persistent customer record tying a customer's orders/debts together across visits.

```jsonc
// proposed Customer entity
{
  "id": "...",
  "businessId": "...",
  "name": "...",                      // always required
  "phone": "...",                     // required only once a debt is opened; unique per business
}

// proposed fields added to Invoice
{
  "customerId": "...",
  "amountPaid": 50000,                // new
  "remaining": 0                      // = totalAmount - amountPaid, server-computed, never written directly
}

// proposed Payment entity — one row per payment against an invoice, append-only
{ "id": "...", "invoiceId": "...", "amount": 30000, "paidAt": "2026-11-09T10:00:00.000Z" }
```

No backend work needed for the WhatsApp reminder itself — same pattern as every other `wa.me` link the frontend already builds client-side from data it already has (business name, amount remaining, invoice number); this only needs the ledger data above to exist to read from.

---

## Thermal printing (proposal — this one is not purely a backend ask)

**Why:** per the report's §6, once Phase 3's invoice data exists, printing an 80mm receipt is mostly a frontend concern (print-sized CSS, plus a small local agent like QZ Tray for USB printers, or a direct socket connection on port 9100 for network/Wi-Fi printers — all three channels documented in the report use the same `ESC/POS` protocol). **The only backend dependency is that the Invoice entity in Phase 3 carries every field a printed receipt needs** (business name/logo, invoice number + date, line items, total, paid/remaining, customer name+phone when a debt is open) so the print template never has to combine data from more than one endpoint. No separate printing endpoint is needed — this is flagged here only so Phase 3's field list is reviewed with "will this be enough to print a receipt with no further lookups" in mind.
