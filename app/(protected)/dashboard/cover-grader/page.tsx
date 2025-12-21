import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";

export const metadata = constructMetadata({
    title: "Cover Grader – Progressly",
    description: "Get feedback on your thumbnail before posting.",
});

export default async function CoverGraderPage() {
    const user = await getCurrentUser();

    if (!user || !user.id) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <DashboardHeader
                heading="Cover Grader"
                text="Get feedback on your thumbnail before posting."
            />
            <div className="rounded-lg border p-8 text-center">
                <p className="text-muted-foreground">Coming soon...</p>
            </div>
        </div>
    );
}
