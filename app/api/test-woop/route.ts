// Test popular vs niche hashtags on Woop API
import { NextResponse } from "next/server";

export async function GET() {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
    const WOOP_API_HOST = "tiktok-most-trending-and-viral-content.p.rapidapi.com";

    if (!RAPIDAPI_KEY) {
        return NextResponse.json({ error: "RAPIDAPI_KEY not set" }, { status: 500 });
    }

    // Test different hashtags - from very popular to niche
    const hashtagsToTest = [
        "fitness",       // Very popular
        "gym",           // Popular
        "workout",       // Popular  
        "gymtok",        // TikTok-specific
        "muslimfitness", // Niche
        "hijab",         // Moderate
        "fyp",           // Most popular
    ];

    const results: Array<{ hashtag: string; status: number; videoCount: number; firstVideoTitle?: string }> = [];

    for (const hashtag of hashtagsToTest) {
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

            results.push({
                hashtag,
                status: response.status,
                videoCount: Array.isArray(videos) ? videos.length : 0,
                firstVideoTitle: videos[0]?.videoTitle?.substring(0, 50),
            });
        } catch (error) {
            results.push({
                hashtag,
                status: 0,
                videoCount: 0,
            });
        }
    }

    // Also test with category + no hashtag
    try {
        const params = new URLSearchParams({
            category: "107", // Sports & Outdoor
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
        results.push({
            hashtag: "category:107 (Sports)",
            status: response.status,
            videoCount: Array.isArray(videos) ? videos.length : 0,
            firstVideoTitle: videos[0]?.videoTitle?.substring(0, 50),
        });
    } catch (error) {
        results.push({ hashtag: "category:107", status: 0, videoCount: 0 });
    }

    return NextResponse.json({ results });
}
