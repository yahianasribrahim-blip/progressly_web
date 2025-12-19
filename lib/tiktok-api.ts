// TikTok API Integration using Woop "TikTok Most Trending and Viral Content" API

// API Configuration
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "f278804a40mshe80b9aa07df21a1p1f6e3ejsn89a14ca0342c";

// NEW: Woop Trending API - supports date filtering for recent videos (last 1-7 days)
const WOOP_API_HOST = "tiktok-most-trending-and-viral-content.p.rapidapi.com";

// OLD: TikTok Scraper API - kept for video download functionality in deepgram-transcription.ts
const SCRAPER_API_HOST = "tiktok-scraper2.p.rapidapi.com";

// Hashtags to query for each niche
export const NICHE_HASHTAGS: Record<string, string[]> = {
    hijab: ["hijabtutorial", "hijabstyle", "modestfashion", "hijabfashion", "muslimfashion"],
    deen: ["islamicreminders", "muslim", "quran", "islamicquotes", "deenoverdunya"],
    cultural: ["ramadan", "eid", "muslimlife", "muslimculture", "eidmubarak"],
    food: ["halalfood", "halaleats", "iftarrecipes", "muslimfoodie", "halalrecipes"],
    gym: ["muslimfitness", "hijabifitness", "modestworkout", "fitmuslimah", "ramadanfitness"],
    pets: ["muslimswithcats", "catsofislam", "catlovers", "muslimcat", "petsofmuslims"],
    storytelling: ["storytime", "muslimstory", "revertmuslim", "myjourney", "islamicstories"],
};

// Words to filter out - videos with these in descriptions are excluded
const INAPPROPRIATE_KEYWORDS = [
    // Romantic/explicit themes
    "love song", "sexy", "hot girl", "hot boy", "kiss", "romance", "boyfriend", "girlfriend",
    "bae", "dating", "hookup", "crush", "flirting", "nsfw", "18+", "explicit",
    // Drugs/alcohol
    "weed", "420", "drunk", "alcohol", "beer", "wine", "party", "high af", "stoned",
    "molly", "xanax", "drugs", "smoke", "blunt", "joints",
    // Violence
    "kill", "murder", "blood", "fight", "gang", "gun", "shoot", "violence", "death",
    // Profanity (common ones)
    "wtf", "af", "fck", "f*ck", "sh*t", "b*tch", "damn", "hell yeah",
    // Other inappropriate
    "thirst trap", "body count", "situationship", "fwb",
];

// Check if video content is appropriate for Muslim creators
function isContentAppropriate(description: string): boolean {
    if (!description) return true;
    const lowerDesc = description.toLowerCase();
    return !INAPPROPRIATE_KEYWORDS.some(keyword => lowerDesc.includes(keyword.toLowerCase()));
}

interface TikTokVideo {
    id: string;
    desc: string;
    createTime: number;
    video: {
        duration: number;
        cover: string;
        playAddr: string;
    };
    author: {
        uniqueId: string;
        nickname: string;
        avatarThumb: string;
    };
    stats: {
        playCount: number;
        diggCount: number;
        commentCount: number;
        shareCount: number;
    };
}

interface HashtagInfo {
    id: string;
    title: string;
    desc: string;
    videoCount: number;
    viewCount: number;
}

export interface TrendingHashtag {
    tag: string;
    viewCount: number;
    videoCount: number;
    category: "Broad" | "Medium" | "Niche";
}

export interface TrendingHook {
    id: string;
    text: string;
    engagement: "Low" | "Medium" | "High";
    platform: "TikTok";
    views: number;
    likes: number;
}

export interface VideoExample {
    id: string;
    thumbnail: string;
    creator: string;
    creatorAvatar: string;
    platform: "TikTok";
    views: string;
    url: string;
    description: string;
    duration: number;
    daysAgo?: number | null; // NEW: How old is the video
}

export interface VideoFormat {
    id: string;
    name: string;
    averageLength: string;
    whyItWorks: string;
    popularity: number;
}

// =============================================================================
// NEW: Woop API - Fetch trending videos with date filtering (last 7 days)
// =============================================================================

// Niche to TikTok category mapping for the Woop API
const NICHE_CATEGORY_MAP: Record<string, number | null> = {
    hijab: 96,        // Lifestyle
    deen: 199,        // Faith & Spirituality (or null for no category filter)
    cultural: 96,     // Lifestyle
    food: 100,        // Food & Drink
    gym: 107,         // Sports & Outdoor
    pets: 108,        // Animals
    storytelling: 90, // Entertainment
};

interface WoopVideoResponse {
    id: string;
    desc: string;
    createTime: number;
    duration: number;
    coverUrl: string;
    playUrl: string;
    playCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    authorUniqueId: string;
}

// Fetch trending videos using Woop API with date filtering
async function fetchTrendingVideos(niche: string, count: number = 30): Promise<TikTokVideo[]> {
    console.log("Fetching trending videos from Woop API for niche:", niche);
    console.log("Using RAPIDAPI_KEY starting with:", RAPIDAPI_KEY?.substring(0, 10) + "...");

    if (!RAPIDAPI_KEY) {
        console.error("RAPIDAPI_KEY is not set");
        return [];
    }

    try {
        // Build URL with parameters
        // - sorting: "rise" = videos with biggest daily rise in views
        // - days: 7 = only videos from last 7 days
        // - order: "desc" = highest rise first
        const params = new URLSearchParams({
            sorting: "rise",      // Sort by daily view rise
            days: "7",            // Only last 7 days - THIS IS THE KEY IMPROVEMENT!
            order: "desc",        // Highest first
        });

        // Add category filter if available for this niche
        const category = NICHE_CATEGORY_MAP[niche.toLowerCase()];
        if (category) {
            params.append("category", category.toString());
        }

        const url = `https://${WOOP_API_HOST}/video?${params.toString()}`;
        console.log("Fetching from Woop API:", url);

        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": WOOP_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            console.error(`Woop API error: ${response.status} - ${errorText}`);
            return [];
        }

        const data = await response.json();
        console.log("Woop API response keys:", Object.keys(data));
        console.log("Sample response:", JSON.stringify(data).substring(0, 500));

        // Map Woop API response to our TikTokVideo interface
        const videos: TikTokVideo[] = [];
        const rawVideos = data.data || data.videos || data || [];

        if (Array.isArray(rawVideos)) {
            for (const v of rawVideos.slice(0, count)) {
                try {
                    // Map the response - exact field names may need adjustment based on actual API response
                    videos.push({
                        id: v.id || v.videoId || "",
                        desc: v.desc || v.description || v.title || "",
                        createTime: v.createTime || v.created_at || Math.floor(Date.now() / 1000),
                        video: {
                            duration: v.duration || v.videoDuration || 0,
                            cover: v.coverUrl || v.cover || v.thumbnail || "",
                            playAddr: v.playUrl || v.videoUrl || "",
                        },
                        author: {
                            uniqueId: v.authorUniqueId || v.author?.uniqueId || v.username || "creator",
                            nickname: v.authorName || v.author?.nickname || v.displayName || "Creator",
                            avatarThumb: v.authorAvatar || v.author?.avatarThumb || "",
                        },
                        stats: {
                            playCount: v.playCount || v.views || v.stats?.playCount || 0,
                            diggCount: v.likeCount || v.likes || v.stats?.diggCount || 0,
                            commentCount: v.commentCount || v.comments || v.stats?.commentCount || 0,
                            shareCount: v.shareCount || v.shares || v.stats?.shareCount || 0,
                        },
                    });
                } catch (mapError) {
                    console.warn("Error mapping video:", mapError);
                }
            }
        }

        console.log(`Woop API returned ${videos.length} videos`);
        return videos;
    } catch (error) {
        console.error("Error fetching from Woop API:", error);
        return [];
    }
}

// =============================================================================
// OLD: TikTok Scraper API - kept for backward compatibility / fallback
// =============================================================================

// Fetch info about a hashtag (returns ID and stats) - uses OLD scraper API
async function fetchHashtagInfo(hashtag: string): Promise<HashtagInfo | null> {
    console.log("[Fallback] Using RAPIDAPI_KEY starting with:", RAPIDAPI_KEY?.substring(0, 10) + "...");

    if (!RAPIDAPI_KEY) {
        console.error("RAPIDAPI_KEY is not set");
        return null;
    }

    try {
        const url = `https://${SCRAPER_API_HOST}/hashtag/info?hashtag=${encodeURIComponent(hashtag)}`;
        console.log("Fetching hashtag info:", url);

        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            next: { revalidate: 0 },
            headers: {
                "x-rapidapi-host": SCRAPER_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            console.error(`Failed to fetch hashtag info: ${response.status} - ${errorText}`);

            // If rate limited, wait and retry once
            if (response.status === 429) {
                console.log("Rate limited, waiting 2 seconds...");
                await new Promise(resolve => setTimeout(resolve, 2000));
                return fetchHashtagInfo(hashtag);
            }
            return null;
        }

        const data = await response.json();
        console.log("Hashtag info response:", JSON.stringify(data).substring(0, 300));


        // Extract hashtag info from response
        const challengeInfo = data.data?.challenge || data.challengeInfo?.challenge || data.data || data;

        return {
            id: challengeInfo.id || challengeInfo.cid || "",
            title: challengeInfo.title || challengeInfo.name || hashtag,
            desc: challengeInfo.desc || "",
            videoCount: challengeInfo.stats?.videoCount || challengeInfo.videoCount || 0,
            viewCount: challengeInfo.stats?.viewCount || challengeInfo.viewCount || 0,
        };
    } catch (error) {
        console.error("Error fetching hashtag info:", error);
        return null;
    }
}

// Fetch videos for a specific hashtag using its ID
async function fetchHashtagVideos(hashtagId: string, count: number = 20): Promise<TikTokVideo[]> {
    if (!RAPIDAPI_KEY) {
        console.error("RAPIDAPI_KEY is not set");
        return [];
    }

    try {
        const url = `https://${SCRAPER_API_HOST}/hashtag/videos?hashtag_id=${hashtagId}&count=${count}`;
        console.log("Fetching hashtag videos:", url);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "x-rapidapi-host": SCRAPER_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
            },
        });

        if (!response.ok) {
            console.error(`Failed to fetch hashtag videos: ${response.status}`);
            return [];
        }

        const data = await response.json();
        console.log("Hashtag videos response keys:", Object.keys(data));

        // Try different response structures
        const videos = data.data?.videos || data.itemList || data.data || [];
        console.log("Found", videos.length, "videos");

        return videos;
    } catch (error) {
        console.error("Error fetching hashtag videos:", error);
        return [];
    }
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

// Determine engagement level based on stats
function getEngagementLevel(video: TikTokVideo): "Low" | "Medium" | "High" {
    const engagementRate =
        (video.stats.diggCount + video.stats.commentCount + video.stats.shareCount) /
        Math.max(video.stats.playCount, 1);

    if (engagementRate > 0.1) return "High";
    if (engagementRate > 0.05) return "Medium";
    return "Low";
}

// Categorize hashtag by reach
function categorizeHashtag(viewCount: number): "Broad" | "Medium" | "Niche" {
    if (viewCount >= 1000000000) return "Broad"; // 1B+ views
    if (viewCount >= 100000000) return "Medium"; // 100M+ views
    return "Niche"; // Under 100M views
}

// Extract hook from video description - just the catchy opening line
function extractHook(description: string): string {
    if (!description) return "";

    // Remove hashtags
    let cleaned = description.replace(/#\w+/g, "").trim();

    // Remove emojis at the start (common in TikTok) - simplified pattern
    cleaned = cleaned.replace(/^[\s🎉🎊🔥💯✨🙏❤️💕🥰😍😊]+/, "");

    // Get the first sentence or first line
    const firstLine = cleaned.split(/[.\n!?]/)[0]?.trim();

    if (!firstLine || firstLine.length < 5) {
        // If too short, get more content
        const fallback = cleaned.substring(0, 80).trim();
        return fallback.length > 60 ? fallback.substring(0, 57) + "..." : fallback;
    }

    // Clean up and limit length
    if (firstLine.length <= 80) return firstLine;
    return firstLine.substring(0, 77) + "...";
}

// Analyze video format/duration patterns
function analyzeVideoFormats(videos: TikTokVideo[]): VideoFormat[] {
    const durationBuckets: Record<string, { count: number; totalViews: number }> = {
        "0-15": { count: 0, totalViews: 0 },
        "15-30": { count: 0, totalViews: 0 },
        "30-60": { count: 0, totalViews: 0 },
        "60-180": { count: 0, totalViews: 0 },
        "180+": { count: 0, totalViews: 0 },
    };

    videos.forEach((video) => {
        const duration = video.video?.duration || 0;
        let bucket: string;

        if (duration <= 15) bucket = "0-15";
        else if (duration <= 30) bucket = "15-30";
        else if (duration <= 60) bucket = "30-60";
        else if (duration <= 180) bucket = "60-180";
        else bucket = "180+";

        durationBuckets[bucket].count++;
        durationBuckets[bucket].totalViews += video.stats?.playCount || 0;
    });

    const formats: VideoFormat[] = [
        {
            id: "f1",
            name: "Quick Hook (0-15 seconds)",
            averageLength: "7-15 seconds",
            whyItWorks: "Captures attention immediately. Perfect for single tips, quick tutorials, or punchy reminders. High completion rate drives algorithm boost.",
            popularity: durationBuckets["0-15"].count,
        },
        {
            id: "f2",
            name: "Short Form (15-30 seconds)",
            averageLength: "15-30 seconds",
            whyItWorks: "Sweet spot for storytelling with a hook. Enough time to deliver value without losing viewers. Popular for tutorials and tips.",
            popularity: durationBuckets["15-30"].count,
        },
        {
            id: "f3",
            name: "Standard (30-60 seconds)",
            averageLength: "30-60 seconds",
            whyItWorks: "Ideal for step-by-step content, detailed explanations, or mini vlogs. Builds connection while maintaining engagement.",
            popularity: durationBuckets["30-60"].count,
        },
        {
            id: "f4",
            name: "Extended (1-3 minutes)",
            averageLength: "1-3 minutes",
            whyItWorks: "For deeper storytelling, comprehensive tutorials, or GRWM content. Builds stronger parasocial connection with viewers.",
            popularity: durationBuckets["60-180"].count,
        },
        {
            id: "f5",
            name: "Long Form (3+ minutes)",
            averageLength: "3+ minutes",
            whyItWorks: "TikTok is pushing longer content. Great for detailed tutorials, story times, and in-depth discussions.",
            popularity: durationBuckets["180+"].count,
        },
    ];

    // Sort by popularity
    return formats.sort((a, b) => b.popularity - a.popularity);
}

// Main function to analyze a niche
export async function analyzeNiche(niche: string): Promise<{
    hooks: TrendingHook[]; // For backwards compatibility - will be merged
    captions: TrendingHook[]; // Viral captions from video descriptions
    spokenHooks: TrendingHook[]; // Actual spoken hooks from transcription
    hashtags: TrendingHashtag[];
    formats: VideoFormat[];
    examples: VideoExample[];
    benchmark: { viewRange: string; timeframe: string };
}> {
    const nicheKey = niche.toLowerCase();
    const hashtags = NICHE_HASHTAGS[nicheKey] || NICHE_HASHTAGS.deen;

    // USE MOCK DATA - set to true to bypass API issues
    const USE_MOCK_DATA = false;

    if (USE_MOCK_DATA) {
        console.log("Using mock data for niche:", nicheKey);
        return getMockDataForNiche(nicheKey, hashtags);
    }

    // Collect all videos and hashtag info
    const allVideos: TikTokVideo[] = [];
    const hashtagStats: TrendingHashtag[] = [];

    // =========================================================================
    // NEW: Use Woop API to get trending videos from last 7 days
    // =========================================================================
    console.log("=== USING NEW WOOP API (date-filtered) ===");
    const woopVideos = await fetchTrendingVideos(nicheKey, 30);
    allVideos.push(...woopVideos);
    console.log(`Got ${woopVideos.length} videos from Woop API (already filtered to last 7 days)`);

    // If Woop API failed or returned too few videos, fall back to old hashtag approach
    if (woopVideos.length < 5) {
        console.log("Woop API returned too few videos, trying hashtag fallback...");
        const hashtagsToQuery = hashtags.slice(0, 2);

        for (const hashtag of hashtagsToQuery) {
            console.log(`[Fallback] Processing hashtag: ${hashtag}`);
            const info = await fetchHashtagInfo(hashtag);

            if (info && info.id) {
                console.log(`[Fallback] Got hashtag ID: ${info.id} for ${hashtag}`);
                hashtagStats.push({
                    tag: hashtag,
                    viewCount: info.viewCount || 0,
                    videoCount: info.videoCount || 0,
                    category: categorizeHashtag(info.viewCount || 0),
                });

                const videos = await fetchHashtagVideos(info.id, 20);
                console.log(`[Fallback] Fetched ${videos.length} videos for #${hashtag}`);
                allVideos.push(...videos);
            }
        }
    }

    // Generate hashtag stats for display (using predefined niche hashtags)
    if (hashtagStats.length === 0) {
        hashtags.forEach((tag, index) => {
            hashtagStats.push({
                tag,
                viewCount: 0, // Will be populated if we add hashtag stats API later
                videoCount: 0,
                category: index < 2 ? "Broad" : index < 4 ? "Medium" : "Niche",
            });
        });
    }

    // Calculate timestamps for filtering
    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

    console.log("Current timestamp:", now, "= ", new Date().toISOString());
    console.log("7 days ago:", sevenDaysAgo, "= ", new Date(sevenDaysAgo * 1000).toISOString());

    // CRITICAL: Deduplicate videos by ID (same video can appear in multiple hashtags)
    const seenVideoIds = new Set<string>();
    const uniqueAllVideos = allVideos.filter(v => {
        if (!v.id || seenVideoIds.has(v.id)) {
            return false;
        }
        seenVideoIds.add(v.id);
        return true;
    });
    console.log(`Deduplicated: ${allVideos.length} → ${uniqueAllVideos.length} unique videos (removed ${allVideos.length - uniqueAllVideos.length} duplicates)`);

    // Start with all valid videos and add date info
    const validVideos = uniqueAllVideos
        .filter((v) => v.stats?.playCount)
        .filter((v) => isContentAppropriate(v.desc))
        .map(v => {
            const createDate = v.createTime ? new Date(v.createTime * 1000) : null;
            const daysAgo = v.createTime ? Math.floor((now - v.createTime) / (24 * 60 * 60)) : null;
            return { ...v, _createDate: createDate, _daysAgo: daysAgo };
        });

    // Log video dates for debugging
    console.log("=== VIDEO DATES ===");
    validVideos.slice(0, 10).forEach((v, i) => {
        console.log(`Video ${i + 1}: ${v._daysAgo} days ago, ${v.stats?.playCount} views, "${v.desc?.substring(0, 30)}..."`);
    });

    // STRICT: First try to get videos from last 7 days ONLY
    let sortedVideos = validVideos
        .filter(v => v.createTime && v.createTime >= sevenDaysAgo)
        .sort((a, b) => (b.stats?.playCount || 0) - (a.stats?.playCount || 0));

    console.log(`Videos from last 7 days: ${sortedVideos.length}`);

    // If not enough from 7 days, try 30 days
    if (sortedVideos.length < 8) {
        console.log("Not enough from 7 days, trying 30 days...");
        sortedVideos = validVideos
            .filter(v => v.createTime && v.createTime >= thirtyDaysAgo)
            .sort((a, b) => (b.stats?.playCount || 0) - (a.stats?.playCount || 0));
        console.log(`Videos from last 30 days: ${sortedVideos.length}`);
    }

    // If STILL not enough, try 90 days MAX - no older than this
    const ninetyDaysAgo = now - (90 * 24 * 60 * 60);
    if (sortedVideos.length < 8) {
        console.log("Not enough from 30 days, trying 90 days MAX...");
        sortedVideos = validVideos
            .filter(v => v.createTime && v.createTime >= ninetyDaysAgo)
            .sort((a, b) => (b.stats?.playCount || 0) - (a.stats?.playCount || 0));
        console.log(`Videos from last 90 days: ${sortedVideos.length}`);
    }

    // If STILL not enough, use all but log the issue
    if (sortedVideos.length < 8) {
        console.warn("WARNING: Not enough recent videos! API may not be returning createTime.");
        // Log what dates we're seeing
        const videosWithDates = validVideos.filter(v => v.createTime);
        const videosWithoutDates = validVideos.filter(v => !v.createTime);
        console.log(`Videos WITH createTime: ${videosWithDates.length}, WITHOUT: ${videosWithoutDates.length}`);
        if (videosWithDates.length > 0) {
            console.log("Sample dates:", videosWithDates.slice(0, 3).map(v => ({
                daysAgo: v._daysAgo,
                date: v._createDate?.toISOString(),
            })));
        }
        // Prefer videos with dates, then fill with those without
        sortedVideos = [...videosWithDates, ...videosWithoutDates]
            .sort((a, b) => (b.stats?.playCount || 0) - (a.stats?.playCount || 0));
    }

    // Now apply view threshold on top of date-filtered videos
    const viewThresholds = [50000, 10000, 1000, 0];
    let finalVideos: typeof sortedVideos = [];

    for (const threshold of viewThresholds) {
        finalVideos = sortedVideos.filter(v => (v.stats?.playCount || 0) >= threshold);
        if (finalVideos.length >= 8) {
            console.log(`Found ${finalVideos.length} videos with ${threshold}+ views`);
            break;
        }
    }

    // Use whatever we have
    if (finalVideos.length < 8) {
        finalVideos = sortedVideos;
        console.log("Using all date-filtered videos:", finalVideos.length);
    }

    console.log("=== FINAL VIDEOS ===");
    console.log("Total raw videos:", allVideos.length);
    console.log("Valid videos:", validVideos.length);
    console.log("Final videos to display:", finalVideos.length);
    console.log("Top video:", finalVideos[0]?.stats?.playCount, "views,", finalVideos[0]?._daysAgo, "days ago");

    // Use finalVideos from here on
    const sortedVideosFinal = finalVideos;

    // Log first few video descriptions WITH DATES
    sortedVideosFinal.slice(0, 5).forEach((v, i) => {
        console.log(`Video ${i + 1}: ${v.stats?.playCount} views, ${v._daysAgo} days old, "${v.desc?.substring(0, 50)}..."`);
    });

    // Import transcription service dynamically to avoid circular deps
    const { getSpokenHooksFromVideos } = await import("./deepgram-transcription");

    // ALWAYS get caption-based hooks from video descriptions (these are "Viral Captions")
    // Use ONLY videos from sortedVideosFinal (the ones we're showing)
    console.log("Extracting viral captions from the DISPLAYED videos...");
    const captions: TrendingHook[] = sortedVideosFinal
        .slice(0, 8) // Only from the videos we're actually showing
        .filter((v) => v.desc && v.desc.length > 10)
        .map((video, index) => ({
            id: `c${index + 1}`,
            text: extractHook(video.desc),
            engagement: getEngagementLevel(video),
            platform: "TikTok" as const,
            views: video.stats.playCount,
            likes: video.stats.diggCount,
        }))
        .filter(c => c.text.length > 15); // Filter out very short captions

    console.log(`Got ${captions.length} viral captions from displayed videos`);

    // Try HARDER to get SPOKEN hooks - process ONLY the videos we're showing
    console.log("Attempting to transcribe spoken hooks from displayed videos...");
    let spokenHooks: TrendingHook[] = [];

    try {
        const rawSpokenHooks = await getSpokenHooksFromVideos(sortedVideosFinal.slice(0, 8), 8);

        if (rawSpokenHooks.length > 0) {
            console.log(`Got ${rawSpokenHooks.length} spoken hooks from transcription!`);
            spokenHooks = rawSpokenHooks.map(h => ({
                id: h.id,
                text: h.text,
                engagement: h.engagement,
                platform: h.platform,
                views: h.views,
                likes: h.likes,
            }));
        }
    } catch (error) {
        console.error("Transcription failed:", error);
    }

    console.log(`Final: ${captions.length} captions, ${spokenHooks.length} spoken hooks`);

    // Deduplicate hooks by text (case-insensitive)
    const seenHookTexts = new Set<string>();
    const deduplicateHooks = <T extends { text: string }>(hooks: T[]): T[] => {
        return hooks.filter(h => {
            const normalized = h.text.toLowerCase().trim();
            if (seenHookTexts.has(normalized) || normalized.length < 25) {
                return false;
            }
            seenHookTexts.add(normalized);
            return true;
        });
    };

    const uniqueCaptions = deduplicateHooks(captions);
    const uniqueSpokenHooks = deduplicateHooks(spokenHooks);

    console.log(`After dedup: ${uniqueCaptions.length} captions, ${uniqueSpokenHooks.length} spoken hooks`);

    // Merged hooks for backwards compatibility (spoken hooks first, then captions as fallback)
    const mergedHooks = uniqueSpokenHooks.length > 0
        ? [...uniqueSpokenHooks, ...uniqueCaptions.slice(0, 5 - uniqueSpokenHooks.length)]
        : uniqueCaptions;

    // Create video examples (return 8 for Pro users) - USE sortedVideosFinal
    const examples: VideoExample[] = sortedVideosFinal.slice(0, 8).map((video) => ({
        id: video.id,
        thumbnail: video.video?.cover || "/api/placeholder/320/180",
        creator: `@${video.author?.uniqueId || "creator"}`,
        creatorAvatar: video.author?.avatarThumb || "",
        platform: "TikTok" as const,
        views: formatViewCount(video.stats?.playCount || 0),
        url: `https://www.tiktok.com/@${video.author?.uniqueId}/video/${video.id}`,
        description: video.desc,
        duration: video.video?.duration || 0,
        daysAgo: video._daysAgo, // NEW: Pass video age
    }));

    // Analyze video formats from the displayed videos
    const formats = analyzeVideoFormats(sortedVideosFinal);

    // Calculate benchmark based on actual data from displayed videos
    const viewCounts = sortedVideosFinal.map((v) => v.stats?.playCount || 0);
    const medianViews = viewCounts.length > 0
        ? viewCounts[Math.floor(viewCounts.length / 2)]
        : 10000;

    const lowRange = Math.floor(medianViews * 0.3);
    const highRange = Math.floor(medianViews * 1.5);

    return {
        hooks: mergedHooks.length > 0 ? mergedHooks : getDefaultHooks(nicheKey),
        captions: captions.slice(0, 10), // Top 10 viral captions
        spokenHooks: spokenHooks.slice(0, 5), // Top 5 spoken hooks (if any)
        hashtags: hashtagStats,
        formats: formats.slice(0, 3), // Top 3 formats
        examples,
        benchmark: {
            viewRange: `${formatViewCount(lowRange)}–${formatViewCount(highRange)}`,
            timeframe: "48–72 hours",
        },
    };
}

// Fallback hooks if API returns no data
function getDefaultHooks(niche: string): TrendingHook[] {
    const defaultHooks: Record<string, TrendingHook[]> = {
        hijab: [
            { id: "h1", text: "This hijab style changed everything", engagement: "High", platform: "TikTok", views: 0, likes: 0 },
            { id: "h2", text: "3 styles you need to try", engagement: "High", platform: "TikTok", views: 0, likes: 0 },
            { id: "h3", text: "POV: You finally found your style", engagement: "Medium", platform: "TikTok", views: 0, likes: 0 },
        ],
        deen: [
            { id: "h1", text: "This verse changed my perspective", engagement: "High", platform: "TikTok", views: 0, likes: 0 },
            { id: "h2", text: "Reminder for those who need it", engagement: "High", platform: "TikTok", views: 0, likes: 0 },
            { id: "h3", text: "The Prophet ﷺ said...", engagement: "Medium", platform: "TikTok", views: 0, likes: 0 },
        ],
        default: [
            { id: "h1", text: "This changed everything for me", engagement: "High", platform: "TikTok", views: 0, likes: 0 },
            { id: "h2", text: "Things I wish I knew sooner", engagement: "High", platform: "TikTok", views: 0, likes: 0 },
            { id: "h3", text: "POV: You figured it out", engagement: "Medium", platform: "TikTok", views: 0, likes: 0 },
        ],
    };

    return defaultHooks[niche] || defaultHooks.default;
}

// Mock data for when API is unavailable
function getMockDataForNiche(niche: string, nicheHashtags: string[]): {
    hooks: TrendingHook[];
    captions: TrendingHook[];
    spokenHooks: TrendingHook[];
    hashtags: TrendingHashtag[];
    formats: VideoFormat[];
    examples: VideoExample[];
    benchmark: { viewRange: string; timeframe: string };
} {
    const mockHooks: Record<string, TrendingHook[]> = {
        hijab: [
            { id: "h1", text: "This hijab style changed my whole look", engagement: "High", platform: "TikTok", views: 2400000, likes: 189000 },
            { id: "h2", text: "3 easy styles for beginners", engagement: "High", platform: "TikTok", views: 1800000, likes: 145000 },
            { id: "h3", text: "POV: You finally found the perfect wrap", engagement: "Medium", platform: "TikTok", views: 950000, likes: 78000 },
            { id: "h4", text: "Wait til the end for the best one", engagement: "High", platform: "TikTok", views: 3100000, likes: 265000 },
            { id: "h5", text: "Tutorial you didn't know you needed", engagement: "Medium", platform: "TikTok", views: 720000, likes: 54000 },
        ],
        deen: [
            { id: "h1", text: "This verse changed my perspective on everything", engagement: "High", platform: "TikTok", views: 3200000, likes: 289000 },
            { id: "h2", text: "A reminder for those who need it today", engagement: "High", platform: "TikTok", views: 2100000, likes: 178000 },
            { id: "h3", text: "The Prophet ﷺ said something beautiful", engagement: "Medium", platform: "TikTok", views: 1500000, likes: 134000 },
            { id: "h4", text: "Story time: How Islam found me", engagement: "High", platform: "TikTok", views: 4500000, likes: 356000 },
            { id: "h5", text: "This dua works every time", engagement: "High", platform: "TikTok", views: 2800000, likes: 223000 },
        ],
        food: [
            { id: "h1", text: "This recipe will change your life", engagement: "High", platform: "TikTok", views: 5200000, likes: 412000 },
            { id: "h2", text: "POV: You're making halal comfort food", engagement: "High", platform: "TikTok", views: 3100000, likes: 267000 },
            { id: "h3", text: "Wait for the cheese pull", engagement: "Medium", platform: "TikTok", views: 1900000, likes: 156000 },
            { id: "h4", text: "Secret ingredient no one talks about", engagement: "High", platform: "TikTok", views: 2700000, likes: 198000 },
            { id: "h5", text: "Making this for iftar tonight", engagement: "Medium", platform: "TikTok", views: 890000, likes: 72000 },
        ],
        gym: [
            { id: "h1", text: "This workout transformed my body in 30 days", engagement: "High", platform: "TikTok", views: 4100000, likes: 334000 },
            { id: "h2", text: "Modest gym fit check", engagement: "Medium", platform: "TikTok", views: 1200000, likes: 98000 },
            { id: "h3", text: "Ramadan workout routine that actually works", engagement: "High", platform: "TikTok", views: 2800000, likes: 245000 },
            { id: "h4", text: "Form check: Are you doing this wrong?", engagement: "Medium", platform: "TikTok", views: 980000, likes: 67000 },
            { id: "h5", text: "POV: You're finally consistent", engagement: "High", platform: "TikTok", views: 1600000, likes: 134000 },
        ],
        cultural: [
            { id: "h1", text: "Ramadan traditions you need to try", engagement: "High", platform: "TikTok", views: 3800000, likes: 312000 },
            { id: "h2", text: "POV: It's Eid morning", engagement: "High", platform: "TikTok", views: 5600000, likes: 467000 },
            { id: "h3", text: "Things only Muslims understand", engagement: "Medium", platform: "TikTok", views: 2100000, likes: 178000 },
            { id: "h4", text: "Get ready with me for Eid", engagement: "High", platform: "TikTok", views: 4200000, likes: 356000 },
            { id: "h5", text: "Our family iftar tradition", engagement: "Medium", platform: "TikTok", views: 1400000, likes: 112000 },
        ],
        pets: [
            { id: "h1", text: "My cat doing the most Muslim thing ever", engagement: "High", platform: "TikTok", views: 6200000, likes: 523000 },
            { id: "h2", text: "POV: Your cat heard the adhan", engagement: "High", platform: "TikTok", views: 4100000, likes: 378000 },
            { id: "h3", text: "Cat vs prayer mat compilation", engagement: "Medium", platform: "TikTok", views: 2300000, likes: 189000 },
            { id: "h4", text: "The Prophet ﷺ loved cats and now I see why", engagement: "High", platform: "TikTok", views: 3500000, likes: 298000 },
            { id: "h5", text: "My cat's reaction to Quran", engagement: "High", platform: "TikTok", views: 5800000, likes: 489000 },
        ],
        storytelling: [
            { id: "h1", text: "Story time: How I became Muslim", engagement: "High", platform: "TikTok", views: 7200000, likes: 612000 },
            { id: "h2", text: "The day everything changed for me", engagement: "High", platform: "TikTok", views: 4500000, likes: 389000 },
            { id: "h3", text: "POV: You're about to hear something beautiful", engagement: "Medium", platform: "TikTok", views: 2100000, likes: 178000 },
            { id: "h4", text: "My journey wasn't easy but worth it", engagement: "High", platform: "TikTok", views: 3800000, likes: 334000 },
            { id: "h5", text: "This story will make you cry", engagement: "High", platform: "TikTok", views: 5100000, likes: 445000 },
        ],
    };

    const hooks = mockHooks[niche] || mockHooks.deen;

    const hashtags: TrendingHashtag[] = nicheHashtags.map((tag, i) => ({
        tag,
        viewCount: [2500000000, 890000000, 450000000, 120000000, 45000000][i] || 45000000,
        videoCount: [1200000, 450000, 230000, 89000, 34000][i] || 34000,
        category: i === 0 ? "Broad" : i < 3 ? "Medium" : "Niche",
    }));

    const formats: VideoFormat[] = [
        { id: "f1", name: "Quick Hook (0-15 seconds)", averageLength: "7-15 seconds", whyItWorks: "Captures attention immediately. Perfect for single tips, quick tutorials, or punchy reminders.", popularity: 45 },
        { id: "f2", name: "Short Form (15-30 seconds)", averageLength: "15-30 seconds", whyItWorks: "Sweet spot for storytelling with a hook. Enough time to deliver value without losing viewers.", popularity: 35 },
        { id: "f3", name: "Standard (30-60 seconds)", averageLength: "30-60 seconds", whyItWorks: "Ideal for step-by-step content, detailed explanations, or mini vlogs.", popularity: 20 },
    ];

    return {
        hooks,
        captions: hooks, // In mock mode, use same data for captions
        spokenHooks: hooks.slice(0, 3), // Use first 3 as "spoken hooks"
        hashtags,
        formats,
        examples: [], // No examples in mock mode
        benchmark: {
            viewRange: "50K–500K",
            timeframe: "48–72 hours",
        },
    };
}
