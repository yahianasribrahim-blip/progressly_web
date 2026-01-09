import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canUseReview, recordReviewUsage } from "@/lib/user";
import { GoogleGenerativeAI, Part, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { prisma } from "@/lib/db";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// Safety settings
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

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

        // Convert file to base64
        const arrayBuffer = await videoFile.arrayBuffer();
        const videoBase64 = Buffer.from(arrayBuffer).toString("base64");

        // Analyze with Gemini
        const videoAnalysis = await analyzeUploadedVideoWithGemini(
            videoBase64,
            videoFile.type || "video/mp4",
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
    videoBase64: string,
    mimeType: string,
    description: string,
    creatorSetup: CreatorSetup | null
): Promise<VideoAnalysis> {
    const videoPart: Part = {
        inlineData: {
            mimeType: mimeType as "video/mp4" | "video/webm" | "video/quicktime",
            data: videoBase64,
        },
    };

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

    const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
    ];

    let result;
    let successfulModel = "";

    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying Gemini model for upload: ${modelName}...`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                safetySettings,
            });
            result = await model.generateContent([videoPart, prompt]);
            successfulModel = modelName;
            console.log(`Success with model: ${modelName}`);
            break;
        } catch (modelError: unknown) {
            const error = modelError as Error;
            console.log(`Model ${modelName} failed:`, error.message?.substring(0, 100));
            // Continue to next model
        }
    }

    if (!result) {
        throw new Error("All Gemini models failed to analyze the video");
    }

    const responseText = result.response.text();
    console.log(`Gemini response received from ${successfulModel}, parsing...`);

    // Clean and parse JSON
    let cleanedText = responseText.trim();
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
