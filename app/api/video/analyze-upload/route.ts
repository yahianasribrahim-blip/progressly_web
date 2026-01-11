import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canUseReview, recordReviewUsage } from "@/lib/user";
import { prisma } from "@/lib/db";

// Use direct REST API calls instead of SDK (SDK has pattern validators that fail)
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "";

// =====================
// REST API FILE UPLOAD
// =====================

interface GeminiFileResponse {
    name: string;
    uri: string;
    mimeType: string;
    state: string;
}

async function uploadVideoToGeminiREST(videoBuffer: ArrayBuffer, mimeType: string): Promise<GeminiFileResponse> {
    const numBytes = videoBuffer.byteLength;
    console.log(`[UPLOAD] Starting upload: ${Math.round(numBytes / 1024)}KB, MIME: ${mimeType}`);

    // Validate inputs
    if (!videoBuffer || numBytes === 0) {
        throw new Error("Empty video buffer");
    }
    if (!mimeType || !mimeType.startsWith("video/")) {
        throw new Error(`Invalid MIME type: ${mimeType}`);
    }
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key not configured");
    }

    // Use simple alphanumeric display name to avoid pattern issues
    const displayName = `video${Date.now()}`;

    try {
        // Step 1: Start resumable upload
        console.log("[UPLOAD] Step 1: Initiating resumable upload...");
        const startResponse = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", {
            method: "POST",
            headers: {
                "x-goog-api-key": GEMINI_API_KEY,
                "X-Goog-Upload-Protocol": "resumable",
                "X-Goog-Upload-Command": "start",
                "X-Goog-Upload-Header-Content-Length": numBytes.toString(),
                "X-Goog-Upload-Header-Content-Type": mimeType,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                file: { display_name: displayName }
            }),
        });

        if (!startResponse.ok) {
            const errorText = await startResponse.text();
            console.error("[UPLOAD] Failed to start:", startResponse.status, errorText);
            throw new Error(`Upload init failed: ${startResponse.status} - ${errorText.substring(0, 200)}`);
        }

        const uploadUrl = startResponse.headers.get("X-Goog-Upload-URL");
        if (!uploadUrl) {
            throw new Error("No upload URL in response headers");
        }
        console.log("[UPLOAD] Step 1 complete. Got upload URL.");

        // Step 2: Upload the actual bytes
        console.log("[UPLOAD] Step 2: Uploading video bytes...");
        const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
                "Content-Length": numBytes.toString(),
                "X-Goog-Upload-Offset": "0",
                "X-Goog-Upload-Command": "upload, finalize",
            },
            body: new Uint8Array(videoBuffer),
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error("[UPLOAD] Failed to upload bytes:", uploadResponse.status, errorText);
            throw new Error(`Byte upload failed: ${uploadResponse.status} - ${errorText.substring(0, 200)}`);
        }

        const responseData = await uploadResponse.json();
        console.log("[UPLOAD] Step 2 complete. Response:", JSON.stringify(responseData, null, 2));

        // Validate response structure
        if (!responseData.file) {
            console.error("[UPLOAD] Unexpected response structure:", responseData);
            throw new Error("Invalid response: missing 'file' object");
        }

        const fileInfo = responseData.file;
        if (!fileInfo.name || !fileInfo.uri) {
            console.error("[UPLOAD] Missing required fields:", fileInfo);
            throw new Error("Invalid response: missing name or uri");
        }

        console.log(`[UPLOAD] Success! Name: ${fileInfo.name}, URI: ${fileInfo.uri}, State: ${fileInfo.state}`);

        return {
            name: fileInfo.name,
            uri: fileInfo.uri,
            mimeType: fileInfo.mimeType || mimeType,
            state: fileInfo.state || "PROCESSING",
        };
    } catch (error) {
        console.error("[UPLOAD] Upload error:", error);
        throw error;
    }
}

async function waitForFileProcessing(fileName: string): Promise<GeminiFileResponse> {
    console.log(`[WAIT] Waiting for file to process: ${fileName}`);

    // Ensure fileName is properly formatted for the API
    // The API expects just the file ID without "files/" prefix
    const fileId = fileName.replace(/^files\//, "");
    console.log(`[WAIT] Using file ID: ${fileId}`);

    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max

    while (attempts < maxAttempts) {
        try {
            // URL encode the file ID in case it has special characters
            const encodedFileId = encodeURIComponent(fileId);
            const url = `https://generativelanguage.googleapis.com/v1beta/files/${encodedFileId}?key=${GEMINI_API_KEY}`;

            const response = await fetch(url);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[WAIT] Status check failed (attempt ${attempts + 1}):`, response.status, errorText);

                // If 404, the file might not exist yet - wait and retry
                if (response.status === 404 && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    attempts++;
                    continue;
                }
                throw new Error(`File status check failed: ${response.status}`);
            }

            const fileInfo = await response.json();
            console.log(`[WAIT] Attempt ${attempts + 1}: State = ${fileInfo.state}`);

            if (fileInfo.state === "ACTIVE") {
                console.log("[WAIT] File is ready!");
                return {
                    name: fileInfo.name,
                    uri: fileInfo.uri,
                    mimeType: fileInfo.mimeType,
                    state: fileInfo.state,
                };
            }

            if (fileInfo.state === "FAILED") {
                throw new Error("Video processing failed on Gemini's servers");
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`[WAIT] Error on attempt ${attempts + 1}:`, error);
            if (attempts >= maxAttempts - 1) throw error;
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    throw new Error(`File not ready after ${maxAttempts} seconds`);
}

async function generateContentWithVideo(fileUri: string, fileMimeType: string, prompt: string): Promise<string> {
    console.log("[GENERATE] Starting content generation...");
    console.log("[GENERATE] File URI:", fileUri);
    console.log("[GENERATE] MIME Type:", fileMimeType);

    // Validate inputs
    if (!fileUri) {
        throw new Error("File URI is required");
    }
    if (!fileMimeType) {
        throw new Error("MIME type is required");
    }

    // The model name - using 2.5 flash
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
        contents: [{
            parts: [
                {
                    file_data: {
                        mime_type: fileMimeType,
                        file_uri: fileUri
                    }
                },
                { text: prompt }
            ]
        }]
    };

    console.log("[GENERATE] Request body:", JSON.stringify(requestBody, null, 2).substring(0, 500));

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();

        if (!response.ok) {
            console.error("[GENERATE] API Error:", response.status, responseText);

            // Check for specific error types
            if (responseText.includes("PROHIBITED_CONTENT") || responseText.includes("SAFETY")) {
                throw new Error("INAPPROPRIATE_CONTENT");
            }
            if (responseText.includes("pattern") || responseText.includes("Pattern")) {
                console.error("[GENERATE] Pattern error! Full response:", responseText);
                throw new Error("Video format issue: The video file could not be processed. Please try a different video.");
            }
            if (responseText.includes("not found") || responseText.includes("NOT_FOUND")) {
                throw new Error("Video file expired or not found. Please upload again.");
            }
            if (responseText.includes("INVALID_ARGUMENT")) {
                console.error("[GENERATE] Invalid argument error:", responseText);
                throw new Error("Invalid video format. Please try MP4 format.");
            }

            throw new Error(`Generation failed (${response.status}): ${responseText.substring(0, 300)}`);
        }

        // Parse response
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error("[GENERATE] Failed to parse response:", responseText.substring(0, 500));
            throw new Error("Failed to parse API response");
        }

        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error("[GENERATE] No text in response:", JSON.stringify(result, null, 2));

            // Check for block reasons
            if (result.candidates?.[0]?.finishReason === "SAFETY") {
                throw new Error("INAPPROPRIATE_CONTENT");
            }
            if (result.promptFeedback?.blockReason) {
                throw new Error(`Content blocked: ${result.promptFeedback.blockReason}`);
            }

            throw new Error("No analysis generated. The video might be too short or unclear.");
        }

        console.log("[GENERATE] Success! Response length:", text.length);
        return text;

    } catch (error) {
        console.error("[GENERATE] Error:", error);
        throw error;
    }
}

// =====================
// MAIN HANDLER
// =====================

export async function POST(request: Request) {
    // Version marker to confirm deployment - v3 with timestamp
    console.log(`\n========== VIDEO UPLOAD v3 - ${new Date().toISOString()} ==========\n`);

    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check usage limits
        const usageCheck = await canUseReview(session.user.id);
        if (!usageCheck.allowed) {
            return NextResponse.json({
                error: usageCheck.message || "Video review limit reached. Upgrade for more!",
                limitReached: true,
                remaining: usageCheck.remaining,
            }, { status: 429 });
        }

        // Parse form data
        const formData = await request.formData();
        const videoFile = formData.get("video") as File | null;
        const description = formData.get("description") as string || "";

        if (!videoFile) {
            return NextResponse.json({ error: "Video file is required" }, { status: 400 });
        }

        console.log("[MAIN] File received:", videoFile.name, "Size:", videoFile.size, "Type:", videoFile.type);

        // Normalize MIME type
        let mimeType = videoFile.type || "";
        const fileName = videoFile.name.toLowerCase();

        // Handle missing or generic MIME types
        if (!mimeType || mimeType === "" || mimeType === "application/octet-stream") {
            if (fileName.endsWith(".mp4")) mimeType = "video/mp4";
            else if (fileName.endsWith(".mov")) mimeType = "video/mp4";
            else if (fileName.endsWith(".webm")) mimeType = "video/webm";
            else if (fileName.endsWith(".avi")) mimeType = "video/mp4";
            else if (fileName.endsWith(".mkv")) mimeType = "video/mp4";
            else mimeType = "video/mp4";
        }

        // Convert QuickTime to MP4 (Gemini doesn't recognize quicktime)
        if (mimeType === "video/quicktime" || mimeType === "video/mov" || mimeType === "video/x-m4v") {
            mimeType = "video/mp4";
        }

        // Validate MIME type
        const validTypes = ["video/mp4", "video/webm", "video/mpeg", "video/3gpp"];
        if (!validTypes.includes(mimeType) && !fileName.match(/\.(mp4|mov|webm|avi|mkv|m4v)$/i)) {
            return NextResponse.json({
                error: `Unsupported format: ${mimeType || videoFile.type || "unknown"}. Please use MP4, MOV, or WebM.`
            }, { status: 400 });
        }

        // Size limit
        const maxSize = 100 * 1024 * 1024;
        if (videoFile.size > maxSize) {
            return NextResponse.json({ error: "Video too large. Maximum size is 100MB." }, { status: 400 });
        }

        if (videoFile.size < 1000) {
            return NextResponse.json({ error: "Video file appears to be empty or corrupted." }, { status: 400 });
        }

        console.log("[MAIN] Normalized MIME type:", mimeType);

        // Get creator setup for context
        let creatorSetup: CreatorSetup | null = null;
        try {
            const profile = await prisma.userProfile.findUnique({
                where: { userId: session.user.id },
                include: { creatorSetup: true },
            });
            creatorSetup = profile?.creatorSetup ?? null;
        } catch (e) {
            console.log("[MAIN] Could not fetch creator setup:", e);
        }

        // Convert to ArrayBuffer
        const arrayBuffer = await videoFile.arrayBuffer();
        console.log("[MAIN] ArrayBuffer size:", arrayBuffer.byteLength);

        // Analyze video
        const videoAnalysis = await analyzeUploadedVideoWithGemini(
            arrayBuffer,
            mimeType,
            description,
            creatorSetup
        );

        // Record usage
        await recordReviewUsage(session.user.id);

        console.log("[MAIN] Analysis complete! Score:", videoAnalysis.score);

        return NextResponse.json({
            success: true,
            video: {
                id: `upload_${Date.now()}`,
                url: null,
                creator: "You",
                description: description || "Uploaded video",
                duration: 0,
                coverUrl: null,
            },
            stats: null,
            engagement: null,
            videoAnalysis,
            analysis: generateAnalysisFromVideoAnalysis(videoAnalysis),
            hasCreatorContext: !!creatorSetup,
            isUpload: true,
        });

    } catch (error) {
        console.error("[MAIN] Error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("INAPPROPRIATE_CONTENT")) {
            return NextResponse.json({
                error: "This video contains inappropriate content and cannot be analyzed."
            }, { status: 400 });
        }

        return NextResponse.json({
            error: errorMessage.startsWith("Failed to analyze")
                ? errorMessage
                : `Analysis failed: ${errorMessage}`
        }, { status: 500 });
    }
}

// =====================
// TYPES
// =====================

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

interface VideoAnalysis {
    contentType: string;
    contentFormat: "original_content" | "edit_compilation" | "repost";
    contentDescription: string;
    sceneBySceneBreakdown: { timestamp: string; description: string; whatsHappening: string }[];
    hookType: string;
    effectiveness: string;
    score: number;
    replicabilityRequirements: string[];
    analysisMethod: "video_frames" | "thumbnail_only" | "full_video" | "cover_only" | "uploaded_video";
    improvements: string[];
    strengths: string[];
}

// =====================
// VIDEO ANALYSIS
// =====================

async function analyzeUploadedVideoWithGemini(
    videoBuffer: ArrayBuffer,
    mimeType: string,
    description: string,
    creatorSetup: CreatorSetup | null
): Promise<VideoAnalysis> {
    console.log("[ANALYZE] Starting video analysis pipeline...");

    // Step 1: Upload
    const uploadedFile = await uploadVideoToGeminiREST(videoBuffer, mimeType);

    // Step 2: Wait for processing
    let file = uploadedFile;
    if (file.state !== "ACTIVE") {
        console.log("[ANALYZE] File still processing, waiting...");
        file = await waitForFileProcessing(file.name);
    }

    console.log("[ANALYZE] File ready:", file.uri);

    // Step 3: Build context
    let nicheContext = "";
    if (creatorSetup) {
        nicheContext = creatorSetup.contentNiche || creatorSetup.contentActivity || "";
    }

    const prompt = `You are a video analyst helping a content creator improve their video BEFORE posting.

VIDEO INFO:
- This is the creator's own video (not yet posted)
- Creator's description/notes: "${description || "None provided"}"
${nicheContext ? `- Creator's niche: ${nicheContext}` : ""}

YOUR TASK:
Analyze this video as if you're a coach helping them improve before they post.

CRITICAL RULES:
1. Be SPECIFIC - describe exactly what you see
2. Be CONSTRUCTIVE - focus on improvements, not just criticism
3. The score should reflect how likely this video is to perform well
4. NEVER mention music
5. Focus on: hook, pacing, visuals, retention potential

Respond with ONLY valid JSON (no markdown, no code blocks):
{
    "contentType": "string - what type of content is this",
    "contentFormat": "original_content",
    "contentDescription": "string - 2-3 sentence description of what happens in the video",
    "sceneBySceneBreakdown": [
        {"timestamp": "0:00-0:03", "description": "what happens", "whatsHappening": "what the viewer sees"}
    ],
    "hookType": "string - what type of hook is used (question, shock, curiosity, etc.)",
    "hookAnalysis": "string - is the hook strong? why or why not?",
    "effectiveness": "string - overall assessment",
    "score": number 0-100 (be honest - most amateur videos score 40-70),
    "strengths": ["array of what works well"],
    "improvements": ["array of specific things to fix before posting"],
    "replicabilityRequirements": ["what would someone need to make this video"]
}`;

    // Step 4: Generate analysis
    console.log("[ANALYZE] Sending to Gemini...");
    const responseText = await generateContentWithVideo(file.uri, file.mimeType, prompt);
    console.log("[ANALYZE] Got response, parsing JSON...");

    // Step 5: Parse response
    let cleanedText = responseText.trim();

    // Remove markdown code blocks if present
    if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText
            .replace(/^```(?:json)?\s*\n?/i, "")
            .replace(/\n?```\s*$/i, "")
            .trim();
    }

    try {
        const parsed = JSON.parse(cleanedText);
        console.log("[ANALYZE] Parsed successfully!");
        return {
            ...parsed,
            analysisMethod: "uploaded_video",
        };
    } catch (parseError) {
        console.error("[ANALYZE] JSON parse error. Raw text:", cleanedText.substring(0, 1000));
        throw new Error("Failed to parse video analysis. Please try again.");
    }
}

function generateAnalysisFromVideoAnalysis(videoAnalysis: VideoAnalysis) {
    return {
        performanceScore: videoAnalysis.score,
        verdict: videoAnalysis.score >= 70 ? "Ready to post!" :
            videoAnalysis.score >= 50 ? "Good potential, some improvements needed" :
                "Consider revising before posting",
        strengths: videoAnalysis.strengths || [],
        improvements: videoAnalysis.improvements || [],
        keyLearnings: [
            `Hook type: ${videoAnalysis.hookType}`,
            `Content type: ${videoAnalysis.contentType}`,
        ],
    };
}
