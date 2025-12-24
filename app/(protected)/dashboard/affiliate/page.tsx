import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { AffiliateDashboard } from "@/components/dashboard/affiliate-dashboard";

export const metadata = constructMetadata({
    title: "Affiliate Dashboard – Progressly",
    description: "Track your affiliate referrals and earnings.",
});

export default async function AffiliateDashboardPage() {
    const user = await getCurrentUser();

    if (!user || !user.id) {
        redirect("/login");
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <AffiliateDashboard />
        </div>
    );
}
