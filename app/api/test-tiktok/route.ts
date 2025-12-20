// Check TikTok API key and make single test request
import { NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const WOOP_API_HOST = "woop-it-api.p.rapidapi.com";

export async function GET() {
    // Show key prefix to verify correct key is deployed
    const keyPrefix = RAPIDAPI_KEY.substring(0, 12);

    // Make a single test request to Woop API
    let testResult = null;
    try {
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
            status: response.status,
            isRateLimited: response.status === 429,
            responsePreview: text.substring(0, 200),
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
