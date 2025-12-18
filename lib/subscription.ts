// @ts-nocheck
// TODO: Fix this when we turn strict mode on.
import { pricingData } from "@/config/subscriptions";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { UserSubscriptionPlan } from "types";

export async function getUserSubscriptionPlan(
  userId: string
): Promise<UserSubscriptionPlan> {
  if (!userId) throw new Error("Missing parameters");

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    select: {
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      stripeCustomerId: true,
      stripePriceId: true,
    },
  })

  if (!user) {
    throw new Error("User not found")
  }

  // Check if user is on a paid plan.
  const isPaid =
    user.stripePriceId &&
      user.stripeCurrentPeriodEnd?.getTime() + 86_400_000 > Date.now() ? true : false;

  // Find the pricing data corresponding to the user's plan
  const userPlan =
    pricingData.find((plan) => plan.stripeIds.monthly === user.stripePriceId) ||
    pricingData.find((plan) => plan.stripeIds.yearly === user.stripePriceId);

  const plan = isPaid && userPlan ? userPlan : pricingData[0]

  const interval = isPaid
    ? userPlan?.stripeIds.monthly === user.stripePriceId
      ? "month"
      : userPlan?.stripeIds.yearly === user.stripePriceId
        ? "year"
        : null
    : null;

  let isCanceled = false;
  // Only try to retrieve from Stripe if it looks like a real Stripe subscription ID
  // Manual/test subscriptions (like 'sub_pro_upgraded' or 'sub_pro_manual') are skipped
  if (isPaid && user.stripeSubscriptionId && user.stripeSubscriptionId.startsWith('sub_') && !user.stripeSubscriptionId.includes('manual') && !user.stripeSubscriptionId.includes('upgraded') && !user.stripeSubscriptionId.includes('test')) {
    try {
      const stripePlan = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId
      );
      isCanceled = stripePlan.cancel_at_period_end;
    } catch (error) {
      // If Stripe can't find the subscription, just continue with isCanceled = false
      console.error("Could not retrieve Stripe subscription:", error);
    }
  }

  return {
    ...plan,
    ...user,
    stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd?.getTime(),
    isPaid,
    interval,
    isCanceled
  }
}
