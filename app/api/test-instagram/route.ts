// Test endpoint to debug Instagram API response
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || "";
    const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

    if (!INSTAGRAM_RAPIDAPI_KEY) {
        return NextResponse.json({ error: "INSTAGRAM_RAPIDAPI_KEY not set" }, { status: 500 });
    }

    const hashtag = request.nextUrl.searchParams.get("hashtag") || "hijabfashion";

    // Try multiple possible endpoint paths
    const possibleEndpoints = [
        { method: "POST", path: "/hashtag_posts", body: `hashtag=${encodeURIComponent(hashtag)}` },
        { method: "POST", path: "/get_hashtag_posts", body: `hashtag=${encodeURIComponent(hashtag)}` },
        { method: "POST", path: "/hashtag", body: `hashtag=${encodeURIComponent(hashtag)}` },
        { method: "POST", path: "/search/hashtag", body: `hashtag=${encodeURIComponent(hashtag)}` },
        { method: "GET", path: `/hashtag_posts?hashtag=${encodeURIComponent(hashtag)}`, body: null },
        { method: "GET", path: `/hashtag?hashtag=${encodeURIComponent(hashtag)}`, body: null },
        { method: "GET", path: `/tag/${encodeURIComponent(hashtag)}`, body: null },
        { method: "POST", path: "/ig/posts_hashtag", body: `hashtag=${encodeURIComponent(hashtag)}` },
        { method: "POST", path: "/v1/hashtag", body: `hashtag=${encodeURIComponent(hashtag)}` },
        { method: "POST", path: "/get_posts_by_hashtag", body: `hashtag=${encodeURIComponent(hashtag)}` },
    ];

    const results: Array<{ endpoint: string; method: string; status: number; preview: string }> = [];

    for (const ep of possibleEndpoints) {
        try {
            const url = `https://${INSTAGRAM_API_HOST}${ep.path}`;

            const response = await fetch(url, {
                method: ep.method,
                cache: "no-store",
                headers: {
                    "x-rapidapi-host": INSTAGRAM_API_HOST,
                    "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: ep.body,
            });

            const text = await response.text();

            results.push({
                endpoint: ep.path,
                method: ep.method,
                status: response.status,
                preview: text.substring(0, 300),
            });

            // If we found a working endpoint (not 404), stop searching
            if (response.status !== 404) {
                break;
            }
        } catch (error) {
            results.push({
                endpoint: ep.path,
                method: ep.method,
                status: 0,
                preview: `Error: ${error instanceof Error ? error.message : String(error)}`,
            });
        }
    }

    return NextResponse.json({
        hashtag,
        testedEndpoints: results,
    });
}
