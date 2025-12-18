import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { AnalyzeMyVideo } from "@/components/dashboard/analyze-my-video";

export const metadata = constructMetadata({
    title: "Analyze My Video – Progressly",
    description: "Get detailed performance insights on your TikTok videos.",
});

export default async function AnalyzeVideoPage() {
    const user = await getCurrentUser();

    if (!user || !user.id) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <DashboardHeader
                heading="Analyze My Video"
                text="Paste your TikTok video URL to get detailed performance insights and improvement suggestions."
            />
            <AnalyzeMyVideo />
        </div>
    );
}
