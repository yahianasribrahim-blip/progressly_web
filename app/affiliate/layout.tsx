import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AffiliateSidebar } from "@/components/layout/affiliate-sidebar";

interface AffiliateLayoutProps {
    children: React.ReactNode;
}

export default async function AffiliateLayout({ children }: AffiliateLayoutProps) {
    const session = await auth();

    // Check session in nested pages, not here (to allow public register/login)
    // Dashboard pages will check individually

    return (
        <div className="flex min-h-screen bg-background">
            {session?.user?.id && <AffiliateSidebar />}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
