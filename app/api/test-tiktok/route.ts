// Check TikTok API with CORRECT endpoint
import { NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const WOOP_API_HOST = "tiktok-most-trending-and-viral-content.p.rapidapi.com";

export async function GET() {
    const keyPrefix = RAPIDAPI_KEY.substring(0, 12);

    let testResult = null;
    try {
        // CORRECT endpoint from tiktok-api.ts line 276
        const params = new URLSearchParams({
            hashtag: "gym",
            sorting: "rise",
            days: "7",
            order: "desc",
        });

        const url = `https://${WOOP_API_HOST}/video?${params.toString()}`;

        const response = await fetch(url, {
            method: "GET",  // GET not POST!
            cache: "no-store",
            headers: {
                "x-rapidapi-host": WOOP_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
                "Accept": "application/json",
            },
        });

        const text = await response.text();
        let json;
        try { json = JSON.parse(text); } catch { json = null; }

        testResult = {
            url,
            status: response.status,
            isRateLimited: response.status === 429,
            videoCount: json?.data?.stats?.length || json?.stats?.length || "unknown",
            responsePreview: text.substring(0, 300),
        };
    } catch (e) {
        testResult = { error: String(e) };
    }

    return NextResponse.json({
        keyPrefix,
        hasKey: RAPIDAPI_KEY.length > 0,
        testResult,
    });
}
