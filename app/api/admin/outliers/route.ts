// Outlier Finder API - Find viral video ideas for Progressly
// Admin-only endpoint to find videos with views >= 5x creator followers

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const SCRAPER_API_HOST = "tiktok-scraper2.p.rapidapi.com";

// Hashtags to search for Progressly content ideas
const PROGRESSLY_HASHTAGS = [
    "contentcreator",
    "tiktokgrowth",
    "tiktokstrategy",
    "viralvideo",
    "howtogoviral",
    "socialmediamarketing",
    "marketingtips",
    "saas",
    "startup",
    "aitools",
    "techstartup",
    "creatoreconomy",
    "growthhacking",
    "tiktoktrends",
];

// Content to filter out
const FILTER_KEYWORDS = [
    "sexy", "nsfw", "18+", "bikini", "thirst",
    "onlyfans", "of link", "link in bio for more",
];

interface OutlierVideo {
    id: string;
    description: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    creatorUsername: string;
    creatorFollowers: number;
    outlierRatio: number;
    thumbnail: string;
    url: string;
}

// Fetch user follower count
async function getCreatorFollowers(username: string): Promise<number> {
    try {
        const url = `https://${SCRAPER_API_HOST}/user/info?unique_id=${encodeURIComponent(username)}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "x-rapidapi-host": SCRAPER_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
            },
        });

        if (!response.ok) {
            console.error(`Failed to fetch user info for ${username}: ${response.status}`);
            return 0;
        }

        const data = await response.json();
        // Try different response structures
        const followers = data.data?.user?.stats?.followerCount
            || data.data?.stats?.followerCount
            || data.userInfo?.stats?.followerCount
            || data.stats?.followerCount
            || 0;

        return followers;
    } catch (error) {
        console.error(`Error fetching followers for ${username}:`, error);
        return 0;
    }
}

// Fetch videos by hashtag
async function fetchHashtagVideos(hashtag: string, count: number = 30): Promise<any[]> {
    try {
        // First get hashtag ID
        const infoUrl = `https://${SCRAPER_API_HOST}/hashtag/info?hashtag=${encodeURIComponent(hashtag)}`;

        const infoResponse = await fetch(infoUrl, {
            method: "GET",
            headers: {
                "x-rapidapi-host": SCRAPER_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
            },
        });

        if (!infoResponse.ok) {
            console.error(`Failed to fetch hashtag info for #${hashtag}`);
            return [];
        }

        const infoData = await infoResponse.json();
        const hashtagId = infoData.data?.challenge?.id || infoData.challengeInfo?.challenge?.id || "";

        if (!hashtagId) {
            console.error(`No hashtag ID found for #${hashtag}`);
            return [];
        }

        // Then get videos
        const videosUrl = `https://${SCRAPER_API_HOST}/hashtag/videos?hashtag_id=${hashtagId}&count=${count}`;

        const videosResponse = await fetch(videosUrl, {
            method: "GET",
            headers: {
                "x-rapidapi-host": SCRAPER_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
            },
        });

        if (!videosResponse.ok) {
            console.error(`Failed to fetch videos for #${hashtag}`);
            return [];
        }

        const videosData = await videosResponse.json();
        return videosData.data?.videos || videosData.itemList || videosData.data || [];
    } catch (error) {
        console.error(`Error fetching videos for #${hashtag}:`, error);
        return [];
    }
}

// Check if content is appropriate
function isContentAppropriate(description: string): boolean {
    if (!description) return true;
    const lowerDesc = description.toLowerCase();
    return !FILTER_KEYWORDS.some(keyword => lowerDesc.includes(keyword));
}

export async function GET(request: Request) {
    try {
        // Auth check - admin only
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { isAdmin: true },
        });

        if (!user?.isAdmin) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        // Get query params
        const { searchParams } = new URL(request.url);
        const hashtag = searchParams.get("hashtag") || "";
        const minRatio = parseInt(searchParams.get("minRatio") || "5");

        // Determine which hashtags to search
        const hashtagsToSearch = hashtag
            ? [hashtag]
            : PROGRESSLY_HASHTAGS.slice(0, 5); // Default: first 5 hashtags

        console.log("Searching hashtags:", hashtagsToSearch);

        // Collect all videos
        const allVideos: any[] = [];
        for (const tag of hashtagsToSearch) {
            console.log(`Fetching videos for #${tag}...`);
            const videos = await fetchHashtagVideos(tag, 20);
            allVideos.push(...videos);

            // Rate limit protection
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`Total videos fetched: ${allVideos.length}`);

        // Deduplicate by video ID
        const seenIds = new Set<string>();
        const uniqueVideos = allVideos.filter(v => {
            const id = v.id || v.video_id || "";
            if (!id || seenIds.has(id)) return false;
            seenIds.add(id);
            return true;
        });

        console.log(`Unique videos: ${uniqueVideos.length}`);

        // Filter inappropriate content
        const filteredVideos = uniqueVideos.filter(v => {
            const desc = v.desc || v.description || "";
            return isContentAppropriate(desc);
        });

        console.log(`After content filter: ${filteredVideos.length}`);

        // Get creator follower counts and calculate outlier ratio
        const outliers: OutlierVideo[] = [];
        const creatorCache = new Map<string, number>();

        for (const video of filteredVideos.slice(0, 30)) { // Limit to 30 to avoid rate limits
            const username = video.author?.uniqueId || video.author?.unique_id || "";
            const views = video.stats?.playCount || video.play_count || 0;

            if (!username || views < 10000) continue; // Skip low-view videos

            // Get follower count (use cache)
            let followers = creatorCache.get(username);
            if (followers === undefined) {
                followers = await getCreatorFollowers(username);
                creatorCache.set(username, followers);
                await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit
            }

            if (followers === 0) continue; // Skip if couldn't get followers

            const ratio = views / followers;

            if (ratio >= minRatio) {
                outliers.push({
                    id: video.id || video.video_id || "",
                    description: (video.desc || video.description || "").substring(0, 200),
                    views,
                    likes: video.stats?.diggCount || video.digg_count || 0,
                    comments: video.stats?.commentCount || video.comment_count || 0,
                    shares: video.stats?.shareCount || video.share_count || 0,
                    creatorUsername: username,
                    creatorFollowers: followers,
                    outlierRatio: Math.round(ratio * 10) / 10,
                    thumbnail: video.video?.cover || video.cover_url || "",
                    url: `https://www.tiktok.com/@${username}/video/${video.id || video.video_id}`,
                });
            }
        }

        // Sort by outlier ratio (highest first)
        outliers.sort((a, b) => b.outlierRatio - a.outlierRatio);

        console.log(`Found ${outliers.length} outliers with ratio >= ${minRatio}x`);

        return NextResponse.json({
            success: true,
            outliers: outliers.slice(0, 20),
            hashtags: hashtagsToSearch,
            totalVideosScanned: filteredVideos.length,
        });

    } catch (error) {
        console.error("Outlier finder error:", error);
        return NextResponse.json({
            error: "Failed to find outliers",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
