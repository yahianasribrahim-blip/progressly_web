// Diagnostic endpoint to understand where videos are being filtered out
import { NextResponse } from "next/server";

export async function GET() {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
    const WOOP_API_HOST = "tiktok-most-trending-and-viral-content.p.rapidapi.com";

    if (!RAPIDAPI_KEY) {
        return NextResponse.json({ error: "RAPIDAPI_KEY not set" }, { status: 500 });
    }

    const MUSLIM_KEYWORDS = ["muslim", "hijab", "hijabi", "modest", "islam", "deen", "halal", "abaya", "ummah", "ramadan", "eid", "sunnah", "quran", "islamic", "muslimah", "modestfashion", "modesty"];
    const GYM_KEYWORDS = ["gym", "workout", "fitness", "exercise", "muscle", "weight", "lift", "squat", "deadlift", "cardio", "training", "gains", "protein", "leg", "arm", "chest", "back", "glute", "abs", "core"];

    const hashtagsToTest = [
        // Tier 1: Muslim-specific
        "hijab", "modest", "muslim",
        // Tier 2: Generic gym
        "gym", "fitness", "workout"
    ];

    const results: Array<{
        hashtag: string;
        tier: string;
        status: number;
        totalVideos: number;
        videosAbove50k: number;
        videosWithMuslimKeywords: number;
        videosWithGymKeywords: number;
        videosWithBoth: number;
        sampleTitles: string[];
    }> = [];

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

            if (!response.ok) {
                results.push({
                    hashtag,
                    tier: ["hijab", "modest", "muslim"].includes(hashtag) ? "Tier 1" : "Tier 2",
                    status: response.status,
                    totalVideos: 0,
                    videosAbove50k: 0,
                    videosWithMuslimKeywords: 0,
                    videosWithGymKeywords: 0,
                    videosWithBoth: 0,
                    sampleTitles: [],
                });
                continue;
            }

            const data = await response.json();
            const videos = data.data?.stats || [];

            const above50k = videos.filter((v: { playCount?: number }) => (v.playCount || 0) >= 50000);

            const withMuslim = videos.filter((v: { videoTitle?: string }) => {
                const desc = (v.videoTitle || "").toLowerCase();
                return MUSLIM_KEYWORDS.some(k => desc.includes(k));
            });

            const withGym = videos.filter((v: { videoTitle?: string }) => {
                const desc = (v.videoTitle || "").toLowerCase();
                return GYM_KEYWORDS.some(k => desc.includes(k));
            });

            const withBoth = videos.filter((v: { videoTitle?: string }) => {
                const desc = (v.videoTitle || "").toLowerCase();
                const hasMuslim = MUSLIM_KEYWORDS.some(k => desc.includes(k));
                const hasGym = GYM_KEYWORDS.some(k => desc.includes(k));
                return hasMuslim && hasGym;
            });

            results.push({
                hashtag,
                tier: ["hijab", "modest", "muslim"].includes(hashtag) ? "Tier 1" : "Tier 2",
                status: response.status,
                totalVideos: videos.length,
                videosAbove50k: above50k.length,
                videosWithMuslimKeywords: withMuslim.length,
                videosWithGymKeywords: withGym.length,
                videosWithBoth: withBoth.length,
                sampleTitles: videos.slice(0, 3).map((v: { videoTitle?: string }) => (v.videoTitle || "").substring(0, 60)),
            });
        } catch (error) {
            results.push({
                hashtag,
                tier: ["hijab", "modest", "muslim"].includes(hashtag) ? "Tier 1" : "Tier 2",
                status: 0,
                totalVideos: 0,
                videosAbove50k: 0,
                videosWithMuslimKeywords: 0,
                videosWithGymKeywords: 0,
                videosWithBoth: 0,
                sampleTitles: [],
            });
        }
    }

    // Summary
    const totalFromTier1 = results.filter(r => r.tier === "Tier 1").reduce((sum, r) => sum + r.totalVideos, 0);
    const totalFromTier2 = results.filter(r => r.tier === "Tier 2").reduce((sum, r) => sum + r.totalVideos, 0);
    const totalWithBoth = results.reduce((sum, r) => sum + r.videosWithBoth, 0);

    return NextResponse.json({
        summary: {
            totalFromTier1,
            totalFromTier2,
            totalWithMuslimAndGymKeywords: totalWithBoth,
            verdict: totalWithBoth === 0
                ? "NO videos have BOTH Muslim AND gym keywords - need to loosen filter"
                : `Found ${totalWithBoth} videos with both - filter should work`
        },
        results,
    });
}
