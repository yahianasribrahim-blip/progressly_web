import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AIStudio } from "@/components/dashboard/ai-studio/ai-studio";

export const metadata: Metadata = {
    title: "AI Studio – Progressly",
    description: "Generate and edit images and videos using AI",
};

// Admin email - same as used in other API routes
const ADMIN_EMAIL = "yahianasribrahim@gmail.com";

export default async function AIStudioPage() {
    const session = await auth();

    // Admin-only access by email check (not database role)
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
        redirect("/dashboard");
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold">AI Studio</h1>
                <p className="text-muted-foreground">
                    Generate and edit images and videos using powerful AI models
                </p>
            </div>
            <AIStudio />
        </div>
    );
}
