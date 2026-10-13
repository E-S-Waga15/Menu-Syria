# Backend changes needed — fulfillment modes, delivery fee, payment code

This documents the backend contract changes the frontend now expects. Everything here is additive to the existing `Business` resource (`GET /restaurants/:slug`, `GET /stores/:slug`, `GET /me/restaurant`, `PATCH /businesses/:businessId`) — no existing field is renamed or removed.

## ⚠️ Bug found in the §1/§2 implementation — delivery-fee validation fires on unrelated requests

**Symptom:** turning dine-in or pickup on/off (while delivery was already enabled from before, untouched by that request) gets rejected with 422 "delivery fee must be set before enabling delivery" — even though that request never touched delivery at all.

**Cause:** the fee-required validation is apparently checking "does `fulfillmentModes` in this request contain `delivery` without `deliveryFee`?" on *every* PATCH, instead of checking "is `delivery` newly being turned on *in this request* (i.e. it wasn't in the business's previous `fulfillmentModes`, but is in the new one)?". So any request that re-sends the full `fulfillmentModes` array — which is required just to toggle a *different*, unrelated mode — gets caught by the same validation, because delivery happens to still be in the array (correctly, since it wasn't being changed).

**Fix needed — pick one:**

1. **Preferred: decouple the three modes into independent fields** instead of one array that has to be resent in full for every toggle:
   ```jsonc
   { "pickupEnabled": true, "dineInEnabled": true, "deliveryEnabled": false }
   ```
   Each is toggled with its own PATCH touching only that field (`{ "pickupEnabled": false }` and nothing else). The fee-required rule then only ever applies to a request that includes `"deliveryEnabled": true` — a request touching `pickupEnabled`/`dineInEnabled` alone can never trigger it, because it's structurally a different field. This also removes the "must resend the whole set" footgun entirely. (If this path is taken, `fulfillmentModes` as a combined array is no longer needed — happy to update the frontend to match whichever shape is simpler on your end.)

2. **Minimal fix, keeping the array:** scope the validation to a *transition* check — only require `deliveryFee` in the payload when `delivery` is present in the submitted `fulfillmentModes` **and** was *not* present in the business's current stored `fulfillmentModes`. A request where delivery was already enabled and stays enabled (because an unrelated mode is being toggled) should never need to carry `deliveryFee` again.

Until this lands, the frontend works around it by always re-sending `deliveryFee` alongside `fulfillmentModes` on every toggle whenever delivery remains in the resulting set — so the immediate error is gone, but it's extra, unnecessary payload on every dine-in/pickup toggle and relies on the frontend always knowing the current fee, which is fragile. Please apply one of the two fixes above when convenient.

## 1. Fulfillment modes — which of dine-in / pickup / delivery a business offers

**Problem today:** the frontend infers available fulfillment modes purely from business type (restaurant → dine-in + pickup + delivery; store → pickup + delivery). There is no way for an individual restaurant to turn dine-in or pickup off, or for a store to turn delivery off.

### New field on `Business`

```jsonc
{
  "fulfillmentModes": ["dineIn", "pickup", "delivery"] // subset, owner-configurable
}
```

- Type: `("dineIn" | "pickup" | "delivery")[]`.
- `dineIn` is only ever valid for a restaurant (a store can never offer it — reject it server-side if a store tries to set it).
- Must contain at least one mode — reject a PATCH that would leave it empty.
- Default for a newly-registered business: restaurant → `["dineIn", "pickup", "delivery"]`, store → `["pickup", "delivery"]` (matches today's hardcoded behavior, so nothing changes for a business that has never touched this setting).
- **Absent/`null` on a GET response** (e.g. a business created before this field existed) means "use the type-based default above" — the frontend already falls back to this, so a migration/backfill is optional but recommended for consistency.

### Write path

```
PATCH /businesses/:businessId
{ "fulfillmentModes": ["pickup", "delivery"] }
```

Validation:
- Every entry must be one of the three known values.
- `dineIn` rejected with 422 if the business is a store.
- Empty array rejected with 422 ("at least one fulfillment mode is required").
- If `delivery` is being added and the business has no `deliveryFee` set yet (see §2), reject with 422 — delivery cannot be turned on before a fee is configured, even "free" (0 counts as configured, see below).

## 2. Delivery fee — now mandatory once delivery is enabled

**Problem today:** `deliveryFee` is `number | null`, and `null`/`0`/absent are all treated as "free delivery" — there's no way to tell "owner explicitly set free delivery" apart from "owner never touched this at all." The frontend now needs to force the owner to make an explicit choice before delivery can be turned on.

### New field on `Business`

```jsonc
{
  "deliveryFeeConfigured": true, // owner has explicitly saved a fee (even 0/free) at least once
  "deliveryFee": 0               // 0 = free delivery, >0 = flat charge in SYP
}
```

- `deliveryFeeConfigured` is `false`/absent until the owner saves this section for the first time; becomes `true` on the first successful `PATCH` that includes `deliveryFee`, and stays `true` from then on (even if the owner later disables delivery and re-enables it — the last chosen fee is remembered, same UX as today's `lastFee` behavior on the frontend, just now backed by a real flag instead of inferred from "fee happens to be nonzero").
- `deliveryFee` itself keeps its existing meaning: `0` = free, `>0` = flat SYP charge. No change to this part.

### Enforcement

- `PATCH /businesses/:businessId` with `fulfillmentModes` that include `"delivery"`: if the business does not already have `deliveryFeeConfigured: true` **and** the same request does not also include a `deliveryFee`, reject with 422 ("set a delivery fee, free or priced, before enabling delivery").
- A request may set both in one call: `{ "fulfillmentModes": [...,"delivery"], "deliveryFee": 0 }` — this is the primary path the dashboard now uses (the delivery-enable switch and the fee field save together).
- Turning delivery back off (`fulfillmentModes` without `"delivery"`) never requires touching `deliveryFee` — the stored fee and `deliveryFeeConfigured` flag are left untouched so re-enabling later remembers the last value.

## 3. Payment code — a typed/copyable Sham Cash transfer code, alongside the existing QR image

**Problem today:** `paymentQrCode` (image) is the only way a business shows customers how to pay via Sham Cash. Many customers prefer to copy a short code into the Sham Cash app directly rather than scan+save an image.

### New field on `Business`

```jsonc
{
  "paymentCode": "SC-7421-9930-ALEP" // opaque string, owner-typed; "" or absent = not set
}
```

- Type: `string`, optional/nullable. No format constraint from the backend's side — it's an opaque string the owner types in (their Sham Cash transfer code/account identifier), the frontend just displays and copies it verbatim.
- Independent of `paymentQrCode` — a business can have either, both, or neither. The frontend shows whichever of the two is present; if both are present it shows both (QR card + a copy-code row).
- Reasonable length cap recommended server-side (e.g. 120 chars) to stop abuse, but no specific format is assumed.

### Write path

```
PATCH /businesses/:businessId
{ "paymentCode": "SC-7421-9930-ALEP" }
```

Same PATCH endpoint as everything else in this document — `paymentCode: ""` clears it, same convention as `paymentQrCode`.

## 4. Summary of all new/changed `Business` fields

| Field | Type | Notes |
|---|---|---|
| `fulfillmentModes` | `("dineIn" \| "pickup" \| "delivery")[]` | new, owner-configurable, see §1 |
| `deliveryFeeConfigured` | `boolean` | new, see §2 |
| `deliveryFee` | `number \| null` | unchanged meaning, now gated by §1/§2 validation |
| `paymentCode` | `string` (optional) | new, see §3 |
| `paymentQrCode` | `string` (optional) | unchanged |

No existing field is removed or renamed. A client that doesn't send any of the new fields continues to behave exactly as it does today (restaurant/store-type-based fulfillment, `deliveryFee` treated as "0/absent = free").

## 5. Order payload — no changes required

`branchId` on order placement keeps its existing meaning (`undefined`/absent = main branch, a real branch id = that branch) — this document doesn't change the order-submission contract, only the business profile read/write contract above it.
