// Check TikTok API with CORRECT host
import { NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
// CORRECT host from tiktok-api.ts
const WOOP_API_HOST = "tiktok-most-trending-and-viral-content.p.rapidapi.com";

export async function GET() {
    const keyPrefix = RAPIDAPI_KEY.substring(0, 12);

    let testResult = null;
    try {
        // Use the correct endpoint from tiktok-api.ts
        const response = await fetch(`https://${WOOP_API_HOST}/api/v2/explore/video/hashtag`, {
            method: "POST",
            headers: {
                "x-rapidapi-host": WOOP_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                hashtag: "gym",
                limit: 5,
            }),
        });

        const text = await response.text();
        testResult = {
            host: WOOP_API_HOST,
            status: response.status,
            isRateLimited: response.status === 429,
            responsePreview: text.substring(0, 300),
        };
    } catch (e) {
        testResult = { error: String(e) };
    }

    return NextResponse.json({
        keyPrefix,
        keyLength: RAPIDAPI_KEY.length,
        hasKey: RAPIDAPI_KEY.length > 0,
        testResult,
    });
}
