"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createBranch,
  deleteBranch,
  updateBranch,
  type BranchWriteInput,
} from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";

/**
 * Branch create / edit / delete. Unlike the catalog's optimistic mutations,
 * these wait for the real response before saying anything: a branch list is
 * short and rarely touched, so there is nothing to gain from redrawing it
 * before the server has actually agreed — and the toast firing early is
 * exactly what used to tell an owner "done" a beat before the real error
 * arrived.
 */
export function useBranchMutations(businessId: string) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const key = queryKeys.me.branches;

  const onError = (error: unknown) => {
    toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
  };
  const onSettled = () => queryClient.invalidateQueries({ queryKey: key });

  const add = useMutation({
    mutationFn: (input: BranchWriteInput) =>
      createBranch({ businessId, ...input }),
    onSuccess: (data) => toast.success(data.message ?? t.dashboard.branchSaved),
    onError,
    onSettled,
  });

  const edit = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<BranchWriteInput>) =>
      updateBranch(id, input),
    onSuccess: (data) => toast.success(data.message ?? t.dashboard.branchSaved),
    onError,
    onSettled,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: (data) =>
      toast.success(data?.message ?? t.dashboard.branchDeleted),
    onError,
    onSettled,
  });

  return {
    save: (values: BranchWriteInput, editingId: string | null) =>
      editingId
        ? edit.mutateAsync({ id: editingId, ...values })
        : add.mutateAsync(values),
    remove: (id: string) => remove.mutateAsync(id),
    isSaving: add.isPending || edit.isPending,
    isRemoving: remove.isPending,
  };
}
