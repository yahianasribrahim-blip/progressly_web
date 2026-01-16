import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { LayoutDashboard, MessageCircle, Users, ArrowLeft, Sparkles, TrendingUp } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const adminLinks = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/outliers", icon: TrendingUp, label: "Outlier Research" },
    { href: "/admin/tickets", icon: MessageCircle, label: "Tickets" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/affiliates", icon: Sparkles, label: "Affiliates" },
  ];


  return (
    <div className="flex min-h-screen">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r bg-muted/30 p-4 flex flex-col">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-purple-600">Admin Panel</h2>
          <p className="text-xs text-muted-foreground">Progressly Management</p>
        </div>

        <nav className="space-y-1 flex-1">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
