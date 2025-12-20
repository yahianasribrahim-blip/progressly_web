// Debug test with known working accounts + real Muslim fitness accounts
import { NextResponse } from "next/server";

const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

export async function GET() {
    // Test with accounts we KNOW work + real fitness accounts
    const testAccounts = [
        // Known working account (tested earlier)
        "hijabfashion",
        // Real Muslim fitness influencers (verified on Instagram)
        "sahadfit",  // Popular hijabi fitness
        "thesetfit", // Modest fitness
        "fitoverforty_uk", // Modest fitness
        "muslimgirl", // General - known to work
    ];

    const results: Array<{
        account: string;
        status: number;
        reelsCount: number;
        sample?: {
            code?: string;
            playCount?: number;
            caption?: string;
        };
        error?: string;
    }> = [];

    for (const account of testAccounts) {
        try {
            const response = await fetch(`https://${INSTAGRAM_API_HOST}/get_ig_user_reels.php`, {
                method: "POST",
                cache: "no-store",
                headers: {
                    "x-rapidapi-host": INSTAGRAM_API_HOST,
                    "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `username_or_url=${encodeURIComponent(account)}&amount=5`,
            });

            if (!response.ok) {
                const errorText = await response.text();
                results.push({
                    account,
                    status: response.status,
                    reelsCount: 0,
                    error: errorText.substring(0, 100),
                });
                continue;
            }

            const data = await response.json();
            const reels = data.reels || [];

            // Get first reel sample
            const firstReel = reels[0];
            const media = firstReel?.node?.media || firstReel?.node || firstReel;

            results.push({
                account,
                status: 200,
                reelsCount: reels.length,
                sample: reels.length > 0 ? {
                    code: media?.code,
                    playCount: media?.play_count || media?.view_count,
                    caption: (media?.caption?.text || "").substring(0, 50),
                } : undefined,
            });
        } catch (error) {
            results.push({
                account,
                status: 0,
                reelsCount: 0,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    const workingAccounts = results.filter(r => r.reelsCount > 0);

    return NextResponse.json({
        summary: {
            tested: results.length,
            working: workingAccounts.length,
            workingNames: workingAccounts.map(a => a.account),
        },
        results,
    });
}
