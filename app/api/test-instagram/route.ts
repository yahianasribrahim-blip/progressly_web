// Test endpoint to debug Instagram API response
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || "";
    const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

    if (!INSTAGRAM_RAPIDAPI_KEY) {
        return NextResponse.json({ error: "INSTAGRAM_RAPIDAPI_KEY not set" }, { status: 500 });
    }

    const hashtag = request.nextUrl.searchParams.get("hashtag") || "hijabfashion";

    try {
        // Try the posts_by_hashtag endpoint
        const url = `https://${INSTAGRAM_API_HOST}/posts_by_hashtag.php`;

        console.log("[Instagram Test] Fetching:", url);
        console.log("[Instagram Test] Hashtag:", hashtag);
        console.log("[Instagram Test] API Key starts with:", INSTAGRAM_RAPIDAPI_KEY.substring(0, 10));

        const response = await fetch(url, {
            method: "POST",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": INSTAGRAM_API_HOST,
                "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `hashtag=${encodeURIComponent(hashtag)}`,
        });

        const status = response.status;
        const statusText = response.statusText;

        let data: unknown;
        const contentType = response.headers.get("content-type");

        if (contentType?.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        return NextResponse.json({
            success: response.ok,
            status,
            statusText,
            contentType,
            dataType: typeof data,
            isArray: Array.isArray(data),
            keys: typeof data === "object" && data !== null ? Object.keys(data) : null,
            // Show first 2000 chars of response
            preview: JSON.stringify(data).substring(0, 2000),
        });
    } catch (error) {
        return NextResponse.json({
            error: "Request failed",
            message: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
