import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { getUserSubscription } from "@/lib/user";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { SavedAnalysesList } from "@/components/dashboard/saved-analyses-list";

export const metadata = constructMetadata({
    title: "Saved Analyses – Progressly",
    description: "View your saved niche analyses.",
});

export default async function SavedAnalysesPage() {
    const user = await getCurrentUser();

    if (!user || !user.id) {
        redirect("/login");
    }

    const subscription = await getUserSubscription(user.id);
    const plan = subscription?.plan || "free";

    return (
        <div className="space-y-6">
            <DashboardHeader
                heading="Saved Analyses"
                text="Access your previously saved niche analyses."
            />
            <SavedAnalysesList
                userId={user.id}
                plan={plan}
            />
        </div>
    );
}
