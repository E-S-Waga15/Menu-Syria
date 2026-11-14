# Backend changes — order system, pagination, and the invoicing/debt/printing roadmap

**Status note (2026-11-09):** §1 (pagination) and §2 (order-system phase 1) are live in production (confirmed via `GET /restaurants?page=1&limit=2` and `GET /stores?page=1&limit=2`, both returning the exact `{ items, meta }` shape asked for below). The frontend's admin restaurants/stores/agents consoles now fetch real server-paginated pages instead of the old "fetch everything, slice in the browser" approach — confirmed by type-checking and linting the whole project clean; a full logged-in admin-console click-through still hasn't been done against production (no admin credentials available in the environment that did this pass), so please do one pass of that before calling §1 fully closed. Two deliberate scope notes from the backend implementation pass, carried over here:

- `GET /restaurants` (the public directory list) didn't exist before this pass and was added fresh — please double-check it against `GET /restaurants/featured` and the known pre-existing routing bug where `restaurants/:slug` actually calls `getStoreBySlug` (that bug is untouched, out of scope here, just flagging it's still live).
- `/admin/agents`' new `q` search matches name and referral code only, not phone — intentional, to avoid duplicate rows from the agent↔region one-to-many relation.
- **New gap found while wiring this up, not yet fixed**: `GET /me/orders` still never returns `selectedOptions` per line — a pre-existing gap, unrelated to this handoff's asks, worth its own pass later.

**Update (2026-11-09, later same day):** the backend shared a full `/customers` + `/invoices` + `/invoices/:id/payments` API reference (deploy confirmed live — `GET /customers` on production answers 401, not 404) ahead of the §4/§5 spec below actually being finalized here. The frontend has now been built directly against *that* real reference rather than the §4/§5 proposal — a full dashboard section: a customer book (`/dashboard/customers`), "issue invoice" from any `delivered` order (`/dashboard/invoices`, plus the same panel surfaced inline wherever delivered orders show up), per-invoice payment recording, and a WhatsApp debt-reminder link built client-side from the invoice's own `remaining`/`customerPhone` — no separate endpoint needed for that last part, same as every other `wa.me` link already in the app. §4/§5 below are now superseded by what was actually shipped (the real field names won, as expected) — kept only as the historical record of what was asked for before the reference came back. Scope notes from building this pass:
  - No `GET /invoices?orderId=` filter exists, so the "which delivered orders are already invoiced" check client-side fetches up to 100 invoices and cross-references `orderId` locally — fine at today's per-business scale, but if `GET /invoices` grows an `orderId` filter later the frontend would happily switch to it.
  - `POST /customers`' 409 (phone already in use) and `POST /invoices/:id/payments`' 400 (amount over remaining) are both shown as toasts using whatever message the backend sends — same `extractErrorMessage` convention as every other write in the app, so no explicit 1:1 mapping was needed here.
  - Not done yet: the actual 80mm thermal-print template (§6) — building against this real invoice shape is now unblocked, just not started.

**Update (2026-11-10):** Phase 2 (order tracking, editing a `pending` order, driver assignment, timed table reservations) and thermal printing are now both built on the frontend too — see the "🆕 New ask: Phase 2" and "✅ Thermal printing" sections below for the concrete API asks and what's already shipped without one. Nothing in this round is blocked on anything else in this doc; all four Phase 2 pieces work against mock data today and switch to real data the moment each endpoint ships, same pattern as every other phase here.

**Update (2026-11-10, later same day):** the backend confirmed all four Phase 2 endpoints are live in production (`commit a66bcdf`, `pm2` restarted, verified against a real local Postgres before deploy) — `GET /public/orders/:id`, `PATCH /orders/:id/items`, the driver endpoints, and the table-reservation fields on `PATCH`/`GET /me/tables`. One deliberate deviation the backend flagged, now matched on the frontend: `businessName` in the tracking response comes back as a plain string, not `{ar, en}` — consistent with the rest of the platform having no bilingual business names. `getPublicOrderTracking` in `src/features/public-menu/services.ts` now wraps it with the same defensive `toLocalized` helper already used elsewhere (accepts either shape, duplicates a plain string into both locales) instead of assuming an object. Also confirmed: the real order id (UUID v4) is unguessable enough to serve as the tracking link's own secret — no separate tracking token needed, as hoped.

**Update (2026-11-10, real end-to-end pass against production):** tested all four Phase 2 flows for real — logged into a real restaurant account, placed/edited/tracked a real order, assigned a real driver, reserved and released a real table — all correct. Two things found and fixed on the frontend side along the way, not backend bugs, noted here for the record:
- `normalizeOrder` in `restaurant-dashboard/services.ts` was a blind pass-through cast. `GET /me/orders` answers an already-normalized shape (`lines`, numeric `total`), while `GET /orders/:id` and every order write endpoint (`/items`, `/driver`, `/delivery-status`, `/status`) answer the raw DB row (`orderItems`, string `totalAmount`, a plain-string item name) — two different shapes for the same entity. Now mapped properly, same as every other entity.
- `/drivers` briefly looked like it was mangling Arabic names into `????` — turned out to be a local shell/argv-encoding artifact in how the test command was invoked, not a real backend issue; reproduced cleanly with proper UTF-8 piping afterward.

**Update (2026-11-14):** three more gaps found live-testing Phase 2 — no order history view, no way to key in a phone/walk-in order from the dashboard, and invoicing was always-manual with no on/off switch. All three built on the frontend (mock data) — see the new "🆕 New ask: order history, manual dashboard orders, and an opt-in invoicing switch" section below for the concrete asks: an `invoicingEnabled` field on the business profile, server-side auto-invoicing for public cart orders when that's on, and a new authenticated `POST /me/orders` for the dashboard's own order-entry dialog.

**New, separate from Phase 2 — plan-gated dashboard navigation (2026-11-10):** the dashboard now shows Orders/Kitchen/Tables/Analytics in the sidebar for every plan, but gates the page content itself behind an upgrade prompt when the current plan doesn't include it — naming the business's own agent to contact if it has one, or platform support otherwise. This reads two fields already confirmed present on `GET /me/restaurant`: `orderChannels` (gates Orders/Kitchen/Tables — unlocked when it includes `"platform"`) and `hasStatistics` (gates Analytics). Both already behaved correctly when we tested a plan upgrade live (`orderChannels` went from `["whatsapp"]` to `["platform","whatsapp"]` after the plan change) — no new backend work needed for this, just flagging the dependency: if either field's meaning ever changes, or a `GET /me/store` response doesn't carry the same two fields, the gate would silently show the wrong state.

This is a separate handoff from `update.md` (which stays for the ongoing day-to-day asks) because everything here traces back to one internal report ("نظام الطلبات على منيو سوريا", تشرين الثاني 2026) that audited the whole order flow end to end and laid out a 4-phase plan. §1–§2 and the Phase 2 section below are asks the frontend has already built against (mock data today, real data the moment these ship). §4–§5 (invoicing, debt) are superseded by the 2026-11-09 "Update" note above — the real API already exists and the frontend is built against it. Thermal printing is done and needs no backend work at all (see its own section). Nothing from the original report remains unaddressed on the frontend side at this point.

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

## 🆕 New ask: Phase 2 — order tracking, editing, drivers, timed reservations

**Status (2026-11-10): the frontend for all four of these is now built against mock data and ready to switch over the moment each endpoint below ships — nothing here is blocked on anything else in this doc.** Per the report's own §3 "الأشهر الأولى بعد الإطلاق".

### 1. Public order tracking — `GET /public/orders/:id`

**Why:** a guest who placed an order through the platform has no way to check on it afterward today — the order confirmation is a one-time toast and nothing else. The frontend now shows a "track your order" link right after checkout (and, for a signed-in customer, from their own order-history card) pointing at `/track/:id`.

No auth — the order's own id is the only thing standing in for a login, same model most delivery apps use for a guest tracking link. Please confirm the real order id (as returned by `POST /public/businesses/:slug/orders` today) is unguessable enough to serve this role as-is; if not, a separate tracking token is an easy addition on top.

```jsonc
// GET /public/orders/:id — 200, or 404 if the id is wrong/gone
{
  "id": "...",
  "businessName": { "ar": "...", "en": "..." },
  "businessSlug": "...",
  "businessLogoUrl": "...",
  "status": "preparing",            // the same 7-value enum everywhere else
  "totalAmount": 95000,
  "currency": "SYP",
  "fulfillmentMode": "delivery",
  "deliveryAddress": "...",
  "items": [
    { "name": "كبسة ياسمين الملكية", "quantity": 1, "unitPrice": 95000, "lineTotal": 95000 }
  ],
  "createdAt": "..."
}
```

### 2. Editing a still-`pending` order's lines — `PATCH /orders/:id/items`

**Why:** the report's own §3 ask — a customer calls to change a quantity or drop an item before the kitchen has even confirmed the order, and today the only options are cancel-and-redo or edit it by hand off-system. The frontend now has an edit button (pencil icon) on every `pending` card in `/dashboard/orders`, gated to `pending` only.

```jsonc
// PATCH /orders/:id/items — body; 409 if the order is no longer `pending`
{ "items": [ { "itemId": "...", "quantity": 2 } ] }   // a line left out of the array is understood as removed
```
Response: the updated order, same shape as `GET /orders/:id`, with `total` recomputed server-side exactly like initial placement already does — the frontend never computes this itself and trusts it blindly. 400 if the array would leave zero items (the frontend already blocks submitting that, but the backend should reject it too, as the order should be cancelled instead of emptied).

### 3. Driver assignment — new `Driver` concept + two new order fields

**Why:** the report confirmed no concept of a delivery driver exists anywhere in the data model. The frontend now shows a driver picker on every `delivery`-fulfillment order card, plus a one-tap "mark out for delivery" / "mark delivered" action independent of the order's own prep status (`status` can reach `delivered` for prep purposes while the driver hand-off is still catching up, or vice versa).

```
GET  /me/drivers                      → Driver[]
POST /drivers                         → Driver        body: { name, phone? }
PATCH /orders/:id/driver              → Order         body: { driverId: string | null }
PATCH /orders/:id/delivery-status     → Order         body: { deliveryStatus: "assigned" | "outForDelivery" | "delivered" }
```
```jsonc
// Driver
{ "id": "...", "name": "سليم ضاهر", "phone": "0944112233" }
```
`Order.driverId`/`Order.deliveryStatus` ride alongside every other order field on `GET /me/orders`/`GET /orders/:id`; `deliveryStatus` is implicitly `"unassigned"` whenever `driverId` is absent, so there's no need to ever write that value explicitly — only `assigned`/`outForDelivery`/`delivered` are ever sent. Whether a `Driver` is its own table or a `STAFF`-role account flagged as a driver is left to you; the frontend only needs the three fields above back.

### 4. Timed table reservation + auto-release — new fields on `Table`

**Why:** `DiningTable.status` today is a flat `available`/`occupied`/`reserved` with no start/end time, so "reserved" has never meant anything concrete. The frontend's hall board now has a reservation form (guest name/phone, start/end time) per table, and reads a reservation as expired — showing the table as free again — the moment `reservedUntil` is in the past, **without waiting on a scheduled job**: a plain read-time check (`new Date(reservedUntil) < now`) is all the frontend does, so a scheduled job to flip the status back is optional on your side too, not required.

```jsonc
// PATCH /tables/:id — new optional fields alongside the existing ones
{
  "status": "reserved",
  "reservedFrom": "2026-11-10T19:00:00.000Z",
  "reservedUntil": "2026-11-10T21:00:00.000Z",
  "reservedByName": "...",
  "reservedByPhone": "..."          // optional
}
// sending all four reservation fields as null clears the reservation (the frontend's "cancel reservation" action)
```
Read back the same four fields on `GET /me/tables`. No auto-release job needed from you unless you'd rather enforce it server-side too (e.g. to stop a double-booking at write time) — the frontend already treats an expired reservation as free on its own.

---

## 🆕 New ask: order history, manual dashboard orders, and an opt-in invoicing switch

**Status (2026-11-14): frontend built against mock data, ready to switch the moment each piece below ships.** Per a follow-up round of feedback after live-testing Phase 2: the dashboard had no way to see a past order once it left the live board, no way for the owner/cashier to type in a phone or walk-in order themselves, and invoicing had no on/off switch — it was always a manual "pick a delivered order" step. All three are addressed below. (Unrelated to the report's own "Phase 3/4" sections further down this doc, which are about the original invoicing/debt proposal — already superseded, see the 2026-11-09 update note at the top.)

### 1. An owner-level invoicing switch — new field on the business profile

**Why:** not every business wants debt/payment tracking — most just want a plain printed receipt. This is now a single on/off choice from `/dashboard/settings`, not a plan entitlement: when off (the default), the frontend never shows the invoicing UI at all and prints a plain receipt for every order; when on, **every new order becomes a real invoice automatically the moment it's placed** — no more manual "issue invoice from a delivered order" step (that UI has been removed from the frontend entirely).

```jsonc
// PATCH /businesses/:id (or wherever the rest of the profile fields already go) — new field
{ "invoicingEnabled": true }
// GET /me/restaurant / GET /me/store — read back the same field
{ "invoicingEnabled": true, /* ...everything already there... */ }
```

### 2. Auto-issuing an invoice server-side for a public cart order

**Why:** a dashboard-created order (see §3 below) is authenticated, so the frontend can call `POST /invoices` itself right after creating one. A guest's public cart order (`POST /public/businesses/:slug/orders`) can't do that — the customer's browser has no owner token to call the invoicing endpoint with. So for `invoicingEnabled` businesses, **please create the `Invoice` row yourself**, server-side, in the same transaction as the order, the moment a public cart order is placed — same shape `POST /invoices` already produces (`amountPaid: 0`, i.e. unpaid/a debt, since nobody at the counter confirmed a payment). No separate ask needed if an invoice is cheap to always construct server-side and only materialize/return when the flag is on.

### 3. An authenticated order-creation endpoint for the dashboard's own "new order" entry

**Why:** every real order today comes from the public guest cart. The dashboard now has its own "+ طلب جديد" dialog (pick items from the real menu, optional customer name/phone, dine-in/pickup/delivery) for a phone-in or walk-in sale the owner/cashier types in themselves — this needs an authenticated equivalent of the public order-placement endpoint, since the public one is tied to a guest + a slug, not a signed-in owner.

```jsonc
// POST /me/orders — authenticated as the business owner/staff
{
  "customerName": "...",           // optional
  "customerPhone": "...",          // optional
  "fulfillmentMode": "dineIn",     // "dineIn" | "pickup" | "delivery"
  "tableNumber": 4,                 // only meaningful for dineIn
  "deliveryAddress": "...",        // only meaningful for delivery
  "deliveryFee": 8000,              // only meaningful for delivery
  "notes": "...",
  "items": [ { "itemId": "...", "quantity": 2 } ]
}
// Response: the created order, same shape as GET /orders/:id — prices/totals
// resolved from the real menu server-side, never trusted from this body,
// same rule the public endpoint already follows.
```

Please also tag these two creation paths distinctly if that's cheap (`source: "platform" | "dashboard"` on the order row) — the frontend has a field ready for it (`Order.source`) but works fine without it too.

### 4. `GET /me/orders` at scale (not urgent yet)

The new history tab filters/searches the same already-fetched `GET /me/orders` response entirely client-side — fine at today's per-business order volume. Flagging now so it's not a surprise later: once a business accumulates enough orders for that to matter, this list will need real pagination and a date-range filter, same `{ items, meta }` contract as every other list in §1.

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

## ✅ Thermal printing — built (browser print, not a backend ask)

**Status (2026-11-10):** built on the frontend at `/print/invoices/:id` (a standalone, no-chrome page) — an 80mm-styled receipt (`@page { size: 80mm auto }`, monospace, dashed separators) that auto-opens the browser's own print dialog. **No backend work was needed**: every field the receipt prints (business name/address, invoice number + date, line items, total/paid/remaining, customer name+phone, payment method) already exists on the real `Invoice` shape documented above in §1/§2 of this doc's invoicing section — exactly the "will this be enough to print with no further lookups" check the original proposal below asked for, confirmed yes.

Deliberately **not** wired to QZ Tray or a direct network-printer socket (port 9100/ESC-POS) — the browser print dialog already covers a USB thermal printer through its own driver, a regular printer, or "save as PDF," which is enough for a first version without that extra local-agent integration. If a specific printer model turns out not to behave through a plain browser print, that integration is still open as a later, separate piece of work — nothing here blocks it.

<details>
<summary>Original proposal (superseded by the "Status" note above, kept for context)</summary>

**Why:** per the report's §6, once Phase 3's invoice data exists, printing an 80mm receipt is mostly a frontend concern (print-sized CSS, plus a small local agent like QZ Tray for USB printers, or a direct socket connection on port 9100 for network/Wi-Fi printers — all three channels documented in the report use the same `ESC/POS` protocol). **The only backend dependency is that the Invoice entity in Phase 3 carries every field a printed receipt needs** (business name/logo, invoice number + date, line items, total, paid/remaining, customer name+phone when a debt is open) so the print template never has to combine data from more than one endpoint. No separate printing endpoint is needed — this is flagged here only so Phase 3's field list is reviewed with "will this be enough to print a receipt with no further lookups" in mind.

</details>
