import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AffiliateSidebar } from "@/components/layout/affiliate-sidebar";

interface AffiliateLayoutProps {
    children: React.ReactNode;
}

export default async function AffiliateLayout({ children }: AffiliateLayoutProps) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/affiliate/login");
    }

    // Check if user is an approved affiliate
    const affiliate = await prisma.affiliate.findUnique({
        where: { userId: session.user.id },
        select: { status: true },
    });

    if (!affiliate || affiliate.status !== "approved") {
        // If not an affiliate or not approved, redirect to register
        redirect("/affiliate/register");
    }

    return (
        <div className="flex min-h-screen bg-background">
            <AffiliateSidebar />
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
