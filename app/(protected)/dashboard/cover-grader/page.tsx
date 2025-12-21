import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { CoverGrader } from "@/components/dashboard/cover-grader";

export const metadata = constructMetadata({
    title: "Cover Grader – Progressly",
    description: "Get AI-powered feedback on your thumbnail before posting.",
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
                text="Get AI-powered feedback on your thumbnail before posting."
            />
            <CoverGrader />
        </div>
    );
}
