import type { Metadata } from "next";

import { OrderTrackingView } from "@/features/public-menu/components/order-tracking-view";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/track/[id]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getDictionary(lang);
  return { title: t.orderTracking.metaTitle, robots: { index: false } };
}

export default async function TrackOrderPage({
  params,
}: PageProps<"/[lang]/track/[id]">) {
  const { id } = await params;
  return <OrderTrackingView id={id} />;
}
