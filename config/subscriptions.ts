import { PlansRow, SubscriptionPlan } from "types";
import { env } from "@/env.mjs";

export const pricingData: SubscriptionPlan[] = [
  {
    title: "Free",
    description: "For creators just getting started",
    benefits: [
      "1 analysis per week",
      "3 hooks (limited)",
      "1 format example",
      "Basic trending data",
    ],
    limitations: [
      "No saved analyses",
      "Example videos blurred",
      "No copy functionality",
    ],
    prices: {
      monthly: 0,
      yearly: 0,
    },
    stripeIds: {
      monthly: null,
      yearly: null,
    },
  },
  {
    title: "Starter",
    description: "Perfect for growing creators",
    benefits: [
      "3 analyses per week",
      "All hooks (10+)",
      "All format examples",
      "Example videos access",
      "Save up to 10 analyses",
      "Copy to clipboard",
      "Weekly refreshed data",
    ],
    limitations: [],
    prices: {
      monthly: 29,
      yearly: 290,
    },
    stripeIds: {
      monthly: env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID,
      yearly: env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID,
    },
  },
  {
    title: "Pro",
    description: "For serious content creators",
    benefits: [
      "1 analysis per day",
      "Everything in Starter",
      "Daily refreshed trends",
      "Unlimited saved analyses",
      "Faster analysis generation",
      "Early access to features",
      "Priority support",
    ],
    limitations: [],
    prices: {
      monthly: 79,
      yearly: 790,
    },
    stripeIds: {
      monthly: env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID,
      yearly: env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID,
    },
  },
];

export const plansColumns = [
  "free",
  "starter",
  "pro",
] as const;

export const comparePlans: PlansRow[] = [
  {
    feature: "Analyses per period",
    free: "1/week",
    starter: "3/week",
    pro: "1/day",
    tooltip: "How many times you can run 'Analyze My Niche'",
  },
  {
    feature: "Hooks provided",
    free: "3",
    starter: "10+",
    pro: "10+",
    tooltip: "Number of hook examples shown per analysis",
  },
  {
    feature: "Format examples",
    free: "1",
    starter: "5+",
    pro: "5+",
  },
  {
    feature: "Example videos",
    free: false,
    starter: true,
    pro: true,
    tooltip: "Access to reference videos from top creators",
  },
  {
    feature: "Hashtag groups",
    free: true,
    starter: true,
    pro: true,
  },
  {
    feature: "Copy to clipboard",
    free: false,
    starter: true,
    pro: true,
  },
  {
    feature: "Save analyses",
    free: false,
    starter: "Up to 10",
    pro: "Unlimited",
  },
  {
    feature: "Data refresh rate",
    free: "Weekly",
    starter: "Weekly",
    pro: "Daily",
  },
  {
    feature: "Priority support",
    free: false,
    starter: false,
    pro: true,
  },
  {
    feature: "Early feature access",
    free: false,
    starter: false,
    pro: true,
  },
];
