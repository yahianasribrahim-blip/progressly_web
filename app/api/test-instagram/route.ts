// Test endpoint to discover working Instagram API endpoints
import { NextResponse } from "next/server";

export async function GET() {
    const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
    const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

    if (!INSTAGRAM_RAPIDAPI_KEY) {
        return NextResponse.json({ error: "INSTAGRAM_RAPIDAPI_KEY or RAPIDAPI_KEY not set" }, { status: 500 });
    }

    const hashtag = "hijab";

    // Based on API documentation: Posts & Reels V2 uses 'hashtag' parameter
    const endpoints = [
        // Posts & Reels V2 (from documentation)
        { name: "posts_reels_v2 POST", method: "POST", url: `https://${INSTAGRAM_API_HOST}/posts_reels_v2`, body: `hashtag=${hashtag}` },
        { name: "posts_and_reels POST", method: "POST", url: `https://${INSTAGRAM_API_HOST}/posts_and_reels`, body: `hashtag=${hashtag}` },
        { name: "posts-reels POST", method: "POST", url: `https://${INSTAGRAM_API_HOST}/posts-reels`, body: `hashtag=${hashtag}` },

        // Search endpoints (from documentation)
        { name: "search POST", method: "POST", url: `https://${INSTAGRAM_API_HOST}/search`, body: `search_query=${hashtag}` },
        { name: "search_hashtag POST", method: "POST", url: `https://${INSTAGRAM_API_HOST}/search_hashtag`, body: `search_query=${hashtag}` },

        // Hashtag posts variations
        { name: "hashtag_posts POST", method: "POST", url: `https://${INSTAGRAM_API_HOST}/hashtag_posts`, body: `hashtag=${hashtag}` },
        { name: "explore_hashtag POST", method: "POST", url: `https://${INSTAGRAM_API_HOST}/explore_hashtag`, body: `hashtag=${hashtag}` },

        // Common REST style endpoints
        { name: "/v2/posts/hashtag POST", method: "POST", url: `https://${INSTAGRAM_API_HOST}/v2/posts/hashtag`, body: `hashtag=${hashtag}` },
        { name: "/hashtag/posts POST", method: "POST", url: `https://${INSTAGRAM_API_HOST}/hashtag/posts`, body: `hashtag=${hashtag}` },
        { name: "/explore/tags POST", method: "POST", url: `https://${INSTAGRAM_API_HOST}/explore/tags`, body: `tag=${hashtag}` },
    ];

    const results: Array<{
        endpoint: string;
        status: number;
        hasData: boolean;
        dataType: string;
        keys?: string[];
        error?: string;
    }> = [];

    for (const endpoint of endpoints) {
        try {
            const fetchOptions: RequestInit = {
                method: endpoint.method,
                cache: "no-store",
                headers: {
                    "x-rapidapi-host": INSTAGRAM_API_HOST,
                    "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            };

            if (endpoint.body) {
                fetchOptions.body = endpoint.body;
            }

            const response = await fetch(endpoint.url, fetchOptions);

            if (!response.ok) {
                const errorText = await response.text().catch(() => "");
                results.push({
                    endpoint: endpoint.name,
                    status: response.status,
                    hasData: false,
                    dataType: "error",
                    error: errorText.substring(0, 100),
                });
                continue;
            }

            const data = await response.json();
            const dataKeys = typeof data === "object" && !Array.isArray(data) ? Object.keys(data) : [];
            const hasData = Array.isArray(data) ? data.length > 0 : dataKeys.length > 0;

            results.push({
                endpoint: endpoint.name,
                status: response.status,
                hasData,
                dataType: Array.isArray(data) ? "array" : typeof data,
                keys: dataKeys.slice(0, 10),
            });
        } catch (error) {
            results.push({
                endpoint: endpoint.name,
                status: 0,
                hasData: false,
                dataType: "exception",
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    // Find working endpoint
    const workingEndpoints = results.filter(r => r.status === 200 && r.hasData);

    return NextResponse.json({
        apiKey: `${INSTAGRAM_RAPIDAPI_KEY.substring(0, 10)}...`,
        summary: {
            workingEndpoints: workingEndpoints.map(e => e.endpoint),
            testedCount: results.length,
        },
        results,
    });
}
