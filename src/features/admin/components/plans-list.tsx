"use client";

import { useState } from "react";

import { Check, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  createAdminPlan,
  deleteAdminPlan,
  updateAdminPlan,
} from "@/features/admin/services";
import { RowActions, type RowAction } from "@/components/shared/row-actions";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

/** the draft a plan is edited through; `null` means the dialog is shut */
type Draft = {
  id: string | null;
  name: string;
  priceMonthly: string;
  features: string[];
  isPopular: boolean;
};

const emptyDraft: Draft = {
  id: null,
  name: "",
  priceMonthly: "",
  features: [""],
  isPopular: false,
};

/**
 * The tiers the platform sells, with the console's editing on top.
 *
 * Cards rather than rows: a plan is read by comparing it against its
 * neighbours, which columns make easy and a stacked list makes work.
 *
 * Edits are kept local while the API is mocked, so the page behaves like the
 * real thing without pretending a write landed somewhere.
 */
export function AdminPlansList({ plans }: { plans: Plan[] }) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState(plans);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const openNew = () => setDraft(emptyDraft);

  const openEdit = (plan: Plan) =>
    setDraft({
      id: plan.id,
      name: plan.name[lang],
      priceMonthly: String(plan.priceMonthly),
      features: plan.features.map((f) => f[lang]),
      isPopular: Boolean(plan.isPopular),
    });

  // only the monthly price and the plan's own metadata are ever sent —
  // the yearly price, both agent prices, and every savings figure come
  // back already computed on the saved `Plan` and are used as-is below,
  // never recalculated here
  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return;

    const priceMonthly = Number(draft.priceMonthly) || 0;
    const features = draft.features.map((f) => f.trim()).filter(Boolean);

    setIsSaving(true);
    try {
      const result = draft.id
        ? await updateAdminPlan(draft.id, {
            name,
            priceMonthly,
            features,
            isPopular: draft.isPopular,
          })
        : await createAdminPlan({
            name,
            priceMonthly,
            features,
            isPopular: draft.isPopular,
          });

      setRows((prev) => {
        // only one tier can be the highlighted one
        const cleared = draft.isPopular
          ? prev.map((p) => ({ ...p, isPopular: false }))
          : prev;

        return draft.id
          ? cleared.map((p) => (p.id === draft.id ? result : p))
          : [...cleared, result];
      });

      toast.success((result as { message?: string })?.message ?? t.admin.planSaved);
      setDraft(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!deleting) return;
    let message: string | undefined;
    setIsRemoving(true);
    try {
      const result = await deleteAdminPlan(deleting.id);
      message = result?.message;
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
      setIsRemoving(false);
      return;
    }
    setRows((prev) => prev.filter((p) => p.id !== deleting.id));
    setIsRemoving(false);
    toast.success(message ?? t.admin.planDeleted);
    setDeleting(null);
  };

  const actionsFor = (plan: Plan): RowAction[] => [
    { label: t.admin.editPlan, icon: Pencil, onSelect: () => openEdit(plan) },
    {
      label: t.admin.deleteRecord,
      icon: Trash2,
      onSelect: () => setDeleting(plan),
      danger: true,
    },
  ];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t.admin.plansPage}
        count={rows.length}
        action={
          <Button onClick={openNew}>
            <Plus className="size-4" />
            {t.admin.addPlan}
          </Button>
        }
      />

      {/* one switch drives every card's displayed cycle — the standard
          SaaS-pricing-page pattern, instead of a per-card toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-muted p-1">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              cycle === "monthly"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {t.admin.billingMonthly}
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              cycle === "yearly"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {t.admin.billingYearly}
          </button>
        </div>
      </div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((plan) => {
          const price = cycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
          const agentPrice =
            cycle === "monthly" ? plan.agentPriceMonthly : plan.agentPriceYearly;
          return (
            <li
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-5 md:p-6",
                plan.isPopular ? "border-primary" : "border-border/60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-bold">
                    {plan.name[lang]}
                  </h2>
                  {plan.isPopular && (
                    <Badge className="mt-1.5 bg-berry-soft text-berry-soft-foreground">
                      <Sparkles className="me-1 size-3" />
                      {t.admin.mostPopular}
                    </Badge>
                  )}
                </div>
                <RowActions actions={actionsFor(plan)} />
              </div>

              <div className="mt-3">
                {cycle === "yearly" && (
                  <span
                    className="block text-sm text-muted-foreground line-through"
                    dir="ltr"
                  >
                    {formatPrice(plan.yearlyOriginalPrice, t.common.currency)}
                  </span>
                )}
                <p className="flex items-baseline gap-1.5">
                  <span className="font-heading text-2xl font-bold text-primary">
                    {formatPrice(price, t.common.currency)}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {cycle === "monthly" ? t.admin.pricePerMonth : t.admin.pricePerYear}
                  </span>
                </p>
                {cycle === "yearly" && (
                  <Badge className="mt-1.5 bg-success/10 text-success">
                    {fmt(t.admin.yearlySavingsBadge, {
                      months: plan.yearlySavingsMonths,
                    })}
                  </Badge>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/40 px-3.5 py-2.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  {t.admin.agentPriceLabel}
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold" dir="ltr">
                    {formatPrice(agentPrice, t.common.currency)}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {fmt(t.admin.agentDiscountBadge, {
                      percent: plan.agentDiscountPercent,
                    })}
                  </span>
                </span>
              </div>

              <p className="mt-2.5 text-sm font-semibold text-muted-foreground">
                {fmt(t.admin.subscribers, { count: plan.subscriberCount })}
              </p>

              <h3 className="label-eyebrow mt-5 text-muted-foreground">
                {t.admin.planFeatures}
              </h3>
              <ul className="mt-2.5 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature.en}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {feature[lang]}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto scrollbar-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? t.admin.editPlan : t.admin.newPlan}
            </DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="plan-name">{t.admin.planName}</Label>
                <Input
                  id="plan-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="plan-price">{t.admin.planPrice}</Label>
                <Input
                  id="plan-price"
                  inputMode="numeric"
                  value={draft.priceMonthly}
                  onChange={(e) =>
                    setDraft({ ...draft, priceMonthly: e.target.value })
                  }
                  className="h-11"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label>{t.admin.planFeatures}</Label>
                {draft.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={feature}
                      placeholder={t.admin.planFeature}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          features: draft.features.map((f, i) =>
                            i === index ? e.target.value : f,
                          ),
                        })
                      }
                      className="h-11"
                    />
                    {draft.features.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t.admin.deleteRecord}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            features: draft.features.filter(
                              (_, i) => i !== index,
                            ),
                          })
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft({ ...draft, features: [...draft.features, ""] })
                  }
                >
                  <Plus className="size-3.5" />
                  {t.admin.addFeature}
                </Button>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
                <Checkbox
                  checked={draft.isPopular}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, isPopular: Boolean(checked) })
                  }
                />
                {t.admin.markPopular}
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" disabled={isSaving} onClick={() => setDraft(null)}>
              {t.common.cancel}
            </Button>
            <Button loading={isSaving} onClick={save}>
              {t.admin.savePlan}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.deleteRecord}</AlertDialogTitle>
            <AlertDialogDescription>
              {fmt(t.admin.confirmDeleteBody, { name: deleting?.name[lang] ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={isRemoving}
              onClick={() => void confirmRemove()}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
