// Test the exact gym accounts to see which ones work
import { NextResponse } from "next/server";

const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

export async function GET() {
    // Exact accounts from NICHE_CREATORS.gym
    const gymAccounts = [
        "lilmobsss",
        "aussiemammoth",
        "hussein.fht",
        "ali_khan_fitness",
        "active.ayesh",
        "lkgainss",
        "saberzamour",
    ];

    const results: Array<{
        account: string;
        status: number;
        reelsCount: number;
        error?: string;
        sample?: {
            code?: string;
            playCount?: number;
            caption?: string;
        };
    }> = [];

    for (const account of gymAccounts) {
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

            const sample = reels[0]?.node?.media;

            results.push({
                account,
                status: 200,
                reelsCount: reels.length,
                sample: sample ? {
                    code: sample.code,
                    playCount: sample.play_count,
                    caption: (sample.caption?.text || "").substring(0, 50),
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

    const working = results.filter(r => r.reelsCount > 0);

    return NextResponse.json({
        summary: {
            tested: results.length,
            working: working.length,
            workingAccounts: working.map(a => a.account),
            brokenAccounts: results.filter(r => r.reelsCount === 0).map(a => a.account),
        },
        results,
    });
}
