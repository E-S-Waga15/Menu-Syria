"use client";

import Link from "next/link";
import { useState } from "react";

import { ChefHat, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewOrderDialog } from "@/features/restaurant-dashboard/components/new-order-dialog";
import { OrderHistoryList } from "@/features/restaurant-dashboard/components/order-history-list";
import { OrdersKanban } from "@/features/restaurant-dashboard/components/orders-kanban";
import { useI18n } from "@/i18n/client";

/**
 * The orders page's own shell: the live board and the history list as two
 * tabs of the same page (not two sidebar entries — the dashboard already
 * has enough top-level pages), plus the "new order" action that opens
 * `NewOrderDialog`.
 */
export function OrdersPage({ dashboardBase }: { dashboardBase: string }) {
  const { t } = useI18n();
  const [tab, setTab] = useState("board");
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" render={<Link href={`${dashboardBase}/kitchen`} />}>
          <ChefHat className="size-4" />
          {t.dashboard.kitchenScreen}
        </Button>
        <Button size="sm" onClick={() => setNewOrderOpen(true)}>
          <Plus className="size-4" />
          {t.dashboard.newOrder}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-max rounded-xl p-2">
          <TabsTrigger value="board" className="rounded-lg px-6 py-2.5 font-semibold">
            {t.dashboard.liveBoardTab}
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg px-6 py-2.5 font-semibold">
            {t.dashboard.orderHistoryTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <OrdersKanban />
        </TabsContent>
        <TabsContent value="history">
          <OrderHistoryList />
        </TabsContent>
      </Tabs>

      <NewOrderDialog open={newOrderOpen} onOpenChange={setNewOrderOpen} />
    </div>
  );
}
