# Backend changes needed — customer-typed-amount option type, category photos

## 🆕 New ask: an optional `imageUrl` on menu/catalog categories

**Why:** categories (the sections a menu/catalog is split into — "المقبلات", "الحلويات", …) can now carry their own photo, shown next to the category's name wherever it appears (the dashboard's category pills and its own new management page, the storefront's category pill bar, each section's own heading, and the "jump to section" picker). Entirely optional — a category with none renders exactly as it did before this shipped, plain text with no image slot reserved.

### Read — `GET /me/menu`'s `categories` array, and the public `GET /public/businesses/:slug/menu` equivalent

```jsonc
{
  "id": "...",
  "name": { "ar": "المقبلات", "en": "Appetizers" },
  "sortOrder": 1,
  "imageUrl": "https://.../categories/abc.png"   // new, optional — absent/null means no photo
}
```

### Write — `POST /categories`, `PATCH /categories/:id`

```jsonc
// POST /categories
{ "businessId": "...", "name": "المقبلات", "sortOrder": 1, "imageUrl": "https://.../categories/abc.png" }

// PATCH /categories/:id — omit the field to leave it untouched, or send "" to clear it back to no photo
{ "imageUrl": "" }
```

Same plain top-level column as `name`/`sortOrder` — categories aren't stored inside an `attributes` JSON blob the way item option groups are, so this shouldn't need anything beyond a new nullable column and passing it through on read/write.

**Upload folder:** the frontend already uploads the file first via `POST /uploads?folder=categories` before sending the resulting URL in the body above — `categories` is already listed as one of the accepted folder values on our side (`UPLOAD_FOLDERS` in `lib/api/upload.ts`), so this should already work if the uploads endpoint's folder allowlist matches what's documented; please confirm `categories` is genuinely accepted there and not silently falling back to `general` or erroring.

## 🆕 New ask: a third option-group type — a customer-typed amount, plus a per-item "sold as one unit" flag

## 🆕 New ask: a third option-group type — a customer-typed amount, plus a per-item "sold as one unit" flag

**Why:** some products are priced per a nominal unit but actually sold by whatever amount the customer wants — e.g. a kilo of loose shawarma listed at 1000, where a customer might order 700's worth or 1200's worth instead of the full kilo. There was no way to express "let the customer type the final price" as an option before; every existing option type (`single`/`multiple`) only ever picks from a predefined list the owner wrote.

This shipped on the frontend already — the dashboard's item editor has a third option-group type, the storefront's item modal renders a number input for it, the cart and WhatsApp message both handle it — but two things need backend support before it actually works end to end:

### 1. Accept `selectionType: "customAmount"` on an option group, with an empty `options: []`

Item create/update (`POST /items`, `PATCH /items/:id`) already accepts `attributes.optionGroups` — this is one more value for each group's `selectionType`, alongside the existing `single`/`multiple`. The difference: a `customAmount` group is saved with **no predefined options at all** — there's nothing to pick from a list, the customer types the amount at order time. Example body:

```jsonc
// PATCH /items/:id
{
  "attributes": {
    "optionGroups": [
      {
        "id": "الكمية",
        "selectionType": "customAmount",
        "required": true,
        "options": []   // always empty for this type — nothing to predefine
      }
    ]
  }
}
```

If `assertOptionGroups` (or wherever option groups are validated on write) currently rejects any group whose `options` array is empty, it needs an exception for `selectionType: "customAmount"` specifically — every other type should keep requiring at least one option, same as today.

### 2. A per-item `quantityLocked: boolean` — same `attributes` JSON blob `optionGroups` already rides in

**Why:** when an item's "quantity" is really expressed through a customAmount option (ordering 700 vs. 1200 already says how much they want), a separate quantity multiplier on top would double-count it — 2× a 700-value order doesn't mean "1400," it's just confusing. This flag hides the +/- quantity control everywhere the item appears and locks every add-to-cart to its own separate 1-unit line. It's independent of `customAmount` groups — an owner can also use it on any item they want sold strictly one at a time for other reasons.

```jsonc
// PATCH /items/:id
{ "attributes": { "quantityLocked": true } }
```

Since `attributes` is already documented as the item entity's free-form extension slot (that's where `optionGroups` lives today), this is probably just a "please confirm it round-trips" rather than a real schema change — the frontend already reads/writes it at `attributes.quantityLocked` the exact same way it does `attributes.optionGroups`. Please confirm an arbitrary new key under `attributes` isn't stripped on write or on read.

### 3. The actual price for a `customAmount` pick has to come from the customer, not a lookup — new ask on the order-placement endpoint

This is the one genuinely new piece of backend logic. Every other option is resolved server-side purely by id — the frontend never gets to tell the backend what an option costs, it only says which one was picked, and the backend looks up its own stored price. That can't work here: there is no stored price for "whatever the customer typed." `POST /public/businesses/:slug/orders`'s per-item `options` array needs to accept an extra field for exactly this case:

```jsonc
// POST /public/businesses/:slug/orders
{
  "items": [
    {
      "itemId": "...",
      "quantity": 1,
      "options": [
        { "id": "الكمية", "amount": 700 }   // "id" = the customAmount group's own id; "amount" = what the customer typed, trusted as-is for this option type only
      ]
    }
  ]
}
```

- `id` matches the `customAmount` group's own id (there's no separate option id to reference, since none were predefined).
- `amount` is the customer's typed final price for that line — please use it directly as that option's resolved price (equivalent internally to `priceDelta = amount - item.price`) rather than trying to look it up, since by definition it was never predefined. Every other option on the same order keeps resolving normally by id — this exception is scoped to groups whose `selectionType` is `customAmount`.
- The order's own generated WhatsApp message/line-item breakdown (if the backend builds one independently, separate from the frontend's own `buildWhatsAppOrderUrl`) should reflect this amount the same way.

**Scope note:** a guest order that falls back to the plain `wa.me` link (no name/phone given, or an offer-bundle line in the cart) never touches the backend at all — that whole path already works today with no backend change, since the frontend builds that message itself from data it already has. Only `POST /public/businesses/:slug/orders` (an order actually recorded through the platform) needs §3.
