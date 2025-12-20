// Test endpoint to debug Woop TikTok API response directly
import { NextResponse } from "next/server";

export async function GET() {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
    const WOOP_API_HOST = "tiktok-most-trending-and-viral-content.p.rapidapi.com";

    if (!RAPIDAPI_KEY) {
        return NextResponse.json({ error: "RAPIDAPI_KEY not set" }, { status: 500 });
    }

    try {
        const params = new URLSearchParams({
            sorting: "rise",
            days: "1",
            order: "desc",
            category: "96", // Lifestyle category
        });

        const url = `https://${WOOP_API_HOST}/video?${params.toString()}`;

        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": WOOP_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
                "Accept": "application/json",
            },
        });

        const status = response.status;
        const statusText = response.statusText;

        let data: unknown;
        const contentType = response.headers.get("content-type");

        try {
            data = await response.json();
        } catch {
            data = await response.text();
        }

        // Analyze the response structure
        const dataType = typeof data;
        const isArray = Array.isArray(data);
        const keys = dataType === "object" && data !== null ? Object.keys(data as object) : [];

        // Check for common data locations
        let videoCount = 0;
        if (isArray) {
            videoCount = (data as unknown[]).length;
        } else if (dataType === "object" && data !== null) {
            const obj = data as Record<string, unknown>;
            if (Array.isArray(obj.data)) videoCount = obj.data.length;
            else if (Array.isArray(obj.videos)) videoCount = obj.videos.length;
            else if (Array.isArray(obj.items)) videoCount = obj.items.length;
        }

        return NextResponse.json({
            success: response.ok,
            status,
            statusText,
            contentType,
            dataType,
            isArray,
            keys,
            videoCount,
            // Show first 3000 chars of response for debugging
            preview: JSON.stringify(data).substring(0, 3000),
        });
    } catch (error) {
        return NextResponse.json({
            error: "Request failed",
            message: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
