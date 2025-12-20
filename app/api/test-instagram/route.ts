// Test full gym niche flow
import { NextResponse } from "next/server";
import { getInstagramReelsForNiche } from "@/lib/instagram-api";

export async function GET() {
    try {
        console.log("[Test] Starting gym niche test...");
        const videos = await getInstagramReelsForNiche("gym");

        return NextResponse.json({
            success: true,
            videoCount: videos.length,
            videos: videos.slice(0, 5).map(v => ({
                creator: v.creator,
                views: v.views,
                url: v.url,
            })),
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
