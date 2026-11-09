import { AdminBusinessesList } from "@/features/admin/components/businesses-list";
import { fetchAdminPage } from "@/features/admin/server";
import { getAdminRestaurants } from "@/features/admin/services";
import { getGovernorates, getRegions } from "@/features/marketing/services";

export default async function AdminBusinessesPage({
  params,
}: PageProps<"/[lang]/admin/restaurants">) {
  const { lang } = await params;

  const [initialData, governorates, regions] = await Promise.all([
    fetchAdminPage(lang, (accessToken) =>
      getAdminRestaurants({}, { accessToken }),
    ),
    getGovernorates(),
    getRegions(),
  ]);

  return (
    <AdminBusinessesList
      initialData={initialData}
      governorates={governorates}
      regions={regions}
      kind="restaurant"
    />
  );
}
