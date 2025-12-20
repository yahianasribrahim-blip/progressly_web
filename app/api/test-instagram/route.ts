// Full diagnostic - shows each step of the Instagram flow
import { NextResponse } from "next/server";
import { getInstagramReelsForNiche } from "@/lib/instagram-api";

const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get("niche") || "gym";

    // Step 1: Direct API call test
    const rawResults: Array<{
        account: string;
        reelsCount: number;
        captions: string[];
    }> = [];

    const testAccounts = ["lilmobsss", "aussiemammoth"];

    for (const account of testAccounts.slice(0, 2)) {
        try {
            const response = await fetch(`https://${INSTAGRAM_API_HOST}/get_ig_user_reels.php`, {
                method: "POST",
                cache: "no-store",
                headers: {
                    "x-rapidapi-host": INSTAGRAM_API_HOST,
                    "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `username_or_url=${encodeURIComponent(account)}&amount=5`,
            });

            if (response.ok) {
                const data = await response.json();
                const reels = data.reels || [];
                const captions = reels.map((r: { node?: { media?: { caption?: { text?: string } } } }) =>
                    r.node?.media?.caption?.text?.substring(0, 50) || "(no caption)"
                );
                rawResults.push({ account, reelsCount: reels.length, captions });
            } else {
                rawResults.push({ account, reelsCount: 0, captions: [`Error: ${response.status}`] });
            }
        } catch (error) {
            rawResults.push({ account, reelsCount: 0, captions: [String(error)] });
        }
    }

    // Step 2: Call the actual function
    let processedVideos: unknown[] = [];
    let error: string | null = null;

    try {
        processedVideos = await getInstagramReelsForNiche(niche);
    } catch (e) {
        error = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({
        niche,
        step1_rawApiFetch: {
            accountsTested: rawResults.length,
            totalReelsFromApi: rawResults.reduce((sum, r) => sum + r.reelsCount, 0),
            details: rawResults,
        },
        step2_processedResult: {
            videosReturned: processedVideos.length,
            videos: processedVideos.map((v: unknown) => {
                const video = v as { creator?: string; views?: string; description?: string };
                return {
                    creator: video.creator,
                    views: video.views,
                    description: video.description?.substring(0, 50),
                };
            }),
            error,
        },
        envCheck: {
            hasInstagramKey: !!INSTAGRAM_RAPIDAPI_KEY,
            hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        },
    });
}
