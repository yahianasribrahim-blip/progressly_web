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

        // Extract video ID from TikTok URL - multiple patterns
        let videoId: string | null = null;

        // Pattern 1: Standard TikTok URL with /video/
        const videoIdMatch = videoUrl.match(/video\/(\d+)/);
        if (videoIdMatch) {
            videoId = videoIdMatch[1];
        }

        // Pattern 2: Short TikTok URL (vm.tiktok.com or vt.tiktok.com)
        if (!videoId && videoUrl.includes('tiktok.com')) {
            const urlParts = videoUrl.split('/');
            const lastPart = urlParts[urlParts.length - 1].split('?')[0];
            if (/^\d+$/.test(lastPart)) {
                videoId = lastPart;
            }
        }

        if (!videoId) {
            return NextResponse.json(
                { error: "Could not extract video ID. Please use a direct TikTok video URL like: https://www.tiktok.com/@username/video/1234567890" },
                { status: 400 }
            );
        }

        console.log("Video ID extracted:", videoId);

        // Fetch video details from TikTok API
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
        const RAPIDAPI_HOST = "tiktok-scraper2.p.rapidapi.com";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let videoData: any = null;

        // Try to get video data
        console.log("Fetching video info...");
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
            console.log("Video data fetched successfully");
        }

        // Try backup endpoint if needed
        if (!videoData?.itemInfo?.itemStruct?.stats?.playCount) {
            console.log("Trying backup endpoint...");
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
                { error: "Failed to fetch video details. Please try again later." },
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

        // Extract data with fallbacks
        const stats = videoInfo.stats || videoInfo.statistics || {};
        const author = videoInfo.author || {};
        const desc = videoInfo.desc || videoInfo.description || "";
        const duration = videoInfo.video?.duration || videoInfo.duration || 0;

        // Get cover/thumbnail image URL for Vision AI analysis
        const coverUrl = videoInfo.video?.cover ||
            videoInfo.video?.dynamicCover ||
            videoInfo.video?.originCover ||
            videoInfo.cover ||
            "";

        // Map to consistent format for display
        const views = stats.playCount || stats.play_count || 0;
        const likes = stats.diggCount || stats.digg_count || 0;
        const comments = stats.commentCount || stats.comment_count || 0;
        const shares = stats.shareCount || stats.share_count || 0;
        const creatorName = author.uniqueId || author.unique_id || author.nickname || "Unknown";

        console.log("Creator:", creatorName);
        console.log("Views:", views, "Likes:", likes, "Comments:", comments, "Shares:", shares);
        console.log("Cover URL:", coverUrl ? "Found" : "Not found");

        // Calculate engagement metrics CORRECTLY
        const engagementMetrics = calculateEngagementMetrics(views, likes, comments, shares);

        // Use Vision AI to actually analyze the video content
        let visionAnalysis: VisionAnalysis | null = null;
        if (coverUrl) {
            try {
                console.log("Running Vision AI analysis on video cover...");
                visionAnalysis = await analyzeVideoWithVision(coverUrl, desc, duration, creatorSetup);
                console.log("Vision AI analysis complete");
            } catch (e) {
                console.error("Vision AI analysis failed:", e);
            }
        }

        // Generate analysis based on ACTUAL video content (from Vision AI) + stats
        const analysis = generateSmartAnalysis(
            engagementMetrics,
            visionAnalysis,
            desc,
            duration,
            creatorSetup
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
            visionAnalysis,
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
    engagementRating: "exceptional" | "above_average" | "average" | "below_average" | "poor";
    engagementFeedback: string;
    likeRate: number;
    commentRate: number;
    shareRate: number;
    likeRating: string;
    commentRating: string;
    shareRating: string;
}

interface VisionAnalysis {
    contentType: string;
    contentDescription: string;
    sceneBreakdown: string[];
    peopleCount: string;
    settingType: string;
    hasMusic: boolean;
    musicType: string | null;
    emotionalTone: string;
    productionLevel: string;
    specificStrengths: string[];
    specificImprovements: string[];
    hookAnalysis: {
        hookType: string;
        hookEffectiveness: string;
        hookScore: number;
    };
    replicabilityNotes: string[];
}

// =================
// ENGAGEMENT METRICS (FIXED)
// =================

function calculateEngagementMetrics(
    views: number,
    likes: number,
    comments: number,
    shares: number
): EngagementMetrics {
    if (views === 0) {
        return {
            engagementRate: 0,
            engagementRating: "poor",
            engagementFeedback: "No view data available",
            likeRate: 0,
            commentRate: 0,
            shareRate: 0,
            likeRating: "N/A",
            commentRating: "N/A",
            shareRating: "N/A",
        };
    }

    const engagementRate = ((likes + comments + shares) / views) * 100;
    const likeRate = (likes / views) * 100;
    const commentRate = (comments / views) * 100;
    const shareRate = (shares / views) * 100;

    // TikTok engagement rate benchmarks:
    // - Exceptional: 10%+
    // - Above average: 6-10%
    // - Average: 4-6%
    // - Below average: 2-4%
    // - Poor: <2%

    let engagementRating: EngagementMetrics["engagementRating"];
    let engagementFeedback: string;

    if (engagementRate >= 10) {
        engagementRating = "exceptional";
        engagementFeedback = "Exceptional engagement! This video is significantly outperforming typical TikTok content.";
    } else if (engagementRate >= 6) {
        engagementRating = "above_average";
        engagementFeedback = "Above average engagement. This video is performing better than most TikTok content.";
    } else if (engagementRate >= 4) {
        engagementRating = "average";
        engagementFeedback = "Average engagement for TikTok. There's room to improve hook and content to boost this.";
    } else if (engagementRate >= 2) {
        engagementRating = "below_average";
        engagementFeedback = "Below average engagement. The video may not be hooking viewers or providing enough value.";
    } else {
        engagementRating = "poor";
        engagementFeedback = "Low engagement rate. Consider analyzing successful videos in your niche and improving your hook.";
    }

    // Like rate benchmarks
    let likeRating = "Good";
    if (likeRate >= 5) likeRating = "Excellent";
    else if (likeRate >= 3) likeRating = "Good";
    else if (likeRate >= 1) likeRating = "Below average";
    else likeRating = "Low";

    // Comment rate benchmarks
    let commentRating = "Average";
    if (commentRate >= 0.5) commentRating = "High engagement";
    else if (commentRate >= 0.2) commentRating = "Good";
    else if (commentRate >= 0.05) commentRating = "Average";
    else commentRating = "Low";

    // Share rate benchmarks
    let shareRating = "Average";
    if (shareRate >= 1) shareRating = "Highly shareable";
    else if (shareRate >= 0.3) shareRating = "Good";
    else if (shareRate >= 0.1) shareRating = "Average";
    else shareRating = "Low shareability";

    return {
        engagementRate: Math.round(engagementRate * 100) / 100,
        engagementRating,
        engagementFeedback,
        likeRate: Math.round(likeRate * 100) / 100,
        commentRate: Math.round(commentRate * 100) / 100,
        shareRate: Math.round(shareRate * 100) / 100,
        likeRating,
        commentRating,
        shareRating,
    };
}

// =================
// VISION AI ANALYSIS
// =================

async function analyzeVideoWithVision(
    coverUrl: string,
    caption: string,
    duration: number,
    creatorSetup: CreatorSetup | null
): Promise<VisionAnalysis> {
    const creatorContext = creatorSetup
        ? `Creator context: ${creatorSetup.teamSize === 1 ? "Solo creator" : `Team of ${creatorSetup.teamSize}`}, ${creatorSetup.experienceLevel} experience, ${creatorSetup.isMuslimCreator ? "Muslim creator" : "General creator"}.`
        : "";

    const systemPrompt = `You are an expert TikTok/short-form video analyst. You will analyze a video thumbnail/cover image along with its caption to understand what the VIDEO CONTENT actually is.

Your job is to determine:
1. What type of content this is (skit, tutorial, voiceover, dance, transformation, story, prank, etc.)
2. What's actually happening in the video
3. How many people appear to be involved (solo, duo, group, crowd)
4. The setting (home, outdoor, studio, public place, car, etc.)
5. Whether it likely uses music or not based on the context
6. The emotional tone of the content
7. The production level (minimal/phone, moderate effort, high production)

${creatorContext}

Be SPECIFIC about what you see. Don't make assumptions - only describe what the image and caption reveal.
Return JSON only.`;

    const userPrompt = `Analyze this TikTok video:

Caption: "${caption}"
Duration: ${duration} seconds

Look at the thumbnail image and tell me:
1. What TYPE of content is this? (be specific - not "entertainment" but "prank skit", "cooking tutorial", "fitness transformation", etc.)
2. What's happening in this video based on what you can see?
3. How many people are visible/involved?
4. What's the setting?
5. Does this look like it uses background music, voice/talking, or sound effects?
6. What's the emotional tone?
7. Is this high production or phone-filmed?
8. What specific strengths does this video have?
9. What specific improvements could be made?
10. For the HOOK specifically - what type is it and how effective?
11. Could a solo creator with limited resources replicate this?

Respond in this exact JSON format:
{
    "contentType": "<specific type like 'prank skit', 'cooking tutorial', 'POV story', etc.>",
    "contentDescription": "<2-3 sentences describing what's actually happening in this video>",
    "sceneBreakdown": ["<scene 1>", "<scene 2>", "<scene 3>"],
    "peopleCount": "<solo/duo/group of X/crowd>",
    "settingType": "<specific setting>",
    "hasMusic": <true/false>,
    "musicType": "<null or 'background music', 'trending sound', 'original audio', 'voiceover'>",
    "emotionalTone": "<funny, dramatic, educational, inspiring, shocking, etc.>",
    "productionLevel": "<minimal/moderate/high>",
    "specificStrengths": ["<specific strength 1 based on actual content>", "<strength 2>"],
    "specificImprovements": ["<specific improvement 1 tailored to this video>", "<improvement 2>"],
    "hookAnalysis": {
        "hookType": "<visual hook/text hook/question/pattern interrupt/dramatic opening/etc.>",
        "hookEffectiveness": "<description of why the hook works or doesn't>",
        "hookScore": <1-10>
    },
    "replicabilityNotes": ["<specific note about what's needed to replicate>", "<resources required>"]
}`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: [
                        { type: "text", text: userPrompt },
                        { type: "image_url", image_url: { url: coverUrl, detail: "high" } }
                    ]
                }
            ],
            max_tokens: 1500,
            response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No response from Vision AI");
        }

        const parsed = JSON.parse(content);
        return {
            contentType: parsed.contentType || "Unknown",
            contentDescription: parsed.contentDescription || "Could not analyze video content",
            sceneBreakdown: parsed.sceneBreakdown || [],
            peopleCount: parsed.peopleCount || "Unknown",
            settingType: parsed.settingType || "Unknown",
            hasMusic: parsed.hasMusic ?? false,
            musicType: parsed.musicType || null,
            emotionalTone: parsed.emotionalTone || "Neutral",
            productionLevel: parsed.productionLevel || "Unknown",
            specificStrengths: parsed.specificStrengths || [],
            specificImprovements: parsed.specificImprovements || [],
            hookAnalysis: {
                hookType: parsed.hookAnalysis?.hookType || "Unknown",
                hookEffectiveness: parsed.hookAnalysis?.hookEffectiveness || "Could not analyze",
                hookScore: parsed.hookAnalysis?.hookScore || 5,
            },
            replicabilityNotes: parsed.replicabilityNotes || [],
        };
    } catch (error) {
        console.error("Vision AI error:", error);
        // Return a basic analysis if Vision AI fails
        return {
            contentType: "Video content",
            contentDescription: "Could not analyze video content with Vision AI. Analysis based on metadata only.",
            sceneBreakdown: [],
            peopleCount: "Unknown",
            settingType: "Unknown",
            hasMusic: false,
            musicType: null,
            emotionalTone: "Unknown",
            productionLevel: "Unknown",
            specificStrengths: [],
            specificImprovements: [],
            hookAnalysis: {
                hookType: "Unknown",
                hookEffectiveness: "Could not analyze hook",
                hookScore: 5,
            },
            replicabilityNotes: [],
        };
    }
}

// =================
// SMART ANALYSIS (COMBINES VISION AI + STATS)
// =================

function generateSmartAnalysis(
    engagement: EngagementMetrics,
    visionAnalysis: VisionAnalysis | null,
    caption: string,
    duration: number,
    creatorSetup: CreatorSetup | null
) {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const keyLearnings: string[] = [];

    // Add Vision AI specific insights if available
    if (visionAnalysis) {
        // Strengths from Vision AI
        strengths.push(...visionAnalysis.specificStrengths);

        // Improvements from Vision AI
        improvements.push(...visionAnalysis.specificImprovements);

        // Add content-specific learnings
        if (visionAnalysis.hookAnalysis.hookScore >= 7) {
            keyLearnings.push(`🎣 Strong ${visionAnalysis.hookAnalysis.hookType} hook - ${visionAnalysis.hookAnalysis.hookEffectiveness}`);
        } else {
            keyLearnings.push(`🎣 Hook could be stronger. Current: ${visionAnalysis.hookAnalysis.hookType}. Consider a more attention-grabbing opening.`);
        }

        // Replicability based on actual content
        if (creatorSetup) {
            const isSolo = creatorSetup.teamSize === 1;
            const peopleNeeded = visionAnalysis.peopleCount;

            if (isSolo && peopleNeeded !== "solo" && !peopleNeeded.includes("1")) {
                keyLearnings.push(`⚠️ This video requires ${peopleNeeded}. As a solo creator, you'd need to adapt this concept or find collaborators.`);
            }

            // Music considerations for Muslim creators
            if (creatorSetup.isMuslimCreator && creatorSetup.prefersNoMusic && visionAnalysis.hasMusic) {
                keyLearnings.push(`🎵 This video uses ${visionAnalysis.musicType || "background music"}. To replicate in a halal way, consider using voice, sound effects, or nasheeds instead.`);
            }

            // Production level check
            if (visionAnalysis.productionLevel === "high" && creatorSetup.hoursPerVideo < 3) {
                keyLearnings.push(`📹 This is high production content. With your ${creatorSetup.hoursPerVideo}-hour time budget, focus on the concept and adapt the production to your resources.`);
            }
        }

        // Add specific replicability notes
        if (visionAnalysis.replicabilityNotes.length > 0) {
            keyLearnings.push(`📝 To replicate: ${visionAnalysis.replicabilityNotes.join(". ")}`);
        }
    }

    // Add engagement-based insights
    if (engagement.engagementRating === "exceptional" || engagement.engagementRating === "above_average") {
        strengths.push(`Strong ${engagement.engagementRate}% engagement rate - this content resonates with viewers`);
    }

    if (engagement.shareRating === "Highly shareable" || engagement.shareRating === "Good") {
        strengths.push(`High share rate (${engagement.shareRate}%) - this content is "send to a friend" worthy`);
    }

    if (engagement.commentRating === "High engagement") {
        strengths.push(`Strong comment engagement (${engagement.commentRate}%) - viewers are actively discussing`);
    }

    // Engagement-based improvements (only if actually poor)
    if (engagement.engagementRating === "below_average" || engagement.engagementRating === "poor") {
        if (engagement.likeRating === "Low" || engagement.likeRating === "Below average") {
            improvements.push(`Like rate is ${engagement.likeRate}% - the content may not be providing enough immediate value or emotional impact`);
        }
        if (engagement.shareRating === "Low shareability") {
            improvements.push(`Share rate is low at ${engagement.shareRate}% - consider adding a surprising moment or useful tip that makes people want to share`);
        }
    }

    // Duration-based insights (only if actually problematic)
    if (duration > 90 && engagement.engagementRating !== "exceptional") {
        improvements.push(`At ${duration}s, this is a longer TikTok. If engagement is dropping, consider tighter editing to maintain attention.`);
    }

    return {
        performanceScore: calculatePerformanceScore(engagement, visionAnalysis),
        verdict: generateVerdict(engagement, visionAnalysis),
        strengths: strengths.slice(0, 5),
        improvements: improvements.slice(0, 5),
        keyLearnings: keyLearnings.slice(0, 4),
    };
}

function calculatePerformanceScore(
    engagement: EngagementMetrics,
    visionAnalysis: VisionAnalysis | null
): number {
    let score = 50; // Base score

    // Engagement score contribution (up to 30 points)
    if (engagement.engagementRating === "exceptional") score += 30;
    else if (engagement.engagementRating === "above_average") score += 22;
    else if (engagement.engagementRating === "average") score += 15;
    else if (engagement.engagementRating === "below_average") score += 8;

    // Hook score contribution (up to 20 points)
    if (visionAnalysis) {
        score += Math.round(visionAnalysis.hookAnalysis.hookScore * 2);
    }

    return Math.min(100, Math.max(0, score));
}

function generateVerdict(
    engagement: EngagementMetrics,
    visionAnalysis: VisionAnalysis | null
): string {
    if (engagement.engagementRating === "exceptional") {
        return "🔥 Exceptional Performance";
    } else if (engagement.engagementRating === "above_average") {
        return "✅ Above Average";
    } else if (engagement.engagementRating === "average") {
        return "📊 Average Performance";
    } else if (engagement.engagementRating === "below_average") {
        return "⚠️ Below Average";
    } else {
        return "📉 Needs Improvement";
    }
}
