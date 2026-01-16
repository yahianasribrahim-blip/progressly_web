// Outlier Research API - Find viral videos from user-selected creators
// Supports both Instagram and TikTok platforms
// An outlier video = 5x or more views compared to creator's followers

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const INSTAGRAM_API_HOST = "instagram-scraper-stable-api.p.rapidapi.com";
const TIKTOK_API_HOST = "tiktok-scraper2.p.rapidapi.com";

// Minimum outlier ratio (views / followers)
const MIN_OUTLIER_RATIO = 5;
// Maximum video age in days
const MAX_DAYS_OLD = 90;

interface OutlierVideo {
    id: string;
    description: string;
    views: number;
    likes: number;
    comments: number;
    creatorUsername: string;
    creatorFollowers: number;
    outlierRatio: number;
    thumbnail: string;
    url: string;
    platform: "instagram" | "tiktok";
    daysAgo: number;
}

interface CreatorInput {
    username: string;
    platform: "instagram" | "tiktok";
}

// ============================================================================
// INSTAGRAM FUNCTIONS
// ============================================================================

async function fetchInstagramUserProfile(username: string, log: (msg: string) => void): Promise<{ followers: number; userId: string } | null> {
    try {
        const response = await fetch(`https://${INSTAGRAM_API_HOST}/get_user_info.php`, {
            method: "POST",
            headers: {
                "x-rapidapi-host": INSTAGRAM_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `username_or_url=${encodeURIComponent(username)}`,
        });

        if (!response.ok) {
            log(`Instagram profile fetch failed for @${username}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const followers = data.follower_count || data.user?.follower_count || 0;
        const userId = data.pk || data.user?.pk || "";

        if (followers > 0) {
            log(`@${username}: ${followers.toLocaleString()} followers`);
            return { followers, userId };
        }

        return null;
    } catch (error) {
        log(`Error fetching Instagram profile for @${username}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

async function fetchInstagramReels(username: string, log: (msg: string) => void): Promise<any[]> {
    try {
        const response = await fetch(`https://${INSTAGRAM_API_HOST}/get_ig_user_reels.php`, {
            method: "POST",
            cache: "no-store",
            headers: {
                "x-rapidapi-host": INSTAGRAM_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `username_or_url=${encodeURIComponent(username)}&amount=30`,
        });

        if (!response.ok) {
            log(`Instagram reels fetch failed for @${username}: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const reels = data.reels || [];
        log(`@${username}: found ${reels.length} reels`);
        return reels;
    } catch (error) {
        log(`Error fetching Instagram reels for @${username}: ${error instanceof Error ? error.message : String(error)}`);
        return [];
    }
}

async function findInstagramOutliers(username: string, log: (msg: string) => void): Promise<OutlierVideo[]> {
    // Get profile first for follower count
    const profile = await fetchInstagramUserProfile(username, log);
    if (!profile || profile.followers === 0) {
        log(`Skipping @${username}: could not get follower count`);
        return [];
    }

    // Get reels
    const reels = await fetchInstagramReels(username, log);
    if (reels.length === 0) return [];

    const now = Math.floor(Date.now() / 1000);
    const outliers: OutlierVideo[] = [];

    for (const item of reels) {
        try {
            const media = item.node?.media || item.node || item;
            if (!media || !media.code) continue;

            // Get view count
            const views = media.play_count || media.view_count || media.video_view_count || 0;
            const likes = media.like_count || 0;
            const comments = media.comment_count || 0;

            // Calculate age
            const timestamp = media.taken_at || media.taken_at_timestamp || now;
            const daysAgo = Math.floor((now - timestamp) / (24 * 60 * 60));

            // Skip if too old
            if (daysAgo > MAX_DAYS_OLD) continue;

            // Calculate outlier ratio
            const ratio = views / profile.followers;

            // Only include if meets threshold
            if (ratio >= MIN_OUTLIER_RATIO) {
                const caption = media.caption?.text || media.caption || "";
                const thumbnail =
                    media.image_versions2?.candidates?.[0]?.url ||
                    media.thumbnail_url ||
                    media.display_url ||
                    "";

                outliers.push({
                    id: media.pk || media.id || media.code,
                    description: caption.substring(0, 200),
                    views,
                    likes,
                    comments,
                    creatorUsername: username,
                    creatorFollowers: profile.followers,
                    outlierRatio: Math.round(ratio * 10) / 10,
                    thumbnail,
                    url: `https://www.instagram.com/reel/${media.code}/`,
                    platform: "instagram",
                    daysAgo,
                });

                log(`OUTLIER: @${username} - ${views.toLocaleString()} views / ${profile.followers.toLocaleString()} followers = ${ratio.toFixed(1)}x`);
            }
        } catch (parseError) {
            // Skip malformed items
        }
    }

    return outliers;
}

// ============================================================================
// TIKTOK FUNCTIONS
// ============================================================================

async function fetchTikTokUserInfo(username: string, log: (msg: string) => void): Promise<{ followers: number; secUid: string } | null> {
    try {
        const response = await fetch(`https://${TIKTOK_API_HOST}/user/info?user_name=${encodeURIComponent(username)}`, {
            method: "GET",
            headers: {
                "x-rapidapi-host": TIKTOK_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
            },
        });

        if (!response.ok) {
            log(`TikTok user info failed for @${username}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const secUid = data.data?.user?.secUid || data.data?.secUid || data.userInfo?.user?.secUid || "";
        const followers = data.data?.user?.stats?.followerCount || data.data?.stats?.followerCount || data.userInfo?.stats?.followerCount || 0;

        if (secUid && followers > 0) {
            log(`@${username}: ${followers.toLocaleString()} followers, sec_uid found`);
            return { followers, secUid };
        }

        log(`@${username}: missing sec_uid or followers`);
        return null;
    } catch (error) {
        log(`Error fetching TikTok user for @${username}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

async function fetchTikTokVideos(secUid: string, username: string, log: (msg: string) => void): Promise<any[]> {
    try {
        const response = await fetch(`https://${TIKTOK_API_HOST}/user/posts?sec_uid=${encodeURIComponent(secUid)}&count=30`, {
            method: "GET",
            headers: {
                "x-rapidapi-host": TIKTOK_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
            },
        });

        if (!response.ok) {
            log(`TikTok videos fetch failed for @${username}: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const videos = data.data?.videos || data.itemList || data.data || [];
        log(`@${username}: found ${videos.length} videos`);
        return videos;
    } catch (error) {
        log(`Error fetching TikTok videos for @${username}: ${error instanceof Error ? error.message : String(error)}`);
        return [];
    }
}

async function findTikTokOutliers(username: string, log: (msg: string) => void): Promise<OutlierVideo[]> {
    // Get user info first
    const userInfo = await fetchTikTokUserInfo(username, log);
    if (!userInfo) {
        log(`Skipping @${username}: could not get TikTok profile`);
        return [];
    }

    // Get videos
    const videos = await fetchTikTokVideos(userInfo.secUid, username, log);
    if (videos.length === 0) return [];

    const now = Math.floor(Date.now() / 1000);
    const outliers: OutlierVideo[] = [];

    for (const video of videos) {
        try {
            const views = video.stats?.playCount || video.play_count || 0;
            const likes = video.stats?.diggCount || video.digg_count || 0;
            const comments = video.stats?.commentCount || video.comment_count || 0;

            // Calculate age
            const createTime = video.createTime || video.create_time || now;
            const daysAgo = Math.floor((now - createTime) / (24 * 60 * 60));

            // Skip if too old
            if (daysAgo > MAX_DAYS_OLD) continue;

            // Calculate outlier ratio
            const ratio = views / userInfo.followers;

            if (ratio >= MIN_OUTLIER_RATIO) {
                const videoId = video.id || video.video_id || "";
                const description = video.desc || video.description || "";
                const thumbnail = video.video?.cover || video.cover_url || "";

                outliers.push({
                    id: videoId,
                    description: description.substring(0, 200),
                    views,
                    likes,
                    comments,
                    creatorUsername: username,
                    creatorFollowers: userInfo.followers,
                    outlierRatio: Math.round(ratio * 10) / 10,
                    thumbnail,
                    url: `https://www.tiktok.com/@${username}/video/${videoId}`,
                    platform: "tiktok",
                    daysAgo,
                });

                log(`OUTLIER: @${username} - ${views.toLocaleString()} views / ${userInfo.followers.toLocaleString()} followers = ${ratio.toFixed(1)}x`);
            }
        } catch (parseError) {
            // Skip malformed items
        }
    }

    return outliers;
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(request: Request) {
    const debugLog: string[] = [];
    const log = (msg: string) => {
        console.log(`[Outlier Research] ${msg}`);
        debugLog.push(`[${new Date().toISOString()}] ${msg}`);
    };

    try {
        log("Starting outlier research...");
        log(`RAPIDAPI_KEY exists: ${!!RAPIDAPI_KEY}, length: ${RAPIDAPI_KEY?.length || 0}`);

        // Auth check - admin only
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized", debug: debugLog }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });

        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Admin access required", debug: debugLog }, { status: 403 });
        }

        // Parse request body
        const body = await request.json();
        const creators: CreatorInput[] = body.creators || [];
        const minRatio = body.minRatio || MIN_OUTLIER_RATIO;
        const maxDays = body.maxDays || MAX_DAYS_OLD;

        if (!creators || creators.length === 0) {
            return NextResponse.json({
                error: "No creators provided. Add Instagram or TikTok usernames to search.",
                debug: debugLog
            }, { status: 400 });
        }

        log(`Searching ${creators.length} creators with min ratio ${minRatio}x, max age ${maxDays} days`);

        const allOutliers: OutlierVideo[] = [];
        const searchedAccounts: string[] = [];

        for (const creator of creators) {
            const { username, platform } = creator;
            searchedAccounts.push(`${platform}:@${username}`);

            log(`Processing ${platform} @${username}...`);

            try {
                if (platform === "instagram") {
                    const outliers = await findInstagramOutliers(username, log);
                    allOutliers.push(...outliers);
                } else if (platform === "tiktok") {
                    const outliers = await findTikTokOutliers(username, log);
                    allOutliers.push(...outliers);
                }
            } catch (error) {
                log(`Error processing @${username}: ${error instanceof Error ? error.message : String(error)}`);
            }

            // Rate limit protection between creators
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Deduplicate by ID
        const seenIds = new Set<string>();
        const uniqueOutliers = allOutliers.filter(v => {
            const key = `${v.platform}:${v.id}`;
            if (seenIds.has(key)) return false;
            seenIds.add(key);
            return true;
        });

        // Sort by outlier ratio (highest first)
        uniqueOutliers.sort((a, b) => b.outlierRatio - a.outlierRatio);

        log(`Found ${uniqueOutliers.length} total outliers with ratio >= ${minRatio}x`);

        return NextResponse.json({
            success: true,
            outliers: uniqueOutliers,
            accounts: searchedAccounts,
            totalOutliers: uniqueOutliers.length,
            settings: { minRatio, maxDays },
            debug: debugLog,
        });

    } catch (error) {
        console.error("Outlier research error:", error);
        return NextResponse.json({
            error: "Failed to find outliers",
            details: error instanceof Error ? error.message : "Unknown error",
            debug: debugLog,
        }, { status: 500 });
    }
}
