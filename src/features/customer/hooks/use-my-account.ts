"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store";
import {
  addMyPhone,
  getMyAccount,
  removeMyPhone,
  updateMyAvatar,
  updateMyProfile,
  type CustomerAccount,
  type CustomerPhoneInput,
  type CustomerProfileInput,
} from "@/features/customer/services";
import { useI18n } from "@/i18n/client";
import { ApiError, IS_MOCK } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { uploadImage } from "@/lib/api/upload";
import { toast } from "@/lib/toast";

/**
 * Nest answers a rejected request with an envelope whose `message` is the part
 * worth showing ("This phone number is already in use"), while `ApiError` only
 * carries the raw body. Unwrapping it here means every account failure speaks
 * about the actual problem instead of a generic line.
 */
function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.message) as {
        message?: string | string[];
      };
      const message = Array.isArray(parsed.message)
        ? parsed.message[0]
        : parsed.message;
      if (message) return message;
    } catch {
      // not the JSON envelope — whatever the body says is the message
      if (error.message) return error.message;
    }
  }
  return fallback;
}

/** `enabled` lets the guard hold the request back until it knows there really
 * is a session to send it with. */
export function useMyAccount(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me.account,
    queryFn: getMyAccount,
    enabled,
  });
}

/**
 * Writes to the account.
 *
 * Every endpoint answers with the whole account, so the cache is written from
 * the response — the page never shows a value the server did not confirm — and
 * then invalidated on settle so it also ends up on server truth.
 */
export function useCustomerProfileMutations() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const key = queryKeys.me.account;

  /**
   * The navbar and this page's greeting read the zustand session, not the
   * query — so a rename or a new photo has to be mirrored into it, or the
   * name in the header would stay stale until the next login.
   */
  const syncSession = (account: CustomerAccount) => {
    const { session, login } = useAuthStore.getState();
    if (!session) return;
    login({
      ...session,
      name: account.name || session.name,
      avatarUrl: account.avatarUrl ?? session.avatarUrl,
    });
  };

  const publish = (account: CustomerAccount) => {
    queryClient.setQueryData(key, account);
    syncSession(account);
  };

  const failed = (error: unknown, fallback: string) => {
    toast.error(errorMessage(error, fallback));
  };

  const settled = () => {
    void queryClient.invalidateQueries({ queryKey: key });
  };

  const profile = useMutation({
    mutationFn: (input: CustomerProfileInput) => updateMyProfile(input),
    onSuccess: (account) => {
      publish(account);
      toast.success(account.message ?? t.account.profileSaved);
    },
    onError: (error) => failed(error, t.common.saveFailed),
    onSettled: settled,
  });

  /** The file goes to the uploads endpoint first and only its URL is saved on
   * the account, so the row keeps a small string rather than an image blob. */
  const avatar = useMutation({
    mutationFn: async (file: File) =>
      updateMyAvatar(await toAvatarUrl(file)),
    onSuccess: (account) => {
      publish(account);
      toast.success(account.message ?? t.account.photoSaved);
    },
    onError: (error) => failed(error, t.account.photoFailed),
    onSettled: settled,
  });

  const add = useMutation({
    mutationFn: (input: CustomerPhoneInput) => addMyPhone(input),
    onSuccess: (account) => {
      publish(account);
      toast.success(account.message ?? t.account.phoneAdded);
    },
    onError: (error) => failed(error, t.common.saveFailed),
    onSettled: settled,
  });

  const remove = useMutation({
    mutationFn: (phoneId: string) => removeMyPhone(phoneId),
    onSuccess: (account) => {
      publish(account);
      toast.success(account.message ?? t.account.phoneRemoved);
    },
    onError: (error) => failed(error, t.common.saveFailed),
    onSettled: settled,
  });

  return {
    /** async so a form can keep itself open when the write is rejected */
    saveProfileAsync: profile.mutateAsync,
    isSavingProfile: profile.isPending,
    updateAvatar: avatar.mutate,
    isUpdatingAvatar: avatar.isPending,
    addPhoneAsync: add.mutateAsync,
    isAddingPhone: add.isPending,
    removePhone: remove.mutate,
    /** which number is mid-delete, so only that row shows a spinner */
    removingPhoneId: remove.isPending ? remove.variables : null,
  };
}

/** Mock mode has no uploads endpoint to call; the preview URL is enough there. */
async function toAvatarUrl(file: File): Promise<string> {
  if (IS_MOCK) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
  const { url } = await uploadImage(file, "users");
  return url;
}
