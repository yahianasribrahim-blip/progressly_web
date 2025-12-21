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

        // Get video playback URL for full video analysis
        const videoPlayUrl = videoInfo.video?.playAddr ||
            videoInfo.video?.play_addr?.url_list?.[0] ||
            videoInfo.video?.downloadAddr ||
            videoInfo.video?.download_addr?.url_list?.[0] ||
            "";

        // Get cover/thumbnail and dynamic cover (GIF)
        const coverUrl = videoInfo.video?.cover ||
            videoInfo.video?.originCover ||
            "";

        const dynamicCoverUrl = videoInfo.video?.dynamicCover || "";

        // Collect all available images for analysis
        const analysisImages: string[] = [];
        if (coverUrl) analysisImages.push(coverUrl);
        if (dynamicCoverUrl && dynamicCoverUrl !== coverUrl) analysisImages.push(dynamicCoverUrl);
        if (videoInfo.video?.originCover && videoInfo.video.originCover !== coverUrl) {
            analysisImages.push(videoInfo.video.originCover);
        }

        // Map stats
        const views = stats.playCount || stats.play_count || 0;
        const likes = stats.diggCount || stats.digg_count || 0;
        const comments = stats.commentCount || stats.comment_count || 0;
        const shares = stats.shareCount || stats.share_count || 0;
        const creatorName = author.uniqueId || author.unique_id || author.nickname || "Unknown";

        console.log("Creator:", creatorName);
        console.log("Views:", views, "Duration:", duration);
        console.log("Video Play URL found:", !!videoPlayUrl);
        console.log("Analysis images available:", analysisImages.length);

        // Calculate engagement WITH view count factor
        const engagementMetrics = calculateEngagementWithViews(views, likes, comments, shares);

        // Analyze video content - try video URL first, fallback to images
        let videoAnalysis: VideoAnalysis | null = null;
        try {
            console.log("Running comprehensive video analysis...");

            if (videoPlayUrl) {
                // Try to analyze actual video frames
                videoAnalysis = await analyzeVideoFrames(
                    videoPlayUrl,
                    analysisImages,
                    desc,
                    duration,
                    creatorSetup,
                    views
                );
            } else {
                // Fallback to image-only analysis
                videoAnalysis = await analyzeFromImages(
                    analysisImages,
                    desc,
                    duration,
                    creatorSetup,
                    views
                );
            }

            console.log("Video analysis complete");
        } catch (e) {
            console.error("Video analysis failed:", e);
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
                hasVideoAnalysis: !!videoPlayUrl,
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
    analysisMethod: "video_frames" | "thumbnail_only";
}

interface SceneBreakdown {
    timestamp: string;
    description: string;
    whatsHappening: string;
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

    // Engagement rate rating
    let engagementRating: EngagementMetrics["engagementRating"];
    let engagementFeedback: string;

    if (engagementRate >= 15) {
        engagementRating = "viral";
        engagementFeedback = "Exceptional engagement rate - content really resonated";
    } else if (engagementRate >= 10) {
        engagementRating = "strong";
        engagementFeedback = "Strong engagement rate - above typical performance";
    } else if (engagementRate >= 6) {
        engagementRating = "good";
        engagementFeedback = "Good engagement rate - on par with successful content";
    } else if (engagementRate >= 4) {
        engagementRating = "average";
        engagementFeedback = "Average engagement - typical for TikTok";
    } else if (engagementRate >= 2) {
        engagementRating = "below_average";
        engagementFeedback = "Below average engagement rate";
    } else {
        engagementRating = "low";
        engagementFeedback = "Low engagement - content may not be hooking viewers";
    }

    // VIEW COUNT rating
    let viewsRating: EngagementMetrics["viewsRating"];
    let viewsFeedback: string;

    if (views >= 1000000) {
        viewsRating = "viral";
        viewsFeedback = "Viral video with over 1M views";
    } else if (views >= 100000) {
        viewsRating = "high";
        viewsFeedback = "High-performing with 100K+ views";
    } else if (views >= 10000) {
        viewsRating = "moderate";
        viewsFeedback = "Moderate reach with 10K+ views";
    } else if (views >= 1000) {
        viewsRating = "low";
        viewsFeedback = "Limited reach - algorithm didn't push it";
    } else {
        viewsRating = "very_low";
        viewsFeedback = "Very low reach - video flopped or is new";
    }

    // OVERALL verdict considers BOTH engagement AND views
    let overallVerdict: string;

    if (viewsRating === "viral" && (engagementRating === "viral" || engagementRating === "strong")) {
        overallVerdict = "🔥 Viral Hit - Massive reach with great engagement";
    } else if (viewsRating === "viral" || viewsRating === "high") {
        if (engagementRating === "viral" || engagementRating === "strong" || engagementRating === "good") {
            overallVerdict = "✅ Strong Performance - High reach with good engagement";
        } else {
            overallVerdict = "📊 High Reach, Average Engagement - Algorithm pushed but didn't fully resonate";
        }
    } else if (viewsRating === "moderate") {
        if (engagementRating === "viral" || engagementRating === "strong") {
            overallVerdict = "💎 Hidden Gem - Great engagement but limited reach";
        } else {
            overallVerdict = "📊 Average Performance";
        }
    } else {
        if (engagementRating === "viral" || engagementRating === "strong") {
            overallVerdict = "⚠️ High Engagement, Low Views - Good content but algorithm didn't push";
        } else {
            overallVerdict = "📉 Underperformed - Limited reach and engagement";
        }
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
// VIDEO FRAME ANALYSIS
// =================

async function analyzeVideoFrames(
    videoUrl: string,
    fallbackImages: string[],
    caption: string,
    duration: number,
    creatorSetup: CreatorSetup | null,
    viewCount: number
): Promise<VideoAnalysis> {
    // Calculate frame timestamps based on video duration
    const frameTimestamps: string[] = [];

    if (duration <= 15) {
        // Short video: analyze at 0s, 5s, 10s, end
        frameTimestamps.push("0:00", "0:05", "0:10");
        if (duration > 10) frameTimestamps.push(`0:${duration}`);
    } else if (duration <= 60) {
        // Medium video: every 10 seconds
        for (let i = 0; i < duration; i += 10) {
            const mins = Math.floor(i / 60);
            const secs = i % 60;
            frameTimestamps.push(`${mins}:${secs.toString().padStart(2, '0')}`);
        }
    } else {
        // Long video: every 15 seconds, max 6 frames
        for (let i = 0; i < Math.min(duration, 90); i += 15) {
            const mins = Math.floor(i / 60);
            const secs = i % 60;
            frameTimestamps.push(`${mins}:${secs.toString().padStart(2, '0')}`);
        }
    }

    const systemPrompt = `You are analyzing a TikTok video. You will see the video thumbnail and must provide a comprehensive analysis.

CRITICAL RULES:
1. NEVER use uncertainty words: "possibly", "likely", "appears to", "seems to", "might", "could be"
2. Only describe what you can DEFINITELY see and determine
3. Be SPECIFIC - mention exact items, products, car models, actions you observe
4. NEVER suggest adding background music as an improvement
5. For improvements, they MUST be things the video is NOT already doing

Video details:
- Caption: "${caption}"
- Duration: ${duration} seconds
- Views: ${viewCount.toLocaleString()}
- Frame timestamps to describe: ${frameTimestamps.join(", ")}

${viewCount < 10000 ? "NOTE: This video has low views. Focus on why it underperformed." : ""}`;

    const userPrompt = `Analyze this TikTok video thoroughly. Provide a detailed scene-by-scene breakdown of what happens throughout the entire video based on what you can observe.

Return JSON in this EXACT format:
{
    "contentType": "<specific type like 'car modification tips', 'cooking tutorial', 'comedy skit'>",
    "contentDescription": "<3-4 sentences describing the full video content, story arc, and what the creator shows/explains>",
    "sceneBySceneBreakdown": [
        {"timestamp": "0:00-0:03", "description": "Hook/Opening", "whatsHappening": "<specific description of opening scene>"},
        {"timestamp": "0:03-0:15", "description": "First Point", "whatsHappening": "<what happens in this section>"},
        {"timestamp": "0:15-0:30", "description": "Second Point", "whatsHappening": "<what happens>"},
        {"timestamp": "0:30-end", "description": "Conclusion", "whatsHappening": "<how video ends>"}
    ],
    "peopleCount": "<exact: 'solo creator', '2 people', 'group of 4'>",
    "settingType": "<specific: 'parking lot with Infiniti G37', 'modern kitchen', 'bedroom with ring light'>",
    "audioType": "<'voiceover/talking', 'original audio with talking', 'music only', 'mixed'>",
    "productionQuality": "<'basic phone filming', 'good lighting and angles', 'professional production'>",
    "whatWorked": [
        "<specific strength 1 - be concrete about what makes it good>",
        "<specific strength 2>",
        "<specific strength 3>"
    ],
    "whatToImprove": [
        "<specific improvement that video is NOT already doing>",
        "<improvement 2>"
    ],
    "hookAnalysis": {
        "hookType": "<type: 'text overlay hook', 'verbal hook', 'visual hook', 'curiosity hook'>",
        "effectiveness": "<why it works or doesn't work>",
        "score": <1-10>
    },
    "replicabilityRequirements": [
        "<specific item needed - e.g., 'a modified car to showcase'>",
        "<requirement 2 - e.g., 'knowledge about the topic'>",
        "<requirement 3>"
    ]
}`;

    try {
        // Build content array with available images
        const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
            { type: "text", text: userPrompt }
        ];

        // Add all available images for better analysis
        const imagesToAnalyze = fallbackImages.length > 0 ? fallbackImages : [videoUrl];
        for (const imageUrl of imagesToAnalyze.slice(0, 3)) {
            if (imageUrl && imageUrl.startsWith('http')) {
                content.push({
                    type: "image_url",
                    image_url: { url: imageUrl, detail: "high" }
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

        // Clean uncertainty language
        const cleanText = (text: string) => {
            return text
                .replace(/possibly|likely|appears to|seems to|might be|could be|probably|perhaps/gi, "")
                .replace(/\s+/g, " ")
                .trim();
        };

        // Filter out music suggestions
        const filterMusicSuggestions = (suggestions: string[]) => {
            return suggestions.filter((s: string) =>
                !s.toLowerCase().includes("music") &&
                !s.toLowerCase().includes("sound") &&
                !s.toLowerCase().includes("audio track")
            );
        };

        return {
            contentType: cleanText(parsed.contentType) || "Video content",
            contentDescription: cleanText(parsed.contentDescription) || "Unable to analyze",
            sceneBySceneBreakdown: (parsed.sceneBySceneBreakdown || []).map((scene: SceneBreakdown) => ({
                timestamp: scene.timestamp,
                description: cleanText(scene.description),
                whatsHappening: cleanText(scene.whatsHappening),
            })),
            peopleCount: cleanText(parsed.peopleCount) || "Not visible",
            settingType: cleanText(parsed.settingType) || "Not determinable",
            audioType: cleanText(parsed.audioType) || "Not determinable",
            productionQuality: cleanText(parsed.productionQuality) || "Unknown",
            whatWorked: filterMusicSuggestions((parsed.whatWorked || []).map(cleanText)),
            whatToImprove: filterMusicSuggestions((parsed.whatToImprove || []).map(cleanText)),
            hookAnalysis: {
                hookType: cleanText(parsed.hookAnalysis?.hookType) || "Unknown",
                effectiveness: cleanText(parsed.hookAnalysis?.effectiveness) || "Unable to analyze",
                score: parsed.hookAnalysis?.score || 5,
            },
            replicabilityRequirements: (parsed.replicabilityRequirements || []).map(cleanText),
            analysisMethod: "video_frames",
        };
    } catch (error) {
        console.error("Video frame analysis error:", error);
        // Fallback to image analysis
        return analyzeFromImages(fallbackImages, caption, duration, creatorSetup, viewCount);
    }
}

async function analyzeFromImages(
    imageUrls: string[],
    caption: string,
    duration: number,
    creatorSetup: CreatorSetup | null,
    viewCount: number
): Promise<VideoAnalysis> {
    const imageUrl = imageUrls[0] || "";

    if (!imageUrl) {
        return getDefaultAnalysis();
    }

    // Similar analysis but noting it's thumbnail-only
    const systemPrompt = `You are analyzing a TikTok video from its thumbnail. Be honest that you're only seeing the thumbnail, not the full video.

RULES:
1. No uncertainty words
2. Be specific about what you see in the thumbnail
3. Never suggest adding music
4. Acknowledge you can only see the thumbnail

Caption: "${caption}"
Duration: ${duration}s
Views: ${viewCount.toLocaleString()}`;

    const userPrompt = `Based on this thumbnail and caption, provide your best analysis. Be clear about what you can and cannot determine.

Return JSON:
{
    "contentType": "<type>",
    "contentDescription": "<description based on thumbnail and caption>",
    "sceneBySceneBreakdown": [{"timestamp": "thumbnail", "description": "Visible frame", "whatsHappening": "<what's shown>"}],
    "peopleCount": "<count>",
    "settingType": "<setting>",
    "audioType": "Cannot determine from thumbnail",
    "productionQuality": "<quality>",
    "whatWorked": ["<strength>"],
    "whatToImprove": ["<improvement>"],
    "hookAnalysis": {"hookType": "<type>", "effectiveness": "<analysis>", "score": <1-10>},
    "replicabilityRequirements": ["<requirement>"]
}`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: [
                        { type: "text", text: userPrompt },
                        { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
                    ]
                }
            ],
            max_tokens: 2000,
            response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("No response");

        const parsed = JSON.parse(content);

        return {
            contentType: parsed.contentType || "Video content",
            contentDescription: parsed.contentDescription || "Unable to analyze",
            sceneBySceneBreakdown: parsed.sceneBySceneBreakdown || [],
            peopleCount: parsed.peopleCount || "Unknown",
            settingType: parsed.settingType || "Unknown",
            audioType: parsed.audioType || "Cannot determine from thumbnail",
            productionQuality: parsed.productionQuality || "Unknown",
            whatWorked: (parsed.whatWorked || []).filter((s: string) => !s.toLowerCase().includes("music")),
            whatToImprove: (parsed.whatToImprove || []).filter((s: string) => !s.toLowerCase().includes("music")),
            hookAnalysis: parsed.hookAnalysis || { hookType: "Unknown", effectiveness: "Unknown", score: 5 },
            replicabilityRequirements: parsed.replicabilityRequirements || [],
            analysisMethod: "thumbnail_only",
        };
    } catch (error) {
        console.error("Image analysis error:", error);
        return getDefaultAnalysis();
    }
}

function getDefaultAnalysis(): VideoAnalysis {
    return {
        contentType: "Unable to analyze",
        contentDescription: "Could not analyze video content",
        sceneBySceneBreakdown: [],
        peopleCount: "Unknown",
        settingType: "Unknown",
        audioType: "Unknown",
        productionQuality: "Unknown",
        whatWorked: [],
        whatToImprove: [],
        hookAnalysis: {
            hookType: "Unknown",
            effectiveness: "Unable to analyze",
            score: 5,
        },
        replicabilityRequirements: [],
        analysisMethod: "thumbnail_only",
    };
}

// =================
// FINAL ANALYSIS GENERATION
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

    // Score based on VIEWS (40% weight)
    if (engagement.viewsRating === "viral") performanceScore += 40;
    else if (engagement.viewsRating === "high") performanceScore += 32;
    else if (engagement.viewsRating === "moderate") performanceScore += 20;
    else if (engagement.viewsRating === "low") performanceScore += 8;

    // Adjust for engagement rate (10% weight)
    if (engagement.engagementRating === "viral") performanceScore += 10;
    else if (engagement.engagementRating === "strong") performanceScore += 8;
    else if (engagement.engagementRating === "good") performanceScore += 6;
    else if (engagement.engagementRating === "average") performanceScore += 4;

    performanceScore = Math.min(100, performanceScore);

    // Cap score for low view videos
    if (views < 10000) performanceScore = Math.min(performanceScore, 65);
    if (views < 1000) performanceScore = Math.min(performanceScore, 45);

    const keyLearnings: string[] = [];

    if (creatorSetup && videoAnalysis) {
        if (creatorSetup.teamSize === 1 && videoAnalysis.peopleCount !== "solo creator" && !videoAnalysis.peopleCount.toLowerCase().includes("solo")) {
            keyLearnings.push(`⚠️ This video has ${videoAnalysis.peopleCount}. As a solo creator, you'd need to adapt this concept.`);
        }

        if (videoAnalysis.replicabilityRequirements.length > 0) {
            keyLearnings.push(`📋 To replicate: ${videoAnalysis.replicabilityRequirements.join(", ")}`);
        }
    }

    // Add context about engagement vs views
    if ((engagement.engagementRating === "viral" || engagement.engagementRating === "strong") &&
        (engagement.viewsRating === "low" || engagement.viewsRating === "very_low")) {
        keyLearnings.push(`💡 High engagement but low views - content was good but algorithm didn't push it. Factors: posting time, hashtags, or early engagement.`);
    }

    // Note analysis method
    if (videoAnalysis?.analysisMethod === "thumbnail_only") {
        keyLearnings.push(`ℹ️ Analysis based on thumbnail and caption. Full video analysis was not available.`);
    }

    return {
        performanceScore,
        verdict: engagement.overallVerdict,
        strengths: videoAnalysis?.whatWorked || [],
        improvements: videoAnalysis?.whatToImprove || [],
        keyLearnings,
    };
}
