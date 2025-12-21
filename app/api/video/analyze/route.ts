import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

        // Get video download URL - try multiple paths
        const videoPlayUrl =
            videoInfo.video?.playAddr ||
            videoInfo.video?.play_addr?.url_list?.[0] ||
            videoInfo.video?.downloadAddr ||
            videoInfo.video?.download_addr?.url_list?.[0] ||
            "";

        // Get cover/thumbnail
        const coverUrl = videoInfo.video?.cover ||
            videoInfo.video?.originCover ||
            "";

        const dynamicCover = videoInfo.video?.dynamicCover || "";

        // Map stats
        const views = stats.playCount || stats.play_count || 0;
        const likes = stats.diggCount || stats.digg_count || 0;
        const comments = stats.commentCount || stats.comment_count || 0;
        const shares = stats.shareCount || stats.share_count || 0;
        const creatorName = author.uniqueId || author.unique_id || author.nickname || "Unknown";

        console.log("Creator:", creatorName);
        console.log("Views:", views, "Duration:", duration);
        console.log("Video Play URL found:", !!videoPlayUrl);

        // Calculate engagement WITH view count factor
        const engagementMetrics = calculateEngagementWithViews(views, likes, comments, shares);

        // Extract frames from video and analyze them
        let videoAnalysis: VideoAnalysis | null = null;
        try {
            console.log("Starting video frame analysis...");

            if (videoPlayUrl) {
                // Download video and extract frames
                const frames = await extractVideoFrames(videoPlayUrl, duration);

                if (frames.length > 0) {
                    console.log(`Extracted ${frames.length} frames, analyzing...`);
                    videoAnalysis = await analyzeVideoFrames(
                        frames,
                        desc,
                        duration,
                        creatorSetup,
                        views
                    );
                } else {
                    // Fallback to cover image analysis
                    console.log("Frame extraction failed, using cover image");
                    videoAnalysis = await analyzeCoverImage(coverUrl, dynamicCover, desc, duration, views);
                }
            } else {
                // No video URL, use cover image
                videoAnalysis = await analyzeCoverImage(coverUrl, dynamicCover, desc, duration, views);
            }

            console.log("Video analysis complete");
        } catch (e) {
            console.error("Video analysis failed:", e);
            // Fallback to cover
            videoAnalysis = await analyzeCoverImage(coverUrl, dynamicCover, desc, duration, views);
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

interface VideoFrame {
    timestamp: number;
    base64: string;
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
    framesAnalyzed: number;
}

// =================
// ENGAGEMENT WITH VIEW COUNT
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
        viewsFeedback = "Limited reach - algorithm didn't push";
    } else {
        viewsRating = "very_low";
        viewsFeedback = "Very low reach - flopped";
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
            ? "⚠️ Great Content, Algorithm Didn't Push"
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
// VIDEO FRAME EXTRACTION
// =================

async function extractVideoFrames(videoUrl: string, duration: number): Promise<VideoFrame[]> {
    const frames: VideoFrame[] = [];

    try {
        console.log("Attempting to download video from:", videoUrl.substring(0, 100) + "...");

        // TikTok CDN requires specific headers to allow downloads
        const videoResponse = await fetch(videoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.tiktok.com/',
                'Sec-Fetch-Dest': 'video',
                'Sec-Fetch-Mode': 'no-cors',
                'Sec-Fetch-Site': 'cross-site',
            }
        });

        console.log("Video download response status:", videoResponse.status);
        console.log("Content-Type:", videoResponse.headers.get('content-type'));
        console.log("Content-Length:", videoResponse.headers.get('content-length'));

        if (!videoResponse.ok) {
            console.log("Video download failed with status:", videoResponse.status);
            return frames;
        }

        const contentType = videoResponse.headers.get('content-type') || '';
        if (!contentType.includes('video')) {
            console.log("Response is not a video, got:", contentType);
            // TikTok may return HTML instead of video
            return frames;
        }

        const videoBuffer = await videoResponse.arrayBuffer();
        const fileSizeKB = Math.round(videoBuffer.byteLength / 1024);
        console.log(`Video downloaded successfully: ${fileSizeKB}KB`);

        // Check if we got a real video (should be at least a few KB)
        if (videoBuffer.byteLength < 10000) {
            console.log("Downloaded file too small, likely not a video");
            return frames;
        }

        const videoBase64 = Buffer.from(videoBuffer).toString('base64');

        // Return video as base64 - GPT-4o's vision can analyze images from videos
        // We're sending the whole video and letting GPT-4o extract key frames
        frames.push({
            timestamp: 0,
            base64: `data:video/mp4;base64,${videoBase64}`
        });

        console.log("Video converted to base64 successfully");

    } catch (error) {
        console.error("Frame extraction error:", error);
    }

    return frames;
}

// =================
// VIDEO FRAME ANALYSIS WITH GPT-4O
// =================

async function analyzeVideoFrames(
    frames: VideoFrame[],
    caption: string,
    duration: number,
    creatorSetup: CreatorSetup | null,
    viewCount: number
): Promise<VideoAnalysis> {
    const systemPrompt = `You are analyzing a TikTok video. You will see frames from the video and must describe EXACTLY what happens in the video, scene by scene.

CRITICAL RULES:
1. ONLY describe what you can actually SEE in the frames
2. Be SPECIFIC - mention exact items, car models, products, actions
3. NEVER use uncertainty words like "possibly", "likely", "appears", "seems"
4. NEVER suggest adding background music
5. If you can't see something clearly, say "Not visible" - don't guess

Video info:
- Caption: "${caption}"
- Duration: ${duration} seconds
- Views: ${viewCount.toLocaleString()}

${viewCount < 10000 ? "This video has low views - analyze why it may have underperformed." : ""}`;

    const userPrompt = `Analyze this TikTok video. Look at all the frames and describe the ENTIRE video content.

Provide a detailed scene-by-scene breakdown with accurate timestamps.

Return JSON:
{
    "contentType": "<specific type: 'car modification tips', 'cooking tutorial', etc.>",
    "contentDescription": "<4-5 sentences describing the FULL video - what happens from start to finish>",
    "sceneBySceneBreakdown": [
        {"timestamp": "0:00-0:03", "description": "Opening/Hook", "whatsHappening": "<exact description of what happens>"},
        {"timestamp": "0:03-0:15", "description": "First Topic", "whatsHappening": "<what creator says/shows>"},
        {"timestamp": "0:15-0:30", "description": "Second Topic", "whatsHappening": "<what happens>"},
        {"timestamp": "0:30-end", "description": "Conclusion", "whatsHappening": "<how it ends>"}
    ],
    "peopleCount": "<exact count: 'solo creator', '2 people', etc.>",
    "settingType": "<specific setting you can see>",
    "audioType": "<'talking/voiceover', 'original audio', 'background music'>",
    "productionQuality": "<'phone filmed', 'good production', 'professional'>",
    "whatWorked": ["<specific strength based on what you SEE>", "<strength 2>", "<strength 3>"],
    "whatToImprove": ["<specific improvement NOT already in video>", "<improvement 2>"],
    "hookAnalysis": {"hookType": "<type>", "effectiveness": "<why it works/doesn't>", "score": <1-10>},
    "replicabilityRequirements": ["<specific item needed>", "<requirement 2>"]
}`;

    try {
        // Build content with frames
        const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
            { type: "text", text: userPrompt }
        ];

        // Add frames as images
        for (const frame of frames.slice(0, 5)) {
            // If it's a data URL (base64), use it directly
            if (frame.base64.startsWith('data:')) {
                content.push({
                    type: "image_url",
                    image_url: { url: frame.base64, detail: "high" }
                });
            }
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content }
            ],
            max_tokens: 2500,
            response_format: { type: "json_object" },
        });

        const responseContent = response.choices[0]?.message?.content;
        if (!responseContent) {
            throw new Error("No response from AI");
        }

        const parsed = JSON.parse(responseContent);

        return {
            contentType: parsed.contentType || "Video content",
            contentDescription: parsed.contentDescription || "Unable to analyze",
            sceneBySceneBreakdown: parsed.sceneBySceneBreakdown || [],
            peopleCount: parsed.peopleCount || "Unknown",
            settingType: parsed.settingType || "Unknown",
            audioType: parsed.audioType || "Unknown",
            productionQuality: parsed.productionQuality || "Unknown",
            whatWorked: (parsed.whatWorked || []).filter((s: string) => !s.toLowerCase().includes("music")),
            whatToImprove: (parsed.whatToImprove || []).filter((s: string) => !s.toLowerCase().includes("music")),
            hookAnalysis: parsed.hookAnalysis || { hookType: "Unknown", effectiveness: "Unknown", score: 5 },
            replicabilityRequirements: parsed.replicabilityRequirements || [],
            analysisMethod: "full_video",
            framesAnalyzed: frames.length,
        };
    } catch (error) {
        console.error("Frame analysis error:", error);
        throw error;
    }
}

// =================
// COVER IMAGE ANALYSIS (FALLBACK)
// =================

async function analyzeCoverImage(
    coverUrl: string,
    dynamicCoverUrl: string,
    caption: string,
    duration: number,
    viewCount: number
): Promise<VideoAnalysis> {
    if (!coverUrl && !dynamicCoverUrl) {
        return getDefaultAnalysis();
    }

    const systemPrompt = `You are analyzing a TikTok video thumbnail. Be HONEST that you can only see the cover image, not the full video.

RULES:
1. Only describe what you can SEE in the thumbnail
2. Acknowledge limitations - you cannot see the full video
3. Never use "possibly", "likely", "appears", "seems"
4. Never suggest adding music

Caption: "${caption}"
Duration: ${duration}s  
Views: ${viewCount.toLocaleString()}`;

    const userPrompt = `Based on this thumbnail and caption, provide your analysis. Be clear about what you CAN and CANNOT determine from just the cover.

Return JSON:
{
    "contentType": "<type based on what you can see>",
    "contentDescription": "<describe what you can determine from thumbnail + caption>",
    "sceneBySceneBreakdown": [{"timestamp": "cover", "description": "Thumbnail", "whatsHappening": "<what's shown in cover>"}],
    "peopleCount": "<what you can see>",
    "settingType": "<visible setting>",
    "audioType": "Cannot determine from thumbnail",
    "productionQuality": "<visible quality>",
    "whatWorked": ["<visible strength>"],
    "whatToImprove": ["<suggestion>"],
    "hookAnalysis": {"hookType": "<type>", "effectiveness": "<analysis>", "score": <1-10>},
    "replicabilityRequirements": ["<visible requirements>"]
}`;

    try {
        const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
            { type: "text", text: userPrompt }
        ];

        // Add cover images
        if (dynamicCoverUrl) {
            content.push({ type: "image_url", image_url: { url: dynamicCoverUrl, detail: "high" } });
        }
        if (coverUrl && coverUrl !== dynamicCoverUrl) {
            content.push({ type: "image_url", image_url: { url: coverUrl, detail: "high" } });
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content }
            ],
            max_tokens: 2000,
            response_format: { type: "json_object" },
        });

        const responseContent = response.choices[0]?.message?.content;
        if (!responseContent) throw new Error("No response");

        const parsed = JSON.parse(responseContent);

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
            framesAnalyzed: 0,
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
        framesAnalyzed: 0,
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
        if (creatorSetup.teamSize === 1 && !videoAnalysis.peopleCount.toLowerCase().includes("solo")) {
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

    if (videoAnalysis?.analysisMethod === "cover_only") {
        keyLearnings.push(`ℹ️ Analysis based on thumbnail only. Video download was not possible.`);
    } else if (videoAnalysis?.analysisMethod === "full_video") {
        keyLearnings.push(`✅ Full video analyzed (${videoAnalysis.framesAnalyzed} frames)`);
    }

    return {
        performanceScore,
        verdict: engagement.overallVerdict,
        strengths: videoAnalysis?.whatWorked || [],
        improvements: videoAnalysis?.whatToImprove || [],
        keyLearnings,
    };
}
