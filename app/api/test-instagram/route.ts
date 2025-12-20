// Test if new Instagram API key works
import { NextResponse } from "next/server";

const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

export async function GET() {
    try {
        const response = await fetch(`https://${INSTAGRAM_API_HOST}/get_ig_user_reels.php`, {
            method: "POST",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": INSTAGRAM_API_HOST,
                "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `username_or_url=aussiemammoth&amount=3`,
        });

        const text = await response.text();
        let json;
        try { json = JSON.parse(text); } catch { json = null; }

        return NextResponse.json({
            keyPrefix: INSTAGRAM_RAPIDAPI_KEY.substring(0, 10),
            httpStatus: response.status,
            success: response.status === 200,
            reelsCount: json?.reels?.length || 0,
            message: response.status === 200
                ? `✓ API working! Found ${json?.reels?.length || 0} reels`
                : `✗ API error: ${response.status}`,
            rawResponse: text.substring(0, 150),
        });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
