import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { getUserSubscription, getUserProfile, canPerformAnalysis, getOnboardingStatus } from "@/lib/user";
import { constructMetadata } from "@/lib/utils";
import { OnboardingWrapper } from "@/components/dashboard/onboarding-wrapper";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

export const metadata = constructMetadata({
  title: "Dashboard – Progressly",
  description: "Optimize your content and post with confidence.",
});

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    redirect("/login");
  }

  const [subscription, profile, onboardingStatus] = await Promise.all([
    getUserSubscription(user.id),
    getUserProfile(user.id),
    getOnboardingStatus(user.id),
  ]);

  const plan = subscription?.plan || "free";
  const analysisStatus = await canPerformAnalysis(user.id, plan);

  return (
    <OnboardingWrapper onboardingCompleted={onboardingStatus.onboardingCompleted}>
      <DashboardHome
        userId={user.id}
        userName={user.name || "Creator"}
        plan={plan}
        canAnalyze={analysisStatus.canAnalyze}
        remaining={analysisStatus.remaining}
        limitMessage={analysisStatus.message}
      />
    </OnboardingWrapper>
  );
}
