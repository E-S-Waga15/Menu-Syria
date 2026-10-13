# Backend changes needed — agent linkage, subscription details, item statistics, plan pricing

Everything here is additive to existing resources — no existing field is renamed or removed. The earlier fulfillment-modes/delivery-fee/payment-code work (previous version of this document) is already shipped and confirmed working; §1-4 below are the batch after that; §6 is the latest addition (plan pricing).

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
