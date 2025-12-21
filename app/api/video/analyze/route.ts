import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

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
        let creatorSetup = null;
        try {
            const profile = await prisma.userProfile.findUnique({
                where: { userId: session.user.id },
                include: { creatorSetup: true },
            });
            creatorSetup = profile?.creatorSetup;
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
        let apiFound = "";

        // Try multiple endpoints to get video data
        // Endpoint 1: Video info by video_id
        console.log("Trying endpoint 1: video/info?video_id=...");
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
            apiFound = "video/info?video_id";
            console.log("Endpoint 1 success, keys:", Object.keys(videoData));
        } else {
            console.log("Endpoint 1 failed:", response1.status);
        }

        // If first endpoint didn't return proper stats, try endpoint 2
        if (!videoData?.itemInfo?.itemStruct?.stats?.playCount) {
            console.log("Trying endpoint 2: video/info_v2?video_url=...");
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
                console.log("Endpoint 2 response keys:", Object.keys(data2));
                // Only use this if it has better data
                if (data2?.itemInfo?.itemStruct?.stats?.playCount || data2?.data?.stats?.playCount) {
                    videoData = data2;
                    apiFound = "video/info_v2?video_url";
                    console.log("Endpoint 2 has better stats, using it");
                }
            } else {
                console.log("Endpoint 2 failed:", response2.status);
            }
        }

        // If still no data, try endpoint 3 with post details
        if (!videoData?.itemInfo?.itemStruct?.stats?.playCount && !videoData?.data?.stats?.playCount) {
            console.log("Trying endpoint 3: post/details...");
            const response3 = await fetch(
                `https://${RAPIDAPI_HOST}/post/details?video_id=${videoId}`,
                {
                    method: "GET",
                    headers: {
                        "x-rapidapi-key": RAPIDAPI_KEY,
                        "x-rapidapi-host": RAPIDAPI_HOST,
                    },
                }
            );

            if (response3.ok) {
                const data3 = await response3.json();
                console.log("Endpoint 3 response keys:", Object.keys(data3));
                if (data3?.stats?.playCount || data3?.itemStruct?.stats?.playCount) {
                    videoData = data3;
                    apiFound = "post/details";
                    console.log("Endpoint 3 has data, using it");
                }
            } else {
                console.log("Endpoint 3 failed:", response3.status);
            }
        }

        if (!videoData) {
            return NextResponse.json(
                { error: "Failed to fetch video details from any API endpoint. Please try again later." },
                { status: 400 }
            );
        }

        console.log("Using API endpoint:", apiFound);
        console.log("API Response status: OK");
        console.log("API Response keys:", Object.keys(videoData));
        console.log("Raw response (first 1000 chars):", JSON.stringify(videoData).substring(0, 1000));

        // Navigate through the response - the API returns nested structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let videoInfo: any = null;

        // Check various paths where data might be
        if (videoData.itemInfo?.itemStruct) {
            videoInfo = videoData.itemInfo.itemStruct;
            console.log("Found data at: itemInfo.itemStruct");
        } else if (videoData.aweme_detail) {
            videoInfo = videoData.aweme_detail;
            console.log("Found data at: aweme_detail");
        } else if (videoData.item) {
            videoInfo = videoData.item;
            console.log("Found data at: item");
        } else if (videoData.data) {
            videoInfo = videoData.data;
            console.log("Found data at: data");
        } else if (videoData.id || videoData.desc) {
            videoInfo = videoData;
            console.log("Using root level data");
        }

        if (!videoInfo) {
            console.error("Could not find video info in response");
            return NextResponse.json(
                { error: "Video data could not be parsed. The TikTok API response format may have changed." },
                { status: 400 }
            );
        }

        console.log("VideoInfo keys:", Object.keys(videoInfo));

        // Extract data with fallbacks
        const stats = videoInfo.stats || videoInfo.statistics || {};
        const author = videoInfo.author || {};
        const desc = videoInfo.desc || videoInfo.description || "";
        const duration = videoInfo.video?.duration || videoInfo.duration || 0;

        // Map to consistent format for display
        const views = stats.playCount || stats.play_count || 0;
        const likes = stats.diggCount || stats.digg_count || 0;
        const comments = stats.commentCount || stats.comment_count || 0;
        const shares = stats.shareCount || stats.share_count || 0;
        const creatorName = author.uniqueId || author.unique_id || author.nickname || "Unknown";

        console.log("=== EXTRACTED DATA ===");
        console.log("Creator:", creatorName);
        console.log("Views:", views, "Likes:", likes, "Comments:", comments, "Shares:", shares);
        console.log("Description:", desc.substring(0, 100));
        console.log("Duration:", duration);

        // Check if stats are actually populated
        const hasRealStats = views > 0 || likes > 0;
        if (!hasRealStats) {
            console.warn("WARNING: No stats found in response - API may not be returning full data");
            console.log("Stats object:", JSON.stringify(stats));
            console.log("VideoInfo object keys:", Object.keys(videoInfo));
        }

        // Generate ENHANCED analysis with hook breakdown and key learnings
        const analysis = analyzeVideoContent(
            desc,
            { playCount: views, diggCount: likes, commentCount: comments, shareCount: shares },
            duration
        );

        // Generate hook analysis
        const hookAnalysis = analyzeHook(desc);

        // Generate content structure
        const contentStructure = analyzeContentStructure(desc, duration);

        // Generate personalized key learnings based on creator setup
        const keyLearnings = generateKeyLearnings(analysis, hookAnalysis, creatorSetup);

        // Calculate replicability score based on creator's resources
        const replicability = calculateReplicability(duration, creatorSetup);

        // Add warning if stats are all zero
        if (!hasRealStats) {
            analysis.feedback = ["⚠️ Could not retrieve full video statistics. The TikTok API may be experiencing issues or the video may have restricted data access."];
        }

        return NextResponse.json({
            success: true,
            video: {
                id: videoId,
                description: desc,
                creator: creatorName,
                duration: duration,
                stats: { views, likes, comments, shares },
            },
            analysis: analysis,
            hookAnalysis: hookAnalysis,
            contentStructure: contentStructure,
            keyLearnings: keyLearnings,
            replicability: replicability,
            debug: {
                hasStats: hasRealStats,
                apiResponseKeys: Object.keys(videoData),
                statsKeys: Object.keys(stats),
                rawStatsObject: stats,
            }
        });
    } catch (error) {
        console.error("Error analyzing video:", error);
        return NextResponse.json(
            { error: "Failed to analyze video. Please try again." },
            { status: 500 }
        );
    }
}

// Analyze the hook/opening of the video
function analyzeHook(description: string) {
    const hookLine = description.split(/[.!?\n]/).shift()?.trim() || "";
    const descLower = description.toLowerCase();

    // Classify hook type
    let hookType = "Unknown";
    let hookScore = 5;
    let hookFeedback = "";

    if (/^pov[:\s]/i.test(hookLine)) {
        hookType = "POV";
        hookScore = 8;
        hookFeedback = "POV hooks are highly effective - they instantly create curiosity and immersion.";
    } else if (/\?/.test(hookLine)) {
        hookType = "Question";
        hookScore = 7;
        hookFeedback = "Questions engage viewers by making them want to know the answer.";
    } else if (/^(wait|watch|dont skip|stop scrolling)/i.test(hookLine)) {
        hookType = "Pattern Interrupt";
        hookScore = 8;
        hookFeedback = "Pattern interrupts are effective at stopping the scroll.";
    } else if (/^(this|here's|the secret|you need|nobody|everyone)/i.test(hookLine)) {
        hookType = "Bold Statement";
        hookScore = 7;
        hookFeedback = "Bold statements create intrigue and promise value.";
    } else if (/^(how to|how i|learn|tutorial|step)/i.test(hookLine)) {
        hookType = "Tutorial/How-To";
        hookScore = 6;
        hookFeedback = "Tutorial hooks work well for educational content - consider adding a curiosity element.";
    } else if (descLower.match(/(trend|viral|challenge|dance|fyp)/)) {
        hookType = "Trend/Challenge";
        hookScore = 6;
        hookFeedback = "Trending content hooks - the visual hook matters more than the caption here.";
    } else if (hookLine.length > 10) {
        hookType = "Statement";
        hookScore = 5;
        hookFeedback = "Consider starting with a question, 'POV:', or a bolder statement.";
    } else {
        hookType = "Minimal";
        hookScore = 4;
        hookFeedback = "The caption doesn't have a strong hook - the video itself likely carries the hook.";
    }

    return {
        hookLine: hookLine.substring(0, 100),
        hookType,
        hookScore,
        hookFeedback,
        suggestions: generateHookSuggestions(hookType, hookScore),
    };
}

function generateHookSuggestions(hookType: string, hookScore: number): string[] {
    const suggestions: string[] = [];

    if (hookScore < 7) {
        suggestions.push("Try starting with 'POV:' followed by a relatable scenario");
        suggestions.push("Ask a question that your target audience is already thinking");
        suggestions.push("Use 'Wait for it...' or 'You need to see this' for curiosity");
    }

    if (hookType === "Minimal" || hookType === "Unknown") {
        suggestions.push("Add a text hook in the first frame of your video");
        suggestions.push("The first 1-2 seconds should tell viewers why they should keep watching");
    }

    return suggestions.slice(0, 3);
}

// Analyze content structure
function analyzeContentStructure(description: string, duration: number) {
    // Estimate phases based on duration
    const phases: { name: string; duration: number; description: string }[] = [];

    if (duration > 0) {
        phases.push({
            name: "Hook",
            duration: Math.min(3, Math.floor(duration * 0.1)),
            description: "First 1-3 seconds to capture attention",
        });

        if (duration > 10) {
            phases.push({
                name: "Build-up",
                duration: Math.floor(duration * 0.4),
                description: "Develop the content, build tension or value",
            });

            phases.push({
                name: "Peak/Payoff",
                duration: Math.floor(duration * 0.3),
                description: "The main moment - punchline, reveal, or key insight",
            });
        }

        phases.push({
            name: "CTA/End",
            duration: Math.floor(duration * 0.2),
            description: "Call-to-action or memorable ending",
        });
    }

    // Check if description has a CTA
    const hasCTA = /follow|like|comment|share|save|link in bio|dm me/i.test(description);

    return {
        phases,
        estimatedPacing: duration <= 15 ? "Fast" : duration <= 45 ? "Medium" : "Slow",
        hasCTA,
        ctaFeedback: hasCTA
            ? "Good - this video includes a call-to-action"
            : "Consider adding a CTA to boost engagement",
    };
}

// Generate personalized key learnings based on creator setup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateKeyLearnings(analysis: any, hookAnalysis: any, creatorSetup: any) {
    const learnings: string[] = [];

    // Hook-related learnings
    if (hookAnalysis.hookScore >= 7) {
        learnings.push(`🎣 Study this hook style: "${hookAnalysis.hookType}" - it's effective and you can adapt it for your content.`);
    }

    // Based on engagement
    if (analysis.engagementRate && parseFloat(analysis.engagementRate) > 5) {
        learnings.push("📈 This video has above-average engagement - pay attention to what made viewers interact.");
    }

    // Personalized based on creator setup
    if (creatorSetup) {
        // Solo creator advice
        if (creatorSetup.teamSize === 1) {
            learnings.push("👤 As a solo creator, focus on the hook and caption - you can replicate these without a team.");
        }

        // Time-based advice
        if (creatorSetup.hoursPerVideo && creatorSetup.hoursPerVideo <= 2) {
            learnings.push("⏱️ With your time budget, prioritize the hook and structure over production polish.");
        }

        // Muslim creator advice
        if (creatorSetup.isMuslimCreator && creatorSetup.prefersNoMusic) {
            learnings.push("🔇 Note: If this video uses music, consider how you'd achieve similar energy with voice, sound effects, or nasheeds.");
        }
    } else {
        // Generic advice if no creator setup
        learnings.push("💡 Complete your Creator Profile in Settings to get personalized recommendations.");
    }

    // Add strength-based learnings
    if (analysis.strengths && analysis.strengths.length > 0) {
        learnings.push(`✅ Key strength to learn from: ${analysis.strengths[0]}`);
    }

    return learnings.slice(0, 5);
}

// Calculate how easy this video is to replicate based on creator's resources
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateReplicability(duration: number, creatorSetup: any) {
    let score = 7; // Default to medium replicability
    const factors: string[] = [];

    // Duration factor
    if (duration <= 30) {
        score += 1;
        factors.push("Short videos are easier to produce");
    } else if (duration >= 60) {
        score -= 1;
        factors.push("Longer videos require more planning");
    }

    if (creatorSetup) {
        // Time factor
        if (creatorSetup.hoursPerVideo >= 3) {
            score += 1;
            factors.push("You have enough time budget for quality production");
        } else if (creatorSetup.hoursPerVideo <= 1) {
            score -= 1;
            factors.push("Your time budget is tight - focus on simple formats");
        }

        // Equipment factor
        if (creatorSetup.hasLighting) {
            factors.push("Your lighting setup helps with quality");
        }
    }

    score = Math.min(10, Math.max(1, score));

    return {
        score,
        label: score >= 8 ? "Easy to replicate" : score >= 5 ? "Moderate effort" : "Challenging",
        factors: factors.slice(0, 3),
    };
}

// Analyze video content and provide feedback
function analyzeVideoContent(
    description: string,
    stats: { playCount?: number; diggCount?: number; commentCount?: number; shareCount?: number },
    duration: number
) {
    const feedback: string[] = [];
    const improvements: string[] = [];
    const strengths: string[] = [];

    // Engagement rate calculation
    const views = stats.playCount || 0;
    const likes = stats.diggCount || 0;
    const comments = stats.commentCount || 0;
    const shares = stats.shareCount || 0;

    const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;
    const likeRate = views > 0 ? (likes / views) * 100 : 0;

    // DETECT VIDEO TYPE based on description and patterns
    const descLower = description.toLowerCase();
    let videoType: "dance" | "tutorial" | "comedy" | "story" | "trend" | "educational" | "aesthetic" | "unknown" = "unknown";

    // Dance/Music videos - typically have music references, dance hashtags, no question-based engagement
    if (descLower.match(/(dance|dancing|choreo|moves|trend|vibe|song|music|beat|fy|fyp|foryou|foryoupage)/)) {
        videoType = "dance";
    }
    // Tutorial/Educational
    else if (descLower.match(/(how to|tutorial|learn|tip|hack|secret|step|guide|recipe|diy)/)) {
        videoType = "tutorial";
    }
    // Comedy/Entertainment
    else if (descLower.match(/(funny|comedy|joke|lol|pov|when you|me when|relatable)/)) {
        videoType = "comedy";
    }
    // Story/Personal
    else if (descLower.match(/(story|storytime|my|i am|my journey|experience)/)) {
        videoType = "story";
    }
    // Aesthetic/Lifestyle
    else if (descLower.match(/(aesthetic|lifestyle|vlog|grwm|day in|routine|outfit)/)) {
        videoType = "aesthetic";
    }
    // Default to trend if has common trend markers
    else if (descLower.match(/(trend|viral|this|wait|watch)/)) {
        videoType = "trend";
    }

    console.log("Detected video type:", videoType);

    // TYPE-SPECIFIC engagement analysis
    if (videoType === "dance" || videoType === "trend") {
        // Dance/trend videos are judged on like rate, not comments
        if (likeRate >= 10) {
            strengths.push(`💃 ${likeRate.toFixed(1)}% like rate is exceptional for a ${videoType} video! People loved this.`);
        } else if (likeRate >= 5) {
            strengths.push(`✅ ${likeRate.toFixed(1)}% like rate is solid for trending content.`);
        } else if (likeRate >= 2) {
            feedback.push(`📊 ${likeRate.toFixed(1)}% like rate is average for ${videoType} content.`);
        } else {
            improvements.push(`📉 ${likeRate.toFixed(1)}% like rate is low. For ${videoType} videos, try using a more popular sound or add a unique twist.`);
        }
    } else {
        // Other video types - engagement rate matters
        if (engagementRate > 10) {
            strengths.push(`🔥 ${engagementRate.toFixed(1)}% engagement is excellent!`);
        } else if (engagementRate > 5) {
            strengths.push(`✅ ${engagementRate.toFixed(1)}% engagement is above TikTok average.`);
        } else if (engagementRate > 2) {
            feedback.push(`📊 ${engagementRate.toFixed(1)}% engagement is average.`);
        } else {
            improvements.push(`📉 ${engagementRate.toFixed(1)}% engagement is below average.`);
        }
    }

    // Duration analysis
    if (duration < 10) {
        if (engagementRate > 5) {
            strengths.push("⚡ Short and punchy format works well for you!");
        } else {
            improvements.push("⏱️ Very short video - consider adding more value or context.");
        }
    } else if (duration > 60) {
        if (engagementRate > 3) {
            strengths.push(`📺 Your ${duration}s video held attention despite length - that's rare and valuable.`);
        } else {
            improvements.push(`⏱️ At ${duration}s, this is a long TikTok. Consider cutting it to 30-45s and keeping only the most engaging moments.`);
        }
    } else {
        strengths.push(`⏱️ ${duration}s is in the TikTok sweet spot (15-60s).`);
    }

    // Hook analysis (first part of description)
    const hook = description.split(/[.!?]/).shift() || "";
    if (hook.length < 20 && description.length > 0) {
        improvements.push(`🎣 Your caption starts with "${hook.substring(0, 30)}..." - try opening with a question, "POV:", or a bold claim to stop scrollers.`);
    } else if (hook.toLowerCase().includes("pov") || hook.toLowerCase().includes("how to") || hook.toLowerCase().includes("this is")) {
        strengths.push(`🎣 Great hook format! "${hook.substring(0, 40)}..." uses proven patterns.`);
    } else if (hook.length > 20) {
        feedback.push(`🎣 Your hook: "${hook.substring(0, 40)}..." - consider starting with "POV:", "Wait for it", or a question.`);
    }

    // Hashtag analysis
    const hashtags = description.match(/#\w+/g) || [];
    if (hashtags.length === 0 && description.length > 0) {
        improvements.push(`📌 No hashtags! Add 3-5 like #fyp #foryou plus 2-3 niche-specific ones.`);
    } else if (hashtags.length > 10) {
        improvements.push(`📌 You used ${hashtags.length} hashtags. TikTok recommends 3-5. Pick your strongest: ${hashtags.slice(0, 3).join(" ")}`);
    } else if (hashtags.length >= 3 && hashtags.length <= 5) {
        strengths.push(`📌 Perfect! ${hashtags.length} hashtags (${hashtags.slice(0, 3).join(" ")}...) is optimal for reach.`);
    } else if (hashtags.length === 1 || hashtags.length === 2) {
        improvements.push(`📌 Only ${hashtags.length} hashtag(s): ${hashtags.join(" ")}. Add 2-3 more for better discoverability.`);
    }

    // Caption length analysis
    if (description.length < 50 && description.length > 0) {
        improvements.push(`✍️ Caption is only ${description.length} characters. Add context about what viewers will learn or feel.`);
    } else if (description.length > 500) {
        feedback.push(`✍️ Your ${description.length}-character caption is long. Put your hook in the first line since TikTok truncates after 150 chars.`);
    }

    // Call to action analysis
    const ctaPatterns = ["follow", "like", "comment", "share", "save", "link in bio", "check out", "dm me"];
    const hasCTA = ctaPatterns.some(pattern => description.toLowerCase().includes(pattern));
    if (!hasCTA) {
        improvements.push("📣 No clear call-to-action. Ask viewers to like, comment, or follow.");
    } else {
        strengths.push("📣 Has a call-to-action - good for driving engagement.");
    }

    // Comments-to-likes ratio
    if (likes > 0 && comments > 0) {
        const commentRatio = comments / likes;
        if (commentRatio > 0.1) {
            strengths.push("💬 High comment-to-like ratio - your content sparks conversation!");
        } else if (commentRatio < 0.02) {
            improvements.push("💬 Low comments - ask questions or create debate-worthy content.");
        }
    }

    // Share analysis
    if (shares > 0 && views > 0) {
        const shareRate = (shares / views) * 100;
        if (shareRate > 1) {
            strengths.push("🔄 High share rate - your content is highly shareable!");
        }
    }

    // IMPROVED SCORING SYSTEM - Based primarily on actual engagement rate
    // TikTok average engagement is around 5-6%
    // Great videos get 10%+, viral videos get 15%+
    let score = 0;

    // Engagement rate is the most important factor (0-60 points)
    if (engagementRate >= 15) {
        score += 60; // Exceptional - viral level
    } else if (engagementRate >= 10) {
        score += 50; // Excellent
    } else if (engagementRate >= 6) {
        score += 40; // Good - above average  
    } else if (engagementRate >= 3) {
        score += 25; // Average
    } else if (engagementRate >= 1) {
        score += 15; // Below average
    } else {
        score += 5; // Poor
    }

    // View count matters too (0-20 points)
    if (views >= 1000000) {
        score += 20; // Viral
    } else if (views >= 100000) {
        score += 15; // Very popular
    } else if (views >= 10000) {
        score += 10; // Popular
    } else if (views >= 1000) {
        score += 5; // Decent reach
    }

    // Content quality bonuses (0-20 points)
    score += Math.min(strengths.length * 3, 12); // Max 12 points from strengths
    score -= Math.min(improvements.length * 2, 10); // Deduct for issues

    // Ensure score is between 0-100
    score = Math.min(100, Math.max(0, score));

    // Determine overall verdict based on new scoring
    let verdict = "";
    if (score >= 80) {
        verdict = "🌟 Exceptional Performance! This video is crushing it.";
    } else if (score >= 60) {
        verdict = "✅ Good Performance. Solid metrics with room to grow.";
    } else if (score >= 40) {
        verdict = "📈 Average Performance. Apply the improvements below.";
    } else if (score >= 20) {
        verdict = "⚠️ Below Average. Focus on improving engagement.";
    } else {
        verdict = "🔧 Needs Work. Study what top creators are doing differently.";
    }

    // Add engagement rate context
    let engagementContext = "";
    if (engagementRate >= 10) {
        engagementContext = "Your engagement rate is excellent! Top 10% of TikTok.";
    } else if (engagementRate >= 5) {
        engagementContext = "Your engagement rate is above average for TikTok.";
    } else if (engagementRate >= 2) {
        engagementContext = "Your engagement rate is average. The TikTok average is around 5-6%.";
    } else {
        engagementContext = "Your engagement rate is below the TikTok average (5-6%). Focus on hooks.";
    }

    // Generate SPECIFIC tips based on video TYPE and actual issues
    const tips: string[] = [];

    // TYPE-SPECIFIC tips
    if (videoType === "dance" || videoType === "trend") {
        // Dance/trend videos - focus on virality, not comments
        if (likeRate < 5) {
            tips.push(`Like rate is ${likeRate.toFixed(1)}%. For ${videoType} videos: Try a more viral sound, add a unique twist, or film in an interesting location.`);
        }
        if (shares > 0 && views > 0 && (shares / views) * 100 < 1) {
            tips.push(`Share rate is low. Make it more "send to a friend" worthy - add humor, surprise, or "you need to see this" moments.`);
        }
        if (views < 10000) {
            tips.push(`Views are under 10K. Post when your audience is most active, use trending sounds early, and add text on screen.`);
        }
        // Positive tip if doing well
        if (likeRate >= 5) {
            tips.push(`Great ${videoType} content! Keep using trending sounds early before they peak. Your timing matters.`);
        }
    } else if (videoType === "tutorial") {
        // Tutorial videos - focus on value and saves
        if (comments > 0 && likes > 0) {
            const commentRatio = (comments / likes) * 100;
            if (commentRatio < 2) {
                tips.push(`Ask "What topic should I cover next?" at the end to boost comments.`);
            }
        }
        tips.push(`Add text on screen summarizing key points - helps with "save for later" behavior.`);
    } else if (videoType === "comedy" || videoType === "story") {
        // Comedy/story - engagement and relatability
        if (shares > 0 && views > 0) {
            const shareRate = (shares / views) * 100;
            if (shareRate < 1) {
                tips.push(`Share rate is ${shareRate.toFixed(2)}%. Make the punchline/ending more "I need to send this" worthy.`);
            }
        }
        tips.push(`For ${videoType} content, the ending is everything. Nail the punchline or emotional moment.`);
    } else {
        // Generic but still specific to this video
        if (engagementRate < 5) {
            tips.push(`${engagementRate.toFixed(1)}% engagement is below average. Hook viewers in the first 1-2 seconds.`);
        }
        if (comments > 0 && likes > 0 && (comments / likes) * 100 < 2) {
            tips.push(`End with a question relevant to your topic to boost comments.`);
        }
    }

    // Universal tips but framed specifically
    const hashtagCount = (description.match(/#\w+/g) || []).length;
    if (hashtagCount < 3) {
        tips.push(`Add #fyp + 2-3 niche hashtags. You have ${hashtagCount}. More = more reach.`);
    }

    // If we somehow have no tips, add generic ones
    if (tips.length === 0) {
        tips.push(`Reply to comments quickly - it signals to TikTok that your content is worth showing.`);
        tips.push(`Create a follow-up video if this performed well.`);
    }

    return {
        score,
        verdict,
        engagementRate: engagementRate.toFixed(2),
        engagementContext,
        strengths,
        improvements,
        feedback,
        tips: tips.slice(0, 4), // Limit to 4 tips
    };
}
