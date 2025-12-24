import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AdminAffiliates } from "@/components/admin/admin-affiliates";

export const metadata = {
    title: "Manage Affiliates – Admin",
    description: "Manage affiliate applications and payouts",
};

export default async function AdminAffiliatesPage() {
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

    // Fetch all affiliates with their stats
    const affiliates = await prisma.affiliate.findMany({
        include: {
            user: {
                select: { name: true, email: true, image: true },
            },
            referrals: true,
            commissions: true,
            payouts: {
                orderBy: { requestedAt: "desc" },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    // Fetch pending payouts
    const pendingPayouts = await prisma.payout.findMany({
        where: { status: "requested" },
        include: {
            affiliate: {
                include: {
                    user: { select: { name: true, email: true } },
                },
            },
        },
        orderBy: { requestedAt: "asc" },
    });

    return (
        <div className="p-6">
            <AdminAffiliates affiliates={affiliates} pendingPayouts={pendingPayouts} />
        </div>
    );
}
