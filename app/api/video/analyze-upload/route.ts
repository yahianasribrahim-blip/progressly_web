import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canUseReview, recordReviewUsage } from "@/lib/user";
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import { prisma } from "@/lib/db";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Initialize Gemini with new SDK
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY || "" });

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

        // Validate file type
        const validTypes = ["video/mp4", "video/quicktime", "video/webm", "video/mov"];
        if (!validTypes.includes(videoFile.type) && !videoFile.name.match(/\.(mp4|mov|webm)$/i)) {
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

        // Get file buffer for Files API upload
        const arrayBuffer = await videoFile.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);
        const mimeType = videoFile.type || "video/mp4";

        // Analyze with Gemini Files API
        const videoAnalysis = await analyzeUploadedVideoWithGemini(
            videoBuffer,
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
                duration: 0, // We'll let Gemini estimate this
                coverUrl: null,
            },
            stats: null, // No stats for uploaded videos
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

        return NextResponse.json(
            { error: "Failed to analyze video. Please try again." },
            { status: 500 }
        );
    }
}

// Types
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

async function analyzeUploadedVideoWithGemini(
    videoBuffer: Buffer,
    mimeType: string,
    description: string,
    creatorSetup: CreatorSetup | null
): Promise<VideoAnalysis> {
    // Write video to temp file for Files API upload
    const tempDir = join(tmpdir(), 'progressly-videos');
    await mkdir(tempDir, { recursive: true });
    const fileExtension = mimeType.includes('webm') ? 'webm' : mimeType.includes('quicktime') ? 'mov' : 'mp4';
    const tempFilePath = join(tempDir, `upload_${Date.now()}.${fileExtension}`);

    try {
        await writeFile(tempFilePath, videoBuffer);
        console.log(`Video saved to temp file: ${tempFilePath}`);

        // Upload to Gemini Files API
        console.log("Uploading to Gemini Files API...");
        const uploadedFile = await ai.files.upload({
            file: tempFilePath,
            config: { mimeType: mimeType as "video/mp4" | "video/webm" | "video/quicktime" },
        });

        console.log(`File uploaded: ${uploadedFile.name}, state: ${uploadedFile.state}`);

        // Wait for file to be processed
        let file = uploadedFile;
        let attempts = 0;
        const maxAttempts = 30;

        while (file.state === "PROCESSING" && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            file = await ai.files.get({ name: file.name! });
            attempts++;
            if (attempts % 5 === 0) {
                console.log(`Still processing... (${attempts}s)`);
            }
        }

        if (file.state === "FAILED") {
            throw new Error("Video processing failed on Gemini's servers");
        }

        if (file.state !== "ACTIVE") {
            throw new Error(`File not ready after ${maxAttempts}s. State: ${file.state}`);
        }

        console.log("File processed and ready for analysis");

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

        // Generate content using the uploaded file
        console.log("Sending to Gemini for analysis...");
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: createUserContent([
                createPartFromUri(file.uri!, file.mimeType!),
                prompt,
            ]),
        });

        const responseText = response.text;
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
            console.error("Failed to parse Gemini response:", cleanedText.substring(0, 200));
            throw new Error("Failed to parse video analysis");
        }
    } finally {
        // Clean up temp file
        try {
            await unlink(tempFilePath);
            console.log("Temp file cleaned up");
        } catch {
            // Ignore cleanup errors
        }
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
