// Test endpoint to discover working Instagram API endpoints
import { NextResponse } from "next/server";

export async function GET() {
    const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
    const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

    if (!INSTAGRAM_RAPIDAPI_KEY) {
        return NextResponse.json({ error: "INSTAGRAM_RAPIDAPI_KEY not set" }, { status: 500 });
    }

    const hashtag = "hijab";

    // Try different endpoints
    const endpoints = [
        { name: "search_hashtag.php GET", method: "GET", url: `https://${INSTAGRAM_API_HOST}/search_hashtag.php?hashtag=${hashtag}` },
        { name: "search_hashtag.php POST", method: "POST", url: `https://${INSTAGRAM_API_HOST}/search_hashtag.php`, body: `hashtag=${hashtag}` },
        { name: "posts_by_hashtag.php GET", method: "GET", url: `https://${INSTAGRAM_API_HOST}/posts_by_hashtag.php?hashtag=${hashtag}` },
        { name: "hashtag_posts.php GET", method: "GET", url: `https://${INSTAGRAM_API_HOST}/hashtag_posts.php?hashtag=${hashtag}` },
        { name: "hashtag/posts GET", method: "GET", url: `https://${INSTAGRAM_API_HOST}/hashtag/posts?hashtag=${hashtag}` },
        { name: "tag_posts.php GET", method: "GET", url: `https://${INSTAGRAM_API_HOST}/tag_posts.php?hashtag=${hashtag}` },
    ];

    const results: Array<{
        endpoint: string;
        status: number;
        hasData: boolean;
        dataType: string;
        sample?: unknown;
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
                    "Content-Type": endpoint.method === "POST" ? "application/x-www-form-urlencoded" : "application/json",
                },
            };

            if (endpoint.method === "POST" && endpoint.body) {
                fetchOptions.body = endpoint.body;
            }

            const response = await fetch(endpoint.url, fetchOptions);

            if (!response.ok) {
                results.push({
                    endpoint: endpoint.name,
                    status: response.status,
                    hasData: false,
                    dataType: "error",
                    error: `HTTP ${response.status}`,
                });
                continue;
            }

            const data = await response.json();
            const dataType = Array.isArray(data) ? "array" : typeof data;
            const hasData = dataType === "array" ? data.length > 0 : (dataType === "object" && Object.keys(data).length > 0);

            results.push({
                endpoint: endpoint.name,
                status: response.status,
                hasData,
                dataType,
                sample: Array.isArray(data) ? data.slice(0, 1) : { keys: Object.keys(data) },
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
        summary: {
            workingEndpoints: workingEndpoints.map(e => e.endpoint),
            testedCount: results.length,
        },
        results,
    });
}
