// Minimal test - just check if Instagram API responds
import { NextResponse } from "next/server";

const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

export async function GET() {
    if (!INSTAGRAM_RAPIDAPI_KEY) {
        return NextResponse.json({ error: "No API key" });
    }

    try {
        const response = await fetch(`https://${INSTAGRAM_API_HOST}/get_ig_user_reels.php`, {
            method: "POST",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": INSTAGRAM_API_HOST,
                "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `username_or_url=aussiemammoth&amount=2`,
        });

        const text = await response.text();

        let json;
        try {
            json = JSON.parse(text);
        } catch {
            json = null;
        }

        return NextResponse.json({
            httpStatus: response.status,
            isRateLimited: response.status === 429,
            reelsCount: json?.reels?.length || 0,
            rawResponse: text.substring(0, 200),
        });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
