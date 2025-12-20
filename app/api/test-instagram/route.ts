// Test endpoint with .php extension pattern
import { NextResponse } from "next/server";

export async function GET() {
    const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
    const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

    if (!INSTAGRAM_RAPIDAPI_KEY) {
        return NextResponse.json({ error: "API key not set" }, { status: 500 });
    }

    const hashtag = "hijab";
    const username = "hijabfashion";

    // Endpoints with .php extension pattern discovered from API docs
    const endpoints = [
        // Hashtag endpoints (what we need)
        { name: "get_ig_hashtag_posts.php", body: `hashtag=${hashtag}` },
        { name: "get_hashtag_posts.php", body: `hashtag=${hashtag}` },
        { name: "search_hashtag.php", body: `hashtag=${hashtag}` },
        { name: "ig_hashtag_posts.php", body: `hashtag=${hashtag}` },
        { name: "hashtag_posts.php", body: `hashtag=${hashtag}` },

        // Search endpoints
        { name: "search.php", body: `search_query=${hashtag}` },
        { name: "get_search.php", body: `search_query=${hashtag}` },

        // User posts (confirmed working pattern)
        { name: "get_ig_user_tagged_posts.php", body: `username_or_url=${username}` },
        { name: "get_ig_user_posts.php", body: `username_or_url=${username}` },
        { name: "get_user_posts.php", body: `username_or_url=${username}` },

        // Reels
        { name: "get_ig_user_reels.php", body: `username_or_url=${username}` },
        { name: "get_reels.php", body: `username_or_url=${username}` },
    ];

    const results: Array<{
        endpoint: string;
        status: number;
        hasData: boolean;
        preview: string;
    }> = [];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`https://${INSTAGRAM_API_HOST}/${endpoint.name}`, {
                method: "POST",
                cache: "no-store",
                headers: {
                    "x-rapidapi-host": INSTAGRAM_API_HOST,
                    "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: endpoint.body,
            });

            const text = await response.text();
            const hasData = response.ok && !text.includes("does not exist") && text.length > 50;

            results.push({
                endpoint: endpoint.name,
                status: response.status,
                hasData,
                preview: text.substring(0, 200),
            });
        } catch (error) {
            results.push({
                endpoint: endpoint.name,
                status: 0,
                hasData: false,
                preview: error instanceof Error ? error.message : String(error),
            });
        }
    }

    // Find working endpoints
    const working = results.filter(r => r.status === 200 && r.hasData);

    return NextResponse.json({
        workingEndpoints: working.map(e => e.endpoint),
        results,
    });
}
