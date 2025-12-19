// Instagram Reels API Integration using RockSolid Instagram Scraper API

// API Configuration
const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

// Reuse hashtags from TikTok - same niches apply
import { NICHE_HASHTAGS } from "./tiktok-api";

// Words to filter out - same as TikTok
const INAPPROPRIATE_KEYWORDS = [
    // Romantic/explicit themes
    "sexy", "hot girl", "hot boy", "kiss", "hookup", "flirting", "nsfw", "18+", "explicit", "sensual",
    // Clearly revealing/explicit content
    "cleavage", "busty", "bodycon", "braless", "lingerie", "underwear",
    "bikini", "swimsuit", "booty", "butt",
    // Thirst trap indicators
    "thirst trap", "body count", "situationship", "fwb", "rate me", "am i hot",
    "would you date", "dms open",
    // Drugs/alcohol
    "weed", "420", "drunk", "alcohol", "high af", "stoned",
    "molly", "xanax", "drugs", "blunt", "joints", "edibles",
    // Violence
    "kill", "murder", "blood", "gang", "gun", "shoot", "violence",
    // Profanity
    "wtf", "fck", "f*ck", "sh*t", "b*tch",
    // Clubbing
    "twerk", "twerking", "clubbing", "rave", "nightclub",
    // AI Generated Content (haram - creating images of living beings)
    "ai generated", "ai voice", "ai art", "ai story", "ai stories",
    "midjourney", "dalle", "dall-e", "stable diffusion", "ai animation",
    "ai prophet", "ai sahaba", "ai companion", "generated with ai",
    // Misguided religious content
    "hijab not required", "hijab is not fard", "don't need hijab", "hijab optional",
    "hijab not mandatory", "hijab not obligatory", "hijab is cultural",
    "not required in quran", "moderate muslim", "progressive muslim",
];

// Check if video content is appropriate for Muslim creators
function isContentAppropriate(description: string): boolean {
    if (!description) return true;
    const lowerDesc = description.toLowerCase();
    return !INAPPROPRIATE_KEYWORDS.some(keyword => lowerDesc.includes(keyword.toLowerCase()));
}

// Instagram Reel interface
export interface InstagramReel {
    id: string;
    shortcode: string;
    caption: string;
    thumbnail: string;
    videoUrl: string;
    playCount: number;
    likeCount: number;
    commentCount: number;
    timestamp: number;
    owner: {
        username: string;
        fullName: string;
        profilePicUrl: string;
    };
    duration: number;
    isReel: boolean;
}

// Standard video interface matching TikTok for unified display
export interface InstagramVideoExample {
    id: string;
    thumbnail: string;
    creator: string;
    creatorAvatar: string;
    platform: "Instagram";
    views: string;
    url: string;
    description: string;
    duration: number;
    daysAgo?: number | null;
}

// Format view count to readable string
function formatViewCount(count: number): string {
    if (count >= 1000000000) {
        return `${(count / 1000000000).toFixed(1)}B`;
    }
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
}

// Fetch Instagram Reels by hashtag
async function fetchReelsByHashtag(hashtag: string, count: number = 20): Promise<InstagramReel[]> {
    console.log(`[Instagram] Fetching reels for hashtag: #${hashtag}`);

    if (!INSTAGRAM_RAPIDAPI_KEY) {
        console.error("[Instagram] INSTAGRAM_RAPIDAPI_KEY is not set");
        return [];
    }

    try {
        // Using the posts_by_hashtag endpoint - returns both posts and Reels
        const url = `https://${INSTAGRAM_API_HOST}/posts_by_hashtag.php`;

        const response = await fetch(url, {
            method: "POST",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": INSTAGRAM_API_HOST,
                "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `hashtag=${encodeURIComponent(hashtag)}&count=${count}`,
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            console.error(`[Instagram] API error: ${response.status} - ${errorText.substring(0, 200)}`);
            return [];
        }

        const data = await response.json();
        console.log("[Instagram] Response keys:", Object.keys(data));

        // Parse the response - structure may vary
        const items = data.data?.items || data.items || data.media || data || [];

        if (!Array.isArray(items)) {
            console.warn("[Instagram] Response is not an array:", typeof items);
            return [];
        }

        console.log(`[Instagram] Found ${items.length} items for #${hashtag}`);

        const reels: InstagramReel[] = [];

        for (const item of items.slice(0, count)) {
            try {
                // Check if it's a video/Reel (not a photo)
                const isVideo = item.is_video || item.media_type === 2 || item.product_type === "clips";

                if (!isVideo) {
                    continue; // Skip photos, only process videos/Reels
                }

                // Parse timestamp
                const timestamp = item.taken_at || item.timestamp ||
                    (item.taken_at_timestamp ? item.taken_at_timestamp : Math.floor(Date.now() / 1000));

                reels.push({
                    id: item.pk || item.id || item.code || "",
                    shortcode: item.code || item.shortcode || "",
                    caption: item.caption?.text || item.caption || item.edge_media_to_caption?.edges?.[0]?.node?.text || "",
                    thumbnail: item.image_versions2?.candidates?.[0]?.url ||
                        item.thumbnail_url ||
                        item.display_url ||
                        item.thumbnail_src || "",
                    videoUrl: item.video_url || item.video_versions?.[0]?.url || "",
                    playCount: item.play_count || item.view_count || item.video_view_count || 0,
                    likeCount: item.like_count || item.edge_liked_by?.count || 0,
                    commentCount: item.comment_count || item.edge_media_to_comment?.count || 0,
                    timestamp: timestamp,
                    owner: {
                        username: item.user?.username || item.owner?.username || "creator",
                        fullName: item.user?.full_name || item.owner?.full_name || "Creator",
                        profilePicUrl: item.user?.profile_pic_url || item.owner?.profile_pic_url || "",
                    },
                    duration: item.video_duration || 0,
                    isReel: item.product_type === "clips" || item.media_type === 2,
                });
            } catch (parseError) {
                console.warn("[Instagram] Error parsing item:", parseError);
            }
        }

        console.log(`[Instagram] Parsed ${reels.length} reels from response`);
        return reels;
    } catch (error) {
        console.error("[Instagram] Error fetching reels:", error);
        return [];
    }
}

// Main function to fetch Instagram Reels for a niche
export async function getInstagramReelsForNiche(niche: string): Promise<InstagramVideoExample[]> {
    console.log(`[Instagram] Getting reels for niche: ${niche}`);

    const nicheKey = niche.toLowerCase();
    const hashtags = NICHE_HASHTAGS[nicheKey] || NICHE_HASHTAGS.deen;

    // Query first 2-3 hashtags to get variety
    const hashtagsToQuery = hashtags.slice(0, 3);
    const allReels: InstagramReel[] = [];

    for (const hashtag of hashtagsToQuery) {
        try {
            const reels = await fetchReelsByHashtag(hashtag, 15);
            allReels.push(...reels);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`[Instagram] Error fetching #${hashtag}:`, error);
        }
    }

    console.log(`[Instagram] Total reels collected: ${allReels.length}`);

    // Calculate timestamps
    const now = Math.floor(Date.now() / 1000);
    const fifteenDaysAgo = now - (15 * 24 * 60 * 60);
    const MIN_VIEWS = 50000;

    // Deduplicate by ID
    const seenIds = new Set<string>();
    const uniqueReels = allReels.filter(r => {
        if (!r.id || seenIds.has(r.id)) return false;
        seenIds.add(r.id);
        return true;
    });

    // Filter: appropriate content, recent (15 days), minimum views
    const filteredReels = uniqueReels
        .filter(r => isContentAppropriate(r.caption))
        .filter(r => r.timestamp >= fifteenDaysAgo)
        .filter(r => r.playCount >= MIN_VIEWS)
        .sort((a, b) => b.playCount - a.playCount);

    console.log(`[Instagram] After filtering: ${filteredReels.length} reels qualify`);

    // Convert to VideoExample format
    const examples: InstagramVideoExample[] = filteredReels.slice(0, 8).map(reel => {
        const daysAgo = Math.floor((now - reel.timestamp) / (24 * 60 * 60));

        return {
            id: reel.id,
            thumbnail: reel.thumbnail,
            creator: `@${reel.owner.username}`,
            creatorAvatar: reel.owner.profilePicUrl,
            platform: "Instagram" as const,
            views: formatViewCount(reel.playCount),
            url: `https://www.instagram.com/reel/${reel.shortcode}/`,
            description: reel.caption,
            duration: reel.duration,
            daysAgo: daysAgo,
        };
    });

    console.log(`[Instagram] Returning ${examples.length} video examples`);
    return examples;
}

// Test function (can be called from API route)
export async function testInstagramAPI(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
        if (!INSTAGRAM_RAPIDAPI_KEY) {
            return { success: false, message: "INSTAGRAM_RAPIDAPI_KEY not set" };
        }

        const reels = await fetchReelsByHashtag("hijabfashion", 5);

        if (reels.length > 0) {
            return { success: true, message: `Found ${reels.length} reels`, count: reels.length };
        } else {
            return { success: false, message: "API returned 0 reels - check endpoint or response format" };
        }
    } catch (error) {
        return { success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` };
    }
}
