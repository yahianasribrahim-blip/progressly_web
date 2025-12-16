import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { getUserSubscription, getUserProfile, canPerformAnalysis } from "@/lib/user";
import { constructMetadata } from "@/lib/utils";
import { AnalyzeNicheSection } from "@/components/dashboard/analyze-niche-section";

export const metadata = constructMetadata({
  title: "Dashboard – Progressly",
  description: "What's working right now in your niche.",
});

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    redirect("/login");
  }

  const [subscription, profile] = await Promise.all([
    getUserSubscription(user.id),
    getUserProfile(user.id),
  ]);

  const plan = subscription?.plan || "free";
  const analysisStatus = await canPerformAnalysis(user.id, plan);

  return (
    <div className="flex flex-col gap-8">
      <AnalyzeNicheSection
        userId={user.id}
        userName={user.name || "Creator"}
        plan={plan}
        canAnalyze={analysisStatus.canAnalyze}
        remaining={analysisStatus.remaining}
        limitMessage={analysisStatus.message}
      />
    </div>
  );
}
