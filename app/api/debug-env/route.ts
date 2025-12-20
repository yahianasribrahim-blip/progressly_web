// Debug endpoint to check environment variables
import { NextResponse } from "next/server";

export async function GET() {
    const rapidApiKey = process.env.RAPIDAPI_KEY || "";
    const instagramKey = process.env.INSTAGRAM_RAPIDAPI_KEY || "";

    return NextResponse.json({
        rapidApiKeyExists: !!rapidApiKey,
        rapidApiKeyLength: rapidApiKey.length,
        rapidApiKeyStart: rapidApiKey ? rapidApiKey.substring(0, 8) + "..." : "NOT SET",
        instagramKeyExists: !!instagramKey,
        instagramKeyLength: instagramKey.length,
        instagramKeyStart: instagramKey ? instagramKey.substring(0, 8) + "..." : "NOT SET",
    });
}
