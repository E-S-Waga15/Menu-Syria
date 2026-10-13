import { Suspense } from "react";

import { AgentRegisterIntro } from "@/features/agent-dashboard/components/agent-register-intro";
import { fetchAgentPage } from "@/features/agent-dashboard/server";
import { getMyAgentProfile } from "@/features/agent-dashboard/services";
import { RestaurantRegisterForm } from "@/features/auth/components/restaurant-register-form";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

export default async function AgentRegisterRestaurantPage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const agent = await fetchAgentPage(lang, (accessToken) =>
    getMyAgentProfile({ accessToken }),
  );

  return (
    // centred and width-capped: the shared form is built for the auth
    // layout, which centres it; the dashboard content area does not, so it
    // otherwise hugged the inline-start edge
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <AgentRegisterIntro kind="restaurant" />
      {/* the shared form reads ?ref= via useSearchParams, which needs a boundary */}
      <Suspense>
        <RestaurantRegisterForm
          lockedReferralCode={agent.referralCode}
          isAgentFlow
        />
      </Suspense>
    </div>
  );
}
