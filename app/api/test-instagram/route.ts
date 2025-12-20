// Debug test endpoint for Instagram API
import { NextResponse } from "next/server";

const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get("niche") || "gym";

    // Test accounts for gym niche
    const testAccounts = [
        "hijabifitness",
        "modestactivewear",
        "muslimwomenwholift",
        "muslimgirl",
        "hijabihousewives",
    ];

    const results: Array<{
        account: string;
        status: number;
        reelsCount: number;
        reelsWithViews: number;
        error?: string;
        sample?: unknown;
    }> = [];

    for (const account of testAccounts.slice(0, 3)) {
        try {
            const response = await fetch(`https://${INSTAGRAM_API_HOST}/get_ig_user_reels.php`, {
                method: "POST",
                cache: "no-store",
                headers: {
                    "x-rapidapi-host": INSTAGRAM_API_HOST,
                    "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `username_or_url=${encodeURIComponent(account)}&amount=10`,
            });

            if (!response.ok) {
                results.push({
                    account,
                    status: response.status,
                    reelsCount: 0,
                    reelsWithViews: 0,
                    error: `HTTP ${response.status}`,
                });
                continue;
            }

            const data = await response.json();
            const reels = data.reels || [];

            // Count reels with views > 10k
            const reelsWithViews = reels.filter((r: { node?: { media?: { play_count?: number } } }) => {
                const playCount = r.node?.media?.play_count || 0;
                return playCount >= 10000;
            }).length;

            results.push({
                account,
                status: 200,
                reelsCount: reels.length,
                reelsWithViews,
                sample: reels[0] ? {
                    hasNode: !!reels[0].node,
                    hasMedia: !!reels[0].node?.media,
                    playCount: reels[0].node?.media?.play_count,
                    code: reels[0].node?.media?.code,
                } : null,
            });
        } catch (error) {
            results.push({
                account,
                status: 0,
                reelsCount: 0,
                reelsWithViews: 0,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return NextResponse.json({
        niche,
        apiKeyExists: !!INSTAGRAM_RAPIDAPI_KEY,
        results,
        summary: {
            totalAccounts: results.length,
            accountsWithReels: results.filter(r => r.reelsCount > 0).length,
            accountsWithQualifyingReels: results.filter(r => r.reelsWithViews > 0).length,
        },
    });
}
