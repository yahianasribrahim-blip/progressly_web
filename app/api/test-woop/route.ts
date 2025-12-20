// Test endpoint to discover all Woop API endpoints
import { NextResponse } from "next/server";

export async function GET() {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
    const WOOP_API_HOST = "tiktok-most-trending-and-viral-content.p.rapidapi.com";

    if (!RAPIDAPI_KEY) {
        return NextResponse.json({ error: "RAPIDAPI_KEY not set" }, { status: 500 });
    }

    // Try multiple possible endpoints
    const endpoints = [
        { path: "/video", params: { sorting: "rise", days: "1", order: "desc", hashtag: "gym" } },
        { path: "/hashtag", params: { name: "gym" } },
        { path: "/hashtag/video", params: { hashtag: "gym" } },
        { path: "/videos/hashtag", params: { tag: "gym" } },
        { path: "/search", params: { query: "gym workout" } },
        { path: "/video", params: { sorting: "rise", days: "1", order: "desc", niche: "fitness" } },
        { path: "/video", params: { sorting: "rise", days: "1", order: "desc", keyword: "gym" } },
    ];

    const results: Array<{ endpoint: string; params: string; status: number; preview: string }> = [];

    for (const ep of endpoints) {
        try {
            const params = new URLSearchParams(ep.params as Record<string, string>);
            const url = `https://${WOOP_API_HOST}${ep.path}?${params.toString()}`;

            const response = await fetch(url, {
                method: "GET",
                cache: "no-store",
                headers: {
                    "x-rapidapi-host": WOOP_API_HOST,
                    "x-rapidapi-key": RAPIDAPI_KEY,
                    "Accept": "application/json",
                },
            });

            const text = await response.text();

            results.push({
                endpoint: ep.path,
                params: JSON.stringify(ep.params),
                status: response.status,
                preview: text.substring(0, 500),
            });
        } catch (error) {
            results.push({
                endpoint: ep.path,
                params: JSON.stringify(ep.params),
                status: 0,
                preview: `Error: ${error instanceof Error ? error.message : String(error)}`,
            });
        }
    }

    return NextResponse.json({
        message: "Testing Woop API endpoints",
        results,
    });
}
