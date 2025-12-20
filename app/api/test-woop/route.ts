// Quick test to verify gym hashtag returns videos
import { NextResponse } from "next/server";

export async function GET() {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
    const WOOP_API_HOST = "tiktok-most-trending-and-viral-content.p.rapidapi.com";

    if (!RAPIDAPI_KEY) {
        return NextResponse.json({ error: "RAPIDAPI_KEY not set" }, { status: 500 });
    }

    const hashtag = "gym";

    try {
        const params = new URLSearchParams({
            hashtag: hashtag,
            sorting: "rise",
            days: "7",
            order: "desc",
        });

        const url = `https://${WOOP_API_HOST}/video?${params.toString()}`;

        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": WOOP_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
                "Accept": "application/json",
            },
        });

        const data = await response.json();
        const videos = data.data?.stats || [];

        // Check 50k filter impact
        const above50k = videos.filter((v: { playCount?: number }) => (v.playCount || 0) >= 50000);

        return NextResponse.json({
            status: response.status,
            hashtag,
            totalVideos: videos.length,
            videosAbove50k: above50k.length,
            sampleVideo: videos[0] ? {
                title: videos[0].videoTitle?.substring(0, 80),
                views: videos[0].playCount,
                user: videos[0].user,
            } : null,
        });
    } catch (error) {
        return NextResponse.json({
            error: "Request failed",
            message: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
