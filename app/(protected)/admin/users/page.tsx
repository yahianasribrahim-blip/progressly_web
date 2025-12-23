import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { UsersManagement } from "@/components/admin/users-management";

export const metadata = {
    title: "User Management – Progressly Admin",
    description: "Manage users",
};

export default async function AdminUsersPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (currentUser?.role !== "ADMIN") {
        redirect("/dashboard");
    }

    // Fetch all users
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            stripeSubscriptionId: true,
            stripePriceId: true,
            stripeCurrentPeriodEnd: true,
        },
    });

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <UsersManagement users={users} currentUserId={session.user.id} />
        </div>
    );
}
