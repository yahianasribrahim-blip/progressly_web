// Instagram Reels API Integration - User-Based Approach
// Fetches content from curated Muslim creator accounts per niche

// API Configuration
const INSTAGRAM_RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

// =============================================================================
// CURATED MUSLIM CREATOR ACCOUNTS PER NICHE
// These are popular Muslim Instagram accounts that create content for each niche
// =============================================================================
const NICHE_CREATORS: Record<string, string[]> = {
    hijab: [
        "hijabfashion",
        "modestfashionweek",
        "modesty",
        "hijabstyle",
        "modeststreetfashion",
    ],
    deen: [
        "islamicreminders",
        "onepathnetwork",
        "muslimcentral",
        "islamicquotes_",
        "quranrecitation",
    ],
    cultural: [
        "muslimgirl",
        "hejabnista",
        "muslimahlifestyle",
        "islamicart",
        "arabesque.life",
    ],
    food: [
        "halalfoodguide",
        "halalgirlsknow",
        "halalfoodhunt",
        "muslimfoodie",
        "modesthalalfood",
    ],
    gym: [
        "hijabifitness",
        "modestactivewear",
        "muslimwomenwholift",
        "hijabworkout",
        "fitmuslimah",
    ],
    pets: [
        "muslimswithcats",
        "halalcatmom",
        "muslimandpets",
    ],
    storytelling: [
        "muslimwomensday",
        "muslimstories",
        "hijabistorytime",
        "muslimlifestyle",
    ],
};

// Words to filter out inappropriate content
const INAPPROPRIATE_KEYWORDS = [
    "sexy", "hot girl", "kiss", "hookup", "nsfw", "18+", "explicit",
    "cleavage", "busty", "braless", "lingerie", "bikini", "swimsuit",
    "thirst trap", "body count", "situationship",
    "weed", "420", "drunk", "alcohol", "drugs",
    "twerk", "clubbing", "rave", "nightclub",
    "ai generated", "ai voice", "ai art",
    "hijab not required", "hijab is not fard", "progressive muslim",
    "gymgirl", "gyat", "leggings", "stay focus",
    "masturbation", "nofap", "porn", "zina",
];

function isContentAppropriate(description: string): boolean {
    if (!description) return true;
    const lowerDesc = description.toLowerCase();
    return !INAPPROPRIATE_KEYWORDS.some(keyword => lowerDesc.includes(keyword.toLowerCase()));
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

function formatViewCount(count: number): string {
    if (count >= 1000000000) return `${(count / 1000000000).toFixed(1)}B`;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
}

// Fetch reels from a specific user account
async function fetchUserReels(username: string): Promise<InstagramVideoExample[]> {
    console.log(`[Instagram] Fetching reels from @${username}`);

    if (!INSTAGRAM_RAPIDAPI_KEY) {
        console.error("[Instagram] API key not set");
        return [];
    }

    try {
        const response = await fetch(`https://${INSTAGRAM_API_HOST}/get_ig_user_reels.php`, {
            method: "POST",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": INSTAGRAM_API_HOST,
                "x-rapidapi-key": INSTAGRAM_RAPIDAPI_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `username_or_url=${encodeURIComponent(username)}&amount=10`,
        });

        if (!response.ok) {
            console.error(`[Instagram] Error for @${username}: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const reels = data.reels || [];

        if (!Array.isArray(reels)) {
            console.warn(`[Instagram] No reels array for @${username}`);
            return [];
        }

        console.log(`[Instagram] Found ${reels.length} reels from @${username}`);

        const now = Math.floor(Date.now() / 1000);
        const videos: InstagramVideoExample[] = [];

        for (const item of reels) {
            try {
                const media = item.node?.media || item.node || item;

                // Skip if no media data
                if (!media || !media.code) continue;

                // Get play count (views)
                const playCount = media.play_count || media.view_count || media.video_view_count || 0;

                // Skip low-view content (minimum 10k for Instagram)
                if (playCount < 10000) continue;

                // Get caption
                const caption = media.caption?.text || media.caption || "";

                // Skip inappropriate content
                if (!isContentAppropriate(caption)) continue;

                // Calculate days ago
                const timestamp = media.taken_at || media.taken_at_timestamp || now;
                const daysAgo = Math.floor((now - timestamp) / (24 * 60 * 60));

                // Skip content older than 30 days
                if (daysAgo > 30) continue;

                // Get thumbnail
                const thumbnail =
                    media.image_versions2?.candidates?.[0]?.url ||
                    media.thumbnail_url ||
                    media.display_url ||
                    "";

                // Get user info
                const user = media.user || media.owner || {};

                videos.push({
                    id: media.pk || media.id || media.code,
                    thumbnail,
                    creator: `@${user.username || username}`,
                    creatorAvatar: user.profile_pic_url || "",
                    platform: "Instagram",
                    views: formatViewCount(playCount),
                    url: `https://www.instagram.com/reel/${media.code}/`,
                    description: caption.substring(0, 200),
                    duration: media.video_duration || 0,
                    daysAgo,
                });
            } catch (parseError) {
                console.warn("[Instagram] Error parsing reel:", parseError);
            }
        }

        return videos;
    } catch (error) {
        console.error(`[Instagram] Error fetching @${username}:`, error);
        return [];
    }
}

// Main function to fetch Instagram Reels for a niche
export async function getInstagramReelsForNiche(niche: string): Promise<InstagramVideoExample[]> {
    console.log(`[Instagram] Getting reels for niche: ${niche}`);

    if (!INSTAGRAM_RAPIDAPI_KEY) {
        console.error("[Instagram] API key not set");
        return [];
    }

    const nicheKey = niche.toLowerCase();
    const creators = NICHE_CREATORS[nicheKey] || NICHE_CREATORS.deen;

    console.log(`[Instagram] Fetching from ${creators.length} creators:`, creators);

    const allVideos: InstagramVideoExample[] = [];

    // Fetch from each creator (limit to 3 to avoid rate limits)
    for (const username of creators.slice(0, 3)) {
        try {
            const videos = await fetchUserReels(username);
            allVideos.push(...videos);

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.error(`[Instagram] Error fetching @${username}:`, error);
        }
    }

    console.log(`[Instagram] Total videos collected: ${allVideos.length}`);

    // Deduplicate by ID
    const seenIds = new Set<string>();
    const uniqueVideos = allVideos.filter(v => {
        if (seenIds.has(v.id)) return false;
        seenIds.add(v.id);
        return true;
    });

    // Sort by views (highest first) and take top 8
    const sortedVideos = uniqueVideos
        .sort((a, b) => {
            const viewsA = parseFloat(a.views.replace(/[KMB]/g, "")) * (a.views.includes("M") ? 1000 : a.views.includes("B") ? 1000000 : 1);
            const viewsB = parseFloat(b.views.replace(/[KMB]/g, "")) * (b.views.includes("M") ? 1000 : b.views.includes("B") ? 1000000 : 1);
            return viewsB - viewsA;
        })
        .slice(0, 8);

    console.log(`[Instagram] Returning ${sortedVideos.length} videos for niche "${niche}"`);
    return sortedVideos;
}

// Test function
export async function testInstagramAPI(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
        if (!INSTAGRAM_RAPIDAPI_KEY) {
            return { success: false, message: "INSTAGRAM_RAPIDAPI_KEY not set" };
        }

        const videos = await fetchUserReels("hijabfashion");

        if (videos.length > 0) {
            return { success: true, message: `Found ${videos.length} reels from @hijabfashion`, count: videos.length };
        } else {
            return { success: false, message: "API returned 0 reels - check account or response format" };
        }
    } catch (error) {
        return { success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` };
    }
}
