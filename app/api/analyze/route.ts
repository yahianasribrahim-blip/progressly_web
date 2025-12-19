import { NextResponse } from "next/server";
import { analyzeNiche } from "@/lib/tiktok-api";
import { generateAIInsights } from "@/lib/ai-insights";

export async function POST(request: Request) {
    console.log("API /api/analyze called");

    try {
        const body = await request.json();
        const niche = body?.niche;

        console.log("Request body:", body);
        console.log("Niche:", niche);

        if (!niche) {
            return NextResponse.json(
                { error: "Niche is required" },
                { status: 400 }
            );
        }

        console.log("Calling analyzeNiche...");

        // Fetch real TikTok data
        const analysisResult = await analyzeNiche(niche);

        console.log("Got result:", {
            hooksCount: analysisResult.hooks.length,
            hashtagsCount: analysisResult.hashtags.length,
            examplesCount: analysisResult.examples.length,
        });

        // Generate AI insights
        console.log("Generating AI insights...");
        const topViewCount = analysisResult.examples.length > 0
            ? Math.max(...analysisResult.examples.map(e => parseInt(e.views.replace(/[^0-9]/g, '')) || 0)) * 1000
            : 100000;

        const aiInsights = await generateAIInsights({
            niche,
            hooks: analysisResult.hooks.map(h => ({
                text: h.text,
                views: h.views || 0,
                likes: h.likes || 0,
                engagement: h.engagement,
            })),
            hashtags: analysisResult.hashtags,
            formats: analysisResult.formats,
            videoCount: analysisResult.examples.length * 5, // Approximate
            topViewCount,
            // Pass actual video descriptions to AI
            videoDescriptions: analysisResult.examples.map(e => e.description || "").filter(d => d.length > 10),
            // NEW: Pass thumbnail URLs for vision analysis
            videoThumbnails: analysisResult.examples.map(e => e.thumbnail).filter(t => t && t.startsWith("http")),
        });

        console.log("AI insights generated:", {
            hasContentIdeas: aiInsights.contentIdeas.length,
            hasHookRecommendations: aiInsights.hookRecommendations.length,
        });

        return NextResponse.json({
            success: true,
            data: {
                niche,
                ...analysisResult,
                aiInsights,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to analyze niche" },
            { status: 500 }
        );
    }
}
