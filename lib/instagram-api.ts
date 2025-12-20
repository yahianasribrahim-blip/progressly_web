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
        "omayazein",        // Hijab lifestyle
        "tamaratomahy",     // Modest fashion
        "abiresag",         // Hijab fashion
        "theblondemuslim",  // Lifestyle + hijab
    ],
    deen: [
        "muftimenkofficla",     // Islamic scholar
        "gemsofshaykhuthman",   // Islamic reminders
        "wayoflifesq",          // Deen content
        "farzyspeaks",          // Islamic lifestyle
    ],
    cultural: [
        "lifeofogaa",       // Muslim lifestyle
        "canyonmimbs",      // Cultural content
        "maisvault",        // Muslim lifestyle
        "thegoldenbalance", // Balance/lifestyle
    ],
    food: [
        "haddy_abdel",      // Food content
    ],
    gym: [
        "lilmobsss",        // Fitness
        "aussiemammoth",    // Gym/fitness
        "hussein.fht",      // Fitness
        "ali_khan_fitness", // Fitness trainer
        "active.ayesh",     // Active lifestyle
        "lkgainss",         // Gym gains
        "saberzamour",      // Fitness
    ],
    pets: [
        "lifeofogaa",       // General lifestyle
    ],
    storytelling: [
        "its_danzy",        // Storytime/lifestyle
        "akhi_ayman",       // Muslim content
        "baraa_bolat",      // Lifestyle content
    ],
    comedy: [
        "islamfawzy_",      // Muslim comedy
        "akhi_ayman",       // Comedy/lifestyle
        "its_danzy",        // Comedy/storytime
    ],
};

// GENERAL MUSLIM CREATORS - Post various content across all niches
const GENERAL_CREATORS = [
    "maryam_kamal_",    // General Muslim content
    "akhi_ayman",       // Muslim lifestyle
    "theblondemuslim",  // Lifestyle/hijab
    "omayazein",        // Muslim lifestyle
    "thegoldenbalance", // Balance/lifestyle
    "lifeofogaa",       // Muslim lifestyle
    "maisvault",        // Content creator
];

// NICHE KEYWORDS - Used to filter general creator content
const NICHE_KEYWORDS: Record<string, string[]> = {
    hijab: ["hijab", "scarf", "wrap", "modest", "style", "fashion", "outfit", "abaya", "dress"],
    deen: ["quran", "allah", "prayer", "salah", "dua", "hadith", "sunnah", "reminder", "faith", "islam"],
    cultural: ["ramadan", "eid", "culture", "tradition", "arab", "desi", "somali", "moroccan", "family"],
    food: ["food", "recipe", "cook", "halal", "meal", "eat", "kitchen", "breakfast", "lunch", "dinner", "iftar", "suhoor"],
    gym: ["gym", "workout", "fitness", "exercise", "muscle", "training", "cardio", "protein", "health", "active"],
    pets: ["cat", "kitten", "pet", "dog", "animal", "cute", "fluffy"],
    storytelling: ["story", "storytime", "grwm", "vlog", "routine", "journey", "experience", "pov", "day in"],
    comedy: ["funny", "comedy", "skit", "joke", "laugh", "hilarious", "prank", "relatable", "humor"],
};

// Check if content matches the niche (keyword-based fallback)
function isNicheRelevantByKeywords(description: string, niche: string): boolean {
    if (!description) return false;
    const lowerDesc = description.toLowerCase();
    const nicheKey = niche.toLowerCase();
    const keywords = NICHE_KEYWORDS[nicheKey];

    if (!keywords || keywords.length === 0) return true;
    return keywords.some(keyword => lowerDesc.includes(keyword));
}

// AI-based niche relevance classification
// Uses OpenAI to determine if a video's caption is actually about the niche
async function classifyVideosWithAI(
    videos: InstagramVideoExample[],
    niche: string
): Promise<InstagramVideoExample[]> {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY || videos.length === 0) {
        // Fallback to keyword matching if no OpenAI key
        console.log("[Instagram] No OpenAI key, falling back to keyword matching");
        return videos.filter(v => isNicheRelevantByKeywords(v.description, niche));
    }

    try {
        // Create a batch prompt for efficiency
        const videoCaptions = videos.map((v, i) =>
            `Video ${i + 1}: "${v.description.substring(0, 200)}"`
        ).join("\n");

        const nicheDescriptions: Record<string, string> = {
            gym: "fitness, workout, exercise, gym, muscle building, weight training, cardio",
            food: "cooking, recipes, halal food, meals, eating, kitchen",
            hijab: "hijab styling, modest fashion, Muslim women's fashion, headscarves",
            deen: "Islamic reminders, Quran, prayer, faith, spirituality, religious teachings",
            cultural: "Muslim culture, Ramadan, Eid, traditions, family, heritage",
            comedy: "funny content, jokes, skits, humor, comedy",
            storytelling: "personal stories, vlogs, GRWM, day in my life, experiences",
            pets: "cats, dogs, animals, pets",
        };

        const nicheDesc = nicheDescriptions[niche.toLowerCase()] || niche;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a content classifier for Muslim creators. Classify each video caption as RELEVANT or NOT RELEVANT to the "${niche}" niche.

The "${niche}" niche includes: ${nicheDesc}

For each video, respond with just the video number and YES or NO.
Example format:
1: YES
2: NO
3: YES

Be strict - only say YES if the video is clearly about ${niche} content.`
                    },
                    {
                        role: "user",
                        content: `Classify these video captions for the "${niche}" niche:\n\n${videoCaptions}`
                    }
                ],
                temperature: 0.1,
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            console.error("[Instagram AI] OpenAI error:", response.status);
            return videos.filter(v => isNicheRelevantByKeywords(v.description, niche));
        }

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content || "";

        console.log(`[Instagram AI] Classification response:\n${aiResponse}`);

        // Parse AI response to get relevant video indices
        const relevantIndices = new Set<number>();
        const lines = aiResponse.split("\n");
        for (const line of lines) {
            const match = line.match(/(\d+):\s*(YES|yes)/);
            if (match) {
                relevantIndices.add(parseInt(match[1]) - 1); // Convert to 0-indexed
            }
        }

        const relevantVideos = videos.filter((_, i) => relevantIndices.has(i));
        console.log(`[Instagram AI] ${relevantVideos.length}/${videos.length} videos classified as relevant to "${niche}"`);

        return relevantVideos;
    } catch (error) {
        console.error("[Instagram AI] Classification error:", error);
        return videos.filter(v => isNicheRelevantByKeywords(v.description, niche));
    }
}

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
    const nicheCreators = NICHE_CREATORS[nicheKey] || NICHE_CREATORS.deen;

    const allVideos: InstagramVideoExample[] = [];

    // 1. Fetch from NICHE-SPECIFIC creators
    console.log(`[Instagram] Fetching from ${nicheCreators.length} niche creators:`, nicheCreators);
    for (const username of nicheCreators.slice(0, 3)) {
        try {
            const videos = await fetchUserReels(username);
            allVideos.push(...videos);
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.error(`[Instagram] Error fetching niche creator @${username}:`, error);
        }
    }

    // 2. Fetch from GENERAL creators (will be AI-filtered later)
    console.log(`[Instagram] Fetching from ${GENERAL_CREATORS.length} general creators`);
    for (const username of GENERAL_CREATORS.slice(0, 2)) {
        try {
            const videos = await fetchUserReels(username);
            allVideos.push(...videos);
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.error(`[Instagram] Error fetching general creator @${username}:`, error);
        }
    }

    console.log(`[Instagram] Total videos collected before filtering: ${allVideos.length}`);

    // Deduplicate by ID
    const seenIds = new Set<string>();
    const uniqueVideos = allVideos.filter(v => {
        if (seenIds.has(v.id)) return false;
        seenIds.add(v.id);
        return true;
    });

    console.log(`[Instagram] Unique videos: ${uniqueVideos.length}`);

    // 3. USE AI TO CLASSIFY ALL VIDEOS - only keep ones truly relevant to the niche
    console.log(`[Instagram] Running AI classification for "${nicheKey}" niche...`);
    const nicheRelevantVideos = await classifyVideosWithAI(uniqueVideos, nicheKey);

    console.log(`[Instagram] After AI classification: ${nicheRelevantVideos.length} videos are relevant to "${nicheKey}"`);

    // Sort by views (highest first) and take top 8
    const sortedVideos = nicheRelevantVideos
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
