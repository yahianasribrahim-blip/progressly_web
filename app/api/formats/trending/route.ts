import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

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
    howMuslimCreatorsCanApply: string[];
    halalAudioSuggestions: string[];
    exampleNiches: string[];
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

    // Try hashtags one by one (limit to 3 to save API calls)
    for (const hashtag of TRENDING_HASHTAGS.slice(0, 3)) {
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


// Use Gemini to extract FORMAT from multiple videos
async function extractFormatsWithGemini(videos: any[]): Promise<TrendingFormat[]> {
    console.log(`Extracting formats from ${videos.length} videos using Gemini...`);

    if (videos.length === 0) {
        return getDefaultFormats();
    }

    const videoDescriptions = videos
        .map((v, i) => `Video ${i + 1}: "${v.description}" (${v.views} views, ${v.duration}s)`)
        .join("\n");

    const prompt = `You are analyzing trending TikTok videos to extract FORMATS that can be applied to ANY niche.

Here are ${videos.length} trending videos:
${videoDescriptions}

Extract 5-7 distinct FORMATS from these videos. A format is the STRUCTURE and APPROACH, not the specific content.

IMPORTANT RULES:
1. Focus on the FORMAT/STRUCTURE that could work in ANY niche (hijab tutorials, cooking, fitness, storytelling, etc.)
2. Never mention specific music or songs
3. Always suggest halal audio alternatives (voiceover, nasheed, ambient sounds, natural sounds)
4. Give specific examples of how a MUSLIM creator could apply each format

Return a JSON array of formats:
[
    {
        "id": "f1",
        "formatName": "<Short catchy name like 'Day 1 vs Day 365 Progression'>",
        "formatDescription": "<2-3 sentences explaining the format structure that works in any niche>",
        "whyItWorks": "<Why this format gets engagement - psychology behind it>",
        "howMuslimCreatorsCanApply": [
            "<Specific example for hijab/modest fashion creators>",
            "<Specific example for food/cooking creators>",
            "<Specific example for fitness creators>",
            "<Specific example for storytelling/vlog creators>"
        ],
        "halalAudioSuggestions": [
            "<Audio option 1 - voiceover idea>",
            "<Audio option 2 - nasheed or ambient sound>"
        ],
        "exampleNiches": ["hijab", "food", "fitness", "storytelling"],
        "engagementPotential": "High"
    }
]

Focus on formats that:
- Are highly replicable without showing haram content
- Work with voiceover or no music
- Can be applied to modest/Islamic content niches
- Have high engagement potential`;

    try {
        const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        let result;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Trying Gemini model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent(prompt);
                console.log(`Success with model: ${modelName}`);
                break;
            } catch (modelError: unknown) {
                const error = modelError as Error;
                console.log(`Model ${modelName} failed:`, error.message?.substring(0, 100));
            }
        }

        if (!result) {
            console.error("All Gemini models failed");
            return getDefaultFormats();
        }

        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("No JSON array found in Gemini response");
            return getDefaultFormats();
        }

        const formats: TrendingFormat[] = JSON.parse(jsonMatch[0]);
        console.log(`Extracted ${formats.length} formats from Gemini`);

        return formats;
    } catch (error) {
        console.error("Error extracting formats with Gemini:", error);
        return getDefaultFormats();
    }
}

// Default formats if API/Gemini fails
function getDefaultFormats(): TrendingFormat[] {
    return [
        {
            id: "default-1",
            formatName: "Before & After Transformation",
            formatDescription: "Show a dramatic transformation from start to finish. Works for any skill, project, or journey.",
            whyItWorks: "Creates curiosity and satisfaction. Viewers want to see the end result and the journey motivates them.",
            howMuslimCreatorsCanApply: [
                "Hijab styling: Show plain outfit → styled modest look",
                "Cooking: Raw ingredients → finished halal dish",
                "Fitness: Starting point → progress after consistent effort",
                "Room/space: Messy → organized and clean"
            ],
            halalAudioSuggestions: [
                "Voiceover explaining your journey",
                "Gentle nasheed",
                "Natural sounds"
            ],
            exampleNiches: ["hijab", "food", "fitness", "lifestyle"],
            engagementPotential: "High",
            avgStats: { views: "500K-2M", likes: "50K-200K", shares: "5K-20K" }
        },
        {
            id: "default-2",
            formatName: "Day in My Life (DITL)",
            formatDescription: "Document your daily routine from morning to evening. Viewers love seeing authentic real-life content.",
            whyItWorks: "Creates parasocial connection. Viewers feel like they know you personally. Highly shareable.",
            howMuslimCreatorsCanApply: [
                "A day as a hijabi student/professional",
                "My morning routine as a Muslim",
                "What I eat in a day (halal edition)",
                "Productive day routine with prayer times"
            ],
            halalAudioSuggestions: [
                "Voiceover narrating your day",
                "Soft background nasheed",
                "Natural sounds (cooking, nature, etc.)"
            ],
            exampleNiches: ["lifestyle", "food", "productivity", "faith"],
            engagementPotential: "High",
            avgStats: { views: "300K-1M", likes: "30K-100K", shares: "3K-15K" }
        },
        {
            id: "default-3",
            formatName: "Get Ready With Me (GRWM)",
            formatDescription: "Film yourself getting ready while talking to the camera. Combine preparation with conversation.",
            whyItWorks: "Intimate format that builds connection. Viewers feel like they're hanging out with a friend.",
            howMuslimCreatorsCanApply: [
                "GRWM for Jummah prayer",
                "Modest makeup and hijab styling",
                "Getting ready for Eid",
                "Study/work session preparation"
            ],
            halalAudioSuggestions: [
                "Talk directly to camera (no music needed)",
                "Share thoughts, stories, or advice while getting ready"
            ],
            exampleNiches: ["hijab", "beauty", "lifestyle", "faith"],
            engagementPotential: "High",
            avgStats: { views: "400K-1.5M", likes: "40K-150K", shares: "4K-18K" }
        },
        {
            id: "default-4",
            formatName: "POV Storytelling",
            formatDescription: "Tell a story from a specific point of view with acting or text overlays. Creates immersive experience.",
            whyItWorks: "Engages viewer's imagination. Easy to relate to. High comment engagement (people share their own stories).",
            howMuslimCreatorsCanApply: [
                "POV: You're learning to pray for the first time",
                "POV: First day wearing hijab",
                "POV: Cooking for iftar during Ramadan",
                "POV: That one aunty at family gatherings"
            ],
            halalAudioSuggestions: [
                "Voiceover narration",
                "Text overlays with subtle background sound",
                "Your own voice acting"
            ],
            exampleNiches: ["storytelling", "comedy", "faith", "culture"],
            engagementPotential: "High",
            avgStats: { views: "600K-3M", likes: "60K-300K", shares: "8K-40K" }
        },
        {
            id: "default-5",
            formatName: "Tutorial/How-To",
            formatDescription: "Teach something step by step. Quick, actionable content that provides real value.",
            whyItWorks: "Saveable content - viewers bookmark for later. Positions you as an expert. Gets shared.",
            howMuslimCreatorsCanApply: [
                "How to style a hijab in 60 seconds",
                "Quick halal recipe tutorial",
                "How to start praying (beginner guide)",
                "Modest outfit ideas for different occasions"
            ],
            halalAudioSuggestions: [
                "Clear voiceover explaining each step",
                "Text overlays for silent viewing",
                "Natural sound of the activity"
            ],
            exampleNiches: ["hijab", "food", "faith", "lifestyle"],
            engagementPotential: "High",
            avgStats: { views: "200K-800K", likes: "20K-80K", shares: "10K-50K" }
        }
    ];
}

export async function GET() {
    console.log("API /api/formats/trending called");

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
                    apiDebugInfo, // Include the API response details
                }
            }, { status: 500 });
        }

        console.log(`Step 1 success: Got ${trendingVideos.length} videos`);

        // Step 2: Extract formats using Gemini
        console.log("Step 2: Extracting formats with Gemini...");

        if (trendingVideos.length === 0) {
            // Can't extract formats without videos
            return NextResponse.json({
                success: false,
                error: "Failed to fetch trending videos from TikTok API",
                debug: {
                    errors,
                    rapidApiKeyExists: !!process.env.RAPIDAPI_KEY,
                    rapidApiKeyLength: process.env.RAPIDAPI_KEY?.length || 0,
                    geminiKeyExists: !!process.env.GOOGLE_GEMINI_API_KEY,
                }
            }, { status: 500 });
        }

        const formats = await extractFormatsWithGemini(trendingVideos);

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

        console.log(`Step 2 success: Extracted ${formats.length} formats`);

        return NextResponse.json({
            success: true,
            data: {
                formats,
                videosAnalyzed: trendingVideos.length,
                generatedAt: new Date().toISOString(),
                source: "live"
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
