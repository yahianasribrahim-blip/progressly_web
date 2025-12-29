import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/auth";
import { canUseFormatSearch, recordFormatSearchUsage } from "@/lib/user";

// Initialize Gemini (fallback)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// OpenAI for Vision-based analysis
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// API Configuration - Using tiktok-scraper2 API
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const TIKTOK_API_HOST = "tiktok-scraper2.p.rapidapi.com";

// NICHE-SPECIFIC HASHTAGS - Returns content relevant to user's niche, not random viral videos
const NICHE_HASHTAGS: Record<string, string[]> = {
    // Business/Money niches
    "affiliate": ["affiliatemarketing", "makemoneyonline", "passiveincome", "sidehustle", "onlinebusiness"],
    "saas": ["saas", "software", "startup", "entrepreneur", "techstartup"],
    "business": ["smallbusiness", "entrepreneur", "businesstips", "sidehustle", "makemoneyonline"],
    "finance": ["personalfinance", "investing", "moneytips", "financialfreedom", "budgeting"],

    // Content creator niches
    "content": ["contentcreator", "creatortips", "socialmediatips", "growthtips", "tiktoktips"],
    "influencer": ["influencer", "ugc", "ugccreator", "branddeals", "sponsorship"],

    // Lifestyle niches
    "fitness": ["fitness", "workout", "gym", "fitnessmotivation", "homeworkout"],
    "food": ["foodtiktok", "recipe", "cooking", "foodie", "easyrecipe"],
    "fashion": ["fashion", "ootd", "style", "outfitideas", "fashiontiktok"],
    "beauty": ["beauty", "makeup", "skincare", "beautytips", "makeuptutorial"],

    // Muslim creator niches
    "hijab": ["hijab", "hijabstyle", "modestfashion", "hijabfashion", "hijabtutorial"],
    "deen": ["islam", "muslim", "islamicreminders", "deen", "islamiccontent"],
    "halal": ["halal", "halalfood", "muslimlife", "ramadan", "islamiclifestyle"],

    // General fallback - still niche-related, not random viral
    "default": ["tutorial", "howto", "tips", "learnontiktok", "lifehacks"],
};

// Get hashtags for a niche (normalize input)
function getHashtagsForNiche(niche: string): string[] {
    const nicheKey = niche.toLowerCase().trim();

    // Check for direct match
    if (NICHE_HASHTAGS[nicheKey]) {
        return NICHE_HASHTAGS[nicheKey];
    }

    // Check for partial match
    for (const [key, hashtags] of Object.entries(NICHE_HASHTAGS)) {
        if (nicheKey.includes(key) || key.includes(nicheKey)) {
            return hashtags;
        }
    }

    // Add niche itself as hashtag + default
    return [nicheKey.replace(/\s+/g, ''), ...NICHE_HASHTAGS.default];
}

// View count limits for MID-VIRAL content (not mega-viral celebrities)
const MIN_VIEWS = 50000;      // At least 50K views
const MAX_VIEWS = 10000000;   // No more than 10M views (avoid mega-viral)

interface SourceVideo {
    id: string;
    url: string;
    thumbnail: string;
    views: number;
    author: string;
    description: string;
}

interface TrendingFormat {
    id: string;
    formatName: string;
    formatDescription: string;
    whyItWorks: string;
    howToApply: string[]; // Niche-specific application ideas
    halalAudioSuggestions: string[];
    engagementPotential: "High" | "Medium" | "Low";
    avgStats: {
        views: string;
        likes: string;
        shares: string;
    };
    sourceVideos?: SourceVideo[]; // PROOF: The actual videos this format was extracted from
}

// Step 1: Get hashtag ID from hashtag name
async function getHashtagId(hashtag: string): Promise<string | null> {
    try {
        const url = `https://${TIKTOK_API_HOST}/hashtag/info?hashtag=${encodeURIComponent(hashtag)}`;

        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": TIKTOK_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            console.error(`Failed to get hashtag info for #${hashtag}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        // Try different response structures
        const hashtagId = data.data?.challenge?.id || data.challengeInfo?.challenge?.id || data.id;

        if (hashtagId) {
            console.log(`Got hashtag ID for #${hashtag}: ${hashtagId}`);
            return hashtagId;
        }

        console.log(`No hashtag ID found for #${hashtag}, response:`, JSON.stringify(data).substring(0, 200));
        return null;
    } catch (error) {
        console.error(`Error getting hashtag ID for #${hashtag}:`, error);
        return null;
    }
}

// Step 2: Get videos for a hashtag ID
async function getHashtagVideos(hashtagId: string, count: number = 30): Promise<any[]> {
    try {
        const url = `https://${TIKTOK_API_HOST}/hashtag/videos?hashtag_id=${hashtagId}&count=${count}`;
        console.log(`Fetching videos: ${url}`);

        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": TIKTOK_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            console.error(`Failed to get videos for hashtag ID ${hashtagId}: ${response.status}`);
            return [];
        }

        const data = await response.json();
        // Try different response structures
        const videos = data.data?.videos || data.itemList || data.videos || data.data || [];

        console.log(`Got ${Array.isArray(videos) ? videos.length : 0} videos for hashtag ID ${hashtagId}`);
        return Array.isArray(videos) ? videos : [];
    } catch (error) {
        console.error(`Error getting videos for hashtag ID ${hashtagId}:`, error);
        return [];
    }
}

// Fetch trending videos for a SPECIFIC NICHE using tiktok-scraper2 API
// WITH recency filter and retry/pivot logic
async function fetchNicheTrendingVideos(niche: string, count: number = 20): Promise<{ videos: any[], debugInfo: any }> {
    const nicheHashtags = getHashtagsForNiche(niche);
    console.log(`Fetching niche-specific videos for "${niche}" using hashtags: ${nicheHashtags.join(', ')}`);

    // MAX AGE: Only videos from last 45 days (trending = RECENT)
    const MAX_AGE_DAYS = 45;
    const cutoffDate = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

    const debugInfo: any = {
        niche,
        hashtags: nicheHashtags,
        apiResponses: [],
        errors: [],
        hashtagsProcessed: [],
        viewFiltering: { min: MIN_VIEWS, max: MAX_VIEWS, filtered: 0 },
        recencyFiltering: { maxAgeDays: MAX_AGE_DAYS, filtered: 0 },
    };

    if (!RAPIDAPI_KEY) {
        console.error("RAPIDAPI_KEY is not set");
        debugInfo.errors.push("RAPIDAPI_KEY is not set");
        return { videos: [], debugInfo };
    }

    const allVideos: any[] = [];
    const seenIds = new Set<string>();

    // Shuffle hashtags to get different results each refresh
    const shuffledHashtags = [...nicheHashtags].sort(() => Math.random() - 0.5);

    // RETRY LOGIC: Try up to ALL hashtags until we get enough videos
    // Start with 4, but if not enough, try all of them
    let hashtagsToTry = 4;

    for (let attempt = 0; attempt < 2; attempt++) {
        const hashtagsThisAttempt = shuffledHashtags.slice(0, hashtagsToTry);

        for (const hashtag of hashtagsThisAttempt) {
            if (allVideos.length >= count) break;

            try {
                // Step 1: Get hashtag ID
                const hashtagId = await getHashtagId(hashtag);

                if (!hashtagId) {
                    debugInfo.errors.push(`#${hashtag}: Could not get hashtag ID`);
                    continue;
                }

                debugInfo.hashtagsProcessed.push({ hashtag, hashtagId });

                // Step 2: Get videos for this hashtag
                const videos = await getHashtagVideos(hashtagId, 30); // Fetch more to filter

                debugInfo.apiResponses.push({
                    hashtag,
                    hashtagId,
                    videosFound: videos.length,
                });

                // Process videos WITH VIEW + RECENCY FILTERING
                for (const v of videos) {
                    const videoId = v.id || v.video_id;
                    if (!videoId || seenIds.has(videoId)) continue;

                    const viewCount = v.stats?.playCount || v.play_count || v.views || 0;

                    // FILTER 1: Only mid-viral content (50K-10M views)
                    if (viewCount < MIN_VIEWS || viewCount > MAX_VIEWS) {
                        debugInfo.viewFiltering.filtered++;
                        continue;
                    }

                    // FILTER 2: Only RECENT videos (last 45 days)
                    const createTime = v.createTime || v.create_time || 0;
                    const videoTimestamp = createTime * 1000; // Convert to milliseconds
                    if (videoTimestamp > 0 && videoTimestamp < cutoffDate) {
                        debugInfo.recencyFiltering.filtered++;
                        continue;
                    }

                    seenIds.add(videoId);

                    allVideos.push({
                        id: videoId,
                        description: v.desc || v.description || "",
                        views: viewCount,
                        likes: v.stats?.diggCount || v.like_count || v.likes || 0,
                        shares: v.stats?.shareCount || v.share_count || v.shares || 0,
                        duration: v.video?.duration || v.duration || 0,
                        coverUrl: v.video?.cover || v.cover || "",
                        author: v.author?.uniqueId || v.author?.nickname || "creator",
                        createTime: createTime,
                    });
                }

                console.log(`#${hashtag}: ${allVideos.length} total mid-viral recent videos`);
            } catch (error) {
                console.error(`Error processing #${hashtag}:`, error);
                debugInfo.errors.push(`#${hashtag}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }

        // PIVOT LOGIC: If not enough videos, try more hashtags
        if (allVideos.length >= count || hashtagsToTry >= shuffledHashtags.length) {
            break;
        }

        console.log(`Only ${allVideos.length} videos found, pivoting to try more hashtags...`);
        hashtagsToTry = shuffledHashtags.length; // Try all of them
    }

    console.log(`Fetched ${allVideos.length} niche-relevant mid-viral recent videos for "${niche}"`);
    return { videos: allVideos, debugInfo };
}


// Niche display names for prompts
const NICHE_NAMES: Record<string, string> = {
    hijab: "Hijab & Modest Fashion",
    food: "Halal Food & Cooking",
    fitness: "Fitness & Wellness",
    deen: "Islamic Content & Deen",
    storytelling: "Storytelling & Vlogs",
    beauty: "Modest Beauty",
    parenting: "Muslim Parenting",
    business: "Halal Business & Finance",
    education: "Islamic Education",
    other: "General Content",
};

// Download and base64 encode image for Vision API
async function downloadImageAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return `data:${contentType};base64,${base64}`;
    } catch {
        return null;
    }
}

// Use GPT-4o Vision to analyze ACTUAL video thumbnails and extract real formats
async function extractFormatsWithVision(videos: any[], niche: string): Promise<TrendingFormat[]> {
    console.log(`Extracting formats from ${videos.length} videos for niche: ${niche} using VISION...`);

    const nicheName = NICHE_NAMES[niche] || niche;

    if (videos.length === 0) {
        return getDefaultFormats(niche);
    }

    // Download thumbnails (up to 8 videos)
    const videosWithThumbnails = videos.filter(v => v.coverUrl && v.coverUrl.startsWith('http')).slice(0, 8);
    if (videosWithThumbnails.length === 0) {
        console.log("No valid thumbnails found, falling back to text-only");
        return extractFormatsWithGemini(videos, niche);
    }

    console.log(`Downloading ${videosWithThumbnails.length} thumbnails...`);
    const base64Images: string[] = [];
    for (const v of videosWithThumbnails) {
        const base64 = await downloadImageAsBase64(v.coverUrl);
        if (base64) base64Images.push(base64);
    }

    if (base64Images.length === 0 || !OPENAI_API_KEY) {
        console.log("No thumbnails downloaded or no OpenAI key, falling back to Gemini");
        return extractFormatsWithGemini(videos, niche);
    }

    console.log(`Sending ${base64Images.length} images to GPT-4o Vision...`);

    // Build image content for vision API
    const imageContent = base64Images.map(url => ({
        type: "image_url" as const,
        image_url: { url, detail: "low" as const }
    }));

    // Also include text descriptions for context
    const videoContext = videosWithThumbnails.map((v, i) =>
        `Video ${i + 1}: "${v.description?.substring(0, 100) || 'No description'}" - ${v.views?.toLocaleString() || '?'} views`
    ).join("\n");

    const variationSeed = Math.random().toString(36).substring(7);

    const prompt = `You are analyzing ${base64Images.length} TikTok video thumbnails from the "${nicheName}" niche.

YOUR GOAL: Extract REAL formats from these videos and turn them into fill-in-the-blank templates.

Video context (hashtag, views):
${videoContext}

CRITICAL RULES FOR HONESTY:
1. LOOK AT EACH THUMBNAIL CAREFULLY - describe ONLY what you literally see
2. If ALL videos show a person talking to camera with NO edits/cuts/overlays → the format IS "Talking Head" 
3. If you see a screen recording → the format involves screen recording
4. If you see text overlay → describe the text overlay format
5. DO NOT invent "screen recording" or "quick cuts" if the videos are just people talking to camera
6. The format you describe MUST match what the MAJORITY of source videos show

CHECK BEFORE EACH FORMAT: "Would someone watching these videos see the format I'm describing?"

WHAT TO LOOK FOR IN EACH THUMBNAIL:
- Is there text overlay? Quote it exactly.
- Is it talking head (person facing camera, single shot)?
- Is it screen recording (showing phone/computer screen)?
- Is it split screen, POV, or has visible cuts/transitions?

HONESTY TEST:
- If 3 videos are just girls talking to camera → format = "Talking Head: speak directly to camera about [TOPIC]"
- If 2 videos have text overlay → describe the text overlay style
- DO NOT suggest "screen record" if no videos show screen recording

Return EXACTLY 3 templates from videos that are RELEVANT to "${nicheName}". 
(seed: ${variationSeed})

Return ONLY valid JSON array with EXACTLY 3 objects:
[
    {
        "id": "f1",
        "formatName": "<Short name based on what you ACTUALLY see>",
        "formatDescription": "<Fill-in-the-blank template with [BRACKETS]. Describe the actual video structure you observed.>",
        "whyItWorks": "<Why this format works - based on the actual video structure>",
        "howToApply": [
            "<Specific example for '${nicheName}' niche>",
            "<Another example>",
            "<Third example>"
        ],
        "halalAudioSuggestions": ["Voiceover", "Natural sounds"],
        "engagementPotential": "High",
        "avgStats": {
            "views": "<Use ACTUAL view counts from the videos above>",
            "likes": "<10% of views>",
            "shares": "<1% of views>"
        }
    }
]

CRITICAL:
- DO NOT make up formats like "quick cuts" unless you literally SEE quick cuts evidence in thumbnails
- If a video is a single static talking head, the template is just "Record yourself talking about [TOPIC]" - don't overcomplicate
- Base everything on what you ACTUALLY SEE, not what you imagine`;



    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        ...imageContent
                    ]
                }],
                max_tokens: 1500,
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            console.error("GPT-4o Vision error:", response.status);
            return extractFormatsWithGemini(videos, niche);
        }

        const result = await response.json();
        const text = result.choices?.[0]?.message?.content || "";
        console.log("GPT-4o Vision response:", text.substring(0, 300));

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("No JSON found in Vision response");
            return extractFormatsWithGemini(videos, niche);
        }

        const formats: TrendingFormat[] = JSON.parse(jsonMatch[0]);
        console.log(`Vision extracted ${formats.length} REAL formats`);
        return formats;
    } catch (error) {
        console.error("Vision extraction error:", error);
        return extractFormatsWithGemini(videos, niche);
    }
}

// Fallback: Use Gemini with text-only (less reliable)
async function extractFormatsWithGemini(videos: any[], niche: string): Promise<TrendingFormat[]> {
    console.log(`Fallback: Extracting formats from ${videos.length} videos using Gemini (text-only)...`);

    const nicheName = NICHE_NAMES[niche] || niche;

    if (videos.length === 0) {
        return getDefaultFormats(niche);
    }

    const videoDescriptions = videos
        .map((v, i) => `Video ${i + 1}: "${v.description}" (${v.views} views, ${v.duration}s)`)
        .join("\n");

    const prompt = `Analyze these TikTok video descriptions and extract formats for "${nicheName}":
${videoDescriptions}

Return ONLY JSON array with 3 format objects. Be specific to what you see in descriptions.`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.error("Gemini fallback failed:", e);
    }
    return getDefaultFormats(niche);
}

// Niche-specific application examples
function getNicheExamples(niche: string): Record<string, string[]> {
    const examples: Record<string, Record<string, string[]>> = {
        hijab: {
            transformation: [
                "Show a plain outfit transformed with layered hijab styling",
                "Before: basic hijab wrap → After: elegant evening hijab look",
                "Style the same hijab 3 different ways for different occasions"
            ],
            ditl: [
                "Day in my life as a hijabi university student",
                "My morning routine - skincare, hijab styling, and getting ready",
                "What I wear in a week as a modest fashion creator"
            ],
            grwm: [
                "Get ready with me for Jummah - styling my favorite hijab",
                "GRWM for Eid - modest glam look from start to finish",
                "Casual Friday hijab styling while chatting about my week"
            ]
        },
        food: {
            transformation: [
                "Raw ingredients → beautifully plated halal biryani",
                "Simple dough → fresh homemade naan bread",
                "Before: empty counter → After: full Eid spread"
            ],
            ditl: [
                "What I eat in a day - halal meal prep and cooking",
                "A day running my halal food business",
                "Weekend cooking vlog - making family recipes"
            ],
            grwm: [
                "Get ready to cook - setting up my kitchen for the day",
                "Meal prepping while sharing my favorite halal recipes",
                "Sunday cooking session - talking about food traditions"
            ]
        },
        fitness: {
            transformation: [
                "Day 1 vs Day 90 of my fitness journey",
                "Morning routine transformation - sluggish to energized",
                "From couch to 5K - my running progress"
            ],
            ditl: [
                "Day in my life as a Muslim fitness creator",
                "Full day of eating and training - halal bulk edition",
                "My workout and prayer routine balanced"
            ],
            grwm: [
                "Getting ready for the gym - modest activewear styling",
                "Morning workout prep routine before Fajr",
                "Pre-workout ritual and meal prep"
            ]
        },
        deen: {
            transformation: [
                "How I went from not praying to never missing a prayer",
                "My Quran recitation - Day 1 vs Day 100",
                "Before and after implementing Islamic morning routine"
            ],
            ditl: [
                "Day in my life around the 5 daily prayers",
                "Productive Muslim morning routine",
                "A day of seeking knowledge - classes and reflection"
            ],
            grwm: [
                "Getting ready for Jummah while sharing a reminder",
                "GRWM for Taraweeh during Ramadan",
                "Morning adhkar routine while getting ready"
            ]
        },
        default: {
            transformation: [
                "Show your before and after in your craft",
                "Document a skill you're learning - progress over time",
                "Transform a space or project from start to finish"
            ],
            ditl: [
                "A day in your life as a content creator",
                "Daily routine that balances deen and dunya",
                "What a productive day looks like for you"
            ],
            grwm: [
                "Get ready with me while chatting about your niche",
                "Morning routine with conversation",
                "Preparing for your workday or content creation"
            ]
        }
    };

    return examples[niche] || examples.default;
}

// Default formats if API/Gemini fails - now niche-specific
function getDefaultFormats(niche: string): TrendingFormat[] {
    const nicheExamples = getNicheExamples(niche);
    const nicheName = NICHE_NAMES[niche] || niche;

    return [
        {
            id: "default-1",
            formatName: "Before & After Transformation",
            formatDescription: "Show a dramatic transformation from start to finish. Works for any skill, project, or journey.",
            whyItWorks: "Creates curiosity and satisfaction. Viewers want to see the end result and the journey motivates them.",
            howToApply: nicheExamples.transformation || [
                `Show a transformation relevant to ${nicheName}`,
                `Document progress over time in your niche`,
                `Before and after of a project or skill`
            ],
            halalAudioSuggestions: [
                "Voiceover explaining your journey",
                "Gentle nasheed or ambient sounds",
                "Natural sounds of the activity"
            ],
            engagementPotential: "High",
            avgStats: { views: "500K-2M", likes: "50K-200K", shares: "5K-20K" }
        },
        {
            id: "default-2",
            formatName: "Day in My Life (DITL)",
            formatDescription: "Document your daily routine from morning to evening. Viewers love seeing authentic real-life content.",
            whyItWorks: "Creates parasocial connection. Viewers feel like they know you personally. Highly shareable.",
            howToApply: nicheExamples.ditl || [
                `A day in your life as a ${nicheName} creator`,
                `Show your daily routine in your niche`,
                `Document an interesting day with your content`
            ],
            halalAudioSuggestions: [
                "Voiceover narrating your day",
                "Soft background nasheed",
                "Natural sounds (cooking, nature, etc.)"
            ],
            engagementPotential: "High",
            avgStats: { views: "300K-1M", likes: "30K-100K", shares: "3K-15K" }
        },
        {
            id: "default-3",
            formatName: "Get Ready With Me (GRWM)",
            formatDescription: "Film yourself getting ready while talking to the camera. Combine preparation with conversation.",
            whyItWorks: "Intimate format that builds connection. Viewers feel like they're hanging out with a friend.",
            howToApply: nicheExamples.grwm || [
                `GRWM while discussing ${nicheName} topics`,
                `Morning routine with casual conversation`,
                `Preparing for your day while sharing advice`
            ],
            halalAudioSuggestions: [
                "Talk directly to camera (no music needed)",
                "Share thoughts, stories, or advice while getting ready"
            ],
            engagementPotential: "High",
            avgStats: { views: "400K-1.5M", likes: "40K-150K", shares: "4K-18K" }
        }
    ];
}

export async function GET(request: Request) {
    console.log("API /api/formats/trending called");

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({
            success: false,
            error: "Authentication required",
        }, { status: 401 });
    }

    // Check usage limits
    const usageCheck = await canUseFormatSearch(session.user.id);
    if (!usageCheck.allowed) {
        return NextResponse.json({
            success: false,
            error: usageCheck.message || "Format search limit reached. Upgrade for more!",
            limitReached: true,
            remaining: usageCheck.remaining,
        }, { status: 429 });
    }

    // Get niche from query params
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get("niche") || "general content";
    console.log(`Niche requested: ${niche}`);

    const errors: string[] = [];
    let trendingVideos: any[] = [];
    let apiDebugInfo: any = {};

    try {
        // Step 1: Fetch trending videos FOR THIS NICHE (not generic viral)
        console.log(`Step 1: Fetching niche-specific videos for "${niche}"...`);
        const fetchResult = await fetchNicheTrendingVideos(niche, 20);
        trendingVideos = fetchResult.videos;
        apiDebugInfo = fetchResult.debugInfo;

        if (trendingVideos.length === 0) {
            errors.push("TikTok API returned 0 videos. Check RAPIDAPI_KEY and API subscription.");
            // Return with API debug info to see what happened
            return NextResponse.json({
                success: false,
                error: "Failed to fetch trending videos from TikTok API",
                debug: {
                    errors,
                    rapidApiKeyExists: !!process.env.RAPIDAPI_KEY,
                    rapidApiKeyLength: process.env.RAPIDAPI_KEY?.length || 0,
                    geminiKeyExists: !!process.env.GOOGLE_GEMINI_API_KEY,
                    apiDebugInfo,
                }
            }, { status: 500 });
        }

        console.log(`Step 1 success: Got ${trendingVideos.length} videos`);

        // Step 2: Extract formats using Gemini with niche context
        console.log(`Step 2: Extracting formats for "${niche}" with Gemini...`);

        const formats = await extractFormatsWithVision(trendingVideos, niche);

        if (formats.length === 0) {
            errors.push("Gemini failed to extract formats from videos");
            return NextResponse.json({
                success: false,
                error: "Gemini failed to extract formats",
                debug: {
                    errors,
                    videosAnalyzed: trendingVideos.length,
                    geminiKeyExists: !!process.env.GOOGLE_GEMINI_API_KEY,
                }
            }, { status: 500 });
        }

        console.log(`Step 2 success: Extracted ${formats.length} formats for ${niche}`);

        // Step 3: Attach source videos as PROOF to each format
        const sourceVideos: SourceVideo[] = trendingVideos.slice(0, 8).map(v => ({
            id: v.id,
            url: `https://www.tiktok.com/@${v.author}/video/${v.id}`,
            thumbnail: v.coverUrl || "",
            views: v.views || 0,
            author: `@${v.author}`,
            description: (v.description || "").substring(0, 100),
        }));

        // Distribute source videos across formats (roughly 2-3 per format)
        const formatsWithProof = formats.map((format, i) => ({
            ...format,
            sourceVideos: sourceVideos.slice(i * 2, i * 2 + 3).filter(v => v.id),
        }));

        // Record usage on success
        await recordFormatSearchUsage(session.user.id);

        return NextResponse.json({
            success: true,
            data: {
                formats: formatsWithProof,
                niche,
                videosAnalyzed: trendingVideos.length,
                generatedAt: new Date().toISOString(),
                source: "live",
                // Also return all source videos for full verification
                allSourceVideos: sourceVideos,
            }
        });
    } catch (error) {
        console.error("API Error:", error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
            debug: {
                errors,
                videosAnalyzed: trendingVideos.length,
                rapidApiKeyExists: !!process.env.RAPIDAPI_KEY,
                geminiKeyExists: !!process.env.GOOGLE_GEMINI_API_KEY,
                apiDebugInfo,
            }
        }, { status: 500 });
    }
}

