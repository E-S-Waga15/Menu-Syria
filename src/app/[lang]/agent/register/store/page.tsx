import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AgentRegisterIntro } from "@/features/agent-dashboard/components/agent-register-intro";
import { fetchAgentPage } from "@/features/agent-dashboard/server";
import { getMyAgentProfile } from "@/features/agent-dashboard/services";
import { RestaurantRegisterForm } from "@/features/auth/components/restaurant-register-form";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function AgentRegisterStorePage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getDictionary(lang);
  const agent = await fetchAgentPage(lang, (accessToken) =>
    getMyAgentProfile({ accessToken }),
  );

  return (
    // centred and width-capped: the shared form is built for the auth
    // layout, which centres it; the dashboard content area does not, so it
    // otherwise hugged the inline-start edge
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <AgentRegisterIntro kind="store" />
      <Suspense>
        <RestaurantRegisterForm
          lockedReferralCode={agent.referralCode}
          isAgentFlow
          copy={{
            title: t.auth.storeRegTitle,
            body: t.auth.storeRegBody,
            nameLabel: t.auth.storeNameLabel,
            namePlaceholder: t.auth.storeNamePlaceholder,
            typeLabel: t.auth.storeTypeLabel,
            step1: t.auth.storeStep1,
            descriptionPlaceholder: t.auth.storeDescriptionPlaceholder,
            logoLabel: t.auth.storeLogoLabel,
            previewItemName: t.auth.previewProductName,
            previewItemDesc: t.auth.previewProductDesc,
            instagramPlaceholder: t.auth.storeInstagramPlaceholder,
          }}
        />
      </Suspense>
    </div>
  );
}
