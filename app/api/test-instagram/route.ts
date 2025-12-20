// Comprehensive diagnostic for TikTok AND Instagram gym niche
import { NextResponse } from "next/server";

const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";
const TIKTOK_RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const TIKTOK_API_HOST = "tiktok-most-trending-and-viral-content.p.rapidapi.com";

export async function GET() {
    const results = {
        tikTok: {
            apiKeySet: !!TIKTOK_RAPIDAPI_KEY,
            hashtag: "muslim",
            status: 0,
            videosReturned: 0,
            error: null as string | null,
        },
        instagram: {
            apiKeySet: !!INSTAGRAM_RAPIDAPI_KEY,
            account: "aussiemammoth",
            status: 0,
            reelsReturned: 0,
            sampleCaptions: [] as string[],
            error: null as string | null,
        },
        openAI: {
            keySet: !!process.env.OPENAI_API_KEY,
        },
    };

    // Test TikTok
    if (TIKTOK_RAPIDAPI_KEY) {
        try {
            const params = new URLSearchParams({
                hashtag: "muslim",
                sorting: "rise",
                days: "7",
                order: "desc",
            });
            const response = await fetch(`https://${TIKTOK_API_HOST}/video?${params.toString()}`, {
                method: "GET",
                cache: "no-store",
                headers: {
                    "x-rapidapi-host": TIKTOK_API_HOST,
                    "x-rapidapi-key": TIKTOK_RAPIDAPI_KEY,
                },
            });
            results.tikTok.status = response.status;
            if (response.ok) {
                const data = await response.json();
                results.tikTok.videosReturned = Array.isArray(data) ? data.length : 0;
            } else {
                const text = await response.text();
                results.tikTok.error = text.substring(0, 100);
            }
        } catch (error) {
            results.tikTok.error = error instanceof Error ? error.message : String(error);
        }
    }

    // Test Instagram
    if (INSTAGRAM_RAPIDAPI_KEY) {
        try {
            const response = await fetch(`https://${INSTAGRAM_API_HOST}/get_ig_user_reels.php`, {
                method: "POST",
                cache: "no-store",
                headers: {
                    "x-rapidapi-host": INSTAGRAM_API_HOST,
                    "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `username_or_url=${encodeURIComponent(results.instagram.account)}&amount=5`,
            });
            results.instagram.status = response.status;
            if (response.ok) {
                const data = await response.json();
                const reels = data.reels || [];
                results.instagram.reelsReturned = reels.length;
                results.instagram.sampleCaptions = reels.slice(0, 3).map((r: { node?: { media?: { caption?: { text?: string } } } }) =>
                    (r.node?.media?.caption?.text || "(no caption)").substring(0, 50)
                );
            } else {
                const text = await response.text();
                results.instagram.error = text.substring(0, 100);
            }
        } catch (error) {
            results.instagram.error = error instanceof Error ? error.message : String(error);
        }
    }

    return NextResponse.json({
        summary: {
            tiktokWorking: results.tikTok.status === 200 && results.tikTok.videosReturned > 0,
            instagramWorking: results.instagram.status === 200 && results.instagram.reelsReturned > 0,
            openAIKeySet: results.openAI.keySet,
        },
        details: results,
    });
}
