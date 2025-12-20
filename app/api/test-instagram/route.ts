// Debug Vision AI - see what's happening with thumbnails and classification
import { NextResponse } from "next/server";

const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

export async function GET() {
    const account = "hussein.fht";

    try {
        // Step 1: Fetch reels
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
            return NextResponse.json({ error: `Instagram API error: ${response.status}` });
        }

        const data = await response.json();
        const reels = data.reels || [];

        // Step 2: Check thumbnail structure
        const firstReel = reels[0];
        const media = firstReel?.node?.media || firstReel?.node || firstReel;

        const thumbnailCheck = {
            hasNode: !!firstReel?.node,
            hasMedia: !!firstReel?.node?.media,
            thumbnailPaths: {
                "image_versions2.candidates[0].url": media?.image_versions2?.candidates?.[0]?.url?.substring(0, 50),
                "thumbnail_url": media?.thumbnail_url?.substring(0, 50),
                "display_url": media?.display_url?.substring(0, 50),
            },
        };

        // Find a working thumbnail
        const thumbnail =
            media?.image_versions2?.candidates?.[0]?.url ||
            media?.thumbnail_url ||
            media?.display_url ||
            "";

        // Step 3: Test Vision API if we have a thumbnail
        let visionResult = null;
        if (thumbnail && OPENAI_API_KEY) {
            try {
                const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text",
                                        text: `Does this image show gym or fitness content? Answer ONLY "YES" or "NO".`
                                    },
                                    {
                                        type: "image_url",
                                        image_url: { url: thumbnail }
                                    }
                                ]
                            }
                        ],
                        max_tokens: 10,
                    }),
                });

                if (visionResponse.ok) {
                    const visionData = await visionResponse.json();
                    visionResult = {
                        status: "success",
                        answer: visionData.choices?.[0]?.message?.content,
                    };
                } else {
                    const errorText = await visionResponse.text();
                    visionResult = {
                        status: "error",
                        httpStatus: visionResponse.status,
                        error: errorText.substring(0, 200),
                    };
                }
            } catch (e) {
                visionResult = { status: "exception", error: String(e) };
            }
        }

        return NextResponse.json({
            account,
            reelsCount: reels.length,
            thumbnailCheck,
            thumbnailFound: !!thumbnail,
            thumbnailPrefix: thumbnail?.substring(0, 80),
            hasOpenAIKey: !!OPENAI_API_KEY,
            visionResult,
        });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
