import { Metadata } from "next";
import { AIStudio } from "@/components/dashboard/ai-studio/ai-studio";

export const metadata: Metadata = {
    title: "AI Studio – Progressly",
    description: "Generate and edit images and videos using AI",
};

export default function AIStudioPage() {
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
