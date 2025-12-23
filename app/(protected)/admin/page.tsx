import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "Admin Dashboard – Progressly",
  description: "Admin dashboard for managing Progressly",
};

// Price mapping for revenue calculation
const PRICE_MAP: Record<string, number> = {
  // Creator Monthly
  "price_1Sb7hNLQIkjmWYDF0oowtF8F": 12,
  // Creator Yearly
  "price_1Sem3GLQIkjmWYDF1rRKulee": 99,
  // Pro Monthly
  "price_1Sb7i1LQIkjmWYDF8jTGCDkI": 29,
  // Pro Yearly
  "price_1Sem3yLQIkjmWYDFLFTG5qNL": 249,
};

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch admin stats
  const [
    totalUsers,
    usersThisMonth,
    activeSubscribers,
    openTickets,
    subscriptionBreakdown,
    activeUsersToday,
  ] = await Promise.all([
    // Total users
    prisma.user.count(),

    // Users this month
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),

    // Active paid subscriptions with price info
    prisma.user.findMany({
      where: {
        stripeSubscriptionId: { not: null },
        stripeCurrentPeriodEnd: { gt: new Date() },
      },
      select: { stripePriceId: true },
    }),

    // Open tickets
    prisma.supportTicket.count({
      where: { status: "open" },
    }),

    // Subscription breakdown by price
    prisma.user.groupBy({
      by: ["stripePriceId"],
      _count: true,
      where: {
        stripeSubscriptionId: { not: null },
        stripeCurrentPeriodEnd: { gt: new Date() },
      },
    }),

    // Active users today (users who logged in today - approximated by updatedAt)
    prisma.user.count({
      where: {
        updatedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  // Calculate monthly revenue
  let monthlyRevenue = 0;
  for (const sub of activeSubscribers) {
    if (sub.stripePriceId && PRICE_MAP[sub.stripePriceId]) {
      const price = PRICE_MAP[sub.stripePriceId];
      // If yearly, divide by 12 for monthly equivalent
      if (sub.stripePriceId.includes("Sem3")) {
        monthlyRevenue += price / 12;
      } else {
        monthlyRevenue += price;
      }
    }
  }

  // Calculate usage stats
  const [totalSavedIdeas, totalSavedTrends, totalTickets] = await Promise.all([
    prisma.savedIdea.count(),
    prisma.savedTrend.count(),
    prisma.supportTicket.count(),
  ]);

  const stats = {
    totalUsers,
    usersThisMonth,
    activeSubscriptions: activeSubscribers.length,
    activeUsersToday,
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    openTickets,
    totalSavedIdeas,
    totalSavedTrends,
    totalTickets,
    subscriptionBreakdown,
  };

  return (
    <div className="p-6">
      <AdminDashboard stats={stats} />
    </div>
  );
}
