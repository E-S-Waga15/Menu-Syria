import { AdminAgentsList } from "@/features/admin/components/agents-list";
import { fetchAdminPage } from "@/features/admin/server";
import { getAdminAgents } from "@/features/admin/services";
import { getGovernorates, getRegions } from "@/features/marketing/services";

export default async function AdminAgentsPage({
  params,
}: PageProps<"/[lang]/admin/agents">) {
  const { lang } = await params;

  const [initialData, governorates, regions] = await Promise.all([
    fetchAdminPage(lang, (accessToken) => getAdminAgents({}, { accessToken })),
    getGovernorates(),
    getRegions(),
  ]);

  return (
    <AdminAgentsList
      initialData={initialData}
      governorates={governorates}
      regions={regions}
    />
  );
}
