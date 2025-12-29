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

// Generic trending hashtags to find globally popular formats
const TRENDING_HASHTAGS = [
    "fyp", "viral", "trending", "foryoupage",
    "transformation", "storytime", "grwm",
    "tutorial", "dayinmylife"
];

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

// Fetch trending videos from generic hashtags using tiktok-scraper2 API
async function fetchGlobalTrendingVideos(count: number = 20): Promise<{ videos: any[], debugInfo: any }> {
    console.log("Fetching global trending videos using tiktok-scraper2...");

    const debugInfo: any = {
        apiResponses: [],
        errors: [],
        hashtagsProcessed: [],
    };

    if (!RAPIDAPI_KEY) {
        console.error("RAPIDAPI_KEY is not set");
        debugInfo.errors.push("RAPIDAPI_KEY is not set");
        return { videos: [], debugInfo };
    }

    const allVideos: any[] = [];
    const seenIds = new Set<string>();

    // Shuffle hashtags to get different results each refresh
    const shuffledHashtags = [...TRENDING_HASHTAGS].sort(() => Math.random() - 0.5);

    // Try hashtags one by one (limit to 3 to save API calls)
    for (const hashtag of shuffledHashtags.slice(0, 3)) {
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
            const videos = await getHashtagVideos(hashtagId, 15);

            debugInfo.apiResponses.push({
                hashtag,
                hashtagId,
                videosFound: videos.length,
            });

            // Process videos
            for (const v of videos) {
                const videoId = v.id || v.video_id;
                if (!videoId || seenIds.has(videoId)) continue;
                seenIds.add(videoId);

                allVideos.push({
                    id: videoId,
                    description: v.desc || v.description || "",
                    views: v.stats?.playCount || v.play_count || v.views || 0,
                    likes: v.stats?.diggCount || v.like_count || v.likes || 0,
                    shares: v.stats?.shareCount || v.share_count || v.shares || 0,
                    duration: v.video?.duration || v.duration || 0,
                    coverUrl: v.video?.cover || v.cover || "",
                    author: v.author?.uniqueId || v.author?.nickname || "creator",
                });
            }

            console.log(`#${hashtag}: added ${allVideos.length} total videos`);
        } catch (error) {
            console.error(`Error processing #${hashtag}:`, error);
            debugInfo.errors.push(`#${hashtag}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }

    console.log(`Fetched ${allVideos.length} global trending videos`);
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

    const prompt = `You are analyzing ${base64Images.length} TikTok video THUMBNAILS to extract REAL content formats.

I want you to look at EXACTLY what each video thumbnail shows and tell me what FORMAT/STRUCTURE they use.

Context for each video:
${videoContext}

User's niche: "${nicheName}"

FOR EACH THUMBNAIL, analyze:
1. VISUAL HOOK: What's happening in the first frame that grabs attention?
   - Camera angle (talking head, POV, wide shot, etc.)
   - Is there text overlay? What does it say?
   - Is there a person? What are they doing?
   - Any props, effects, or visual gimmicks?

2. FORMAT STRUCTURE: What type of video is this?
   - Tutorial (showing how to do something)
   - Reaction (reacting to something)
   - Storytime (talking to camera)
   - Slideshow (images appearing while talking)
   - POV (first person perspective)
   - Montage (multiple clips edited together)
   - Before/After (transformation)
   - Other (describe it)

3. UNIQUE MECHANISM: What makes this format work? What's the creative element?

Based on your REAL observations, extract EXACTLY 3 distinct formats that are ACTUALLY in these videos.

(seed: ${variationSeed})

Return ONLY valid JSON array with EXACTLY 3 objects:
[
    {
        "id": "f1",
        "formatName": "<Describe what you ACTUALLY see - e.g., 'Slideshow While Naming Things' or 'Setup Camera Visual Hook'>",
        "formatDescription": "<2-3 sentences describing what the video ACTUALLY does based on the thumbnail>",
        "whyItWorks": "<Why this specific format works based on what you observed>",
        "howToApply": [
            "<How someone in '${nicheName}' niche could use this EXACT format>",
            "<Another application>",
            "<Third application>"
        ],
        "halalAudioSuggestions": ["Voiceover", "Natural sounds"],
        "engagementPotential": "High",
        "avgStats": {
            "views": "<ACTUAL view range from the videos - use the real data provided>",
            "likes": "<estimate based on typical 10% of views>",
            "shares": "<estimate based on typical 1% of views>"
        }
    }
]

CRITICAL: Describe what you ACTUALLY SEE in the thumbnails. Do NOT make up generic formats like "GRWM" or "Day 1 vs Day 365" unless you literally see that in the images.`;

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
        // Step 1: Fetch trending videos from generic hashtags
        console.log("Step 1: Fetching trending videos...");
        const fetchResult = await fetchGlobalTrendingVideos(20);
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

        // Record usage on success
        await recordFormatSearchUsage(session.user.id);

        return NextResponse.json({
            success: true,
            data: {
                formats,
                niche,
                videosAnalyzed: trendingVideos.length,
                generatedAt: new Date().toISOString(),
                source: "live",
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

