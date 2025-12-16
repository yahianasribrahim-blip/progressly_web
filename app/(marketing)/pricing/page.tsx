import { getCurrentUser } from "@/lib/session";
import { getUserSubscriptionPlan } from "@/lib/subscription";
import { constructMetadata } from "@/lib/utils";
import { PricingSection } from "@/components/pricing/pricing-section";

export const metadata = constructMetadata({
  title: "Pricing – Progressly",
  description: "Choose the plan that fits your content creation journey.",
});

export default async function PricingPage() {
  const user = await getCurrentUser();

  let subscriptionPlan;
  if (user && user.id) {
    subscriptionPlan = await getUserSubscriptionPlan(user.id);
  }

  return (
    <div className="flex w-full flex-col gap-16 py-8 md:py-8">
      <PricingSection userId={user?.id} subscriptionPlan={subscriptionPlan} />
    </div>
  );
}
