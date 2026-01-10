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
        select: {
            id: true,
            userId: true,
            affiliateCode: true,
            status: true,
            firstName: true,
            lastName: true,
            email: true,
            paypalEmail: true,
            socialHandle: true,
            hasSocialFollowing: true,
            totalEarnings: true,
            pendingEarnings: true,
            paidEarnings: true,
            createdAt: true,
            user: {
                select: { name: true, email: true, image: true },
            },
            referrals: {
                select: { id: true, status: true },
            },
            commissions: {
                select: { id: true, amount: true, status: true },
            },
            payouts: {
                select: { id: true, amount: true, status: true },
                orderBy: { requestedAt: "desc" },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    // Fetch pending payouts
    const pendingPayouts = await prisma.payout.findMany({
        where: { status: "requested" },
        select: {
            id: true,
            amount: true,
            status: true,
            paypalEmail: true,
            requestedAt: true,
            affiliate: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
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
