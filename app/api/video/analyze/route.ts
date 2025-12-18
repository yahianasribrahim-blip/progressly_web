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

        console.log("=== VIDEO ANALYSIS REQUEST ===");
        console.log("URL:", videoUrl);

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

        // Generate analysis with REAL data - pass in the expected format
        const analysis = analyzeVideoContent(desc, { playCount: views, diggCount: likes, commentCount: comments, shareCount: shares }, duration);

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
