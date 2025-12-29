// Outlier Finder API - Find viral video ideas for Progressly
// Admin-only endpoint to find videos with views >= 5x creator followers

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const SCRAPER_API_HOST = "tiktok-scraper2.p.rapidapi.com";

// SaaS/Software companies with TikTok accounts to analyze for replicable content
// These are companies similar to Progressly that have successful TikTok presence
const SAAS_ACCOUNTS = [
    // Major SaaS companies with great TikTok content
    "duolingo",           // Language learning app - famous for viral TikTok
    "canva",              // Design tool
    "notion",             // Productivity tool
    "figma",              // Design tool
    "lfrfrancis",         // Loom's TikTok
    "shopify",            // E-commerce platform
    "hubspot",            // CRM/Marketing
    "mailchimp",          // Email marketing
    "calendly",           // Scheduling tool
    "grammarly",          // Writing tool
    "capcut",             // Video editing
    "clickup",            // Project management
    "monday.com",         // Work management
    "airtable",           // Database/spreadsheet
    "typeform",           // Forms/surveys
    "zapier",             // Automation
    "webflow",            // Website builder
    "framer",             // Website builder
    "stripe",             // Payments
    "intercom",           // Customer messaging
    // Smaller SaaS/creator tools
    "beehiiv",            // Newsletter platform
    "convertkit",         // Creator email
    "podia",              // Course platform
    "gumroad",            // Digital products
    "lemonadeinc",        // Insurance
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
// Track if we've logged the first response (for debugging)
let hasLoggedFirstUserResponse = false;

// Fetch user follower count - try multiple endpoint formats
async function getCreatorFollowers(username: string, secUid: string, log?: (msg: string) => void): Promise<number> {
    // List of endpoint formats to try - user_name is the correct parameter
    const endpoints: string[] = [
        `/user/info?user_name=${encodeURIComponent(username)}`,  // Correct format!
    ];

    // Also try sec_uid if available
    if (secUid) {
        endpoints.push(`/user/info?sec_uid=${encodeURIComponent(secUid)}`);
    }

    for (const endpoint of endpoints) {
        try {
            const url = `https://${SCRAPER_API_HOST}${endpoint}`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "x-rapidapi-host": SCRAPER_API_HOST,
                    "x-rapidapi-key": RAPIDAPI_KEY,
                },
            });

            if (!response.ok) {
                continue; // Try next endpoint
            }

            const data = await response.json();

            // Skip if empty response
            if (!data || Object.keys(data).length === 0) {
                continue; // Try next endpoint
            }

            // Log the first full response to see the structure
            if (!hasLoggedFirstUserResponse && log) {
                log(`USER API SUCCESS at ${endpoint}`);
                log(`RESPONSE STRUCTURE: ${JSON.stringify(data).substring(0, 800)}`);
                hasLoggedFirstUserResponse = true;
            }

            // Try different response structures
            const followers = data.data?.user?.stats?.followerCount
                || data.data?.stats?.followerCount
                || data.userInfo?.stats?.followerCount
                || data.userInfo?.user?.stats?.followerCount
                || data.stats?.followerCount
                || data.user?.stats?.followerCount
                || data.followerCount
                || data.data?.followerCount
                || 0;

            if (followers > 0) {
                return followers;
            }
        } catch (error) {
            continue; // Try next endpoint
        }
    }

    // If all endpoints fail, log it
    if (!hasLoggedFirstUserResponse && log) {
        log(`ALL ENDPOINTS FAILED for @${username}`);
        hasLoggedFirstUserResponse = true;
    }

    return 0;
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

// Fetch videos from a specific user account (for SaaS company research)
async function fetchUserVideos(username: string, count: number = 30, log?: (msg: string) => void): Promise<any[]> {
    try {
        // First get user info to get sec_uid
        const userInfoUrl = `https://${SCRAPER_API_HOST}/user/info?user_name=${encodeURIComponent(username)}`;

        const userResponse = await fetch(userInfoUrl, {
            method: "GET",
            headers: {
                "x-rapidapi-host": SCRAPER_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
            },
        });

        if (!userResponse.ok) {
            log?.(`Failed to fetch user info for @${username}: ${userResponse.status}`);
            return [];
        }

        const userData = await userResponse.json();
        const secUid = userData.data?.user?.secUid
            || userData.data?.secUid
            || userData.userInfo?.user?.secUid
            || "";

        const followerCount = userData.data?.user?.stats?.followerCount
            || userData.data?.stats?.followerCount
            || userData.userInfo?.stats?.followerCount
            || 0;

        if (!secUid) {
            log?.(`No sec_uid found for @${username}`);
            return [];
        }

        log?.(`@${username}: sec_uid found, ${followerCount} followers`);

        // Use sec_uid to get user's videos
        const videosUrl = `https://${SCRAPER_API_HOST}/user/posts?sec_uid=${encodeURIComponent(secUid)}&count=${count}`;

        const videosResponse = await fetch(videosUrl, {
            method: "GET",
            headers: {
                "x-rapidapi-host": SCRAPER_API_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
            },
        });

        if (!videosResponse.ok) {
            log?.(`Failed to fetch videos for @${username}: ${videosResponse.status}`);
            return [];
        }

        const videosData = await videosResponse.json();
        const videos = videosData.data?.videos || videosData.itemList || videosData.data || [];

        // Attach follower count to each video for ratio calculation
        return videos.map((v: any) => ({
            ...v,
            _accountFollowers: followerCount,
            _accountName: username,
        }));
    } catch (error) {
        log?.(`Error fetching videos for @${username}: ${error instanceof Error ? error.message : String(error)}`);
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
    const debugLog: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        debugLog.push(`[${new Date().toISOString()}] ${msg}`);
    };

    try {
        log("Starting outlier finder for SaaS accounts...");
        log(`RAPIDAPI_KEY exists: ${!!RAPIDAPI_KEY}, length: ${RAPIDAPI_KEY?.length || 0}`);

        // Auth check - admin only
        const session = await auth();
        log(`Session user ID: ${session?.user?.id || "none"}`);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized", debug: debugLog }, { status: 401 });
        }

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });

        log(`User role: ${user?.role}`);

        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Admin access required", debug: debugLog }, { status: 403 });
        }

        // Get query params
        const { searchParams } = new URL(request.url);
        const account = searchParams.get("account") || "";
        const minRatio = parseInt(searchParams.get("minRatio") || "3"); // Lower threshold for SaaS

        // Determine which SaaS accounts to search
        const accountsToSearch = account
            ? [account]
            : SAAS_ACCOUNTS.slice(0, 8); // Default: first 8 accounts

        log(`Searching SaaS accounts: ${accountsToSearch.join(", ")}`);

        // Collect all videos from SaaS accounts
        const allVideos: any[] = [];
        for (const acct of accountsToSearch) {
            log(`Fetching videos for @${acct}...`);
            try {
                const videos = await fetchUserVideos(acct, 20, log);
                log(`@${acct}: got ${videos.length} videos`);
                allVideos.push(...videos);
            } catch (e) {
                log(`@${acct} ERROR: ${e instanceof Error ? e.message : String(e)}`);
            }

            // Rate limit protection
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        log(`Total videos fetched: ${allVideos.length}`);

        // Deduplicate by video ID
        const seenIds = new Set<string>();
        const uniqueVideos = allVideos.filter(v => {
            const id = v.id || v.video_id || "";
            if (!id || seenIds.has(id)) return false;
            seenIds.add(id);
            return true;
        });

        log(`Unique videos: ${uniqueVideos.length}`);

        // Filter inappropriate content
        const filteredVideos = uniqueVideos.filter(v => {
            const desc = v.desc || v.description || "";
            return isContentAppropriate(desc);
        });

        log(`After content filter: ${filteredVideos.length}`);

        // Calculate outlier ratios using the attached _accountFollowers
        const outliers: OutlierVideo[] = [];

        for (const video of filteredVideos) {
            const username = video._accountName || video.author?.uniqueId || "";
            const views = video.stats?.playCount || video.play_count || 0;
            const followers = video._accountFollowers || 0;

            if (!username || views < 10000 || followers === 0) continue;

            const ratio = views / followers;

            if (ratio >= minRatio) {
                log(`OUTLIER: @${username} - ${views} views / ${followers} followers = ${ratio.toFixed(1)}x`);
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

        log(`Found ${outliers.length} outliers with ratio >= ${minRatio}x`);

        return NextResponse.json({
            success: true,
            outliers: outliers.slice(0, 20),
            accounts: accountsToSearch,
            totalVideosScanned: filteredVideos.length,
            debug: debugLog,
        });

    } catch (error) {
        console.error("Outlier finder error:", error);
        return NextResponse.json({
            error: "Failed to find outliers",
            details: error instanceof Error ? error.message : "Unknown error",
            debug: debugLog,
        }, { status: 500 });
    }
}

