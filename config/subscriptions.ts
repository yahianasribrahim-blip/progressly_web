import { PlansRow, SubscriptionPlan } from "types";
import { env } from "@/env.mjs";

export const pricingData: SubscriptionPlan[] = [
  {
    title: "Free",
    description: "Try out the core features",
    benefits: [
      "3 video analyses/month",
      "5 optimizations/month (cover, script, caption)",
      "2 format refreshes/month",
      "10 saved items (Content Bank + Trend Bank)",
    ],
    limitations: [
      "Limited usage",
      "Basic support only",
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
    title: "Creator",
    description: "For growing content creators",
    benefits: [
      "20 video analyses/month",
      "30 optimizations/month (cover, script, caption)",
      "10 format refreshes/month",
      "Unlimited saved items",
      "Save video breakdowns",
      "All trending format details",
    ],
    limitations: [],
    prices: {
      monthly: 12,
      yearly: 99,
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
      "60 video analyses/month",
      "Unlimited optimizations",
      "30 format refreshes/month",
      "Unlimited saved items",
      "Priority support",
      "Early access to new features",
    ],
    limitations: [],
    prices: {
      monthly: 29,
      yearly: 249,
    },
    stripeIds: {
      monthly: env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID,
      yearly: env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID,
    },
  },
];

export const plansColumns = [
  "free",
  "creator",
  "pro",
] as const;

export const comparePlans: PlansRow[] = [
  {
    feature: "Video Analyses",
    free: "3/month",
    creator: "20/month",
    pro: "60/month",
    tooltip: "AI breakdown of your video content",
  },
  {
    feature: "Cover Optimizer",
    free: "5/month",
    creator: "30/month",
    pro: "Unlimited",
    tooltip: "AI feedback on your thumbnails",
  },
  {
    feature: "Script Optimizer",
    free: "5/month",
    creator: "30/month",
    pro: "Unlimited",
    tooltip: "AI improvement of your video scripts",
  },
  {
    feature: "Caption Optimizer",
    free: "5/month",
    creator: "30/month",
    pro: "Unlimited",
  },
  {
    feature: "Trending Formats",
    free: "2/month",
    creator: "10/month",
    pro: "30/month",
    tooltip: "Refresh to discover new trending formats",
  },
  {
    feature: "Content Bank",
    free: "10 items",
    creator: "Unlimited",
    pro: "Unlimited",
    tooltip: "Save video ideas for later",
  },
  {
    feature: "Trend Bank",
    free: "10 items",
    creator: "Unlimited",
    pro: "Unlimited",
    tooltip: "Save trending formats to use later",
  },
  {
    feature: "Saved Breakdowns",
    free: false,
    creator: true,
    pro: true,
    tooltip: "Save full video analysis breakdowns",
  },
  {
    feature: "Priority Support",
    free: false,
    creator: false,
    pro: true,
  },
  {
    feature: "Early Feature Access",
    free: false,
    creator: false,
    pro: true,
  },
];

// Usage limits for each plan
export const planLimits = {
  free: {
    videoAnalyses: 3,
    optimizations: 5, // Combined: cover + script + caption
    formatRefreshes: 2,
    savedItems: 10, // Content Bank + Trend Bank combined
  },
  creator: {
    videoAnalyses: 20,
    optimizations: 30,
    formatRefreshes: 10,
    savedItems: -1, // -1 = unlimited
  },
  pro: {
    videoAnalyses: 60,
    optimizations: -1, // unlimited
    formatRefreshes: 30,
    savedItems: -1,
  },
};
