import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// Analyze a single video from TikTok URL
export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { videoUrl } = body;

        if (!videoUrl) {
            return NextResponse.json(
                { error: "Video URL is required" },
                { status: 400 }
            );
        }

        console.log("=== VIDEO ANALYSIS REQUEST ===");
        console.log("URL:", videoUrl);

        // Fetch creator setup for personalized recommendations
        let creatorSetup: CreatorSetup | null = null;
        try {
            const profile = await prisma.userProfile.findUnique({
                where: { userId: session.user.id },
                include: { creatorSetup: true },
            });
            creatorSetup = profile?.creatorSetup ?? null;
        } catch (e) {
            console.log("Could not fetch creator setup:", e);
        }

        // Extract video ID from TikTok URL
        let videoId: string | null = null;
        const videoIdMatch = videoUrl.match(/video\/(\d+)/);
        if (videoIdMatch) {
            videoId = videoIdMatch[1];
        }

        if (!videoId && videoUrl.includes('tiktok.com')) {
            const urlParts = videoUrl.split('/');
            const lastPart = urlParts[urlParts.length - 1].split('?')[0];
            if (/^\d+$/.test(lastPart)) {
                videoId = lastPart;
            }
        }

        if (!videoId) {
            return NextResponse.json(
                { error: "Could not extract video ID. Please use a direct TikTok video URL." },
                { status: 400 }
            );
        }

        // Fetch video details from TikTok API
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
        const RAPIDAPI_HOST = "tiktok-scraper2.p.rapidapi.com";

        // Get video download URL from tikwm.com
        let videoDownloadUrl = "";
        let coverUrl = "";

        try {
            console.log("Method 1: Trying tikwm.com...");
            const tikwmResponse = await fetch(
                `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`,
                {
                    method: "GET",
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                }
            );

            console.log("tikwm status:", tikwmResponse.status);

            if (tikwmResponse.ok) {
                const tikwmData = await tikwmResponse.json();
                console.log("tikwm code:", tikwmData.code, "msg:", tikwmData.msg);
                if (tikwmData.code === 0 && tikwmData.data) {
                    videoDownloadUrl = tikwmData.data.play || tikwmData.data.hdplay || tikwmData.data.wmplay || "";
                    coverUrl = tikwmData.data.cover || tikwmData.data.origin_cover || "";
                    console.log("tikwm video URL found:", !!videoDownloadUrl);
                }
            }
        } catch (e) {
            console.log("tikwm API failed:", e);
        }

        // Fallback: Try RapidAPI download endpoint
        if (!videoDownloadUrl) {
            try {
                console.log("Method 2: Trying RapidAPI download...");
                const rapidResponse = await fetch(
                    `https://${RAPIDAPI_HOST}/video/no_watermark?video_url=${encodeURIComponent(videoUrl)}`,
                    {
                        method: "GET",
                        headers: {
                            "x-rapidapi-key": RAPIDAPI_KEY,
                            "x-rapidapi-host": RAPIDAPI_HOST,
                        },
                    }
                );

                console.log("RapidAPI download status:", rapidResponse.status);

                if (rapidResponse.ok) {
                    const rapidData = await rapidResponse.json();
                    console.log("RapidAPI keys:", Object.keys(rapidData));
                    videoDownloadUrl = rapidData.video_url || rapidData.nwm_video_url ||
                        rapidData.data?.play || rapidData.data?.hdplay || "";
                    if (!coverUrl) {
                        coverUrl = rapidData.cover || rapidData.data?.cover || "";
                    }
                    console.log("RapidAPI video URL found:", !!videoDownloadUrl);
                }
            } catch (e) {
                console.log("RapidAPI download failed:", e);
            }
        }

        console.log("Final: videoDownloadUrl available:", !!videoDownloadUrl);
        console.log("Final: coverUrl available:", !!coverUrl);

        // Get video info from RapidAPI
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let videoData: any = null;

        const response1 = await fetch(
            `https://${RAPIDAPI_HOST}/video/info?video_id=${videoId}`,
            {
                method: "GET",
                headers: {
                    "x-rapidapi-key": RAPIDAPI_KEY,
                    "x-rapidapi-host": RAPIDAPI_HOST,
                },
            }
        );

        if (response1.ok) {
            videoData = await response1.json();
        }

        // Try backup endpoint
        if (!videoData?.itemInfo?.itemStruct?.stats?.playCount) {
            const encodedUrl = encodeURIComponent(videoUrl);
            const response2 = await fetch(
                `https://${RAPIDAPI_HOST}/video/info_v2?video_url=${encodedUrl}`,
                {
                    method: "GET",
                    headers: {
                        "x-rapidapi-key": RAPIDAPI_KEY,
                        "x-rapidapi-host": RAPIDAPI_HOST,
                    },
                }
            );

            if (response2.ok) {
                const data2 = await response2.json();
                if (data2?.itemInfo?.itemStruct?.stats?.playCount) {
                    videoData = data2;
                }
            }
        }

        if (!videoData) {
            return NextResponse.json(
                { error: "Failed to fetch video details. Please try again." },
                { status: 400 }
            );
        }

        // Extract video info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let videoInfo: any = null;

        if (videoData.itemInfo?.itemStruct) {
            videoInfo = videoData.itemInfo.itemStruct;
        } else if (videoData.aweme_detail) {
            videoInfo = videoData.aweme_detail;
        } else if (videoData.item) {
            videoInfo = videoData.item;
        } else if (videoData.data) {
            videoInfo = videoData.data;
        } else if (videoData.id || videoData.desc) {
            videoInfo = videoData;
        }

        if (!videoInfo) {
            return NextResponse.json(
                { error: "Video data could not be parsed." },
                { status: 400 }
            );
        }

        // Extract all data
        const stats = videoInfo.stats || videoInfo.statistics || {};
        const author = videoInfo.author || {};
        const desc = videoInfo.desc || videoInfo.description || "";
        const duration = videoInfo.video?.duration || videoInfo.duration || 0;

        // Use cover from API if we don't have one
        if (!coverUrl) {
            coverUrl = videoInfo.video?.cover || videoInfo.video?.originCover || "";
        }

        // Map stats
        const views = stats.playCount || stats.play_count || 0;
        const likes = stats.diggCount || stats.digg_count || 0;
        const comments = stats.commentCount || stats.comment_count || 0;
        const shares = stats.shareCount || stats.share_count || 0;
        const creatorName = author.uniqueId || author.unique_id || author.nickname || "Unknown";

        console.log("Creator:", creatorName);
        console.log("Views:", views, "Duration:", duration);
        console.log("Video download URL:", videoDownloadUrl ? "Found" : "Not found");

        // Calculate engagement
        const engagementMetrics = calculateEngagementWithViews(views, likes, comments, shares);

        // ANALYZE VIDEO WITH GEMINI
        let videoAnalysis: VideoAnalysis | null = null;
        try {
            console.log("Starting Gemini video analysis...");

            if (videoDownloadUrl) {
                videoAnalysis = await analyzeVideoWithGemini(
                    videoDownloadUrl,
                    desc,
                    duration,
                    creatorSetup,
                    views
                );
            } else {
                console.log("No video URL, falling back to cover analysis");
                videoAnalysis = await analyzeCoverWithGemini(coverUrl, desc, duration, views);
            }

            console.log("Video analysis complete");
        } catch (e) {
            console.error("Video analysis failed:", e);
            // Fallback
            videoAnalysis = await analyzeCoverWithGemini(coverUrl, desc, duration, views);
        }

        // Generate final analysis
        const analysis = generateFinalAnalysis(
            engagementMetrics,
            videoAnalysis,
            desc,
            duration,
            creatorSetup,
            views
        );

        return NextResponse.json({
            success: true,
            video: {
                id: videoId,
                url: videoUrl,
                creator: creatorName,
                description: desc,
                duration,
                coverUrl,
            },
            stats: {
                views,
                likes,
                comments,
                shares,
            },
            engagement: engagementMetrics,
            videoAnalysis,
            analysis,
            hasCreatorContext: !!creatorSetup,
        });
    } catch (error) {
        console.error("Error analyzing video:", error);
        return NextResponse.json(
            { error: "Failed to analyze video. Please try again." },
            { status: 500 }
        );
    }
}

// =================
// TYPES
// =================

interface CreatorSetup {
    teamSize: number;
    primaryDevice: string | null;
    hoursPerVideo: number;
    videosPerWeek: number;
    experienceLevel: string;
    isMuslimCreator: boolean;
    prefersNoMusic: boolean;
    availableProps: string[];
    filmingLocations: string[];
}

interface EngagementMetrics {
    engagementRate: number;
    engagementRating: "viral" | "strong" | "good" | "average" | "below_average" | "low";
    engagementFeedback: string;
    viewsRating: "viral" | "high" | "moderate" | "low" | "very_low";
    viewsFeedback: string;
    likeRate: number;
    commentRate: number;
    shareRate: number;
    overallVerdict: string;
}

interface SceneBreakdown {
    timestamp: string;
    description: string;
    whatsHappening: string;
}

interface VideoAnalysis {
    contentType: string;
    contentDescription: string;
    sceneBySceneBreakdown: SceneBreakdown[];
    peopleCount: string;
    settingType: string;
    audioType: string;
    productionQuality: string;
    whatWorked: string[];
    whatToImprove: string[];
    hookAnalysis: {
        hookType: string;
        effectiveness: string;
        score: number;
    };
    replicabilityRequirements: string[];
    analysisMethod: "full_video" | "cover_only";
}

// =================
// ENGAGEMENT CALCULATION
// =================

function calculateEngagementWithViews(
    views: number,
    likes: number,
    comments: number,
    shares: number
): EngagementMetrics {
    if (views === 0) {
        return {
            engagementRate: 0,
            engagementRating: "low",
            engagementFeedback: "No view data available",
            viewsRating: "very_low",
            viewsFeedback: "No views recorded",
            likeRate: 0,
            commentRate: 0,
            shareRate: 0,
            overallVerdict: "Unable to analyze - no data",
        };
    }

    const engagementRate = ((likes + comments + shares) / views) * 100;
    const likeRate = (likes / views) * 100;
    const commentRate = (comments / views) * 100;
    const shareRate = (shares / views) * 100;

    let engagementRating: EngagementMetrics["engagementRating"];
    let engagementFeedback: string;

    if (engagementRate >= 15) {
        engagementRating = "viral";
        engagementFeedback = "Exceptional engagement rate";
    } else if (engagementRate >= 10) {
        engagementRating = "strong";
        engagementFeedback = "Strong engagement rate";
    } else if (engagementRate >= 6) {
        engagementRating = "good";
        engagementFeedback = "Good engagement rate";
    } else if (engagementRate >= 4) {
        engagementRating = "average";
        engagementFeedback = "Average engagement";
    } else if (engagementRate >= 2) {
        engagementRating = "below_average";
        engagementFeedback = "Below average engagement";
    } else {
        engagementRating = "low";
        engagementFeedback = "Low engagement";
    }

    let viewsRating: EngagementMetrics["viewsRating"];
    let viewsFeedback: string;

    if (views >= 1000000) {
        viewsRating = "viral";
        viewsFeedback = "Viral - 1M+ views";
    } else if (views >= 100000) {
        viewsRating = "high";
        viewsFeedback = "High reach - 100K+ views";
    } else if (views >= 10000) {
        viewsRating = "moderate";
        viewsFeedback = "Moderate reach - 10K+ views";
    } else if (views >= 1000) {
        viewsRating = "low";
        viewsFeedback = "Limited reach";
    } else {
        viewsRating = "very_low";
        viewsFeedback = "Very low reach";
    }

    let overallVerdict: string;

    if (viewsRating === "viral" && (engagementRating === "viral" || engagementRating === "strong")) {
        overallVerdict = "🔥 Viral Hit";
    } else if (viewsRating === "viral" || viewsRating === "high") {
        overallVerdict = engagementRating === "low" || engagementRating === "below_average"
            ? "📊 High Reach, Low Engagement"
            : "✅ Strong Performance";
    } else if (viewsRating === "moderate") {
        overallVerdict = engagementRating === "viral" || engagementRating === "strong"
            ? "💎 Hidden Gem"
            : "📊 Average Performance";
    } else {
        overallVerdict = engagementRating === "viral" || engagementRating === "strong"
            ? "⚠️ Great Content, Low Reach"
            : "📉 Underperformed";
    }

    return {
        engagementRate: Math.round(engagementRate * 100) / 100,
        engagementRating,
        engagementFeedback,
        viewsRating,
        viewsFeedback,
        likeRate: Math.round(likeRate * 100) / 100,
        commentRate: Math.round(commentRate * 100) / 100,
        shareRate: Math.round(shareRate * 100) / 100,
        overallVerdict,
    };
}

// =================
// GEMINI VIDEO ANALYSIS
// =================

async function analyzeVideoWithGemini(
    videoUrl: string,
    caption: string,
    duration: number,
    creatorSetup: CreatorSetup | null,
    viewCount: number
): Promise<VideoAnalysis> {
    console.log("Downloading video for Gemini analysis...");

    // Download the video
    const videoResponse = await fetch(videoUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.tiktok.com/',
        }
    });

    if (!videoResponse.ok) {
        console.log("Video download failed:", videoResponse.status);
        throw new Error("Failed to download video");
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const videoBase64 = Buffer.from(videoBuffer).toString('base64');
    const fileSizeKB = Math.round(videoBuffer.byteLength / 1024);

    console.log(`Video downloaded: ${fileSizeKB}KB`);

    if (videoBuffer.byteLength < 10000) {
        throw new Error("Downloaded file too small");
    }

    // Prepare video for Gemini
    const videoPart: Part = {
        inlineData: {
            mimeType: "video/mp4",
            data: videoBase64,
        },
    };

    const prompt = `You are a TikTok video analyst. Watch this entire video carefully and provide a detailed analysis.

VIDEO INFO:
- Caption: "${caption}"
- Duration: ${duration} seconds
- Views: ${viewCount.toLocaleString()}

RULES:
1. Describe EXACTLY what happens in the video - you are WATCHING the actual video
2. Provide accurate timestamps for each scene
3. Be SPECIFIC about what you see and hear
4. NEVER use uncertainty words like "possibly", "likely", "appears to" - you are watching the video
5. NEVER suggest adding background music as an improvement
6. For improvements, only suggest things the video is NOT already doing

Return a JSON object with this EXACT structure:
{
    "contentType": "<specific type like 'car modification tips', 'comedy skit', 'cooking tutorial'>",
    "contentDescription": "<4-5 sentences describing the FULL video from start to finish - what the creator shows, says, and does>",
    "sceneBySceneBreakdown": [
        {"timestamp": "0:00-0:03", "description": "Opening/Hook", "whatsHappening": "<exact description of opening>"},
        {"timestamp": "0:03-0:15", "description": "First Topic", "whatsHappening": "<what happens in this section>"},
        {"timestamp": "0:15-0:30", "description": "Second Topic", "whatsHappening": "<what happens>"},
        {"timestamp": "0:30-end", "description": "Conclusion", "whatsHappening": "<how video ends>"}
    ],
    "peopleCount": "<exact: 'solo creator', '2 people', 'group of 5'>",
    "settingType": "<specific: 'parking lot with Infiniti G37', 'home kitchen', 'bedroom with ring light'>",
    "audioType": "<'talking/voiceover', 'original audio with talking', 'background music only', 'mixed'>",
    "productionQuality": "<'basic phone filming', 'good lighting and angles', 'professional production'>",
    "whatWorked": [
        "<specific strength based on what you SEE in the video>",
        "<another specific strength>",
        "<strength 3>"
    ],
    "whatToImprove": [
        "<specific improvement that the video is NOT already doing>",
        "<improvement 2>"
    ],
    "hookAnalysis": {
        "hookType": "<type: 'text overlay', 'verbal hook', 'visual hook', 'curiosity hook'>",
        "effectiveness": "<why it works or doesn't work>",
        "score": <1-10>
    },
    "replicabilityRequirements": [
        "<specific item needed to replicate - e.g., 'a modified car'>",
        "<requirement 2>",
        "<requirement 3>"
    ]
}`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const result = await model.generateContent([prompt, videoPart]);
        const response = await result.response;
        const text = response.text();

        console.log("Gemini response received, parsing...");

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No JSON found in Gemini response");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Filter out music suggestions
        const filterMusic = (arr: string[]) => arr.filter((s: string) =>
            !s.toLowerCase().includes("music") &&
            !s.toLowerCase().includes("audio track") &&
            !s.toLowerCase().includes("sound effect")
        );

        return {
            contentType: parsed.contentType || "Video content",
            contentDescription: parsed.contentDescription || "Unable to analyze",
            sceneBySceneBreakdown: parsed.sceneBySceneBreakdown || [],
            peopleCount: parsed.peopleCount || "Unknown",
            settingType: parsed.settingType || "Unknown",
            audioType: parsed.audioType || "Unknown",
            productionQuality: parsed.productionQuality || "Unknown",
            whatWorked: filterMusic(parsed.whatWorked || []),
            whatToImprove: filterMusic(parsed.whatToImprove || []),
            hookAnalysis: parsed.hookAnalysis || { hookType: "Unknown", effectiveness: "Unknown", score: 5 },
            replicabilityRequirements: parsed.replicabilityRequirements || [],
            analysisMethod: "full_video",
        };
    } catch (error) {
        console.error("Gemini video analysis error:", error);
        throw error;
    }
}

// Fallback: analyze cover image with Gemini
async function analyzeCoverWithGemini(
    coverUrl: string,
    caption: string,
    duration: number,
    viewCount: number
): Promise<VideoAnalysis> {
    if (!coverUrl) {
        return getDefaultAnalysis();
    }

    try {
        // Download cover image
        const imageResponse = await fetch(coverUrl);
        if (!imageResponse.ok) {
            throw new Error("Failed to download cover");
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');

        const imagePart: Part = {
            inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64,
            },
        };

        const prompt = `You are analyzing a TikTok video thumbnail. Be HONEST that you can only see the cover image.

Caption: "${caption}"
Duration: ${duration}s  
Views: ${viewCount.toLocaleString()}

Return JSON with this structure (acknowledge limitations - you only see the thumbnail):
{
    "contentType": "<type based on thumbnail>",
    "contentDescription": "<describe what you can determine from thumbnail + caption>",
    "sceneBySceneBreakdown": [{"timestamp": "thumbnail", "description": "Cover Frame", "whatsHappening": "<what's visible>"}],
    "peopleCount": "<what you can see>",
    "settingType": "<visible setting>",
    "audioType": "Cannot determine from thumbnail",
    "productionQuality": "<visible quality>",
    "whatWorked": ["<visible strength>"],
    "whatToImprove": ["<suggestion based on what you see>"],
    "hookAnalysis": {"hookType": "<type>", "effectiveness": "<analysis>", "score": <1-10>},
    "replicabilityRequirements": ["<visible requirements>"]
}`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No JSON in response");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            contentType: parsed.contentType || "Video",
            contentDescription: parsed.contentDescription || "Analysis based on thumbnail only",
            sceneBySceneBreakdown: parsed.sceneBySceneBreakdown || [],
            peopleCount: parsed.peopleCount || "Unknown",
            settingType: parsed.settingType || "Unknown",
            audioType: "Cannot determine from thumbnail",
            productionQuality: parsed.productionQuality || "Unknown",
            whatWorked: (parsed.whatWorked || []).filter((s: string) => !s.toLowerCase().includes("music")),
            whatToImprove: (parsed.whatToImprove || []).filter((s: string) => !s.toLowerCase().includes("music")),
            hookAnalysis: parsed.hookAnalysis || { hookType: "Unknown", effectiveness: "Unknown", score: 5 },
            replicabilityRequirements: parsed.replicabilityRequirements || [],
            analysisMethod: "cover_only",
        };
    } catch (error) {
        console.error("Cover analysis error:", error);
        return getDefaultAnalysis();
    }
}

function getDefaultAnalysis(): VideoAnalysis {
    return {
        contentType: "Unable to analyze",
        contentDescription: "Could not analyze video",
        sceneBySceneBreakdown: [],
        peopleCount: "Unknown",
        settingType: "Unknown",
        audioType: "Unknown",
        productionQuality: "Unknown",
        whatWorked: [],
        whatToImprove: [],
        hookAnalysis: { hookType: "Unknown", effectiveness: "Unknown", score: 5 },
        replicabilityRequirements: [],
        analysisMethod: "cover_only",
    };
}

// =================
// FINAL ANALYSIS
// =================

function generateFinalAnalysis(
    engagement: EngagementMetrics,
    videoAnalysis: VideoAnalysis | null,
    caption: string,
    duration: number,
    creatorSetup: CreatorSetup | null,
    views: number
) {
    let performanceScore = 50;

    if (engagement.viewsRating === "viral") performanceScore += 40;
    else if (engagement.viewsRating === "high") performanceScore += 32;
    else if (engagement.viewsRating === "moderate") performanceScore += 20;
    else if (engagement.viewsRating === "low") performanceScore += 8;

    if (engagement.engagementRating === "viral") performanceScore += 10;
    else if (engagement.engagementRating === "strong") performanceScore += 8;
    else if (engagement.engagementRating === "good") performanceScore += 6;
    else if (engagement.engagementRating === "average") performanceScore += 4;

    performanceScore = Math.min(100, performanceScore);
    if (views < 10000) performanceScore = Math.min(performanceScore, 65);
    if (views < 1000) performanceScore = Math.min(performanceScore, 45);

    const keyLearnings: string[] = [];

    if (creatorSetup && videoAnalysis) {
        const peopleCount = videoAnalysis.peopleCount.toLowerCase();
        if (creatorSetup.teamSize === 1 && !peopleCount.includes("solo") && !peopleCount.includes("1")) {
            keyLearnings.push(`⚠️ This video has ${videoAnalysis.peopleCount}. As a solo creator, you'd need to adapt.`);
        }
        if (videoAnalysis.replicabilityRequirements.length > 0) {
            keyLearnings.push(`📋 To replicate: ${videoAnalysis.replicabilityRequirements.join(", ")}`);
        }
    }

    if ((engagement.engagementRating === "viral" || engagement.engagementRating === "strong") &&
        (engagement.viewsRating === "low" || engagement.viewsRating === "very_low")) {
        keyLearnings.push(`💡 Good engagement but low views - algorithm didn't push it.`);
    }

    if (videoAnalysis?.analysisMethod === "full_video") {
        keyLearnings.push(`✅ Full video analyzed with Gemini AI`);
    } else if (videoAnalysis?.analysisMethod === "cover_only") {
        keyLearnings.push(`ℹ️ Analysis based on thumbnail only (video download failed)`);
    }

    return {
        performanceScore,
        verdict: engagement.overallVerdict,
        strengths: videoAnalysis?.whatWorked || [],
        improvements: videoAnalysis?.whatToImprove || [],
        keyLearnings,
    };
}
