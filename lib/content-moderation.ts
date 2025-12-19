// Visual Content Moderation Service
// Scans thumbnails to filter out inappropriate imagery that text filters miss

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface ModerationResult {
    isAppropriate: boolean;
    reason?: string;
}

/**
 * Check if a video thumbnail shows appropriate modest content
 * Uses GPT-4o Vision to scan for revealing/immodest imagery
 */
export async function moderateThumbnail(thumbnailUrl: string): Promise<ModerationResult> {
    if (!OPENAI_API_KEY || !thumbnailUrl) {
        return { isAppropriate: true }; // Default to allow if can't check
    }

    try {
        // Download thumbnail as base64
        const response = await fetch(thumbnailUrl);
        if (!response.ok) {
            return { isAppropriate: true };
        }

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = response.headers.get("content-type") || "image/jpeg";
        const base64Url = `data:${contentType};base64,${base64}`;

        // Use GPT-4o to check for modesty
        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `You are a content moderator for a MUSLIM modest fashion platform. 
                                
This image is a TikTok thumbnail. Check if it shows APPROPRIATE modest content.

REJECT if you see ANY of these:
- Tight/revealing clothing showing body shape
- Exposed skin (arms, chest, stomach, legs)
- Low-cut tops or cleavage
- Form-fitting/bodycon clothing
- Suggestive poses or expressions
- Makeup focused on appearing "sexy"
- Any content that would be considered immodest in Islamic standards

APPROVE only if the content shows:
- Loose, modest clothing that doesn't reveal body shape
- Proper hijab/head covering (if worn)
- Appropriate Islamic fashion or tutorials
- Family-friendly content

Respond with ONLY one word: APPROVE or REJECT`
                            },
                            {
                                type: "image_url",
                                image_url: { url: base64Url, detail: "low" }
                            }
                        ]
                    }
                ],
                max_tokens: 10,
            }),
        });

        if (!aiResponse.ok) {
            console.error("Moderation API error:", aiResponse.status);
            return { isAppropriate: true };
        }

        const result = await aiResponse.json();
        const answer = result.choices?.[0]?.message?.content?.trim()?.toUpperCase() || "";

        if (answer.includes("REJECT")) {
            console.log(`❌ REJECTED thumbnail: ${thumbnailUrl.substring(0, 50)}...`);
            return { isAppropriate: false, reason: "Immodest content detected" };
        }

        return { isAppropriate: true };
    } catch (error) {
        console.error("Moderation error:", error);
        return { isAppropriate: true }; // Default to allow on error
    }
}

/**
 * Filter videos by moderating their thumbnails
 * Returns only videos with appropriate thumbnails
 */
export async function moderateVideoThumbnails(
    videos: Array<{
        id: string;
        video?: { cover?: string };
        coverUrl?: string;
    }>,
    maxToCheck: number = 10
): Promise<Set<string>> {
    const rejectedIds = new Set<string>();
    const videosToCheck = videos.slice(0, maxToCheck);

    console.log(`\n=== VISUAL CONTENT MODERATION ===`);
    console.log(`Checking ${videosToCheck.length} video thumbnails for modest content...`);

    // Check thumbnails in parallel (but limit concurrency)
    const results = await Promise.all(
        videosToCheck.map(async (video) => {
            const thumbnailUrl = video.coverUrl || video.video?.cover;
            if (!thumbnailUrl) return { id: video.id, rejected: false };

            const result = await moderateThumbnail(thumbnailUrl);
            return { id: video.id, rejected: !result.isAppropriate };
        })
    );

    results.forEach(r => {
        if (r.rejected) {
            rejectedIds.add(r.id);
        }
    });

    console.log(`Moderation complete: ${rejectedIds.size} videos rejected for immodest content`);
    return rejectedIds;
}
