// User library functions - works without new Prisma models until migration runs

import { prisma } from "@/lib/db";

export const getUserByEmail = async (email: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        name: true,
        emailVerified: true,
      },
    });

    return user;
  } catch {
    return null;
  }
};

// Get user's onboarding status
export const getOnboardingStatus = async (userId: string) => {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { onboardingCompleted: true },
    });

    return {
      hasProfile: !!profile,
      onboardingCompleted: profile?.onboardingCompleted ?? false,
    };
  } catch {
    return { hasProfile: false, onboardingCompleted: false };
  }
};

// Get creator setup for personalized recommendations
export const getCreatorSetup = async (userId: string) => {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: { creatorSetup: true },
    });

    return profile?.creatorSetup ?? null;
  } catch {
    return null;
  }
};


export const getUserById = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    return user;
  } catch {
    return null;
  }
};

// Get user subscription status
export const getUserSubscription = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
        stripePriceId: true,
      },
    });

    if (!user) return null;

    const isPaid =
      user.stripePriceId &&
      user.stripeCurrentPeriodEnd &&
      user.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now();

    // Determine plan based on price ID
    let plan: "free" | "starter" | "pro" = "free";
    if (isPaid) {
      // Check if it's the pro plan
      if (user.stripePriceId?.includes("business") || user.stripePriceId?.includes("pro")) {
        plan = "pro";
      } else {
        plan = "starter";
      }
    }

    return {
      isPaid: isPaid || false,
      plan,
      stripeSubscriptionId: user.stripeSubscriptionId,
      stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd,
      stripePriceId: user.stripePriceId,
    };
  } catch {
    return null;
  }
};

// Plan limits configuration
export const PLAN_LIMITS = {
  free: {
    analysesPerWeek: 1,
    formatRefreshesPerMonth: 2,
    optimizationsPerMonth: 5,
    hooksLimit: 3,
    formatsLimit: 1,
    savedAnalysesLimit: 0,
    exampleVideosBlurred: true,
    copyEnabled: false,
  },
  starter: {
    analysesPerWeek: 3,
    formatRefreshesPerMonth: 10,
    optimizationsPerMonth: 20,
    hooksLimit: 10,
    formatsLimit: 5,
    savedAnalysesLimit: 10,
    exampleVideosBlurred: false,
    copyEnabled: true,
  },
  pro: {
    analysesPerDay: 1,
    formatRefreshesPerMonth: -1, // unlimited
    optimizationsPerMonth: -1, // unlimited
    hooksLimit: 10,
    formatsLimit: 5,
    savedAnalysesLimit: -1, // unlimited
    exampleVideosBlurred: false,
    copyEnabled: true,
  },
};

// Mock user profile (until Prisma migration runs)
export interface UserProfile {
  id: string;
  userId: string;
  username?: string;
  niche?: string;
  platforms?: string[];
  // Analysis tracking
  analysesUsedThisWeek: number;
  analysesUsedToday: number;
  lastAnalysisDate?: Date;
  weekStartDate?: Date;
  // Monthly tracking
  formatRefreshesThisMonth: number;
  optimizationsThisMonth: number;
  monthStartDate?: Date;
}

// In-memory storage for development (replace with DB after migration)
const mockProfiles: Map<string, UserProfile> = new Map();

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (mockProfiles.has(userId)) {
    return mockProfiles.get(userId)!;
  }

  // Create default profile
  const profile: UserProfile = {
    id: `profile-${userId}`,
    userId,
    analysesUsedThisWeek: 0,
    analysesUsedToday: 0,
    formatRefreshesThisMonth: 0,
    optimizationsThisMonth: 0,
  };
  mockProfiles.set(userId, profile);
  return profile;
};

export const updateUserProfile = async (
  userId: string,
  data: Partial<UserProfile>
): Promise<UserProfile | null> => {
  const profile = await getUserProfile(userId);
  if (!profile) return null;

  const updated = { ...profile, ...data };
  mockProfiles.set(userId, updated);
  return updated;
};

// Check if user can perform analysis
export const canPerformAnalysis = async (
  userId: string,
  plan: "free" | "starter" | "pro"
): Promise<{ canAnalyze: boolean; remaining: number; message?: string }> => {
  const profile = await getUserProfile(userId);
  if (!profile) {
    return { canAnalyze: false, remaining: 0, message: "Profile not found" };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get start of week (Sunday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  // Reset counters if needed
  if (!profile.weekStartDate || new Date(profile.weekStartDate) < weekStart) {
    profile.analysesUsedThisWeek = 0;
    profile.weekStartDate = weekStart;
  }

  if (!profile.lastAnalysisDate || new Date(profile.lastAnalysisDate) < today) {
    profile.analysesUsedToday = 0;
  }

  if (plan === "pro") {
    const limit = PLAN_LIMITS.pro.analysesPerDay;
    const remaining = limit - profile.analysesUsedToday;
    return {
      canAnalyze: remaining > 0,
      remaining,
      message: remaining <= 0 ? "Daily limit reached. Come back tomorrow!" : undefined,
    };
  } else {
    const limit = plan === "starter"
      ? PLAN_LIMITS.starter.analysesPerWeek
      : PLAN_LIMITS.free.analysesPerWeek;
    const remaining = limit - profile.analysesUsedThisWeek;
    return {
      canAnalyze: remaining > 0,
      remaining,
      message: remaining <= 0 ? "Weekly limit reached. Upgrade for more analyses!" : undefined,
    };
  }
};

// ============================================
// DATABASE-BACKED USAGE TRACKING
// ============================================

// Get or create usage tracking record for user
export const getOrCreateUsageTracking = async (userId: string) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  let tracking = await prisma.usageTracking.findUnique({
    where: { userId },
  });

  if (!tracking) {
    // Create new tracking record
    tracking = await prisma.usageTracking.create({
      data: {
        userId,
        currentMonth,
        currentYear,
        formatSearchesThisMonth: 0,
        optimizationsThisMonth: 0,
        analysesThisMonth: 0,
      },
    });
  } else {
    // Check if we need to reset for new month
    if (tracking.currentMonth !== currentMonth || tracking.currentYear !== currentYear) {
      tracking = await prisma.usageTracking.update({
        where: { userId },
        data: {
          currentMonth,
          currentYear,
          formatSearchesThisMonth: 0,
          optimizationsThisMonth: 0,
          analysesThisMonth: 0,
        },
      });
    }
  }

  return tracking;
};

// Check if user can use a format search
export const canUseFormatSearch = async (
  userId: string
): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
  const tracking = await getOrCreateUsageTracking(userId);
  const subscription = await getUserSubscription(userId);
  const plan = subscription?.plan || "free";

  if (plan === "pro") {
    return { allowed: true, remaining: -1 }; // unlimited
  }

  const limit = plan === "starter"
    ? PLAN_LIMITS.starter.formatRefreshesPerMonth
    : PLAN_LIMITS.free.formatRefreshesPerMonth;
  const remaining = limit - tracking.formatSearchesThisMonth;

  return {
    allowed: remaining > 0,
    remaining,
    message: remaining <= 0 ? "Monthly Trending Format Search limit reached. Upgrade for more!" : undefined,
  };
};


// Record a format search usage
export const recordFormatSearchUsage = async (userId: string): Promise<void> => {
  await getOrCreateUsageTracking(userId); // Ensure record exists and reset if needed
  await prisma.usageTracking.update({
    where: { userId },
    data: {
      formatSearchesThisMonth: { increment: 1 },
    },
  });
};

// Check if user can use an optimization (script, caption, cover)
export const canUseOptimization = async (
  userId: string
): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
  const tracking = await getOrCreateUsageTracking(userId);
  const subscription = await getUserSubscription(userId);
  const plan = subscription?.plan || "free";

  if (plan === "pro") {
    return { allowed: true, remaining: -1 }; // unlimited
  }

  const limit = plan === "starter"
    ? PLAN_LIMITS.starter.optimizationsPerMonth
    : PLAN_LIMITS.free.optimizationsPerMonth;
  const remaining = limit - tracking.optimizationsThisMonth;

  return {
    allowed: remaining > 0,
    remaining,
    message: remaining <= 0 ? "Monthly optimization limit reached. Upgrade for more!" : undefined,
  };
};

// Record an optimization usage
export const recordOptimizationUsage = async (userId: string): Promise<void> => {
  await getOrCreateUsageTracking(userId); // Ensure record exists and reset if needed
  await prisma.usageTracking.update({
    where: { userId },
    data: {
      optimizationsThisMonth: { increment: 1 },
    },
  });
};

// Check if user can use a video analysis
export const canUseAnalysis = async (
  userId: string
): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
  const tracking = await getOrCreateUsageTracking(userId);
  const subscription = await getUserSubscription(userId);
  const plan = subscription?.plan || "free";

  if (plan === "pro") {
    return { allowed: true, remaining: -1 }; // unlimited
  }

  // Uses analysesPerWeek limit (we track monthly but check weekly-ish limits)
  const limit = plan === "starter"
    ? PLAN_LIMITS.starter.analysesPerWeek
    : PLAN_LIMITS.free.analysesPerWeek;
  const remaining = limit - tracking.analysesThisMonth;

  return {
    allowed: remaining > 0,
    remaining,
    message: remaining <= 0 ? "Video analysis limit reached. Upgrade for more!" : undefined,
  };
};

// Record an analysis usage
export const recordAnalysisUsage = async (userId: string): Promise<void> => {
  await getOrCreateUsageTracking(userId); // Ensure record exists and reset if needed
  await prisma.usageTracking.update({
    where: { userId },
    data: {
      analysesThisMonth: { increment: 1 },
    },
  });
};

// Get user's full usage data for dashboard
export const getUserUsage = async (userId: string) => {
  const tracking = await getOrCreateUsageTracking(userId);
  return {
    formatSearchesThisMonth: tracking.formatSearchesThisMonth,
    optimizationsThisMonth: tracking.optimizationsThisMonth,
    analysesThisMonth: tracking.analysesThisMonth,
    currentMonth: tracking.currentMonth,
    currentYear: tracking.currentYear,
  };
};