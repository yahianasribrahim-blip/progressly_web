// Video Frame Analysis Service
// Extracts frames from TikTok videos and analyzes them with GPT-4o Vision to detect visual hooks

import { v2 as cloudinary } from "cloudinary";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface VideoInfo {
    id: string;
    videoUrl: string;
    author?: string;
}

interface VisualHook {
    id: string;
    text: string; // Description of the visual hook
    engagement: "Low" | "Medium" | "High";
    platform: "TikTok";
    isVisual: boolean;
}

/**
 * Upload a video to Cloudinary from URL and get a public_id for frame extraction
 */
async function uploadVideoToCloudinary(videoUrl: string, videoId: string): Promise<string | null> {
    try {
        console.log(`Uploading video ${videoId} to Cloudinary...`);

        const result = await cloudinary.uploader.upload(videoUrl, {
            resource_type: "video",
            public_id: `tiktok_frames/${videoId}`,
            overwrite: true,
            // Only upload first 5 seconds to save bandwidth/cost
            eager: [
                { start_offset: "0", end_offset: "5" }
            ],
        });

        console.log(`Cloudinary upload success: ${result.public_id}`);
        return result.public_id;
    } catch (error) {
        console.error(`Cloudinary upload error for ${videoId}:`, error);
        return null;
    }
}

/**
 * Generate frame URLs from a Cloudinary video at specific timestamps
 * Uses URL transformation to extract frames at 0s, 1s, 2s, 3s
 */
function getFrameUrls(cloudName: string, publicId: string, timestamps: number[] = [0, 1, 2, 3]): string[] {
    return timestamps.map(t => {
        // Cloudinary video-to-image transformation
        // so_X = start offset in seconds, f_jpg = format as JPEG
        return `https://res.cloudinary.com/${cloudName}/video/upload/so_${t},w_480,h_854,c_fill,f_jpg/${publicId}`;
    });
}

/**
 * Download frames as base64 for Vision API
 */
async function downloadFramesAsBase64(frameUrls: string[]): Promise<string[]> {
    const base64Frames: string[] = [];

    for (const url of frameUrls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const buffer = await response.arrayBuffer();
                const base64 = Buffer.from(buffer).toString("base64");
                const contentType = response.headers.get("content-type") || "image/jpeg";
                base64Frames.push(`data:${contentType};base64,${base64}`);
                console.log(`Downloaded frame: ${url.substring(0, 60)}...`);
            }
        } catch (error) {
            console.warn(`Failed to download frame: ${url}`);
        }
    }

    return base64Frames;
}

/**
 * Analyze video frames with GPT-4o Vision to detect visual hooks
 */
async function analyzeFramesWithVision(base64Frames: string[], niche: string): Promise<string> {
    if (!OPENAI_API_KEY || base64Frames.length === 0) {
        console.log("Vision analysis skipped: no API key or frames");
        return "";
    }

    try {
        console.log(`Analyzing ${base64Frames.length} video frames with GPT-4o Vision...`);

        const imageContent = base64Frames.map(base64Url => ({
            type: "image_url" as const,
            image_url: { url: base64Url, detail: "low" as const }
        }));

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `You are analyzing the first 4 seconds of a TikTok video (frames at 0s, 1s, 2s, 3s) in the "${niche}" niche.

Your job is to identify the VISUAL HOOK - what grabs attention in the first few seconds.

Look for:
1. TEXT ON SCREEN - What text appears? Quote it exactly.
2. VISUAL TECHNIQUE - How does the video start? (close-up, before/after, mystery object, etc.)
3. ACTION - What is happening? (walking toward camera, revealing something, reaction, etc.)
4. HOOK PATTERN - Why would someone keep watching?

Format your response as:
VISUAL HOOK: [One-line description of the opening visual hook technique]

Example good responses:
- "Opens with text 'Wait for it...' while hands hold a hidden object"
- "Before/after split screen showing dramatic transformation"
- "POV walking toward something with suspenseful music implied"
- "Close-up reaction face with shocked expression"`
                            },
                            ...imageContent
                        ]
                    }
                ],
                max_tokens: 300,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Vision API error:", response.status, errorText);
            return "";
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || "";
        console.log("Visual hook analysis:", content);
        return content;
    } catch (error) {
        console.error("Error analyzing frames:", error);
        return "";
    }
}

/**
 * Extract visual hook text from the analysis result
 */
function extractVisualHookText(analysis: string): string {
    if (!analysis) return "";

    // Look for "VISUAL HOOK:" line
    const match = analysis.match(/VISUAL HOOK:\s*(.+)/i);
    if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, ""); // Remove quotes
    }

    // Fallback: take the first meaningful line
    const lines = analysis.split("\n").filter(l => l.trim().length > 10);
    if (lines.length > 0) {
        return lines[0].replace(/^[-•*]\s*/, "").trim();
    }

    return "";
}

/**
 * Main function: Get visual hooks from multiple TikTok videos
 * Downloads videos to Cloudinary, extracts frames, analyzes with Vision API
 */
export async function getVisualHooksFromVideos(
    videos: Array<{
        id: string;
        video?: { playAddr?: string };
        playUrl?: string;
        author?: { uniqueId?: string };
        stats?: { playCount?: number; diggCount?: number };
    }>,
    niche: string,
    maxVideos: number = 3
): Promise<VisualHook[]> {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (!cloudName) {
        console.error("CLOUDINARY_CLOUD_NAME not set");
        return [];
    }

    const hooks: VisualHook[] = [];
    const videosToProcess = videos.slice(0, maxVideos);

    console.log(`\n=== VISUAL HOOK EXTRACTION ===`);
    console.log(`Processing ${videosToProcess.length} videos for visual hooks...`);

    for (let i = 0; i < videosToProcess.length; i++) {
        const video = videosToProcess[i];
        const videoUrl = video.playUrl || video.video?.playAddr;

        if (!videoUrl || !video.id) {
            console.log(`Video ${i + 1}: No URL available, skipping`);
            continue;
        }

        console.log(`\nVideo ${i + 1}/${videosToProcess.length}: ${video.id}`);

        try {
            // Step 1: Upload to Cloudinary
            const publicId = await uploadVideoToCloudinary(videoUrl, video.id);

            if (!publicId) {
                console.log("Failed to upload to Cloudinary, skipping");
                continue;
            }

            // Step 2: Get frame URLs at 0s, 1s, 2s, 3s
            const frameUrls = getFrameUrls(cloudName, publicId, [0, 1, 2, 3]);
            console.log("Generated frame URLs:", frameUrls.length);

            // Step 3: Download frames as base64
            const base64Frames = await downloadFramesAsBase64(frameUrls);

            if (base64Frames.length === 0) {
                console.log("No frames downloaded, skipping");
                continue;
            }

            // Step 4: Analyze with Vision API
            const analysis = await analyzeFramesWithVision(base64Frames, niche);
            const hookText = extractVisualHookText(analysis);

            if (hookText && hookText.length > 10) {
                const views = video.stats?.playCount || 0;
                const likes = video.stats?.diggCount || 0;
                const engagementRate = views > 0 ? likes / views : 0;

                let engagement: "Low" | "Medium" | "High" = "Low";
                if (engagementRate > 0.1) engagement = "High";
                else if (engagementRate > 0.05) engagement = "Medium";

                hooks.push({
                    id: `visual_h${i + 1}`,
                    text: hookText,
                    engagement,
                    platform: "TikTok",
                    isVisual: true,
                });

                console.log(`✓ Got visual hook: "${hookText}"`);
            }

            // Clean up: delete the video from Cloudinary after processing
            try {
                await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
                console.log("Cleaned up Cloudinary video");
            } catch {
                // Ignore cleanup errors
            }

        } catch (error) {
            console.error(`Error processing video ${video.id}:`, error);
        }

        // Delay between videos
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\nTotal visual hooks extracted: ${hooks.length}`);
    return hooks;
}
