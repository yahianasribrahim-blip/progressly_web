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
        const { inspirationVideo, videoIntention } = body;

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
        let creatorSetup = null;
        try {
            const profile = await prisma.userProfile.findUnique({
                where: { userId: session.user.id },
            });

            // Get creator setup separately if it exists
            if (profile) {
                const setup = await prisma.creatorSetup.findUnique({
                    where: { profileId: profile.id },
                });
                creatorSetup = setup;
            }
        } catch (e) {
            console.log("Could not fetch creator setup:", e);
        }

        const creatorContext = creatorSetup ? `
CREATOR'S RESOURCES (CRITICAL - Generate ideas they can ACTUALLY make):
- Team Size: ${creatorSetup.teamSize === 1 ? "Solo creator (alone)" : `${creatorSetup.teamSize} people`}
- Experience Level: ${creatorSetup.experienceLevel}
- Primary Device: ${creatorSetup.primaryDevice || "Smartphone"}
- Time per Video: ${creatorSetup.hoursPerVideo} hours max
- Videos per Week: ${creatorSetup.videosPerWeek}
- Available Props: ${creatorSetup.availableProps?.join(", ") || "Basic items"}
- Filming Locations: ${creatorSetup.filmingLocations?.join(", ") || "Home"}
- Prefers No Music: ${creatorSetup.prefersNoMusic ? "Yes" : "No"}
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

RULES:
1. Generate an idea that ADAPTS the inspiration to what the creator can ACTUALLY make with their resources
2. If the inspiration requires a K9 police car and creator is solo at home - suggest an equivalent like "cleaning your car" or "organizing a space"
3. Provide SPECIFIC shot-by-shot instructions with timestamps
4. Include camera angles and lighting for each shot
5. Make it achievable in their time budget
6. Keep the same energy/vibe as the inspiration but make it DOABLE
7. NEVER suggest things they don't have access to

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
            hasCreatorContext: !!creatorSetup,
        });
    } catch (error) {
        console.error("Error generating idea:", error);
        return NextResponse.json(
            { error: "Failed to generate video idea. Please try again." },
            { status: 500 }
        );
    }
}
