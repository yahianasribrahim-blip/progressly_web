// Diagnostic to see actual Instagram API response structure
import { NextResponse } from "next/server";

const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

export async function GET() {
    const account = "aussiemammoth";

    try {
        const response = await fetch(`https://${INSTAGRAM_API_HOST}/get_ig_user_reels.php`, {
            method: "POST",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": INSTAGRAM_API_HOST,
                "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `username_or_url=${encodeURIComponent(account)}&amount=3`,
        });

        if (!response.ok) {
            return NextResponse.json({ error: `HTTP ${response.status}` }, { status: 500 });
        }

        const data = await response.json();
        const firstReel = data.reels?.[0];

        // Show all keys at each level to understand structure
        return NextResponse.json({
            topLevelKeys: Object.keys(data),
            reelsCount: data.reels?.length || 0,
            firstReelKeys: firstReel ? Object.keys(firstReel) : [],
            nodeKeys: firstReel?.node ? Object.keys(firstReel.node) : [],
            mediaKeys: firstReel?.node?.media ? Object.keys(firstReel.node.media) : [],
            // Try to find caption in various places
            captionLocations: {
                "node.media.caption": firstReel?.node?.media?.caption,
                "node.media.caption.text": firstReel?.node?.media?.caption?.text,
                "node.caption": firstReel?.node?.caption,
                "caption": firstReel?.caption,
                "media.caption": data.reels?.[0]?.media?.caption,
            },
            playCountLocations: {
                "node.media.play_count": firstReel?.node?.media?.play_count,
                "node.media.view_count": firstReel?.node?.media?.view_count,
                "node.play_count": firstReel?.node?.play_count,
                "play_count": firstReel?.play_count,
            },
            // Show raw first reel (truncated)
            firstReelRaw: JSON.stringify(firstReel).substring(0, 500),
        });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
