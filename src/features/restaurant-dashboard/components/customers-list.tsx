"use client";

import Link from "next/link";
import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, Plus, User } from "lucide-react";

import { Pagination } from "@/components/shared/pagination";
import { AdminFilterBar } from "@/features/admin/components/admin-filter-bar";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { Button } from "@/components/ui/button";
import { CustomerDialog } from "@/features/restaurant-dashboard/components/customer-dialog";
import {
  createCustomer,
  getCustomers,
} from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import { usePageParam, useSearchParam } from "@/lib/url-state";

/**
 * The business's own customer book — a simple, searchable card list rather
 * than a table (the whole feature is read mostly on a phone at the counter).
 * Search/page live in the URL (see `lib/url-state`) and drive a real
 * server-paginated fetch, same contract as the admin console's lists.
 */
export function CustomersList() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [query, setQuery] = useSearchParam("q");
  const [page, setPage] = usePageParam();
  const [dialogOpen, setDialogOpen] = useState(false);

  const listQuery = { page, q: query.trim() || undefined };
  const { data } = useQuery({
    queryKey: queryKeys.me.customers(listQuery),
    queryFn: () => getCustomers(listQuery),
  });

  const rows = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;

  const refetch = () =>
    void queryClient.invalidateQueries({ queryKey: ["me", "customers"] });

  const addCustomer = async (values: { name: string; phone: string }) => {
    try {
      const result = await createCustomer({
        name: values.name,
        phone: values.phone.trim() || undefined,
      });
      refetch();
      toast.success(result?.message ?? t.dashboard.customerSaved);
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t.dashboard.customers}
        count={total}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            {t.dashboard.addCustomer}
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground">{t.dashboard.customersHint}</p>

      <AdminFilterBar
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder={t.agentsPage.searchPlaceholder}
        hasFilters={query.trim() !== ""}
        onClear={() => {
          setQuery("");
          setPage(1);
        }}
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-14 text-center">
          <p className="text-sm font-semibold">{t.dashboard.noCustomersYet}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.dashboard.noCustomersYetBody}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/${lang}/dashboard/customers/${customer.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors duration-200 hover:border-primary/35"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-berry-soft text-berry-soft-foreground">
                  <User className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{customer.name}</p>
                  {customer.phone && (
                    <p
                      className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      <Phone className="size-3 shrink-0" />
                      {customer.phone}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={null}
        onSave={addCustomer}
      />
    </div>
  );
}
