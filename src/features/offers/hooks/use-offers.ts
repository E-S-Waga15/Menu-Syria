"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { OfferValues } from "@/features/offers/schemas";
import {
  createOffer,
  deleteOffer,
  updateOffer,
  type OfferWriteInput,
} from "@/features/offers/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { LocalizedText, Offer } from "@/lib/types";

/** The API stores one string per field; the form is single-locale too. */
const toLocalized = (value: string): LocalizedText => ({ ar: value, en: value });

/**
 * Create, edit, pause, duplicate and delete the offers a business publishes.
 *
 * Every write lands in the cache first so the card the owner just edited
 * redraws under their cursor, and is rolled back if the server refuses it.
 */
export function useOfferMutations(businessId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const key = queryKeys.offers.byBusiness(businessId);

  const failure = {
    onError: (
      error: unknown,
      _variables: unknown,
      context?: { previous?: Offer[] },
    ) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  };

  async function patch(next: (current: Offer[]) => Offer[]) {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<Offer[]>(key);
    if (previous) queryClient.setQueryData<Offer[]>(key, next(previous));
    return { previous };
  }

  const currentOffers = () => queryClient.getQueryData<Offer[]>(key) ?? [];

  const create = useMutation({
    mutationFn: (input: OfferWriteInput) => createOffer(businessId, input),
    onMutate: (input) =>
      patch((current) => [
        ...current,
        {
          id: `offer-pending-${Date.now()}`,
          businessId,
          name: toLocalized(input.name),
          description: toLocalized(input.description),
          images: input.images,
          includes: input.includes.map(toLocalized),
          originalPrice: input.originalPrice,
          price: input.price,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          isActive: input.isActive,
          badge: input.badge,
          sortOrder: input.sortOrder,
        },
      ]),
    onSuccess: (data) => toast.success(data.message ?? t.offers.saved),
    ...failure,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<OfferWriteInput> }) =>
      updateOffer(businessId, id, input),
    onMutate: ({ id, input }) =>
      patch((current) =>
        current.map((offer) =>
          offer.id === id ? { ...offer, ...toOfferPatch(input) } : offer,
        ),
      ),
    onSuccess: (data) => toast.success(data.message ?? t.offers.saved),
    ...failure,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteOffer(businessId, id),
    onMutate: (id) => patch((current) => current.filter((o) => o.id !== id)),
    onSuccess: (data) => toast.success(data?.message ?? t.offers.deleted),
    ...failure,
  });

  return {
    /** `editing` decides whether this is a new offer or a rewrite of one */
    save: (values: OfferValues, editing: Offer | null) => {
      const input: OfferWriteInput = {
        name: values.name,
        description: values.description,
        images: values.images,
        includes: values.includes.map((line) => line.trim()).filter(Boolean),
        originalPrice: Number(values.originalPrice) || 0,
        price: Number(values.price) || 0,
        startsAt: values.startsAt,
        endsAt: values.endsAt || undefined,
        isActive: values.isActive,
        badge: values.badge === "none" ? undefined : values.badge,
        sortOrder: editing?.sortOrder ?? currentOffers().length + 1,
      };
      if (editing) update.mutate({ id: editing.id, input });
      else create.mutate(input);
    },
    toggleActive: (offer: Offer) =>
      update.mutate({ id: offer.id, input: { isActive: !offer.isActive } }),
    /**
     * A copy starts paused: publishing it is a decision, not a side effect of
     * duplicating something that was already live.
     */
    duplicate: (offer: Offer) =>
      create.mutate({
        name: offer.name.ar,
        description: offer.description.ar,
        images: offer.images,
        includes: offer.includes.map((line) => line.ar),
        originalPrice: offer.originalPrice,
        price: offer.price,
        startsAt: offer.startsAt,
        endsAt: offer.endsAt,
        isActive: false,
        badge: offer.badge,
        sortOrder: currentOffers().length + 1,
      }),
    remove: (offer: Offer) => remove.mutate(offer.id),
    /** a delete is the only destructive one, and it says so */
    isRemoving: remove.isPending,
    isPending: create.isPending || update.isPending,
  };
}

function toOfferPatch(input: Partial<OfferWriteInput>): Partial<Offer> {
  const patch: Partial<Offer> = {};
  if (input.name !== undefined) patch.name = toLocalized(input.name);
  if (input.description !== undefined) {
    patch.description = toLocalized(input.description);
  }
  if (input.images !== undefined) patch.images = input.images;
  if (input.includes !== undefined) {
    patch.includes = input.includes.map(toLocalized);
  }
  if (input.originalPrice !== undefined) patch.originalPrice = input.originalPrice;
  if (input.price !== undefined) patch.price = input.price;
  if (input.startsAt !== undefined) patch.startsAt = input.startsAt;
  if (input.endsAt !== undefined) patch.endsAt = input.endsAt;
  if (input.isActive !== undefined) patch.isActive = input.isActive;
  if (input.badge !== undefined) patch.badge = input.badge;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  return patch;
}