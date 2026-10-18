import { z } from "zod";

import { syrianPhone, type ValidationMessages } from "@/lib/validation";

/**
 * One option group's shape, shared by the dedicated options editor and the
 * add-item dialog's own embedded copy (see `optionGroupSchema` usage below).
 * `id` doubles as the free-text label on both a group and an option (the
 * backend has no separate name field), so a blank one is not a validation
 * error here: `toOptionGroups` silently drops any group or option the owner
 * left empty.
 */
const optionGroupSchema = z.object({
  id: z.string(),
  selectionType: z.enum(["single", "multiple", "customAmount"]),
  required: z.boolean(),
  options: z.array(
    z.object({
      id: z.string(),
      priceDelta: z.number(),
    }),
  ),
});

export const dishFormSchema = (v: ValidationMessages) =>
  z.object({
    name: z.string().trim().min(1, v.required),
    desc: z.string(),
    price: z
      .string()
      .min(1, v.priceRequired)
      .regex(/^\d+$/, v.numbersOnly),
    currency: z.enum(["SYP", "USD"]),
    // hides the +/- quantity stepper everywhere this item appears, and
    // locks every add to its own separate 1x line — see
    // CatalogItem.quantityLocked
    quantityLocked: z.boolean(),
    // only shown/submitted when adding a brand-new item — editing an
    // existing one manages its options separately, from the item card's
    // own kebab menu (see MenuDishDialog)
    groups: z.array(optionGroupSchema),
  });
export type DishFormValues = z.infer<ReturnType<typeof dishFormSchema>>;

export const branchFormSchema = (v: ValidationMessages) =>
  z.object({
    name: z.string().trim().min(1, v.required),
    governorateId: z.string().min(1, v.governorateRequired),
    districtId: z.string().min(1, v.regionRequired),
    address: z.string(),
    phone: syrianPhone(v.phoneInvalid),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
  });
export type BranchFormValues = z.infer<ReturnType<typeof branchFormSchema>>;

/**
 * One item's option groups (size/color/custom add-ons), edited on their own
 * for an existing item — see `item-options-modal.tsx`.
 *
 * Price entry always follows `selectionType`, not a separate owner-facing
 * toggle: a single-choice group (size) is priced as each option's own final
 * price, a multiple-choice group (add-ons) is priced as what each option
 * adds. See `toOptionGroups` in `item-options-modal.tsx` for the conversion.
 */
export const itemOptionsSchema = () =>
  z.object({
    groups: z.array(optionGroupSchema),
    // edited here too, not just at creation — it's really the open option's
    // own setting (see OpenOptionCard), but lives on the item itself
    quantityLocked: z.boolean(),
  });
export type ItemOptionsValues = z.infer<ReturnType<typeof itemOptionsSchema>>;
