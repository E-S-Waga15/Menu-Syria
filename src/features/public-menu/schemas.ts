import { z } from "zod";

import { isSyrianPhone } from "@/lib/validation";
import type { ValidationMessages } from "@/lib/validation";

/**
 * Checkout details — name and phone are required for every fulfillment
 * mode; what else is required depends on `fulfillment`: dine-in's table
 * number is optional, pickup needs a pickup-time slot, delivery needs an
 * address too.
 */
export const cartDetailsSchema = (v: ValidationMessages) =>
  z
    .object({
      fulfillment: z.enum(["dineIn", "pickup", "delivery"]),
      tableNumber: z.string().regex(/^\d*$/, v.numbersOnly),
      customerName: z.string(),
      // "asap", or an exact "HH:mm" (24h) time the customer picked
      pickupTime: z.string().optional(),
      phone: z.string(),
      address: z.string(),
      notes: z.string(),
    })
    .superRefine((data, ctx) => {
      // name + phone are mandatory no matter how the order is fulfilled
      if (!data.customerName.trim())
        ctx.addIssue({
          code: "custom",
          path: ["customerName"],
          message: v.required,
        });
      if (!isSyrianPhone(data.phone))
        ctx.addIssue({
          code: "custom",
          path: ["phone"],
          message: v.phoneInvalid,
        });

      if (data.fulfillment === "pickup" && !data.pickupTime) {
        ctx.addIssue({
          code: "custom",
          path: ["pickupTime"],
          message: v.required,
        });
      }
      if (data.fulfillment === "delivery" && !data.address.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["address"],
          message: v.required,
        });
      }
    });
export type CartDetailsValues = z.infer<ReturnType<typeof cartDetailsSchema>>;
