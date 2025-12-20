// Test TikTok gym niche
import { NextResponse } from "next/server";
import { analyzeNiche } from "@/lib/tiktok-api";

export async function GET() {
    try {
        const result = await analyzeNiche("gym");

        return NextResponse.json({
            success: true,
            tiktokExamples: result.examples.map(v => ({
                creator: v.creator,
                views: v.views,
                platform: v.platform,
                url: v.url,
            })),
            totalExamples: result.examples.length,
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
