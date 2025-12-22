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

    const intentionContext = videoIntention
        ? `\n- Creator's Intended Purpose: "${videoIntention}" (IMPORTANT: Suggestions should align with this intent. Do NOT suggest things that contradict the video's purpose. For example, if it's ASMR/Satisfying content, don't suggest adding educational explanations.)`
        : "";

    const prompt = `You are a TikTok video analyst. Watch this entire video carefully and provide a detailed analysis.

VIDEO INFO:
- Caption: "${caption}"
- Duration: ${duration} seconds
- Views: ${viewCount.toLocaleString()}${intentionContext}

RULES:
1. Describe EXACTLY what happens in the video - you are WATCHING the actual video
2. Provide accurate timestamps for each scene
3. Be SPECIFIC about what you see and hear
4. NEVER use uncertainty words like "possibly", "likely", "appears to" - you are watching the video
5. NEVER mention music at all - don't suggest it, don't praise it, don't talk about it
6. NEVER recommend specific editing tools or software (CapCut, Premiere, etc.)
7. For improvements, only suggest things the video is NOT already doing
8. If a video intention is specified, RESPECT IT when giving suggestions. For example:
   - ASMR/Satisfying content: Focus on visual and audio quality, pacing, not educational value
   - Educational: Focus on clarity, information delivery, structure
   - Comedy: Focus on timing, punchlines, relatability
9. Focus on MEANINGFUL details that affect the video's effectiveness. Skip trivial observations (e.g., minor clothing adjustments, tiny movements). Only describe what matters to the content.
10. USE SIMPLE LANGUAGE - write like you're explaining to a 10 year old. No fancy words. Short sentences.

CRITICAL: You MUST watch and analyze the ENTIRE video from start to finish. Do not just analyze the thumbnail or first frame.

STRICT CONTENT MODERATION (scan EVERY scene in the video):
Flag as INAPPROPRIATE if ANY of the following appear ANYWHERE in the video:

EXPLICIT CONTENT:
- Nudity or partial nudity (exposed breasts, buttocks, genitals)
- Sexually suggestive dancing focused on body parts (jiggling, twerking, bouncing)
- OnlyFans promotion or sexual content promotion
- Explicit or simulated sexual acts
- Inappropriate touching of private areas (groin, buttocks, chest) by another person
- Hands sliding over, grabbing, or groping someone's body inappropriately
- Sexual caressing or fondling even if clothed

SEXUAL SPEECH/DIALOGUE (flag if mentioned verbally or in text):
- Talk about breasts, nipples, boobs, butt, or private parts in sexual context
- "Free the nipple" or similar provocative slogans on clothing or spoken
- Sexual jokes, innuendo, or double meanings
- Arguing about showing body parts or "being allowed to show" body parts
- Talking about making clothes see-through or wet

CLOTHING/UNDRESSING:
- Intentionally making clothing wet/see-through to reveal body
- Undressing, stripping, or removing clothing in suggestive manner
- One person removing or pulling off another person's clothing (ANY type)
- Removing or pulling off hijab, niqab, or face covering from a woman (even partially)
- "Wardrobe malfunction" content or revealing clothing "accidents"
- Dragging someone into frame to show their body
- Grabbing, tugging, or pulling at someone's clothing

THIRST TRAP CONTENT:
- Content designed to sexually attract viewers (lip biting, body focus)
- Camera focus on bouncing/jiggling body parts
- Suggestive poses with revealing outfits

Do NOT flag:
- Normal fitness content (running, exercising) without sexual focus
- Swimwear in appropriate beach/pool context WITHOUT sexual behavior
- Educational content about bodies (health, anatomy) in clinical context

Return a JSON object with this EXACT structure:
{
    "contentModeration": {
        "isSafe": <true or false>,
        "reason": "<if not safe, explain why - e.g., 'sexually suggestive dancing', 'partial nudity'. If safe, leave empty string>"
    },
    "contentType": "<specific type like 'car modification tips', 'comedy skit', 'cooking tutorial'>",
    "contentFormat": "<IMPORTANT: 'original_content' if creator filmed themselves/their own content. 'edit_compilation' if video uses footage of CELEBRITIES, ATHLETES, MOVIES, TV SHOWS, or other people's content (like soccer player edits, boxing highlights, movie clips). 'repost' if it's just reposted content with no editing>",
    "celebritiesDetected": "<if contentFormat is 'edit_compilation', list who: e.g., 'Mbappe, Ronaldo'. If original content, say 'none'>",
    "contentDescription": "<MINIMUM 50 CHARACTERS. Write 4-6 sentences describing what happens in the video. Use SIMPLE, casual words like you're texting a friend. Cover the beginning, middle, and end of the video. If you write less than 50 characters, you have failed.>",
    "sceneBySceneBreakdown": [
        {"timestamp": "0:00-0:03", "description": "Opening/Hook", "whatsHappening": "<exact description of opening>"},
        {"timestamp": "0:03-0:15", "description": "First Topic", "whatsHappening": "<what happens in this section>"},
        {"timestamp": "0:15-0:30", "description": "Second Topic", "whatsHappening": "<what happens>"},
        {"timestamp": "0:30-end", "description": "Conclusion", "whatsHappening": "<how video ends>"}
    ],
    "peopleCount": "<BE ACCURATE: 'no people visible' if ZERO humans appear, 'solo creator' if 1, '2 people' if 2, etc. COUNT CAREFULLY - do not guess>",
    "subjectInfo": {
        "mainSubject": "<who is the MAIN focus? e.g., 'the creator', 'man in blue shirt', 'no main subject - product focused'>",
        "backgroundPeople": "<describe any people NOT the main subject, or 'none' if solo or no people>",
        "relationship": "<if 2+ people: 'working together' / 'against each other (prank/competition)' / 'acting individually' / 'crowd/audience'. If solo or no people: 'n/a'>"
    },
    "settingType": "<specific: 'parking lot with Infiniti G37', 'home kitchen', 'bedroom with ring light'>",
    "audioType": "<'talking/voiceover', 'original audio with talking', 'background music only', 'mixed'>",
    "cameraStyle": "<Analyze camera movement/stability: 'handheld' (shaky, natural hand movement), 'chest_mounted' (POV from chest height, stable but moves with body), 'tripod_static' (completely still, fixed position), 'gimbal_stabilized' (smooth movement, no shake), 'selfie_handheld' (facing creator, arm's length), 'screen_recording' (screen capture, no real camera)>",
    "productionQuality": "<'basic phone filming', 'good lighting and angles', 'professional production'>",
    "lessonsToApply": [
        "<When you say something is 'good' or 'effective', you MUST explain HOW to do it. Example: Instead of 'use dramatic effects', say 'Switch from color to black-and-white right when the beat drops'>",
        "<Second tip - tell them exactly WHAT to do, not just that something is good. Example: Instead of 'use quick cuts', say 'Cut to a new clip every 2-3 seconds to keep it fast'>",
        "<Third tip - be specific and actionable>"
    ],
    "mistakesToAvoid": [
        "<What could be done better? Tell them exactly HOW to fix it. Example: 'The text stayed too long - keep text on screen for only 1-2 seconds'>",
        "<Second tip - keep it helpful and specific>"
    ],
    "hookAnalysis": {
        "hookType": "<type: 'text overlay', 'verbal hook', 'visual hook', 'curiosity hook'>",
        "effectiveness": "<why it works or doesn't work>",
        "score": <1-10>
    },
    "replicabilityRequirements": [
        "<FOR EDITS: focus on editing skills needed (e.g., 'Speed ramping skills', 'Color grading', 'Finding HD footage of the athletes'). FOR ORIGINAL CONTENT: focus on props/equipment needed (e.g., 'a modified car', 'ring light')>",
        "<requirement 2 - make sure this matches the video type: editing skills for edits, physical items for original content>",
        "<requirement 3>"
    ],
    "whyItFlopped": "<ONLY fill this if the video has low views/engagement. Explain honestly: What went wrong? Algorithm issues? Hook failure? Wrong timing? Content problems? If video performed well, set to null>"
}`;

    try {
        // Try multiple model names - different accounts may have different models available
        const modelsToTry = [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
        ];

        let result;
        let successfulModel = "";

        for (const modelName of modelsToTry) {
            try {
                console.log(`Trying Gemini model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent([prompt, videoPart]);
                successfulModel = modelName;
                console.log(`Success with model: ${modelName}`);
                break;
            } catch (modelError: unknown) {
                const error = modelError as Error;
                console.log(`Model ${modelName} failed:`, error.message?.substring(0, 100));
                // Continue to next model
            }
        }

        if (!result) {
            throw new Error("All Gemini models failed");
        }

        const response = await result.response;
        const text = response.text();

        console.log(`Gemini response received from ${successfulModel}, parsing...`);

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No JSON found in Gemini response");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Check content moderation - reject inappropriate videos
        if (parsed.contentModeration && parsed.contentModeration.isSafe === false) {
            throw new Error(`INAPPROPRIATE_CONTENT: ${parsed.contentModeration.reason || "This video contains inappropriate content"}`);
        }

        // Filter out music suggestions
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

        // Try multiple model names
        const modelsToTry = [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
        ];

        let result;
        for (const modelName of modelsToTry) {
            try {
                console.log(`Cover analysis: trying ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent([prompt, imagePart]);
                console.log(`Cover analysis: success with ${modelName}`);
                break;
            } catch {
                console.log(`Cover analysis: ${modelName} failed`);
            }
        }

        if (!result) {
            throw new Error("All models failed for cover analysis");
        }

        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
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
