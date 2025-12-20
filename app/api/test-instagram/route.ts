// Simple diagnostic test for Instagram API
import { NextResponse } from "next/server";

const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

export async function GET() {
    if (!INSTAGRAM_RAPIDAPI_KEY) {
        return NextResponse.json({ error: "No Instagram API key set" }, { status: 500 });
    }

    const testAccount = "lilmobsss";

    try {
        console.log(`[Test] Fetching from @${testAccount} with key: ${INSTAGRAM_RAPIDAPI_KEY.substring(0, 10)}...`);

        const response = await fetch(`https://${INSTAGRAM_API_HOST}/get_ig_user_reels.php`, {
            method: "POST",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": INSTAGRAM_API_HOST,
                "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `username_or_url=${encodeURIComponent(testAccount)}&amount=5`,
        });

        const responseText = await response.text();

        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            data = { rawResponse: responseText.substring(0, 300) };
        }

        return NextResponse.json({
            apiKeyPrefix: INSTAGRAM_RAPIDAPI_KEY.substring(0, 15),
            testAccount,
            httpStatus: response.status,
            httpOk: response.ok,
            reelsCount: data.reels?.length || 0,
            dataKeys: typeof data === "object" && data !== null ? Object.keys(data) : [],
            sample: data.reels?.[0] ? { hasNode: !!data.reels[0].node } : null,
            error: data.message || data.error || null,
        });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
