// Deepgram Transcription Service for extracting spoken hooks from TikTok videos

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "c23e57a70b1eac0634a378617c15ecd18fd82eab";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "f278804a40mshe80b9aa07df21a1p1f6e3ejsn89a14ca0342c";
const RAPIDAPI_HOST = "tiktok-scraper2.p.rapidapi.com";

interface TranscriptionResult {
    transcript: string;
    confidence: number;
    words: Array<{
        word: string;
        start: number;
        end: number;
    }>;
}

/**
 * Get a no-watermark download URL for a TikTok video
 */
async function getDownloadableVideoUrl(videoId: string, authorUsername: string): Promise<string | null> {
    try {
        const tiktokUrl = `https://www.tiktok.com/@${authorUsername}/video/${videoId}`;
        console.log("Getting no-watermark URL for:", tiktokUrl);

        const response = await fetch(
            `https://${RAPIDAPI_HOST}/video/no_watermark?video_url=${encodeURIComponent(tiktokUrl)}`,
            {
                method: "GET",
                headers: {
                    "x-rapidapi-host": RAPIDAPI_HOST,
                    "x-rapidapi-key": RAPIDAPI_KEY,
                },
            }
        );

        if (!response.ok) {
            console.error(`No watermark API error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        console.log("No watermark response keys:", Object.keys(data));
        console.log("Full response:", JSON.stringify(data).substring(0, 300));

        // Try different possible response structures
        const downloadUrl = data.no_watermark  // This is the key they return!
            || data.video?.play_addr?.url_list?.[0]
            || data.data?.play
            || data.nw_url
            || data.video_url
            || data.downloadAddr
            || data.play;

        if (downloadUrl) {
            console.log("Got download URL:", downloadUrl.substring(0, 80) + "...");
        } else {
            console.log("No download URL found in response");
        }

        return downloadUrl || null;
    } catch (error) {
        console.error("Error getting download URL:", error);
        return null;
    }
}

/**
 * Transcribe audio from a video URL using Deepgram
 */
export async function transcribeVideoAudio(videoUrl: string): Promise<TranscriptionResult | null> {
    if (!DEEPGRAM_API_KEY) {
        console.error("DEEPGRAM_API_KEY is not set");
        return null;
    }

    try {
        console.log("Sending to Deepgram:", videoUrl.substring(0, 80) + "...");

        const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true", {
            method: "POST",
            headers: {
                "Authorization": `Token ${DEEPGRAM_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                url: videoUrl,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Deepgram error: ${response.status}`, errorText);
            return null;
        }

        const data = await response.json();

        // Log full response structure for debugging
        console.log("Deepgram response metadata:", {
            request_id: data.metadata?.request_id,
            duration: data.metadata?.duration,
            channels: data.results?.channels?.length,
        });

        const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
        const confidence = data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;
        const words = data.results?.channels?.[0]?.alternatives?.[0]?.words || [];

        if (transcript && transcript.length > 0) {
            console.log("Transcription SUCCESS:", transcript.substring(0, 100));
        } else {
            console.log("Transcription returned EMPTY - video may have no speech/music only");
            console.log("Duration:", data.metadata?.duration, "seconds");
        }

        return { transcript, confidence, words };
    } catch (error) {
        console.error("Transcription error:", error);
        return null;
    }
}

/**
 * Extract the spoken hook (first 1-2 sentences) from a transcript
 * Fixed: Requires 25+ chars and 3+ words to avoid garbage like "Please"
 */
export function extractSpokenHook(transcript: string): string {
    if (!transcript || transcript.length < 25) return "";

    // Common single-word garbage to skip
    const garbageWords = ["please", "wait", "hey", "hi", "um", "uh", "okay", "so", "like"];

    // Split into sentences and take first 2
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let hook = sentences.slice(0, 2).join(". ").trim();

    // If still too short, take more of the transcript
    if (hook.length < 25 && transcript.length >= 25) {
        hook = transcript.substring(0, 80).trim();
    }

    // Check if it's just garbage
    const words = hook.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (words.length < 3) return ""; // Need at least 3 words
    if (words.length === 1 && garbageWords.includes(words[0])) return "";

    // Final length check
    if (hook.length < 25) return "";

    // Truncate if too long
    if (hook.length > 120) {
        return hook.substring(0, 117) + "...";
    }

    return hook;
}

/**
 * Get spoken hooks from multiple TikTok videos
 * Uses no-watermark endpoint to get downloadable URLs, then transcribes with Deepgram
 */
export async function getSpokenHooksFromVideos(
    videos: Array<{
        id: string;
        playUrl?: string;
        video?: { playAddr?: string };
        author?: { uniqueId?: string };
        stats?: { playCount?: number; diggCount?: number };
    }>,
    maxVideos: number = 3
): Promise<Array<{
    id: string;
    text: string;
    engagement: "Low" | "Medium" | "High";
    platform: "TikTok";
    views: number;
    likes: number;
    isSpoken: boolean;
}>> {
    const hooks: Array<{
        id: string;
        text: string;
        engagement: "Low" | "Medium" | "High";
        platform: "TikTok";
        views: number;
        likes: number;
        isSpoken: boolean;
    }> = [];

    // Only transcribe the top videos (sorted by views)
    const topVideos = videos
        .filter(v => v.id && v.author?.uniqueId)
        .slice(0, maxVideos);

    console.log(`Attempting to transcribe ${topVideos.length} videos...`);

    for (let i = 0; i < topVideos.length; i++) {
        const video = topVideos[i];

        console.log(`\nProcessing video ${i + 1}/${topVideos.length}: ${video.id}`);

        // Step 1: Get downloadable URL via no-watermark endpoint
        const downloadUrl = await getDownloadableVideoUrl(video.id, video.author?.uniqueId || "");

        if (!downloadUrl) {
            console.log("Could not get download URL, skipping...");
            continue;
        }

        // Step 2: Transcribe with Deepgram
        const result = await transcribeVideoAudio(downloadUrl);

        if (result && result.transcript) {
            const hook = extractSpokenHook(result.transcript);

            if (hook && hook.length > 5) {
                const views = video.stats?.playCount || 0;
                const likes = video.stats?.diggCount || 0;
                const engagementRate = views > 0 ? likes / views : 0;

                let engagement: "Low" | "Medium" | "High" = "Low";
                if (engagementRate > 0.1) engagement = "High";
                else if (engagementRate > 0.05) engagement = "Medium";

                hooks.push({
                    id: `spoken_h${i + 1}`,
                    text: hook,
                    engagement,
                    platform: "TikTok",
                    views,
                    likes,
                    isSpoken: true,
                });

                console.log(`✓ Got spoken hook: "${hook}"`);
            }
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\nTotal spoken hooks extracted: ${hooks.length}`);
    return hooks;
}
