// TikTok API Integration using RapidAPI TikTok Scraper

// TEMPORARY: Hardcoded for testing - move back to env var later
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "f278804a40mshe80b9aa07df21a1p1f6e3ejsn89a14ca0342c";
const RAPIDAPI_HOST = "tiktok-scraper2.p.rapidapi.com";

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
}

export interface VideoFormat {
    id: string;
    name: string;
    averageLength: string;
    whyItWorks: string;
    popularity: number;
}

// Fetch info about a hashtag (returns ID and stats)
async function fetchHashtagInfo(hashtag: string): Promise<HashtagInfo | null> {
    console.log("Using RAPIDAPI_KEY starting with:", RAPIDAPI_KEY?.substring(0, 10) + "...");

    if (!RAPIDAPI_KEY) {
        console.error("RAPIDAPI_KEY is not set");
        return null;
    }

    try {
        const url = `https://${RAPIDAPI_HOST}/hashtag/info?hashtag=${encodeURIComponent(hashtag)}`;
        console.log("Fetching hashtag info:", url);

        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            next: { revalidate: 0 },
            headers: {
                "x-rapidapi-host": RAPIDAPI_HOST,
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
        const url = `https://${RAPIDAPI_HOST}/hashtag/videos?hashtag_id=${hashtagId}&count=${count}`;
        console.log("Fetching hashtag videos:", url);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "x-rapidapi-host": RAPIDAPI_HOST,
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
    hooks: TrendingHook[];
    hashtags: TrendingHashtag[];
    formats: VideoFormat[];
    examples: VideoExample[];
    benchmark: { viewRange: string; timeframe: string };
}> {
    const nicheKey = niche.toLowerCase();
    const hashtags = NICHE_HASHTAGS[nicheKey] || NICHE_HASHTAGS.deen;

    // USE MOCK DATA - set to true to bypass API issues
    const USE_MOCK_DATA = true;

    if (USE_MOCK_DATA) {
        console.log("Using mock data for niche:", nicheKey);
        return getMockDataForNiche(nicheKey, hashtags);
    }

    // Collect all videos and hashtag info
    const allVideos: TikTokVideo[] = [];
    const hashtagStats: TrendingHashtag[] = [];

    // Fetch data for each hashtag (limit to 2 to conserve API calls)
    const hashtagsToQuery = hashtags.slice(0, 2);

    for (const hashtag of hashtagsToQuery) {
        console.log(`Processing hashtag: ${hashtag}`);

        // First, fetch hashtag info to get the ID
        const info = await fetchHashtagInfo(hashtag);

        if (info && info.id) {
            console.log(`Got hashtag ID: ${info.id} for ${hashtag}`);

            // Add to hashtag stats
            hashtagStats.push({
                tag: hashtag,
                viewCount: info.viewCount || 0,
                videoCount: info.videoCount || 0,
                category: categorizeHashtag(info.viewCount || 0),
            });

            // Now fetch videos using the ID
            const videos = await fetchHashtagVideos(info.id, 15);
            allVideos.push(...videos);
        } else {
            console.log(`Could not get info for hashtag: ${hashtag}`);
            // Still add to stats with zero values
            hashtagStats.push({
                tag: hashtag,
                viewCount: 0,
                videoCount: 0,
                category: "Niche",
            });
        }
    }

    // Add remaining hashtags with estimated categories
    hashtags.slice(3).forEach((tag, index) => {
        hashtagStats.push({
            tag,
            viewCount: 0,
            videoCount: 0,
            category: index < 2 ? "Medium" : "Niche",
        });
    });

    // Sort videos by views
    const sortedVideos = allVideos
        .filter((v) => v.stats?.playCount)
        .sort((a, b) => (b.stats?.playCount || 0) - (a.stats?.playCount || 0));

    console.log("Total videos found:", allVideos.length);
    console.log("Videos with play counts:", sortedVideos.length);

    // Log first few video descriptions
    sortedVideos.slice(0, 3).forEach((v, i) => {
        console.log(`Video ${i + 1} (${v.stats?.playCount} views):`, v.desc?.substring(0, 50));
        console.log(`  Video URL available:`, !!v.video?.playAddr);
    });

    // Import transcription service dynamically to avoid circular deps
    const { getSpokenHooksFromVideos } = await import("./deepgram-transcription");

    // Try to get SPOKEN hooks from video transcription (try more videos to get at least 3-5 hooks)
    console.log("Attempting to transcribe spoken hooks...");
    let hooks: TrendingHook[] = [];

    try {
        const spokenHooks = await getSpokenHooksFromVideos(sortedVideos, 10); // Try 10 videos to get more hooks

        if (spokenHooks.length > 0) {
            console.log(`Got ${spokenHooks.length} spoken hooks from transcription!`);
            hooks = spokenHooks.map(h => ({
                id: h.id,
                text: h.text,
                engagement: h.engagement,
                platform: h.platform,
                views: h.views,
                likes: h.likes,
            }));
        }
    } catch (error) {
        console.error("Transcription failed, falling back to caption hooks:", error);
    }

    // If transcription didn't work, fall back to caption-based hooks
    if (hooks.length === 0) {
        console.log("Using caption-based hooks as fallback");
        hooks = sortedVideos
            .slice(0, 10)
            .filter((v) => v.desc && v.desc.length > 5)
            .map((video, index) => ({
                id: `h${index + 1}`,
                text: extractHook(video.desc),
                engagement: getEngagementLevel(video),
                platform: "TikTok" as const,
                views: video.stats.playCount,
                likes: video.stats.diggCount,
            }));
    }

    console.log("Final hooks count:", hooks.length);
    if (hooks.length > 0) {
        console.log("First hook text:", hooks[0].text);
    }

    // Create video examples
    const examples: VideoExample[] = sortedVideos.slice(0, 4).map((video) => ({
        id: video.id,
        thumbnail: video.video?.cover || "/api/placeholder/320/180",
        creator: `@${video.author?.uniqueId || "creator"}`,
        creatorAvatar: video.author?.avatarThumb || "",
        platform: "TikTok" as const,
        views: formatViewCount(video.stats?.playCount || 0),
        url: `https://www.tiktok.com/@${video.author?.uniqueId}/video/${video.id}`,
        description: video.desc,
        duration: video.video?.duration || 0,
    }));

    // Analyze video formats
    const formats = analyzeVideoFormats(sortedVideos);

    // Calculate benchmark based on actual data
    const viewCounts = sortedVideos.map((v) => v.stats?.playCount || 0);
    const medianViews = viewCounts.length > 0
        ? viewCounts[Math.floor(viewCounts.length / 2)]
        : 10000;

    const lowRange = Math.floor(medianViews * 0.3);
    const highRange = Math.floor(medianViews * 1.5);

    return {
        hooks: hooks.length > 0 ? hooks : getDefaultHooks(nicheKey),
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
        hashtags,
        formats,
        examples: [], // No examples in mock mode
        benchmark: {
            viewRange: "50K–500K",
            timeframe: "48–72 hours",
        },
    };
}
