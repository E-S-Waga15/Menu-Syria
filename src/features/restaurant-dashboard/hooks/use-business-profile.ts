"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  updateBusinessProfile,
  type BusinessProfileInput,
} from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { Restaurant } from "@/lib/types";

/**
 * Saving one section of the business profile.
 *
 * The business row is written field-by-field rather than replaced, so a
 * section only ever sends the fields it owns — saving the theme cannot
 * overwrite an address another tab is editing.
 */
export function useBusinessProfileMutations(businessId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const key = queryKeys.me.business;

  const save = useMutation({
    mutationFn: (input: BusinessProfileInput) =>
      updateBusinessProfile(businessId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Restaurant>(key);
      if (previous) queryClient.setQueryData<Restaurant>(key, applyInput(previous, input));
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    },
    onSuccess: (data) =>
      toast.success(
        (data as { message?: string })?.message ?? t.dashboard.settingsSaved,
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    save: (input: BusinessProfileInput) => save.mutateAsync(input),
    isPending: save.isPending,
  };
}

/**
 * The profile form edits one language at a time, but the API stores a single
 * string per field — so the optimistic copy has to collapse both languages the
 * same way the server will, or the screen would show a value the next refetch
 * immediately contradicts.
 */
function applyInput(business: Restaurant, input: BusinessProfileInput): Restaurant {
  const next: Restaurant = { ...business };

  if (input.name !== undefined) next.name = { ar: input.name, en: input.name };
  if (input.slug !== undefined) next.slug = input.slug;
  if (input.description !== undefined) {
    next.description = { ar: input.description, en: input.description };
  }
  if (input.address !== undefined) {
    next.address = { ar: input.address, en: input.address };
  }
  if (input.cuisineType !== undefined) {
    next.cuisine = { ar: input.cuisineType, en: input.cuisineType };
  }
  if (input.districtId !== undefined) next.regionId = input.districtId;
  if (input.latitude !== undefined || input.longitude !== undefined) {
    next.location = {
      lat: input.latitude ?? business.location.lat,
      lng: input.longitude ?? business.location.lng,
    };
  }
  if (input.primaryColor !== undefined || input.secondaryColor !== undefined) {
    next.theme = {
      primaryColor: input.primaryColor ?? business.theme.primaryColor,
      secondaryColor: input.secondaryColor ?? business.theme.secondaryColor,
    };
  }
  if (input.logo !== undefined) next.logoUrl = input.logo;
  if (input.images !== undefined) next.coverImages = input.images;
  if (input.paymentQrCode !== undefined) next.paymentQrCode = input.paymentQrCode;
  if (input.paymentCode !== undefined) next.paymentCode = input.paymentCode;
  if (input.deliveryFee !== undefined) {
    next.deliveryFee = input.deliveryFee;
    next.deliveryFeeConfigured = true;
  }
  if (input.fulfillmentModes !== undefined) {
    next.fulfillmentModes = input.fulfillmentModes;
  }

  const whatsapp = input.phones?.find((phone) => phone.numberType === "whatsapp");
  const primary = input.phones?.find((phone) => phone.numberType !== "whatsapp");
  if (whatsapp) next.whatsapp = whatsapp.number;
  if (primary) next.phone = primary.number;

  const instagram = input.socialLinks?.find(
    (link) => link.socialPlatform.toLowerCase() === "instagram",
  );
  const facebook = input.socialLinks?.find(
    (link) => link.socialPlatform.toLowerCase() === "facebook",
  );
  if (instagram) next.instagram = instagram.url;
  if (facebook) next.facebook = facebook.url;

  return next;
}
