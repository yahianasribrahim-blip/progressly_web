import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canUseAnalysis, recordAnalysisUsage, getUserSubscription } from "@/lib/user";
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Initialize the new Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY || "" });

// Duration limits per plan (in seconds)
const DURATION_LIMITS = {
    free: 30,      // 30 seconds max for free users
    starter: 60,   // 1 minute for starter
    creator: 180,  // 3 minutes for creator/pro
    pro: 180,      // 3 minutes for pro
};

// Analyze a single video from TikTok URL
export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check usage limits
        const usageCheck = await canUseAnalysis(session.user.id);
        if (!usageCheck.allowed) {
            return NextResponse.json({
                error: usageCheck.message || "Video analysis limit reached. Upgrade for more!",
                limitReached: true,
                remaining: usageCheck.remaining,
            }, { status: 429 });
        }

        const body = await request.json();
        const { videoUrl, videoIntention } = body;

        if (!videoUrl) {
            return NextResponse.json(
                { error: "Video URL is required" },
                { status: 400 }
            );
        }

        console.log("=== VIDEO ANALYSIS REQUEST ===");
        console.log("URL:", videoUrl);
        console.log("Intention:", videoIntention || "not specified");

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

        try {
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
                const text = await response1.text();
                if (text && text.trim()) {
                    try {
                        videoData = JSON.parse(text);
                        console.log("RapidAPI response1 parsed successfully");
                    } catch (parseError) {
                        console.log("RapidAPI response1 JSON parse failed:", text.substring(0, 100));
                    }
                } else {
                    console.log("RapidAPI response1 returned empty body");
                }
            } else {
                console.log("RapidAPI response1 status:", response1.status);
            }
        } catch (fetchError) {
            console.log("RapidAPI response1 fetch error:", fetchError);
        }

        // Try backup endpoint
        if (!videoData?.itemInfo?.itemStruct?.stats?.playCount) {
            try {
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
                    const text = await response2.text();
                    if (text && text.trim()) {
                        try {
                            const data2 = JSON.parse(text);
                            console.log("RapidAPI response2 parsed successfully");
                            if (data2?.itemInfo?.itemStruct?.stats?.playCount) {
                                videoData = data2;
                            } else if (!videoData) {
                                // Use this data if we have nothing else
                                videoData = data2;
                            }
                        } catch (parseError) {
                            console.log("RapidAPI response2 JSON parse failed:", text.substring(0, 100));
                        }
                    } else {
                        console.log("RapidAPI response2 returned empty body");
                    }
                } else {
                    console.log("RapidAPI response2 status:", response2.status);
                }
            } catch (fetchError) {
                console.log("RapidAPI response2 fetch error:", fetchError);
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

        // === DURATION LIMIT ENFORCEMENT ===
        const ADMIN_EMAIL = "yahianasribrahim@gmail.com";
        const isAdmin = session.user.email === ADMIN_EMAIL;

        if (!isAdmin) {
            const subscription = await getUserSubscription(session.user.id);
            const planType = subscription?.stripePriceId ?
                (subscription.stripePriceId.includes('pro') ? 'pro' :
                    subscription.stripePriceId.includes('creator') ? 'creator' :
                        subscription.stripePriceId.includes('starter') ? 'starter' : 'free') : 'free';

            const maxDuration = DURATION_LIMITS[planType as keyof typeof DURATION_LIMITS] || DURATION_LIMITS.free;

            if (duration > maxDuration) {
                const planUpgrade = planType === 'free' ? 'Starter' : planType === 'starter' ? 'Creator' : 'Pro';
                return NextResponse.json({
                    error: `Video too long for your plan. Maximum: ${maxDuration}s, Video: ${duration}s. Upgrade to ${planUpgrade} for longer videos!`,
                    durationLimitReached: true,
                    maxDuration,
                    videoDuration: duration,
                    currentPlan: planType,
                }, { status: 400 });
            }

            console.log(`Duration check passed: ${duration}s <= ${maxDuration}s (${planType} plan)`);
        } else {
            console.log(`Admin bypass: skipping duration limit for ${ADMIN_EMAIL}`);
        }

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

        // Calculate engagement
        const engagementMetrics = calculateEngagementWithViews(views, likes, comments, shares);

        // ANALYZE VIDEO WITH GEMINI
        let videoAnalysis: VideoAnalysis | null = null;
        let fallbackReason = "";
        try {
            console.log("Starting Gemini video analysis...");

            if (videoDownloadUrl) {
                videoAnalysis = await analyzeVideoWithGemini(
                    videoDownloadUrl,
                    desc,
                    duration,
                    creatorSetup,
                    views,
                    videoIntention
                );
            } else {
                fallbackReason = "No video download URL available from TikTok API";
                console.log("No video URL, falling back to cover analysis");
                videoAnalysis = await analyzeCoverWithGemini(coverUrl, desc, duration, views);
            }

            console.log("Video analysis complete");
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            console.error("Video analysis failed:", errorMsg);

            // If Gemini blocked for prohibited content, reject the video entirely
            // DO NOT fall back to thumbnail - this would bypass content detection
            if (errorMsg.includes("PROHIBITED_CONTENT") || errorMsg.includes("INAPPROPRIATE_CONTENT")) {
                throw new Error("INAPPROPRIATE_CONTENT: This video was blocked by AI content moderation for containing prohibited content.");
            }

            fallbackReason = `Video analysis error: ${errorMsg.substring(0, 100)}`;
            // Only fallback for non-content-related errors (network issues, etc.)
            videoAnalysis = await analyzeCoverWithGemini(coverUrl, desc, duration, views);
        }

        // Add fallback reason to videoAnalysis if it fell back
        if (fallbackReason && videoAnalysis) {
            videoAnalysis.fallbackReason = fallbackReason;
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

        // Record usage on success
        await recordAnalysisUsage(session.user.id);

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

        // Check if it's an inappropriate content error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("INAPPROPRIATE_CONTENT")) {
            return NextResponse.json(
                { error: "This video contains inappropriate content and cannot be analyzed." },
                { status: 400 }
            );
        }

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
    contentActivity: string | null;
    filmingStyle: string | null;
    contentNiche: string | null;
    contentConstraints: string | null;
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
    contentFormat: "original_content" | "edit_compilation" | "repost";
    celebritiesDetected: string;
    contentDescription: string;
    sceneBySceneBreakdown: SceneBreakdown[];
    peopleCount: string;
    settingType: string;
    audioType: string;
    cameraStyle: string;
    productionQuality: string;
    lessonsToApply: string[];
    mistakesToAvoid: string[];
    hookAnalysis: {
        hookType: string;
        effectiveness: string;
        score: number;
    };
    replicabilityRequirements: string[];
    analysisMethod: "full_video" | "cover_only";
    whyItFlopped?: string | null;
    fallbackReason?: string;
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
    viewCount: number,
    videoIntention?: string
): Promise<VideoAnalysis> {
    console.log("Downloading video for Gemini Files API analysis...");

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
    const fileSizeKB = Math.round(videoBuffer.byteLength / 1024);
    const fileSizeMB = Math.round(fileSizeKB / 1024 * 10) / 10;

    console.log(`Video downloaded: ${fileSizeMB}MB (${fileSizeKB}KB)`);

    if (videoBuffer.byteLength < 10000) {
        throw new Error("Downloaded file too small - may be an error page");
    }

    // Validate video content by checking magic bytes (MP4 files have 'ftyp' at offset 4)
    const bytes = new Uint8Array(videoBuffer.slice(0, 12));
    const hexSignature = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const isMP4 = hexSignature.includes('66747970'); // "ftyp" in hex

    if (!isMP4) {
        console.log("Downloaded content is not a valid MP4 file. Hex signature:", hexSignature.substring(0, 24));
        throw new Error("Invalid video format - content appears to be corrupted or not a video");
    }

    // Write video to temp file for Files API upload
    const tempDir = join(tmpdir(), 'progressly-videos');
    await mkdir(tempDir, { recursive: true });
    const tempFilePath = join(tempDir, `video_${Date.now()}.mp4`);

    try {
        await writeFile(tempFilePath, Buffer.from(videoBuffer));
        console.log(`Video saved to temp file: ${tempFilePath}`);

        // Upload to Gemini Files API
        console.log("Uploading to Gemini Files API...");
        const uploadedFile = await ai.files.upload({
            file: tempFilePath,
            config: { mimeType: "video/mp4" },
        });

        console.log(`File uploaded: ${uploadedFile.name}, state: ${uploadedFile.state}`);

        // Wait for file to be processed (Gemini needs to process the video)
        let file = uploadedFile;
        let attempts = 0;
        const maxAttempts = 30; // Max 30 seconds wait

        while (file.state === "PROCESSING" && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            file = await ai.files.get({ name: file.name! });
            attempts++;
            if (attempts % 5 === 0) {
                console.log(`Still processing... (${attempts}s)`);
            }
        }

        if (file.state === "FAILED") {
            throw new Error("Video processing failed on Gemini's servers");
        }

        if (file.state !== "ACTIVE") {
            throw new Error(`File not ready after ${maxAttempts}s. State: ${file.state}`);
        }

        console.log("File processed and ready for analysis");

        // Build prompt context
        const intentionContext = videoIntention
            ? `\n- Creator's Intended Purpose: "${videoIntention}" (IMPORTANT: Suggestions should align with this intent. Do NOT suggest things that contradict the video's purpose. For example, if it's ASMR/Satisfying content, don't suggest adding educational explanations.)`
            : "";

        let userNicheDescription = "";
        if (creatorSetup) {
            if (creatorSetup.contentNiche && creatorSetup.contentNiche.trim()) {
                userNicheDescription = creatorSetup.contentNiche;
            } else if (creatorSetup.contentActivity) {
                userNicheDescription = creatorSetup.contentActivity;
            }
        }
        const nicheContext = userNicheDescription
            ? `\n- ANALYZING USER'S CONTENT TYPE: ${userNicheDescription}`
            : "";

        const prompt = `You are a TikTok video analyst. Watch this entire video carefully and provide a detailed analysis.

VIDEO INFO:
- Caption: "${caption}"
- Duration: ${duration} seconds
- Views: ${viewCount.toLocaleString()}${intentionContext}${nicheContext}

RULES:
1. Describe EXACTLY what happens in the video - you are WATCHING the actual video
2. Be specific about locations, objects, actions visible
3. NEVER mention or comment on any audio/music - focus ONLY on visuals and spoken content
4. The "lessonsToApply" and "mistakesToAvoid" should NEVER reference adding music, sound effects, or audio tracks
5. Focus on: visual hooks, pacing, camera work, editing, text overlays, and spoken content if any

CONTENT MODERATION:
- If this video contains sexually explicit content, nudity, or inappropriate material involving minors, respond ONLY with: {"contentModeration": {"isSafe": false, "reason": "Contains inappropriate content"}}
- Exception: Hijab-related, modest fashion, or covered-up content is PERFECTLY FINE and should be analyzed normally
- Exception: Family/parenting content showing children in normal contexts is fine

Respond with JSON (no markdown code blocks):
{
    "contentModeration": {"isSafe": true},
    "contentType": "<type like 'Comedy Skit', 'Educational', 'Lifestyle Vlog', 'Product Review', 'Trend/Challenge'>",
    "contentFormat": "<'original_content' if creator made it, 'edit_compilation' if clips/movie edits, 'repost' if clearly stolen>",
    "celebritiesDetected": "<list celebrities/influencers if recognized, otherwise 'none'>",
    "contentDescription": "<2-3 sentences describing what happens in the video>",
    "sceneBySceneBreakdown": [
        {"timestamp": "0:00-0:03", "description": "Opening Hook", "whatsHappening": "<what specifically happens>"},
        {"timestamp": "0:03-0:15", "description": "First Topic", "whatsHappening": "<what happens in this section>"},
        {"timestamp": "0:03-0:15", "description": "First Topic", "whatsHappening": "<what happens in this section>"},
        {"timestamp": "0:15-0:30", "description": "Second Topic", "whatsHappening": "<what happens>"},
        {"timestamp": "0:30-end", "description": "Conclusion", "whatsHappening": "<how video ends>"}
    ],
    "peopleCount": "<BE ACCURATE: 'no people visible' if ZERO humans appear, 'solo creator' if 1, '2 people' if 2, etc.>",
    "settingType": "<specific: 'parking lot with car', 'home kitchen', 'bedroom with ring light'>",
    "audioType": "<'talking/voiceover', 'original audio with talking', 'background music only', 'mixed'>",
    "productionQuality": "<'basic phone filming', 'good lighting and angles', 'professional production'>",
    "lessonsToApply": [
        "<First, describe SPECIFICALLY what THIS video does well. Focus on hooks, editing, pacing - NOT music>",
        "<Second specific thing this video does. Focus on content not appearance>",
        "<Third specific thing. General takeaway that applies to ANY niche>"
    ],
    "mistakesToAvoid": [
        "<What could be done better? Focus on editing, pacing, hooks, captions - NOT on music or appearance>",
        "<Second tip - keep it helpful and specific, about content not appearance>"
    ],
    "hookAnalysis": {
        "hookType": "<type: 'text overlay', 'verbal hook', 'visual hook', 'curiosity hook'>",
        "effectiveness": "<Describe exactly how THIS video's hook works>",
        "score": <1-10>
    },
    "replicabilityRequirements": [
        "<What equipment/props would be needed to make similar content>",
        "<Second requirement>",
        "<Third requirement - technical/production needs>"
    ],
    "whyItFlopped": "<ONLY fill this if the video has low views/engagement. Explain honestly: What went wrong? If video performed well, set to null>"
}`;

        // Generate content using the uploaded file
        console.log("Sending to Gemini for analysis...");
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: createUserContent([
                createPartFromUri(file.uri!, file.mimeType!),
                prompt,
            ]),
        });

        const text = response.text;
        console.log("Gemini response received, parsing...");

        // Extract JSON from response
        const jsonMatch = text?.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No JSON found in Gemini response");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Check content moderation - reject inappropriate videos
        if (parsed.contentModeration && parsed.contentModeration.isSafe === false) {
            throw new Error(`INAPPROPRIATE_CONTENT: ${parsed.contentModeration.reason || "This video contains inappropriate content"}`);
        }

        // Filter out music suggestions (though prompt should prevent them now)
        const filterMusic = (arr: string[]) => arr.filter((s: string) =>
            !s.toLowerCase().includes("music") &&
            !s.toLowerCase().includes("audio track") &&
            !s.toLowerCase().includes("sound effect")
        );

        return {
            contentType: parsed.contentType || "Video content",
            contentFormat: parsed.contentFormat || "original_content",
            celebritiesDetected: parsed.celebritiesDetected || "none",
            contentDescription: parsed.contentDescription || "Unable to analyze",
            sceneBySceneBreakdown: parsed.sceneBySceneBreakdown || [],
            peopleCount: parsed.peopleCount || "Unknown",
            settingType: parsed.settingType || "Unknown",
            audioType: parsed.audioType || "Unknown",
            cameraStyle: parsed.cameraStyle || "Unknown",
            productionQuality: parsed.productionQuality || "Unknown",
            lessonsToApply: filterMusic(parsed.lessonsToApply || []),
            mistakesToAvoid: filterMusic(parsed.mistakesToAvoid || []),
            hookAnalysis: parsed.hookAnalysis || { hookType: "Unknown", effectiveness: "Unknown", score: 5 },
            replicabilityRequirements: parsed.replicabilityRequirements || [],
            analysisMethod: "full_video",
            whyItFlopped: parsed.whyItFlopped || null,
        };
    } finally {
        // Clean up temp file
        try {
            await unlink(tempFilePath);
            console.log("Temp file cleaned up");
        } catch {
            // Ignore cleanup errors
        }
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
    "lessonsToApply": ["<visible strength>"],
    "mistakesToAvoid": ["<suggestion based on what you see>"],
    "hookAnalysis": {"hookType": "<type>", "effectiveness": "<analysis>", "score": <1-10>},
    "replicabilityRequirements": ["<visible requirements>"]
}`;

        console.log("Cover analysis: using gemini-2.5-flash...");
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: imageBase64,
                    },
                },
                prompt,
            ],
        });

        const text = response.text;
        console.log("Cover analysis response received");

        const jsonMatch = text?.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No JSON in response");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            contentType: parsed.contentType || "Video",
            contentFormat: parsed.contentFormat || "original_content",
            celebritiesDetected: parsed.celebritiesDetected || "none",
            contentDescription: parsed.contentDescription || "Analysis based on thumbnail only",
            sceneBySceneBreakdown: parsed.sceneBySceneBreakdown || [],
            peopleCount: parsed.peopleCount || "Unknown",
            settingType: parsed.settingType || "Unknown",
            audioType: "Cannot determine from thumbnail",
            cameraStyle: "Cannot determine from thumbnail",
            productionQuality: parsed.productionQuality || "Unknown",
            lessonsToApply: (parsed.lessonsToApply || []).filter((s: string) => !s.toLowerCase().includes("music")),
            mistakesToAvoid: (parsed.mistakesToAvoid || []).filter((s: string) => !s.toLowerCase().includes("music")),
            hookAnalysis: parsed.hookAnalysis || { hookType: "Unknown", effectiveness: "Unknown", score: 5 },
            replicabilityRequirements: parsed.replicabilityRequirements || [],
            analysisMethod: "cover_only",
            whyItFlopped: parsed.whyItFlopped || null,
        };
    } catch (error) {
        console.error("Cover analysis error:", error);
        return getDefaultAnalysis();
    }
}

function getDefaultAnalysis(): VideoAnalysis {
    return {
        contentType: "Unable to analyze",
        contentFormat: "original_content",
        celebritiesDetected: "none",
        contentDescription: "Could not analyze video",
        sceneBySceneBreakdown: [],
        peopleCount: "Unknown",
        settingType: "Unknown",
        audioType: "Unknown",
        cameraStyle: "Unknown",
        productionQuality: "Unknown",
        lessonsToApply: [],
        mistakesToAvoid: [],
        hookAnalysis: { hookType: "Unknown", effectiveness: "Unknown", score: 5 },
        replicabilityRequirements: [],
        analysisMethod: "cover_only",
        whyItFlopped: null,
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
        const isEditCompilation = videoAnalysis.contentFormat === "edit_compilation";

        // Only warn if video has 2+ people AND it's NOT an edit compilation
        // Don't warn for "no people" or "solo" - those are easy for solo creators
        // Don't warn for edit compilations - the people are celebrities, not collaborators
        const hasMultiplePeople = !peopleCount.includes("solo") &&
            !peopleCount.includes("1") &&
            !peopleCount.includes("no people") &&
            !peopleCount.includes("0");
        if (creatorSetup.teamSize === 1 && hasMultiplePeople && !isEditCompilation) {
            keyLearnings.push(`⚠️ This video has ${videoAnalysis.peopleCount}. As a solo creator, you'd need to adapt.`);
        }

        // For edit compilations, show athletes detected with option to use others
        if (isEditCompilation && videoAnalysis.celebritiesDetected && videoAnalysis.celebritiesDetected !== "none") {
            keyLearnings.push(`🎬 This edit features: ${videoAnalysis.celebritiesDetected}. You can create a similar edit with these athletes or choose others in the same sport/genre.`);
        }

        if (videoAnalysis.replicabilityRequirements.length > 0) {
            keyLearnings.push(`📋 To replicate: ${videoAnalysis.replicabilityRequirements.join(", ")}`);
        }
    }

    if ((engagement.engagementRating === "viral" || engagement.engagementRating === "strong") &&
        (engagement.viewsRating === "low" || engagement.viewsRating === "very_low")) {
        keyLearnings.push(`💡 Good engagement but low views - algorithm didn't push it.`);
    }

    // Only show a note if analysis was limited to thumbnail
    if (videoAnalysis?.analysisMethod === "cover_only") {
        keyLearnings.push(`ℹ️ Analysis based on thumbnail only (video download failed)`);
    }

    return {
        performanceScore,
        verdict: engagement.overallVerdict,
        strengths: videoAnalysis?.lessonsToApply || [],
        improvements: videoAnalysis?.mistakesToAvoid || [],
        keyLearnings,
        whyItFlopped: videoAnalysis?.whyItFlopped || null,
    };
}
