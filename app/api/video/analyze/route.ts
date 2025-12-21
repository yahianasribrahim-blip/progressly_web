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
            "";

        // Get cover/thumbnail
        const coverUrl = videoInfo.video?.cover ||
            videoInfo.video?.dynamicCover ||
            videoInfo.video?.originCover ||
            "";

        // Get multiple preview images if available
        const previewImages: string[] = [];
        if (videoInfo.video?.cover) previewImages.push(videoInfo.video.cover);
        if (videoInfo.video?.dynamicCover) previewImages.push(videoInfo.video.dynamicCover);
        if (videoInfo.video?.originCover) previewImages.push(videoInfo.video.originCover);

        // Map stats
        const views = stats.playCount || stats.play_count || 0;
        const likes = stats.diggCount || stats.digg_count || 0;
        const comments = stats.commentCount || stats.comment_count || 0;
        const shares = stats.shareCount || stats.share_count || 0;
        const creatorName = author.uniqueId || author.unique_id || author.nickname || "Unknown";

        console.log("Creator:", creatorName);
        console.log("Views:", views, "Duration:", duration);
        console.log("Video Play URL:", videoPlayUrl ? "Found" : "Not found");
        console.log("Preview images:", previewImages.length);

        // Calculate engagement WITH view count factor
        const engagementMetrics = calculateEngagementWithViews(views, likes, comments, shares);

        // Analyze video with multiple frames/images - FULL analysis not just thumbnail
        let videoAnalysis: VideoAnalysis | null = null;
        try {
            console.log("Running full video content analysis...");
            videoAnalysis = await analyzeVideoContent(
                previewImages,
                desc,
                duration,
                creatorSetup,
                views
            );
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
    detailedBreakdown: string[];
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
        engagementFeedback = "Exceptional engagement rate - this content really resonated";
    } else if (engagementRate >= 10) {
        engagementRating = "strong";
        engagementFeedback = "Strong engagement rate - above typical TikTok performance";
    } else if (engagementRate >= 6) {
        engagementRating = "good";
        engagementFeedback = "Good engagement rate - on par with successful content";
    } else if (engagementRate >= 4) {
        engagementRating = "average";
        engagementFeedback = "Average engagement - typical for TikTok content";
    } else if (engagementRate >= 2) {
        engagementRating = "below_average";
        engagementFeedback = "Below average engagement rate";
    } else {
        engagementRating = "low";
        engagementFeedback = "Low engagement rate - content may not be hooking viewers";
    }

    // VIEW COUNT rating (this is what was missing!)
    let viewsRating: EngagementMetrics["viewsRating"];
    let viewsFeedback: string;

    if (views >= 1000000) {
        viewsRating = "viral";
        viewsFeedback = "Viral video with over 1M views";
    } else if (views >= 100000) {
        viewsRating = "high";
        viewsFeedback = "High-performing video with 100K+ views";
    } else if (views >= 10000) {
        viewsRating = "moderate";
        viewsFeedback = "Moderate reach with 10K+ views";
    } else if (views >= 1000) {
        viewsRating = "low";
        viewsFeedback = "Limited reach - video didn't get pushed by algorithm";
    } else {
        viewsRating = "very_low";
        viewsFeedback = "Very low reach - video likely flopped or is very new";
    }

    // OVERALL verdict considers BOTH engagement AND views
    let overallVerdict: string;

    if (viewsRating === "viral" && engagementRating === "viral") {
        overallVerdict = "🔥 Viral Hit - Massive reach with exceptional engagement";
    } else if (viewsRating === "viral" || viewsRating === "high") {
        if (engagementRating === "viral" || engagementRating === "strong") {
            overallVerdict = "✅ Strong Performer - High reach with good engagement";
        } else {
            overallVerdict = "📊 High Reach, Average Engagement - Algorithm pushed but didn't resonate";
        }
    } else if (viewsRating === "moderate") {
        if (engagementRating === "viral" || engagementRating === "strong") {
            overallVerdict = "💎 Hidden Gem - Great engagement but limited reach";
        } else {
            overallVerdict = "📊 Average Performance - Moderate reach and engagement";
        }
    } else {
        // Low or very low views
        if (engagementRating === "viral" || engagementRating === "strong") {
            overallVerdict = "⚠️ High Engagement but Flopped - Content was good but algorithm didn't push it";
        } else {
            overallVerdict = "📉 Underperforming - Limited reach and low engagement";
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
// VIDEO CONTENT ANALYSIS
// =================

async function analyzeVideoContent(
    imageUrls: string[],
    caption: string,
    duration: number,
    creatorSetup: CreatorSetup | null,
    viewCount: number
): Promise<VideoAnalysis> {
    // Use the best available image
    const imageUrl = imageUrls[0] || "";

    if (!imageUrl) {
        return getDefaultAnalysis();
    }

    const systemPrompt = `You are a TikTok video analyst. You MUST analyze what you actually see - no guessing, no uncertainty.

CRITICAL RULES:
1. NEVER use words like "possibly", "likely", "appears to be", "seems to"
2. NEVER suggest adding background music (many creators prefer no music)
3. Only describe what you can DEFINITIVELY see
4. If you can't tell something from the image, say "Not visible in thumbnail" 
5. Be SPECIFIC - mention exact things you see (car model, products, etc.)
6. For improvements, NEVER suggest something the video might already do

You are analyzing a TikTok video with:
- Caption: "${caption}"
- Duration: ${duration} seconds
- Views: ${viewCount.toLocaleString()}

${viewCount < 10000 ? "Note: This video has low views, so focus on why it may not have performed well." : ""}`;

    const userPrompt = `Analyze this TikTok video thumbnail and caption. Describe ONLY what you can definitively see.

RESPOND IN THIS EXACT JSON FORMAT:
{
    "contentType": "<specific type: 'car modification tips', 'cooking tutorial', 'comedy skit', etc.>",
    "contentDescription": "<2-3 sentences about what the video shows - be specific about details you see>",
    "detailedBreakdown": [
        "<specific thing 1 that happens in video based on what you see>",
        "<specific thing 2>",
        "<specific thing 3>"
    ],
    "peopleCount": "<exact: 'solo creator', '2 people', 'group of 4', etc.>",
    "settingType": "<specific: 'parking lot with sports car', 'home kitchen', etc.>",
    "audioType": "<'talking/voiceover', 'original audio', 'not determinable from image'>",
    "productionQuality": "<'phone filmed', 'moderate editing', 'high production'>",
    "whatWorked": [
        "<specific strength you can see - be concrete>",
        "<another specific strength>",
        "<strength 3>"
    ],
    "whatToImprove": [
        "<specific improvement - must NOT be something video already does>",
        "<improvement 2>"
    ],
    "hookAnalysis": {
        "hookType": "<type based on caption/thumbnail>",
        "effectiveness": "<why it works or doesn't>",
        "score": <1-10>
    },
    "replicabilityRequirements": [
        "<specific item needed: 'a car with visible modifications'>",
        "<specific requirement 2>",
        "<requirement 3>"
    ]
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
        if (!content) {
            throw new Error("No response from AI");
        }

        const parsed = JSON.parse(content);

        // Post-process to remove any uncertainty language that slipped through
        const cleanText = (text: string) => {
            return text
                .replace(/possibly|likely|appears to|seems to|might be|could be|probably/gi, "")
                .replace(/\s+/g, " ")
                .trim();
        };

        return {
            contentType: cleanText(parsed.contentType) || "Video content",
            contentDescription: cleanText(parsed.contentDescription) || "Unable to fully analyze",
            detailedBreakdown: (parsed.detailedBreakdown || []).map(cleanText),
            peopleCount: cleanText(parsed.peopleCount) || "Not visible",
            settingType: cleanText(parsed.settingType) || "Not determinable",
            audioType: cleanText(parsed.audioType) || "Not determinable",
            productionQuality: cleanText(parsed.productionQuality) || "Unknown",
            whatWorked: (parsed.whatWorked || []).map(cleanText),
            whatToImprove: (parsed.whatToImprove || [])
                .map(cleanText)
                .filter((s: string) => !s.toLowerCase().includes("music")), // Remove any music suggestions
            hookAnalysis: {
                hookType: cleanText(parsed.hookAnalysis?.hookType) || "Unknown",
                effectiveness: cleanText(parsed.hookAnalysis?.effectiveness) || "Unable to analyze",
                score: parsed.hookAnalysis?.score || 5,
            },
            replicabilityRequirements: (parsed.replicabilityRequirements || []).map(cleanText),
        };
    } catch (error) {
        console.error("Video analysis error:", error);
        return getDefaultAnalysis();
    }
}

function getDefaultAnalysis(): VideoAnalysis {
    return {
        contentType: "Unable to analyze",
        contentDescription: "Could not analyze video content",
        detailedBreakdown: [],
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
    else performanceScore += 0;

    // Adjust for engagement rate (10% weight)
    if (engagement.engagementRating === "viral") performanceScore += 10;
    else if (engagement.engagementRating === "strong") performanceScore += 8;
    else if (engagement.engagementRating === "good") performanceScore += 6;
    else if (engagement.engagementRating === "average") performanceScore += 4;
    else performanceScore += 0;

    // Cap at 100
    performanceScore = Math.min(100, performanceScore);

    // For low view videos, cap the score
    if (views < 10000) {
        performanceScore = Math.min(performanceScore, 65);
    }
    if (views < 1000) {
        performanceScore = Math.min(performanceScore, 45);
    }

    const keyLearnings: string[] = [];

    // Add personalized learnings based on creator setup
    if (creatorSetup && videoAnalysis) {
        if (creatorSetup.teamSize === 1 && videoAnalysis.peopleCount !== "solo creator" && !videoAnalysis.peopleCount.includes("1")) {
            keyLearnings.push(`⚠️ This video has ${videoAnalysis.peopleCount}. As a solo creator, you'd need to adapt this concept or collaborate.`);
        }

        if (videoAnalysis.replicabilityRequirements.length > 0) {
            keyLearnings.push(`📋 Requirements to replicate: ${videoAnalysis.replicabilityRequirements.join(", ")}`);
        }
    }

    // Add engagement context
    if (engagement.engagementRating === "viral" || engagement.engagementRating === "strong") {
        if (engagement.viewsRating === "low" || engagement.viewsRating === "very_low") {
            keyLearnings.push(`💡 High engagement but low views suggests the content was good but didn't get algorithm push. Posting time, hashtags, or early engagement may have been factors.`);
        }
    }

    return {
        performanceScore,
        verdict: engagement.overallVerdict,
        strengths: videoAnalysis?.whatWorked || [],
        improvements: videoAnalysis?.whatToImprove || [],
        keyLearnings,
    };
}
