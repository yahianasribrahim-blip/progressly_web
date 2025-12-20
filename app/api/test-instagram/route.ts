// Check which API key is being used
import { NextResponse } from "next/server";

const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";

export async function GET() {
    return NextResponse.json({
        keyPrefix: INSTAGRAM_RAPIDAPI_KEY.substring(0, 10),
        keyLength: INSTAGRAM_RAPIDAPI_KEY.length,
        expectedPrefix: "f16603a116", // New key should start with this
        isNewKey: INSTAGRAM_RAPIDAPI_KEY.startsWith("f16603a116"),
        message: INSTAGRAM_RAPIDAPI_KEY.startsWith("f16603a116")
            ? "✓ New key is deployed!"
            : "✗ Old key still in use - Vercel needs redeploy",
    });
}
