import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { PrePostChecklist } from "@/components/dashboard/pre-post-checklist";
import { prisma } from "@/lib/db";

export const metadata = constructMetadata({
    title: "Pre-Post Checklist – Progressly",
    description: "Final quality check before hitting publish.",
});

export default async function PrePostChecklistPage() {
    const user = await getCurrentUser();

    if (!user || !user.id) {
        redirect("/login");
    }

    // Check if user is Muslim creator
    let isMuslimCreator = false;
    try {
        const profile = await prisma.userProfile.findUnique({
            where: { userId: user.id },
            include: { creatorSetup: true },
        });
        isMuslimCreator = profile?.creatorSetup?.isMuslimCreator ?? false;
    } catch (e) {
        console.log("Could not fetch creator setup:", e);
    }

    return (
        <div className="space-y-6">
            <DashboardHeader
                heading="Pre-Post Checklist"
                text="Make sure your video is ready before hitting publish."
            />
            <PrePostChecklist isMuslimCreator={isMuslimCreator} />
        </div>
    );
}
