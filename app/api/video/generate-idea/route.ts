import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { inspirationVideo, videoIntention, userAnswers } = body;

        if (!inspirationVideo) {
            return NextResponse.json(
                { error: "Inspiration video data is required" },
                { status: 400 }
            );
        }

        console.log("=== GENERATE IDEA REQUEST ===");
        console.log("Content Type:", inspirationVideo.contentType);
        console.log("Intention:", videoIntention);

        // Fetch creator setup for personalized recommendations
        let teamSize = 1;
        let experienceLevel = "beginner";
        let primaryDevice = "Smartphone";
        let hoursPerVideo = 2;
        let videosPerWeek = 2;
        let availableProps: string[] = [];
        let filmingLocations: string[] = ["Home"];
        let prefersNoMusic = false;
        let hasCreatorSetup = false;

        try {
            const profile = await prisma.userProfile.findUnique({
                where: { userId: session.user.id },
                include: { creatorSetup: true },
            });

            if (profile?.creatorSetup) {
                hasCreatorSetup = true;
                const setup = profile.creatorSetup;
                teamSize = setup.teamSize || 1;
                experienceLevel = setup.experienceLevel || "beginner";
                primaryDevice = setup.primaryDevice || "Smartphone";
                hoursPerVideo = setup.hoursPerVideo || 2;
                videosPerWeek = setup.videosPerWeek || 2;
                availableProps = setup.availableProps || [];
                filmingLocations = setup.filmingLocations || ["Home"];
                prefersNoMusic = setup.prefersNoMusic || false;
            }
        } catch (e) {
            console.log("Could not fetch creator setup:", e);
        }

        const creatorContext = hasCreatorSetup ? `
CREATOR'S RESOURCES (CRITICAL - Generate ideas they can ACTUALLY make):
- Team Size: ${teamSize === 1 ? "Solo creator (alone)" : `${teamSize} people`}
- Experience Level: ${experienceLevel}
- Primary Device: ${primaryDevice}
- Time per Video: ${hoursPerVideo} hours max
- Videos per Week: ${videosPerWeek}
- Available Props: ${availableProps.length > 0 ? availableProps.join(", ") : "Basic items"}
- Filming Locations: ${filmingLocations.join(", ")}
- Prefers No Music: ${prefersNoMusic ? "Yes" : "No"}
` : `
CREATOR'S RESOURCES (Assume basic setup):
- Solo creator
- Smartphone camera
- 1-2 hours per video
- Home filming location
`;

        const prompt = `You are a TikTok content strategist. Based on the inspiration video analysis and the creator's available resources, generate a PERSONALIZED, ACHIEVABLE video plan.

INSPIRATION VIDEO:
- Content Type: ${inspirationVideo.contentType}
- Duration: ${inspirationVideo.duration} seconds
- Setting: ${inspirationVideo.settingType}
- What Worked: ${inspirationVideo.whatWorked?.join(", ") || "N/A"}
- Scene Breakdown: ${JSON.stringify(inspirationVideo.sceneBreakdown || [])}

VIDEO INTENTION: ${videoIntention}

${creatorContext}

${userAnswers && userAnswers.length > 0 ? `
USER'S SPECIFIC SITUATION (from pre-generation questions):
${userAnswers.map((a: { question: string; answer: string }) => `- ${a.question}: ${a.answer}`).join("\n")}

IMPORTANT: Respect these answers! If they said "no" to something, DO NOT suggest it.
` : ""}

RULES:
1. STAY FOCUSED ON THE SAME TOPIC/PRODUCT - If the inspiration is about a dropshipping product, your idea must be for THAT SAME PRODUCT
2. Do NOT generate ideas for a completely different product or topic - adapt the FORMAT/STYLE, not the subject
3. Generate an idea that ADAPTS the filming style/format to what the creator can make with their resources
4. If the inspiration requires equipment the creator doesn't have - suggest alternative ways to film THE SAME product/topic
5. Provide SPECIFIC shot-by-shot instructions with timestamps
6. Include camera angles and lighting for each shot
7. Make it achievable in their time budget
8. Keep the same energy/vibe as the inspiration but make it DOABLE
9. NEVER suggest things they don't have access to

Return a JSON object with this EXACT structure:
{
    "title": "<catchy title for their video idea>",
    "concept": "<2-3 sentences explaining the adapted concept and why it works>",
    "estimatedDuration": "<e.g., '30-45 seconds'>",
    "shotByShot": [
        {
            "shotNumber": 1,
            "timestamp": "0:00-0:05",
            "action": "<exactly what to film and do>",
            "cameraAngle": "<specific angle: wide, close-up, POV, etc.>",
            "lighting": "<natural, ring light, window light, etc.>",
            "notes": "<any tips for this shot>"
        }
    ],
    "equipmentNeeded": ["<list of items they need - must be achievable>"],
    "locationSuggestions": ["<specific location ideas based on their filming locations>"],
    "tipsForSuccess": ["<3-4 specific tips to make this video pop>"]
}`;

        // Try multiple model names
        const modelsToTry = [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
        ];

        let result;
        for (const modelName of modelsToTry) {
            try {
                console.log(`Generate idea: trying ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent(prompt);
                console.log(`Generate idea: success with ${modelName}`);
                break;
            } catch {
                console.log(`Generate idea: ${modelName} failed`);
            }
        }

        if (!result) {
            throw new Error("All Gemini models failed");
        }

        const response = await result.response;
        const text = response.text();

        console.log("Gemini response received, parsing...");

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No JSON found in response");
        }

        const idea = JSON.parse(jsonMatch[0]);

        console.log("Generated idea:", idea.title);

        return NextResponse.json({
            success: true,
            idea,
            hasCreatorContext: hasCreatorSetup,
        });
    } catch (error) {
        console.error("Error generating idea:", error);
        return NextResponse.json(
            { error: "Failed to generate video idea. Please try again." },
            { status: 500 }
        );
    }
}
