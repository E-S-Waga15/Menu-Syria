import { notFound } from "next/navigation";

import { AgentDashboardShell } from "@/features/agent-dashboard/components/shell";
import { isLocale } from "@/i18n/config";

export default async function AgentLayout({
  children,
  params,
}: LayoutProps<"/[lang]/agent">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return <AgentDashboardShell>{children}</AgentDashboardShell>;
}
