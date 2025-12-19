// Visual Content Moderation Service
// Scans thumbnails to filter out inappropriate imagery that text filters miss

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface ModerationResult {
    isAppropriate: boolean;
    reason?: string;
}

/**
 * Check if a video thumbnail shows appropriate content for the given niche
 * Uses GPT-4o Vision - stricter for hijab/modest fashion niches
 */
export async function moderateThumbnail(thumbnailUrl: string, niche: string = ""): Promise<ModerationResult> {
    if (!OPENAI_API_KEY || !thumbnailUrl) {
        return { isAppropriate: true }; // Default to allow if can't check
    }

    // Determine if this niche requires strict modest fashion standards
    const modestFashionNiches = ["hijab", "modest", "fashion", "cultural"];
    const requiresModestStandards = modestFashionNiches.some(n => niche.toLowerCase().includes(n));

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

        // Different prompts based on niche requirements
        // STRICT for hijab/modest fashion - tight tops are not acceptable even with hijab
        const modestPrompt = `You are checking content for a Muslim modest fashion platform.

REJECT if you see ANY of these (even if person is wearing hijab):
- Tight/fitted top that shows body shape or curves
- Form-fitting shirt or blouse that clings to the body
- Low-cut or revealing neckline
- Exposed stomach, chest, or excessive skin
- Clothing that emphasizes body shape

IMPORTANT: A person can wear hijab but still be dressed immodestly if their top is tight/form-fitting. REJECT those.

APPROVE only if:
- Loose, non-form-fitting clothing
- Modest neckline that doesn't show chest
- Can't clearly see body shape through the clothing

Be STRICT - this is for a Muslim modest fashion platform.
Respond with ONLY: APPROVE or REJECT`;

        const generalPrompt = `Check if this is appropriate family-friendly content.

REJECT ONLY for:
- Explicit nudity or near-nudity  
- Obviously sexualized content
- Violence or gore

APPROVE normal content.
Respond with ONLY: APPROVE or REJECT`;

        const prompt = requiresModestStandards ? modestPrompt : generalPrompt;

        // Use GPT-4o to check
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
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: base64Url, detail: "low" } }
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
    niche: string,
    maxToCheck: number = 10
): Promise<Set<string>> {
    const rejectedIds = new Set<string>();
    const videosToCheck = videos.slice(0, maxToCheck);

    console.log(`\n=== VISUAL CONTENT MODERATION ===`);
    console.log(`Checking ${videosToCheck.length} video thumbnails for niche "${niche}"...`);

    // Check thumbnails in parallel (but limit concurrency)
    const results = await Promise.all(
        videosToCheck.map(async (video) => {
            const thumbnailUrl = video.coverUrl || video.video?.cover;
            if (!thumbnailUrl) return { id: video.id, rejected: false };

            const result = await moderateThumbnail(thumbnailUrl, niche);
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
