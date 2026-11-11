"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import {
  Bike,
  CheckCircle2,
  ChefHat,
  CircleX,
  Clock,
  MapPin,
  PackageCheck,
  RotateCcw,
} from "lucide-react";

import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { SafeImage } from "@/components/shared/safe-image";
import { Logo } from "@/components/shared/logo";
import { Price } from "@/components/shared/price";
import { getPublicOrderTracking } from "@/features/public-menu/services";
import { fmt, useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const STEPS: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "delivered"];

const STEP_ICON: Record<string, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle2,
  preparing: ChefHat,
  ready: PackageCheck,
  delivered: Bike,
};

const TERMINAL: OrderStatus[] = ["delivered", "cancelled", "refunded"];

/**
 * A guest-facing, no-login read of one order's own status — the whole
 * point is that the link itself (the order's own unguessable id) is the
 * only thing standing in for a login. Polls while the order is still live
 * so the page updates on its own as the kitchen advances it.
 */
export function OrderTrackingView({ id }: { id: string }) {
  const { t, lang } = useI18n();

  const { data: order, isLoading } = useQuery({
    queryKey: ["public", "orders", id],
    queryFn: () => getPublicOrderTracking(id),
    refetchInterval: (query) =>
      query.state.data && TERMINAL.includes(query.state.data.status) ? false : 15000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <CircleX className="size-12 text-muted-foreground" />
        <div>
          <h1 className="font-heading text-lg font-bold">
            {t.orderTracking.notFoundTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.orderTracking.notFoundBody}
          </p>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const isRefunded = order.status === "refunded";
  const currentStepIndex = STEPS.indexOf(
    isCancelled || isRefunded ? "pending" : order.status,
  );

  const STATUS_LABEL: Record<string, string> = {
    pending: t.orderTracking.statusPending,
    confirmed: t.orderTracking.statusConfirmed,
    preparing: t.orderTracking.statusPreparing,
    ready: t.orderTracking.statusReady,
    delivered: t.orderTracking.statusDelivered,
  };

  const fulfillmentLabel =
    order.fulfillmentMode === "delivery"
      ? t.orderTracking.deliveryMode
      : order.fulfillmentMode === "pickup"
        ? t.orderTracking.pickupMode
        : t.orderTracking.dineInMode;

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-center">
        <Logo lang={lang} brand={t.seo.siteName} className="h-8" />
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          {order.businessLogoUrl && (
            <SafeImage
              unoptimized
              src={order.businessLogoUrl}
              alt=""
              width={44}
              height={44}
              className="size-11 shrink-0 rounded-xl object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-heading font-bold">
              {order.businessName[lang]}
            </p>
            <p className="text-xs text-muted-foreground">
              {fmt(t.orderTracking.placedAt, {
                date: new Date(order.createdAt).toLocaleString(
                  lang === "ar" ? "ar-SY" : "en-US",
                  { dateStyle: "medium", timeStyle: "short" },
                ),
              })}
            </p>
          </div>
        </div>

        {isCancelled || isRefunded ? (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-destructive/10 p-4 text-destructive">
            {isCancelled ? (
              <CircleX className="size-5 shrink-0" />
            ) : (
              <RotateCcw className="size-5 shrink-0" />
            )}
            <p className="text-sm font-semibold">
              {isCancelled ? t.orderTracking.cancelledNote : t.orderTracking.refundedNote}
            </p>
          </div>
        ) : (
          <ol className="mt-6 space-y-0">
            {STEPS.map((step, i) => {
              const Icon = STEP_ICON[step]!;
              const done = i <= currentStepIndex;
              const isLast = i === STEPS.length - 1;
              return (
                <li key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                        done
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-container text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4.5" />
                    </span>
                    {!isLast && (
                      <span
                        className={cn(
                          "h-8 w-0.5 transition-colors duration-300",
                          i < currentStepIndex ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                  <div className={cn("pb-8", isLast && "pb-0")}>
                    <p
                      className={cn(
                        "pt-1.5 text-sm font-bold",
                        done ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {STATUS_LABEL[step]}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {order.fulfillmentMode === "delivery" && order.deliveryAddress && (
          <p className="mt-2 flex items-start gap-1.5 border-t border-dashed border-border pt-4 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="font-semibold text-foreground">
                {t.orderTracking.deliveryAddress}:
              </span>{" "}
              {order.deliveryAddress}
            </span>
          </p>
        )}
        {order.fulfillmentMode && (
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            {fulfillmentLabel}
          </p>
        )}

        <h2 className="mt-5 border-t border-dashed border-border pt-4 text-sm font-bold text-muted-foreground">
          {t.orderTracking.itemsTitle}
        </h2>
        <ul className="mt-2 space-y-1.5 text-sm">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="truncate">
                {item.quantity}× {item.name}
              </span>
              <Price
                amount={item.lineTotal}
                currency={order.currency}
                lang={lang}
                className="shrink-0 text-muted-foreground"
              />
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-dashed border-border pt-4">
          <span className="font-bold">{t.orderTracking.total}</span>
          <Price
            amount={order.totalAmount}
            currency={order.currency}
            lang={lang}
            className="font-bold text-primary"
          />
        </div>
      </div>

      <Link
        href={`/${order.businessSlug}`}
        className="mt-6 block text-center text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        {t.orderTracking.backToMenu}
      </Link>
    </div>
  );
}
