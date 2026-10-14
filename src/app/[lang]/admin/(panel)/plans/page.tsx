import { FetchError } from "@/components/shared/fetch-error";
import { AdminPlansList } from "@/features/admin/components/plans-list";
import { fetchAdminPage } from "@/features/admin/server";
import { getAdminPlans } from "@/features/admin/services";

export default async function AdminPlansPage({
  params,
}: PageProps<"/[lang]/admin/plans">) {
  const { lang } = await params;

  // a non-401 failure here (the backend's own 500, a timeout, a malformed
  // response) used to crash the whole SSR render with no fallback at all —
  // an inline retry beats that silently
  let plans;
  try {
    plans = await fetchAdminPage(lang, (accessToken) =>
      getAdminPlans({ accessToken }),
    );
  } catch {
    return <FetchError />;
  }
  return <AdminPlansList plans={plans} />;
}
