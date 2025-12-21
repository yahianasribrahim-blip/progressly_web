import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";

export const metadata = constructMetadata({
    title: "Caption Optimizer – Progressly",
    description: "Craft captions that stop the scroll and drive engagement.",
});

export default async function CaptionOptimizerPage() {
    const user = await getCurrentUser();

    if (!user || !user.id) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <DashboardHeader
                heading="Caption Optimizer"
                text="Craft captions that stop the scroll and drive engagement."
            />
            <div className="rounded-lg border p-8 text-center">
                <p className="text-muted-foreground">Coming soon...</p>
            </div>
        </div>
    );
}
