import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";

export const metadata = constructMetadata({
    title: "Pre-Post Checklist – Progressly",
    description: "Final quality check before hitting publish.",
});

export default async function PrePostChecklistPage() {
    const user = await getCurrentUser();

    if (!user || !user.id) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <DashboardHeader
                heading="Pre-Post Checklist"
                text="Final quality check before hitting publish."
            />
            <div className="rounded-lg border p-8 text-center">
                <p className="text-muted-foreground">Coming soon...</p>
            </div>
        </div>
    );
}
