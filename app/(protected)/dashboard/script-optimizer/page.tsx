import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { ScriptOptimizer } from "@/components/dashboard/script-optimizer";

export const metadata = constructMetadata({
    title: "Script Optimizer – Progressly",
    description: "Write scripts that hook viewers and keep them watching.",
});

export default async function ScriptOptimizerPage() {
    const user = await getCurrentUser();

    if (!user || !user.id) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <DashboardHeader
                heading="Script Optimizer"
                text="Write scripts that hook viewers and keep them watching. Get personalized suggestions based on your setup."
            />
            <ScriptOptimizer />
        </div>
    );
}
