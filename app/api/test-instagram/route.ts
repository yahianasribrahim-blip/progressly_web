// Test the new user-based Instagram API
import { NextResponse } from "next/server";
import { getInstagramReelsForNiche } from "@/lib/instagram-api";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get("niche") || "hijab";

    try {
        const videos = await getInstagramReelsForNiche(niche);

        return NextResponse.json({
            success: true,
            niche,
            videoCount: videos.length,
            videos: videos.map(v => ({
                creator: v.creator,
                views: v.views,
                daysAgo: v.daysAgo,
                description: v.description.substring(0, 50) + "...",
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
