import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canUseReview, recordReviewUsage } from "@/lib/user";
import { prisma } from "@/lib/db";

// Use direct REST API calls instead of SDK (SDK has pattern validators that fail)
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "";

// =====================
// REST API FILE UPLOAD (avoids SDK pattern validation issues)
// =====================

interface GeminiFileResponse {
    name: string;
    uri: string;
    mimeType: string;
    state: string;
}

async function uploadVideoToGeminiREST(videoBuffer: ArrayBuffer, mimeType: string): Promise<GeminiFileResponse> {
    const numBytes = videoBuffer.byteLength;
    console.log(`Uploading ${Math.round(numBytes / 1024)}KB video via REST API...`);

    // Step 1: Start resumable upload
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
            file: { display_name: `video_upload_${Date.now()}` }
        }),
    });

    if (!startResponse.ok) {
        const errorText = await startResponse.text();
        console.error("Failed to start upload:", errorText);
        throw new Error(`Failed to start upload: ${startResponse.status}`);
    }

    const uploadUrl = startResponse.headers.get("X-Goog-Upload-URL");
    if (!uploadUrl) {
        throw new Error("No upload URL received from Gemini");
    }

    console.log("Got upload URL, uploading video bytes...");

    // Step 2: Upload the actual bytes
    const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Length": numBytes.toString(),
            "X-Goog-Upload-Offset": "0",
            "X-Goog-Upload-Command": "upload, finalize",
        },
        body: videoBuffer,
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Failed to upload video:", errorText);
        throw new Error(`Failed to upload video: ${uploadResponse.status}`);
    }

    const fileInfo = await uploadResponse.json();
    console.log("Video uploaded:", fileInfo.file?.name, "State:", fileInfo.file?.state);

    return {
        name: fileInfo.file.name,
        uri: fileInfo.file.uri,
        mimeType: fileInfo.file.mimeType,
        state: fileInfo.file.state,
    };
}

async function waitForFileProcessing(fileName: string): Promise<GeminiFileResponse> {
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max

    while (attempts < maxAttempts) {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${GEMINI_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`Failed to get file status: ${response.status}`);
        }

        const fileInfo = await response.json();

        if (fileInfo.state === "ACTIVE") {
            console.log("File is ready for analysis");
            return fileInfo;
        }

        if (fileInfo.state === "FAILED") {
            throw new Error("Video processing failed on Gemini's servers");
        }

        attempts++;
        if (attempts % 5 === 0) {
            console.log(`Still processing... (${attempts}s)`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`File not ready after ${maxAttempts}s`);
}

async function generateContentWithVideo(fileUri: string, fileMimeType: string, prompt: string): Promise<string> {
    console.log("Generating content with video...");
    console.log("File URI:", fileUri);
    console.log("MIME Type:", fileMimeType);

    // Validate file URI format
    if (!fileUri || !fileUri.startsWith("https://")) {
        throw new Error(`Invalid file URI format: ${fileUri}`);
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { file_data: { mime_type: fileMimeType, file_uri: fileUri } },
                        { text: prompt }
                    ]
                }]
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini generate error:", errorText);

        // Check for content moderation blocks
        if (errorText.includes("PROHIBITED_CONTENT") || errorText.includes("SAFETY")) {
            throw new Error("INAPPROPRIATE_CONTENT");
        }

        // Check for pattern matching errors
        if (errorText.includes("pattern") || errorText.includes("Pattern")) {
            console.error("Pattern error detected. File URI:", fileUri);
            throw new Error(`Video file format issue. Please try a different video file.`);
        }

        throw new Error(`Gemini generation failed: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
        console.error("Empty response from Gemini:", JSON.stringify(result, null, 2));
        throw new Error("No analysis generated. Please try again.");
    }

    return text;
}

// =====================
// MAIN HANDLER
// =====================

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check usage limits for video reviews
        const usageCheck = await canUseReview(session.user.id);
        if (!usageCheck.allowed) {
            return NextResponse.json({
                error: usageCheck.message || "Video review limit reached. Upgrade for more!",
                limitReached: true,
                remaining: usageCheck.remaining,
            }, { status: 429 });
        }

        const formData = await request.formData();
        const videoFile = formData.get("video") as File | null;
        const description = formData.get("description") as string || "";

        if (!videoFile) {
            return NextResponse.json(
                { error: "Video file is required" },
                { status: 400 }
            );
        }

        // Validate file type - normalize mimeType
        let mimeType = videoFile.type;
        const fileName = videoFile.name.toLowerCase();

        // Handle various MIME type edge cases
        if (!mimeType || mimeType === "" || mimeType === "application/octet-stream") {
            if (fileName.endsWith(".mp4")) mimeType = "video/mp4";
            else if (fileName.endsWith(".mov")) mimeType = "video/mp4"; // Gemini treats MOV as MP4
            else if (fileName.endsWith(".webm")) mimeType = "video/webm";
            else mimeType = "video/mp4"; // Default to MP4
        }

        // Convert quicktime to mp4 for Gemini compatibility
        if (mimeType === "video/quicktime" || mimeType === "video/mov") {
            mimeType = "video/mp4";
        }

        const validTypes = ["video/mp4", "video/webm"];
        if (!validTypes.includes(mimeType) && !fileName.match(/\.(mp4|mov|webm)$/i)) {
            return NextResponse.json(
                { error: "Invalid video format. Please upload MP4, MOV, or WebM." },
                { status: 400 }
            );
        }

        // Max 100MB
        const maxSize = 100 * 1024 * 1024;
        if (videoFile.size > maxSize) {
            return NextResponse.json(
                { error: "Video too large. Maximum size is 100MB." },
                { status: 400 }
            );
        }

        console.log("=== VIDEO UPLOAD ANALYSIS ===");
        console.log("File:", videoFile.name, "Size:", Math.round(videoFile.size / 1024), "KB");
        console.log("MIME Type (normalized):", mimeType);

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

        // Get file buffer directly (no temp file needed!)
        const arrayBuffer = await videoFile.arrayBuffer();

        // Analyze with Gemini Files API using REST
        const videoAnalysis = await analyzeUploadedVideoWithGemini(
            arrayBuffer,
            mimeType,
            description,
            creatorSetup
        );

        // Record usage for video reviews
        await recordReviewUsage(session.user.id);

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
        console.error("Error analyzing uploaded video:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("INAPPROPRIATE_CONTENT")) {
            return NextResponse.json(
                { error: "This video contains inappropriate content and cannot be analyzed." },
                { status: 400 }
            );
        }

        // Return the actual error message for debugging
        return NextResponse.json(
            { error: `Failed to analyze video: ${errorMessage}` },
            { status: 500 }
        );
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
// VIDEO ANALYSIS WITH REST API
// =====================

async function analyzeUploadedVideoWithGemini(
    videoBuffer: ArrayBuffer,
    mimeType: string,
    description: string,
    creatorSetup: CreatorSetup | null
): Promise<VideoAnalysis> {
    console.log("Starting REST API upload to Gemini Files API...");

    // Upload to Gemini Files API using REST (no SDK, no temp files, no pattern issues)
    const uploadedFile = await uploadVideoToGeminiREST(videoBuffer, mimeType);

    // Wait for processing if needed
    let file = uploadedFile;
    if (file.state !== "ACTIVE") {
        const fileName = file.name.replace("files/", "");
        file = await waitForFileProcessing(fileName);
    }

    console.log("File ready. URI:", file.uri, "MIME:", file.mimeType);

    // Context from creator setup
    let nicheContext = "";
    if (creatorSetup) {
        if (creatorSetup.contentNiche) nicheContext = creatorSetup.contentNiche;
        else if (creatorSetup.contentActivity) nicheContext = creatorSetup.contentActivity;
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

    // Generate content using REST API
    console.log("Sending to Gemini for analysis via REST API...");
    const responseText = await generateContentWithVideo(file.uri, file.mimeType, prompt);
    console.log("Gemini response received, parsing...");

    // Clean and parse JSON
    let cleanedText = responseText?.trim() || "";
    if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    try {
        const parsed = JSON.parse(cleanedText);
        return {
            ...parsed,
            analysisMethod: "uploaded_video",
        };
    } catch {
        console.error("Failed to parse Gemini response:", cleanedText.substring(0, 500));
        throw new Error("Failed to parse video analysis response");
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
