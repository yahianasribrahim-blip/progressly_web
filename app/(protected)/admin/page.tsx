import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "Admin Dashboard – Progressly",
  description: "Admin dashboard for managing Progressly",
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
    activeSubscriptions,
    openTickets,
    recentTickets,
    subscriptionBreakdown,
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

    // Active paid subscriptions
    prisma.user.count({
      where: {
        stripeSubscriptionId: { not: null },
        stripeCurrentPeriodEnd: { gt: new Date() },
      },
    }),

    // Open tickets
    prisma.supportTicket.count({
      where: { status: "open" },
    }),

    // Recent tickets with messages
    prisma.supportTicket.findMany({
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    }),

    // Subscription breakdown by price
    prisma.user.groupBy({
      by: ["stripePriceId"],
      _count: true,
      where: {
        stripeSubscriptionId: { not: null },
      },
    }),
  ]);

  // Calculate usage stats
  const [
    totalSavedIdeas,
    totalSavedTrends,
    totalTickets,
  ] = await Promise.all([
    prisma.savedIdea.count(),
    prisma.savedTrend.count(),
    prisma.supportTicket.count(),
  ]);

  const stats = {
    totalUsers,
    usersThisMonth,
    activeSubscriptions,
    openTickets,
    totalSavedIdeas,
    totalSavedTrends,
    totalTickets,
    subscriptionBreakdown,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminDashboard stats={stats} tickets={recentTickets} />
    </div>
  );
}
