// Simple test for Instagram gym niche
import { NextResponse } from "next/server";
import { getInstagramReelsForNiche } from "@/lib/instagram-api";

export async function GET() {
    try {
        const videos = await getInstagramReelsForNiche("gym");

        return NextResponse.json({
            success: true,
            videoCount: videos.length,
            videos: videos.map(v => ({
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
