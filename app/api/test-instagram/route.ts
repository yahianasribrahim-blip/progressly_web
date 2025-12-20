// Test endpoint based on actual API sidebar screenshot
import { NextResponse } from "next/server";

export async function GET() {
    const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
    const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

    if (!INSTAGRAM_RAPIDAPI_KEY) {
        return NextResponse.json({ error: "API key not set" }, { status: 500 });
    }

    const hashtag = "hijab";
    const username = "hijabfashion"; // Also test with username

    // Endpoints based on the API sidebar: Search, Posts/Reels (Media), Hashtags
    const endpoints = [
        // Search endpoints
        { name: "search (Users + Hashtags)", method: "POST", body: `search_query=${hashtag}` },

        // Hashtags endpoint variations
        { name: "hashtags", method: "POST", body: `hashtag=${hashtag}` },
        { name: "hashtags", method: "GET", query: `?hashtag=${hashtag}` },

        // Posts/Reels endpoints
        { name: "posts", method: "POST", body: `username_or_url=${username}` },
        { name: "posts_reels", method: "POST", body: `username_or_url=${username}` },
        { name: "reels", method: "POST", body: `username_or_url=${username}` },
        { name: "media", method: "POST", body: `username_or_url=${username}` },

        // User endpoints  
        { name: "user", method: "POST", body: `username_or_url=${username}` },
        { name: "user_info", method: "POST", body: `username_or_url=${username}` },
        { name: "profile", method: "POST", body: `username_or_url=${username}` },

        // Tagged posts
        { name: "user_tagged_posts", method: "POST", body: `username_or_url=${username}` },
    ];

    const results: Array<{
        endpoint: string;
        method: string;
        status: number;
        hasData: boolean;
        keys?: string[];
        preview?: string;
    }> = [];

    for (const endpoint of endpoints) {
        try {
            const url = endpoint.query
                ? `https://${INSTAGRAM_API_HOST}/${endpoint.name}${endpoint.query}`
                : `https://${INSTAGRAM_API_HOST}/${endpoint.name}`;

            const fetchOptions: RequestInit = {
                method: endpoint.method,
                cache: "no-store",
                headers: {
                    "x-rapidapi-host": INSTAGRAM_API_HOST,
                    "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            };

            if (endpoint.method === "POST" && endpoint.body) {
                fetchOptions.body = endpoint.body;
            }

            const response = await fetch(url, fetchOptions);
            const text = await response.text();

            let data;
            try {
                data = JSON.parse(text);
            } catch {
                data = null;
            }

            const dataKeys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data) : [];
            const hasData = response.ok && (Array.isArray(data) ? data.length > 0 : dataKeys.length > 0);

            results.push({
                endpoint: endpoint.name,
                method: endpoint.method,
                status: response.status,
                hasData,
                keys: dataKeys.slice(0, 5),
                preview: text.substring(0, 150),
            });
        } catch (error) {
            results.push({
                endpoint: endpoint.name,
                method: endpoint.method,
                status: 0,
                hasData: false,
                preview: error instanceof Error ? error.message : String(error),
            });
        }
    }

    // Find working endpoints
    const working = results.filter(r => r.status === 200 && r.hasData);

    return NextResponse.json({
        apiKeyPrefix: INSTAGRAM_RAPIDAPI_KEY.substring(0, 10),
        workingEndpoints: working.map(e => `${e.method} /${e.endpoint}`),
        results,
    });
}
