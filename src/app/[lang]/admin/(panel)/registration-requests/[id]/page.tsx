import { notFound } from "next/navigation";

import { RegistrationRequestDetail } from "@/features/admin/components/registration-request-detail";
import { fetchAdminPage } from "@/features/admin/server";
import { getRegistrationRequestById } from "@/features/admin/services";
import { isLocale } from "@/i18n/config";

export default async function RegistrationRequestDetailPage({
  params,
}: PageProps<"/[lang]/admin/registration-requests/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const request = await fetchAdminPage(lang, (accessToken) =>
    getRegistrationRequestById(id, { accessToken }),
  );
  if (!request) notFound();

  return <RegistrationRequestDetail initialRequest={request} />;
}
