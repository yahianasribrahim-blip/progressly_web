import { NextResponse } from "next/server";
import { auth } from "@/auth";

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

        // Extract video ID from TikTok URL
        const videoIdMatch = videoUrl.match(/video\/(\d+)/);
        if (!videoIdMatch) {
            return NextResponse.json(
                { error: "Invalid TikTok URL. Please use a direct video link." },
                { status: 400 }
            );
        }

        const videoId = videoIdMatch[1];
        console.log("Analyzing video ID:", videoId);

        // Fetch video details from TikTok API
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
        const RAPIDAPI_HOST = "tiktok-scraper2.p.rapidapi.com";

        const videoResponse = await fetch(
            `https://${RAPIDAPI_HOST}/video/info?video_id=${videoId}`,
            {
                method: "GET",
                headers: {
                    "x-rapidapi-key": RAPIDAPI_KEY,
                    "x-rapidapi-host": RAPIDAPI_HOST,
                },
            }
        );

        if (!videoResponse.ok) {
            console.error("Failed to fetch video info:", videoResponse.status);
            return NextResponse.json(
                { error: "Failed to fetch video details. Please check the URL." },
                { status: 400 }
            );
        }

        const videoData = await videoResponse.json();
        console.log("Video data received:", Object.keys(videoData));

        // Extract video info
        const videoInfo = videoData.itemInfo?.itemStruct || videoData;

        const stats = videoInfo.stats || {};
        const author = videoInfo.author || {};
        const desc = videoInfo.desc || "";
        const duration = videoInfo.video?.duration || 0;

        // Analyze the video content
        const analysis = analyzeVideoContent(desc, stats, duration);

        return NextResponse.json({
            success: true,
            video: {
                id: videoId,
                description: desc,
                creator: author.uniqueId || author.nickname || "Unknown",
                duration: duration,
                stats: {
                    views: stats.playCount || 0,
                    likes: stats.diggCount || 0,
                    comments: stats.commentCount || 0,
                    shares: stats.shareCount || 0,
                },
            },
            analysis: analysis,
        });
    } catch (error) {
        console.error("Error analyzing video:", error);
        return NextResponse.json(
            { error: "Failed to analyze video" },
            { status: 500 }
        );
    }
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

    // Engagement analysis
    if (engagementRate > 10) {
        strengths.push("🔥 Excellent engagement rate! Your content is resonating with viewers.");
    } else if (engagementRate > 5) {
        strengths.push("✅ Good engagement rate - above average for TikTok.");
    } else if (engagementRate > 2) {
        feedback.push("📊 Average engagement rate. Consider stronger hooks to boost interaction.");
    } else {
        improvements.push("📉 Low engagement rate. Focus on creating more compelling hooks and calls-to-action.");
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
            strengths.push("📺 Longer format is working - your audience is engaged.");
        } else {
            improvements.push("⏱️ Long video with lower engagement - try trimming to the best 30-45 seconds.");
        }
    } else {
        strengths.push("⏱️ Good video length - sweet spot for TikTok.");
    }

    // Hook analysis (first part of description)
    const hook = description.split(/[.!?]/).shift() || "";
    if (hook.length < 20) {
        improvements.push("🎣 Hook seems short. Start with a bold statement, question, or POV.");
    } else if (hook.toLowerCase().includes("pov") || hook.toLowerCase().includes("how to") || hook.toLowerCase().includes("this is")) {
        strengths.push("🎣 Good hook pattern - using proven formats like POV or How-to.");
    }

    // Hashtag analysis
    const hashtags = description.match(/#\w+/g) || [];
    if (hashtags.length === 0) {
        improvements.push("📌 No hashtags found. Add 3-5 relevant hashtags for discoverability.");
    } else if (hashtags.length > 10) {
        improvements.push("📌 Too many hashtags (>10). Focus on 3-5 highly relevant ones.");
    } else if (hashtags.length >= 3 && hashtags.length <= 5) {
        strengths.push("📌 Good hashtag count - optimal for discoverability.");
    }

    // Caption length analysis
    if (description.length < 50) {
        improvements.push("✍️ Caption is quite short. Add context or a call-to-action.");
    } else if (description.length > 500) {
        feedback.push("✍️ Long caption - make sure the key message is in the first line.");
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

    // Overall score
    let score = 50; // Base score
    score += strengths.length * 10;
    score -= improvements.length * 8;
    score = Math.min(100, Math.max(0, score));

    // Determine overall verdict
    let verdict = "";
    if (score >= 80) {
        verdict = "🌟 Excellent Performance! This video is doing great.";
    } else if (score >= 60) {
        verdict = "✅ Good Performance. Keep up the good work with some tweaks.";
    } else if (score >= 40) {
        verdict = "📈 Average Performance. Apply the improvements below to boost results.";
    } else {
        verdict = "🔧 Needs Work. Focus on the key improvements listed.";
    }

    return {
        score,
        verdict,
        engagementRate: engagementRate.toFixed(2),
        strengths,
        improvements,
        feedback,
        tips: [
            "Post consistently at peak hours (7-9 AM or 7-10 PM)",
            "Reply to comments quickly to boost algorithm",
            "Create content series to build loyal audience",
            "Use trending sounds (permissible ones) to increase reach",
        ],
    };
}
