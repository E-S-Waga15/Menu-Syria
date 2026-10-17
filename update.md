# Backend changes needed — agent linkage, subscription details, item statistics, plan pricing

## ✅ Matched on the frontend: real notifications (`GET /notifications`, `PATCH /:id/read`)

The in-app half of this is fully wired up — every dashboard (admin, agent, owner, customer) now reads its bell count and its notices page from `GET /notifications` / `GET /notifications?unread=true`, and toggling read/unread calls `PATCH /notifications/:id/read` for real. This replaces an old frontend-only stopgap that derived reminders purely from subscription expiry dates and never covered any admin/agent event at all.

**One open question — `message` isn't localized:** the platform is bilingual (ar/en), but `message` arrives as a single pre-composed string (e.g. `"تم تجديد اشتراكك حتى 2026-11-17"`) with no language variant. The frontend shows it exactly as sent regardless of the viewer's chosen UI language, so an English-reading user still sees this one in Arabic. Could you either (a) accept an `Accept-Language` header or `?lang=` param and compose `message` in that language, or (b) send both `messageAr`/`messageEn`, or (c) send the raw values that went into the sentence (e.g. `{ planExpiresAt: "2026-11-17" }`) alongside `type` so the frontend can compose the line itself from its own dictionary? Any of the three works — just flagging that today's shape can't be localized on our side without guessing at the Arabic phrasing per type.

**Push side: done too, now that the full Firebase Web config is in hand.** The `firebase` SDK is installed, `public/firebase-messaging-sw.js` handles a push that arrives with no tab focused, and `features/notifications/lib/push.ts` covers the rest:

- A banner on the notifications page ("تفعيل الإشعارات") requests permission and registers the device's FCM token via `POST /push-tokens` the first time, only shown while permission is still in its default (not-yet-asked) state.
- Every authenticated page quietly re-registers the token on load if permission was already granted in an earlier visit — never prompts again, just keeps the backend's record current.
- A push that arrives while a tab is focused doesn't trigger the OS notification UI on its own, so `onMessage` refetches the unread count/list right away instead of waiting for the next poll.
- Logout calls `DELETE /push-tokens` for the device's current token before clearing the session, so a signed-out browser stops receiving that account's pushes.

Nothing further needed from the backend here — this is confirmed working against the config you sent. One thing worth confirming on your side: does a push notification's payload include a `notification.title`/`notification.body` pair (the standard FCM shape `{ notification: { title, body }, data: {...} }`)? That's what both the service worker and the foreground handler expect; if pushes are sent as data-only messages instead, the title/body would need to come from `data` fields instead and we'd adjust to match.

## ✅ Matched on the frontend: the new renew/subscription-request/admin-subscriptions contract

Everything from your last message is wired up:

- **Renew**: the admin console no longer fires `POST /subscriptions/:id/renew` straight from a single button click. The renew button is now disabled unless the subscription's own `planExpiresAt` has actually passed, and even then it sits behind an explicit confirm dialog spelling out which business is being renewed — exactly the mistake from the أبو زيد incident above shouldn't be repeatable from here. A 400 from the new validation (still-active, or never-activated) surfaces as-is in a toast.
- **Plan change**: the admin's old direct "change plan" dropdown (an instant `PATCH /subscriptions/:id`) is gone. Changing a business's plan now goes through `POST /subscription-requests` immediately followed by `PATCH /subscription-requests/:id/status` with the chosen plan + duration, behind the same two-step dialog (pick plan/duration → explicit confirm) used for approving a registration request.
- **Subscription requests** (`/admin/subscription-requests`): approving now opens the same plan+duration dialog instead of a bare "confirm payment" button, and rejecting now sits behind a confirm dialog too, matching registration requests. The old `GET /subscriptions/pending` + `POST /subscriptions/:id/activate` two-phase flow (a separate "confirm cash collected" step after approval) has been removed from the frontend entirely, since approving a subscription request now activates it directly per your message — let us know if that pending/activate pair is still live on your side for some other flow, since nothing on our side calls it anymore.
- **Admin subscriptions page**: rebuilt against `GET /admin/subscriptions?kind=&status=&page=&limit=`, split into "via agent" / "general" sections (one query per section), each with its own status filter and real server-side pagination reading `meta.totalPages`. Platform-kind rows get a "mark as paid" button calling `PATCH /subscriptions/:id` with `{ paymentStatus: "paid", paidAt }`; agent-kind rows just display `agentPaymentStatus` (no mutator built for that side, per your note that it's unchanged).
- `Plan.isFree` is read and shown as a small badge next to the plan name wherever a plan appears in these lists.

One open question: we don't yet show `amountPaid`/the agent's computed commission back to the admin at the moment they confirm a plan change or request approval (the confirm dialog says the amount is computed on confirmation, not before) — if `PATCH /subscription-requests/:id/status`'s response includes the resulting subscription (with `amountPaid`), we can surface that in the success toast instead of a generic message.

## 🚨 Urgent: wrong accidental renewal needs to be reversed — restaurant "أبو زيد", agent "بشر"

**What happened:** an admin accidentally clicked "تجديد الاشتراك" (renew subscription) on restaurant **أبو زيد**'s admin detail page. This calls `POST /subscriptions/:id/renew` for real — it created a genuine new subscription period and, since this business is linked to agent **بشر**, it now owes/credits the agent a commission for a renewal that should never have happened.

**Needed, as soon as possible:**
1. Find the subscription renewal just created for أبو زيد (should be the most recent one on that business, today's date).
2. Revert it: remove that renewal period (restore `planExpiresAt`/`planStartedAt` to what they were right before this renewal), and reverse whatever commission/ledger entry it generated for agent بشر so they aren't credited for a renewal that didn't really happen.
3. There's currently no "undo renewal" or "delete subscription" endpoint the admin console can call to fix this itself — worth considering for later, but for right now this needs a direct database correction on your side.

Please confirm once reversed so we can double check both the business's subscription dates and the agent's ledger on our side.

## ✅ Fixed: delete endpoints for users, businesses and agents

Confirmed shipped, `SUPER_ADMIN`-only:

- **`DELETE /businesses/:id`**: a real hard delete when a SUPER_ADMIN calls it (cascades orders, items, categories, offers, tables, staff, branches, photos/links/phones, subscriptions…) — unchanged (still a disable, not a delete) when the owner/staff calls the same route, verified directly so existing behavior for them doesn't regress.
- **`DELETE /agents/:id`**: detaches the agent from every business they referred (`agentId` → `null`, the business itself stays), detaches their subscriptions and registration requests, then deletes their own login account too. Verified live: the business survived, the agent and their login both disappeared.
- **`DELETE /users/:id`**: deletes any business the user owns (same cascade as above), detaches any linked agent the same way, deletes their staff record if any, and on orders — keeps the order record but clears `user_id` rather than deleting it (an order is a real business record, shouldn't vanish because the account did).

Frontend already called these three paths unchanged — no frontend change needed for this part.

## ✅ Fixed: `createdAt` on business records

Was already present — confirmed directly against `/admin/restaurants`, no backend change needed. **Still open on the frontend side**: the admin business detail page doesn't display it yet (not wired up this round) — noted for a follow-up pass, not blocked on anything backend.

## ✅ Fixed (with a frontend-side correction needed): real pagination on every admin list endpoint

**Why:** the admin console's list pages (users, restaurants, stores, agents, registration requests, subscriptions) currently fetch the *entire* table in one request and paginate it client-side in the browser — fine today, but it gets slower and heavier for every admin page-load as each list grows, and it's exactly the kind of thing that should be the database's job, not the browser's. The frontend already has a working pager UI (added this session) wired to client-side slicing — switching it to real server pagination later is a small, contained change on our side once these query params exist.

### Request shape — add to every list endpoint below

Shipped on `GET /users`, `GET /admin/restaurants`, `GET /admin/stores`, `GET /admin/agents`, `GET /registration-requests` — `page`/`limit` accepted (default limit 24, capped at 100 even if a larger one is requested), response is `{ items, meta: { page, limit, total, totalPages } }`. A real TypeORM `.skip()/.offset()` pagination bug (page 2 repeating page 1) was found and fixed during their own testing — confirmed both locally and on production.

**Two things this broke on the frontend that are now fixed on our side, documented here so the shape of what shipped is clear:**

1. **The response has no `{ success, message, data }` envelope** — `{ items, meta }` arrives directly, same as every other plain GET on this API. Our original ask assumed the envelope would wrap it; it doesn't, matching the rest of the API's GET convention instead. `apiFetch`'s envelope-unwrapping already only triggers when `success`/`data` keys are present, so this needed no change — but the five list-fetching functions in `features/admin/services.ts` were still typed/written to expect a bare array, so when this shipped, they received `{ items, meta }` where every admin list page's `.map()`/`.filter()`/`.length` expected an array — **this took the whole admin console down in production** (every page that touches a restaurant/store list, including the dashboard overview, which fetches both through `getAdminSubscriptions`). Fixed now: those five functions unwrap `items` out of either shape (bare array or `{ items }`), so the frontend works whether or not a given endpoint has migrated yet.
2. **No admin list page sends `page`/`limit` yet** — they still fetch once and paginate client-side, same as before this shipped. Without an explicit `limit`, the new default of 24 would have silently truncated every list to its first 24 rows (not a crash — worse, silent data loss: businesses/users past #24 would just disappear from search, filters, and counts). Stopgap fix shipped on our side: every one of those five calls now sends `?limit=100` (the server's own cap) so nothing is dropped as long as a table stays under 100 rows. This is not the final shape — migrating these five list pages to real server-driven pagination (sending `page`/`limit`/filters and reading `meta.totalPages` instead of slicing a full array client-side) is still open and is the real fix once any list is expected to pass 100 rows.

**Question for the backend:** our original ask (and the path the frontend already called) was `/admin/users`, but the confirmation names `/users` for this one specifically, while the other four keep their existing `/admin/...` paths. The frontend kept calling `/admin/users?limit=100` — please confirm whether pagination actually shipped on `/admin/users`, or whether it's really a separate `/users` route and `/admin/users` is unaffected (still a bare array, uncapped) — if the latter, `/admin/users` should get the same `page`/`limit` support for consistency with the other four, since the users list can grow past 100 just like the others.

## ✅ Fixed on the backend: `Business.isOpen` was hardcoded `true` everywhere, never actually computed from hours

Confirmed and fixed — `isOpen` was a static `true` on every read (owner's own and the public storefront), not derived from anything. It's now computed server-side from `openingHours` against current Damascus time, and the frontend reads it directly again (an earlier attempt computed it client-side instead while this was still broken server-side — reverted now that the backend sends the real value, so there's exactly one place this is computed, not two that could disagree).

`openingHours` itself is `null` (not a placeholder string) when a business never published hours — matches every other optional field on this API (`planName`, `agent`, `logo`, …), and keeps the empty-state wording the frontend's own call (already handled: the storefront's hours panel already treats an absent/empty array as "not published" distinctly from a `null` day meaning "closed that day"). Writes still always send the full 7-entry array — no partial-week or clear-to-unset support yet; flagged for later if ever needed.

The frontend doesn't compute a "next opens at" time from the response (the backend only sends the boolean) — that part is still derived client-side from `openingHours` for the cart's closed-state message.

## 🆕 New ask: accept `openingHours` on `PATCH /businesses/:id`

**Why:** the dashboard now has a real opening-hours editor (Settings → Delivery & Payment tab → "ساعات العمل") — 7 days, each independently open or closed with its own start/end time, plus a "apply to every day" quick action. `Business.openingHours` was already a documented read field (`(DayHours | null)[]`, index 0 = Sunday, consumed by the storefront's own hours display), but there was never a way to *write* it — this is the first screen that needs to.

**What we need:** accept `openingHours` as one more field on the existing field-by-field `PATCH /businesses/:id` (the same endpoint every other profile section already writes through — no new endpoint needed), and return it back on the updated `Business`/`Restaurant`/`Store` read.

### Write shape

```jsonc
// PATCH /businesses/:id
{
  "openingHours": [
    { "opens": "09:00", "closes": "22:00" },  // index 0 = Sunday
    { "opens": "09:00", "closes": "22:00" },  // Monday
    null,                                      // Tuesday — closed that day
    { "opens": "09:00", "closes": "22:00" },
    { "opens": "09:00", "closes": "22:00" },
    { "opens": "09:00", "closes": "23:00" },
    { "opens": "09:00", "closes": "23:00" }    // Saturday
  ]
}
```

- Always sent as the full 7-entry array (the dashboard always has a complete week in state) — simplest to just replace the whole column rather than merge by index.
- `null` for a day means closed that day — distinct from the field being absent entirely, which (per the existing read contract) means hours were never published at all. An update that includes `openingHours` should always result in exactly 7 entries, never a partial week.
- `opens`/`closes` are `"HH:mm"` 24-hour strings. The frontend already validates `closes` is after `opens` before sending, but worth validating server-side too since this endpoint is reachable directly.
- No new read field — `GET /me/restaurant`/`GET /me/store` and the public storefront reads already return `openingHours` in this exact shape today (confirmed: the storefront's own opening-hours display already consumes it), so the write just needs to persist into whatever column already backs that read.

## ✅ Fixed: `GET /agents/me/dues` was computing the agent's commission off the monthly rate instead of the subscription's real billing cycle

Confirmed and fixed on the backend — the $10.5-instead-of-$105 case was exactly what it looked like (the monthly agent price used for a yearly subscription). `GET /agents/me/dues` now returns, per subscription: `billingCycle` ("monthly" | "yearly"), `startDate`/`endDate`, and `businessAmountPaid` (what the business itself paid), alongside the existing `amountOwed` — and `amountOwed` is sent exactly, with no rounding, so a genuine fractional amount (e.g. `10.5`) is real and should be shown as-is.

**Frontend side (done this session, matching the above):**
- `formatPrice` no longer rounds — every price on the platform is shown exactly as the backend sends it, decimals included.
- `AgentDuesSubscription` extended with `billingCycle`, `startDate`, `endDate`, `businessAmountPaid`.
- The agent overview page gained a "dues breakdown" section listing each referred subscription's billing period, what the business paid, and what the agent owes — previously only the summed total was shown anywhere.

## 🆕 New ask: accept an optional `slug` on `POST /registration-requests/public`

**Why:** the restaurant/store registration form now lets the applicant pick their own menu link (e.g. `abod_restaurant`) up front, instead of only being able to set it after approval from the dashboard. It's sent as an optional `slug` field alongside the existing body — same validation rules as the dashboard's own slug editor (English only, no dots, unique across businesses).

**What we need confirmed:**
- `POST /registration-requests/public` should accept `slug` in the body and carry it through to the business record created when the request is approved.
- If `slug` is omitted (applicant left it blank), keep the current behavior — the backend assigns one.
- If the requested `slug` is already taken by another business, the approval step should fail the same way `PATCH /businesses/:id` already does today (409), so an admin reviewing the request sees it instead of two businesses silently getting the same link.

If this isn't supported yet, the frontend still sends the field — it's just dropped until the backend reads it, so nothing breaks either way.

## 🆕 New ask: confirm `planName` (and `planStartedAt`) are actually present on `GET /me/agent/restaurants` / `GET /me/agent/stores`

**Why:** the agent overview's new "latest subscriptions" card reads `planName` off each referred business to badge what plan they're on, and `planStartedAt` to sort/date the list — both fields are already documented and confirmed working on the **owner's own** `GET /me/restaurant`/`GET /me/store` read, but every business coming back from the agent's two referral-list endpoints shows the generic fallback label instead of a real plan name, and several have no `planStartedAt` at all.

Since the code reading these fields is identical to what already works correctly on the owner-facing reads, the most likely explanation is that `/me/agent/restaurants` and `/me/agent/stores` serialize businesses through a different (older or narrower) path that was never updated to include `planName`/`planStartedAt` alongside the other business fields. Could you confirm directly against the response body of these two endpoints whether both fields are actually present for a business that has them set on its own `/me/restaurant` read? If they're missing here specifically, that's the fix — the frontend doesn't need anything further once they're included.

## ✅ `viewCount` on `GET /me/menu` — confirmed shipped

Said as done on the backend side. Frontend reads `item.viewCount` straight off the menu list now (previously only read from whatever `GET /statistics/items/:id` happened to leave in the client cache, so every card showed "—" until that item's own stats modal had been opened once in the session). Please double check live that the field is actually present on a few real items — the frontend falls back to the old cache-based behavior, then to "—", so a still-missing field would silently look like "nothing happened" rather than an obvious error.

## 🆕 New ask: `agent.regionIds` + `agent.photoUrl` on `BusinessAgent` (`GET /me/restaurant` / `GET /me/store`)

**Why:** the owner's dashboard now shows "activated by {agent}, in {region}" (listing **both** regions when the agent covers two) and shows the agent's own photo on the contact card — but `BusinessAgent` (the read-only agent-contact snapshot on a business's own read, §1 below) still only has `regionId: string` and no photo field at all. Please extend it:

```jsonc
// GET /me/restaurant / GET /me/store — business.agent
{
  "agent": {
    "id": "a1",
    "name": "أحمد الحموي",
    "photoUrl": "https://.../agents/abc.png",  // new, optional
    "governorateId": "damascus",
    "regionIds": ["bab-touma", "mazzeh"],      // was regionId: string
    "phone": "...",
    "whatsapp": "..."
  }
}
```

**Note on priority:** this one already caused a real outage on our side — the frontend trusted `regionIds` would always be an array (matching the contract) and called `.map()` on it directly; since the backend is still sending the old shape, that crashed the entire settings page (not just the subscription tab) for any business with an agent attached. We've since made the frontend defensive against this specific gap, but please treat the mismatch itself as the thing to fix, not just something to work around on our end — the next field that assumes the documented contract and isn't defensive will break the same way. Until `regionIds` ships, the frontend falls back to the legacy `regionId` if present, then to the business's own governorate name. Until `photoUrl` ships, the contact card shows a generic icon instead of a photo — safe, no crash risk there.

## ✅ §1-§6 below: confirmed shipped and verified (both locally and on production)

Agent linkage, plan name/start date, approval-time duration picker, the new per-item statistics endpoint, and the full server-computed plan pricing model are all live. Thank you — frontend is already reading these fields as specced, no changes needed on either side for §1-§6. Kept below as a reference of what the contract is.

## ✅ Fixed: `PATCH /subscription-plans/:id` rejecting `features` — root cause was broader than suspected

Neither `CreateSubscriptionPlanDto` nor `UpdateSubscriptionPlanDto` declared `features`/`isPopular` at all — this wasn't a PATCH-only regression; `POST` never genuinely accepted these fields either (whatever worked during create likely just didn't include them in the tested payload). Added both as real, writable `SubscriptionPlan` columns: `features` (free-text array, admin-authored — no longer auto-derived from `hasCart`/`hasStatistics`), localized to `{ar, en}` on read the same way every other plain-string input in this API works; `isPopular` (boolean). Backfilled the 3 existing plans so their cards don't go blank. Verified live: the exact repro payload now returns 200.

## ✅ Added: `yearlyPricePerMonth` / `agentYearlyPricePerMonth`

Both now on every `Plan` response from `GET /subscription-plans` and `GET /admin/plans`: `yearlyPricePerMonth = round(priceYearly / 12)`, `agentYearlyPricePerMonth = round(agentPriceYearly / 12)`. Live now — the frontend's per-month line under the yearly price renders immediately, no frontend deploy needed.

## ✅ `GET /admin/plans` and `GET /subscription-plans` are now the same code path

Eliminated the duplicate formatter entirely — `/admin/plans` delegates to the same service as `/subscription-plans`, so they can't drift apart again. Also found and fixed a real data-exposure bug introduced while unifying them: the first draft loaded the full `Subscription` relation just to count subscribers, which would have leaked `businessId`/`amountPaid`/payment-status onto this public endpoint. Replaced with a count-only query — confirmed live that neither endpoint's response contains a `subscriptions` key.

## ✅ Local image storage migrated to Cloudinary — no backend contract change

All previously locally-stored images (business logos/photos, item photos, user avatars, offer images — 19 references) have been migrated to Cloudinary and the local source files removed from the server. This is backend-internal infrastructure; every URL field's shape and meaning is unchanged, no frontend action needed.

## 🆕 New ask: remove the plan-gate (403) on item statistics — and more broadly, nothing should be plan-restricted yet

The per-item statistics endpoint currently returns 403 when "the business's plan doesn't include statistics." Please remove that check for now — **every feature should be available to every plan while the product is still being built**; which features belong to which plan hasn't been decided yet, and will be a deliberate, separate pass once the platform is feature-complete. If any other endpoint already has a similar plan-based 403 gate, please lift it the same way until we explicitly ask to reintroduce it. The frontend's own "your plan doesn't support this" messaging for item statistics has already been removed to match.

## ✅ Fixed: `GET /admin/plans` was missing the flat §6 pricing fields — this was the actual crash cause

Root cause confirmed and fixed on the backend: `/admin/plans` had its own separate formatter (distinct from `/subscription-plans`) that was never updated when the flat pricing fields shipped — so every plan row was missing `priceYearly`, `yearlyOriginalPrice`, `yearlySavingsMonths`, `yearlySavingsAmount`, `agentPriceMonthly`, `agentPriceYearly`, `agentYearlySavingsAmount`, `agentDiscountPercent` entirely (not null — simply absent from the JSON), which is why *every* row crashed the render, not just an incomplete legacy one as first suspected. Confirmed directly against the `subscription_plans` table (local + production): no row has a null `monthlyPrice`/`agentDiscountPercentage` — there was never an incomplete-data scenario to backfill, it was purely the `/admin/plans` formatter lagging behind. Both endpoints now share one computation function so they can't drift apart again. Verified live on production: both `GET /admin/plans` and `GET /subscription-plans` return the complete flat shape for every row. The frontend's own defensive guards (render blank/zero instead of crashing on a missing field) stay in place as a safety net regardless.

## No new backend work needed for the agent pricing-cards page

Every number the agent's monthly/yearly-toggle pricing cards need is already in `GET /subscription-plans`'s response today: `priceMonthly`, `priceYearly`, `yearlyOriginalPrice`, `yearlySavingsMonths`, `yearlySavingsAmount`, `agentPriceMonthly`, `agentPriceYearly`, `agentYearlySavingsAmount`, `agentDiscountPercent` — all server-computed per the agreed policy (yearly = 10× monthly, agent = 70% of customer price on both cycles). A plan always supports both cycles; there's no "monthly-only/yearly-only" flag on write, since one plan's `priceMonthly` input always yields both. The toggle is purely a client-side display switch between the already-present `price*`/`agentPrice*` field pairs.

## 🆕 New ask: agent's own editable profile — `PATCH /me/agent`, plus a `regionIds` fix on the read shape

**Why:** The agent dashboard now has its own `/agent/profile` page: a fullscreen photo viewer (tap the avatar → view/change/save/delete, same UX as the restaurant/store logo) plus an "account info" card (name, bio, phone, WhatsApp, Instagram, Facebook, and coverage area) editable the same way the business settings page edits its own info — an edit toggle, inline fields, a save/discard bar.

### `PATCH /me/agent`

```jsonc
// body — every field optional, only what the agent actually changed is sent
{
  "photoUrl": "https://.../agents/abc.png",  // or "" to clear back to the generic placeholder
  "name": "أحمد الحموي",                      // plain string in the signed-in locale, not a {ar,en} pair
  "bio": "خبرة ثماني سنوات في قطاع الضيافة...",
  "phone": "+963944100200",
  "whatsapp": "+963944100200",
  "instagram": "ahmad.menusyria",
  "facebook": "AhmadMenuSyria",
  "governorateId": "damascus",
  "regionIds": ["bab-touma", "mazzeh"]        // see the regionIds note below — 1 or 2 ids, both within governorateId
}
// response: the full updated Agent
```

- Referral code and commission rate are **not** writable here — admin-managed only, this endpoint should ignore (or reject) those two fields if sent.
- The frontend already has `POST /uploads?folder=agents` uploading the photo first and sending back its URL, then calls this endpoint with that URL — if `agents` isn't already a valid `folder` value on the uploads endpoint, please confirm it is (it's listed as one of the accepted folders on our side).
- **Please confirm the empty-string-clears-the-photo convention** — the frontend sends `{ "photoUrl": "" }` to clear the agent's photo, and separately sends `{ "logo": "" }` to `PATCH /me/restaurant` / `PATCH /me/store` to clear the business logo, both on the assumption that an empty string is treated as "remove it" rather than being rejected as an invalid URL. If either side needs an explicit `DELETE` endpoint or a `null` value instead, let us know and we'll switch both calls to match.

### `regionIds` — the agent model's coverage area is one governorate + up to two regions, not one region

**Why:** an agent's coverage area was modeled as a single `regionId`, but agent self-registration (`POST /agents/register` or wherever that lands — the form already sends `districtIds` as an array) always meant "one or more regions within one governorate." We're now capping that at **exactly one governorate, and one or two regions within it** — enough to realistically cover ground without an agent claiming an entire province. Please:

- Rename/replace `regionId` with `regionIds: string[]` (1-2 items) on `GET /me/agent`, on any public agent read (`GET /agents/:id` or similar, used by the public agent directory page), and anywhere else `Agent.regionId` is currently returned.
- Validate server-side, both at registration and on this new `PATCH /me/agent`: `regionIds` has 1-2 entries, and every id in it belongs to `governorateId`. The frontend already enforces this client-side (disables picking a 3rd region, caps the zod schema at `.max(2)`), but it should be enforced server-side too since this endpoint is reachable directly.
- The already-shipped `BusinessAgent` shape on `GET /me/restaurant`/`GET /me/store` (§1 below) is unaffected — that read-only contact card can keep sending a single `regionId` for display; this ask is only about the `Agent` entity itself (the agent's own profile, and the public agent directory/profile page).

---

Everything below is additive to existing resources — no existing field is renamed or removed. The earlier fulfillment-modes/delivery-fee/payment-code work (an even older version of this document) is already shipped and confirmed working; §1-4 below are the batch after that; §6 is plan pricing.

**Standing rule for all of §6: every price shown anywhere in the frontend — monthly, yearly, agent monthly, agent yearly, savings amounts — is a field the backend returns, never a value the frontend computes by multiplying or subtracting another price. If a number appears on screen, it has its own field in the API response.**

## 1. Which agent onboarded a business — new `agent` field on `Business`

**Why:** the owner's dashboard now has a "your subscription was activated by agent X — contact them for anything" section, plus a dedicated support page that points to the same agent. Today there's no durable link from an approved business back to the agent who referred it — only the transient `RegistrationRequest.agent` field (admin-only, pre-approval) and a governorate-proximity guess used for the public agent-profile page. Neither is a real foreign key.

### New field, on `GET /me/restaurant` and `GET /me/store` only (never on public storefront reads)

```jsonc
{
  "agent": {
    "id": "a1",
    "name": "أحمد الحموي",
    "governorateId": "damascus",
    "regionId": "bab-touma",
    "phone": "+963944100200",
    "whatsapp": "+963944100200",
    "instagram": "ahmad.menusyria",   // optional
    "facebook": "AhmadMenuSyria"      // optional
  }
}
```

- `null`/absent means this business wasn't signed up through an agent (self-registered, or predates this field).
- This is a read-only, server-resolved field — the frontend never writes it. It should resolve from whatever already links a `RegistrationRequest` to an agent today (the same relationship `RegistrationRequest.agent` already carries pre-approval) — once a request is approved into a real `Business`, that same agent reference needs to persist onto the business record itself.

## 2. Plan name and start date — new fields on `Business`

**Why:** the subscription tab showed a hardcoded `"Premium"` and no start date at all — neither was ever a real field.

```jsonc
{
  "planName": "Premium",
  "planStartedAt": "2026-01-10T09:00:00.000Z"
}
```

- `planName`: the active plan's display name. Absent/empty falls back to a generic label on the frontend, so this is safe to roll out gradually.
- `planStartedAt`: ISO datetime the current plan period began. Should be set to the moment an admin approves a registration request or a renewal (see §3) — paired with the existing `planExpiresAt` for "X days remaining" and a start/end display.

## 3. Subscription duration at approval time — extend the registration-request approval endpoint

**Why:** today `PATCH /registration-requests/:id/status` only takes `{ status, planId }` — the subscription's length is implied entirely by the plan's own `durationDays`. The dashboard now needs an admin to explicitly choose how long the subscription runs when approving, independent of the plan tier: monthly (a chosen number of months), a specific end date, or yearly — capped at one year no matter which is picked.

### Extended request body

```jsonc
// PATCH /registration-requests/:id/status
{
  "status": "approved",
  "planId": "plan_premium",
  "durationType": "monthly",   // "monthly" | "custom" | "yearly"
  "durationMonths": 3,         // only when durationType = "monthly", 1-12
  "endDate": "2026-12-31"      // only when durationType = "custom", ISO date, ≤ 1 year from now
}
```

Validation:
- `durationType` required when `status: "approved"`.
- `monthly`: `durationMonths` required, integer 1-12.
- `custom`: `endDate` required, must be in the future and no more than 365 days from the approval moment.
- `yearly`: no extra field needed — always exactly 1 year from approval.
- The subscription's `startDate` is always the approval timestamp (now), never admin-specified — only the length/end is chosen.
- Reject (422) any combination where the computed period would exceed one year.

On success, apply the computed `startDate`/`endDate` to the business's `planStartedAt`/`planExpiresAt` (§2), and ideally echo them back on the updated `RegistrationRequest`:

```jsonc
{
  "subscriptionStartDate": "2026-10-14T08:00:00.000Z",
  "subscriptionEndDate": "2027-01-14T08:00:00.000Z"
}
```

## 4. Per-item statistics endpoint — not implemented yet

**Confirmed via code comment already in the frontend:** `GET /statistics/items/:id` is called (`getItemStatistics` in `src/features/restaurant-dashboard/services.ts`) but always 404s — there is no mock stub masking this, it's a real gap. Every *other* analytics endpoint in the same dashboard area (`/statistics/business`, `/statistics/overview`, `/statistics/best-selling`, `/statistics/categories`, `/statistics/peak-times`, `/statistics/live-activity`, `/statistics/insights`) is already implemented and working — this is the one missing piece, not a broader analytics gap.

### Requested shape — `GET /statistics/items/:itemId`

Matches the `ItemStatistics` type already defined in the frontend (`src/lib/types.ts`):

```jsonc
{
  "viewCount": 128,
  "cartAddCount": 34,
  "quantitySold": 52,
  "revenue": 780000,
  "conversionRate": 0.27,      // cartAddCount / viewCount, or however it's best computed server-side
  "favoriteCount": 9
}
```

- 403 should still mean "the business's plan doesn't include item-level statistics" (the frontend already distinguishes this from "not available yet" — see `ItemStatsModal`'s existing 403 handling).
- 404 for an item id that doesn't belong to the authenticated business, same as other item-scoped endpoints.

## 5. Summary of all new fields

| Field | Resource | Type | Notes |
|---|---|---|---|
| `agent` | `Business` (owner reads only) | `BusinessAgent \| null` | §1 |
| `planName` | `Business` | `string` (optional) | §2 |
| `planStartedAt` | `Business` | `string` (ISO, optional) | §2 |
| `durationType`, `durationMonths`, `endDate` | request body of `PATCH /registration-requests/:id/status` | — | §3, only when approving |
| `subscriptionStartDate`, `subscriptionEndDate` | `RegistrationRequest` response | `string` (ISO, optional) | §3 |
| `GET /statistics/items/:itemId` | new endpoint | `ItemStatistics` | §4 |

## 6. Subscription plan pricing — monthly, yearly, and agent prices, all server-computed

**Why:** an admin creates a plan with one price (the agreed monthly rate) and nothing else — the yearly price, the agent's discounted price on both cycles, and every savings figure shown on the pricing cards (admin console and the agent's own "plans at my price" page) all need to come back from the API already computed. The frontend does not multiply, discount, or subtract anything; every number it displays is its own field.

### Pricing policy (apply server-side)

- **Yearly price** = 10 × monthly price (i.e. the customer gets 2 months free for committing to a year). Not 12×.
- **Agent price** = 70% of the customer price, on both monthly and yearly (a flat 30% discount), so an agent can resell at the normal customer price and keep the 30% margin. Example: monthly price 15 → agent monthly price 10.5.

### `Plan` read shape — `GET /subscription-plans` (and the admin's `GET /admin/plans`, same endpoint today per `getAdminPlans`)

```jsonc
{
  "id": "p2",
  "name": { "ar": "الاحترافية", "en": "Professional" },
  "priceMonthly": 280000,
  "priceYearly": 2800000,
  "yearlyOriginalPrice": 3360000,     // priceMonthly * 12, for the struck-through "before" price next to priceYearly
  "yearlySavingsMonths": 2,
  "yearlySavingsAmount": 560000,      // yearlyOriginalPrice - priceYearly
  "agentPriceMonthly": 196000,
  "agentPriceYearly": 1960000,
  "agentYearlySavingsAmount": 840000, // priceYearly - agentPriceYearly
  "agentDiscountPercent": 30,
  "features": [{ "ar": "...", "en": "..." }],
  "subscriberCount": 264,
  "isPopular": true
}
```

Every field from `priceYearly` down through `agentDiscountPercent` is backend-computed from `priceMonthly` and the policy above — none of them are ever sent by the frontend on write.

### Write shape — `POST /subscription-plans`, `PATCH /subscription-plans/:id`

```jsonc
{
  "name": "Professional",
  "priceMonthly": 280000,
  "features": ["Unlimited items", "Orders from app and WhatsApp"],
  "isPopular": true
}
```

Only the fields an admin actually decides. The response to this write should be the full `Plan` shape above, with every computed field filled in — the admin console's plan list updates directly from this response, so a write that omits any of the computed fields will show stale/blank pricing until the next full list reload.

### Agent-facing read — `GET /subscription-plans` from an authenticated agent session

Same endpoint, same shape — an agent only ever reads `agentPriceMonthly`/`agentPriceYearly`/`agentYearlySavingsAmount`/`agentDiscountPercent` from it (never `priceMonthly`/`priceYearly`, which are the customer-facing numbers) — no separate endpoint needed unless it's cleaner on your end to not expose customer pricing to an agent's token at all, in which case a role-scoped response (omitting `priceMonthly`/`priceYearly`/`yearlyOriginalPrice`/`yearlySavingsAmount` for an agent caller) would also work with the same frontend code, since it only reads the `agent*` fields on that page.

### Summary of new `Plan` fields

| Field | Type | Formula (server-side) |
|---|---|---|
| `priceYearly` | `number` | `priceMonthly * 10` |
| `yearlyOriginalPrice` | `number` | `priceMonthly * 12` |
| `yearlySavingsMonths` | `number` | `2` (policy constant) |
| `yearlySavingsAmount` | `number` | `yearlyOriginalPrice - priceYearly` |
| `agentPriceMonthly` | `number` | `round(priceMonthly * 0.7)` |
| `agentPriceYearly` | `number` | `round(priceYearly * 0.7)` |
| `agentYearlySavingsAmount` | `number` | `priceYearly - agentPriceYearly` |
| `agentDiscountPercent` | `number` | `30` (policy constant) |
