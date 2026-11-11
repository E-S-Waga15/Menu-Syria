import Link from "next/link";

import { ChefHat } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OrdersKanban } from "@/features/restaurant-dashboard/components/orders-kanban";
import { PlanFeatureGate } from "@/features/restaurant-dashboard/components/plan-feature-gate";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale } from "@/i18n/config";

export default async function DashboardOrdersPage({
  params,
}: PageProps<"/[lang]/dashboard/orders">) {
  const { lang } = await params;
  const t = isLocale(lang) ? await getDictionary(lang) : undefined;

  return (
    <PlanFeatureGate>
      <div className="space-y-5">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/${lang}/dashboard/kitchen`} />}
          >
            <ChefHat className="size-4" />
            {t?.dashboard.kitchenScreen}
          </Button>
        </div>
        <OrdersKanban />
      </div>
    </PlanFeatureGate>
  );
}
