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
        let userNiche = "general content";

        try {
            const profile = await prisma.userProfile.findUnique({
                where: { userId: session.user.id },
                include: { creatorSetup: true },
            });

            if (profile) {
                // Get the user's niche/focus area
                const nicheMap: Record<string, string> = {
                    HIJAB: "Muslim hijab fashion and lifestyle",
                    DEEN: "Islamic lifestyle and spirituality",
                    CULTURAL: "cultural content and traditions",
                    FOOD: "food and cooking",
                    GYM: "fitness and gym content",
                    PETS: "pet content and animals",
                    STORYTELLING: "storytelling and entertainment",
                    OTHER: "general content"
                };
                userNiche = nicheMap[profile.niche] || "general content";
            }

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
CREATOR'S NICHE/FOCUS: ${userNiche}

CREATOR'S RESOURCES (CRITICAL - Generate ideas they can ACTUALLY make):
- Team Size: ${teamSize === 1 ? "Solo creator (alone)" : `${teamSize} people`}
- Experience Level: ${experienceLevel}
- Primary Device: ${primaryDevice}
- Time per Video: ${hoursPerVideo} hours max
- Videos per Week: ${videosPerWeek}
- Available Props: ${availableProps.length > 0 ? availableProps.join(", ") : "Basic items"}
- Filming Locations: ${filmingLocations.join(", ")}
- Prefers No Music: ${prefersNoMusic ? "Yes" : "No"}

IMPORTANT: Tailor the video idea to fit their ${userNiche} content style while adapting the inspiration format.
` : `
CREATOR'S NICHE/FOCUS: ${userNiche}

CREATOR'S RESOURCES (Assume basic setup):
- Solo creator
- Smartphone camera
- 1-2 hours per video
- Home filming location

IMPORTANT: Tailor the video idea to fit their ${userNiche} content style while adapting the inspiration format.
`;

        const isEditCompilation = inspirationVideo.contentFormat === "edit_compilation";

        const prompt = isEditCompilation ? `You are a TikTok content strategist specializing in VIDEO EDITS. Your job is to extract the UNDERLYING EDIT CONCEPT from an inspiration and help the creator apply it to THEIR specific niche.

INSPIRATION EDIT:
- Content Type: ${inspirationVideo.contentType}
- Duration: ${inspirationVideo.duration} seconds
- Celebrities/Athletes Featured: ${inspirationVideo.celebritiesDetected || "Unknown"}
- What Made This Edit Work: ${inspirationVideo.whatWorked?.join(", ") || "N/A"}

VIDEO INTENTION/ABOUT: ${videoIntention}

${creatorContext}

${userAnswers && userAnswers.length > 0 ? `
USER'S EDITING SITUATION:
${userAnswers.map((a: { question: string; answer: string }) => `- ${a.question}: ${a.answer}`).join("\n")}

IMPORTANT: Respect these answers! If they said "no" to something, DO NOT suggest it.
` : ""}

CRITICAL RULES FOR EDITS:
1. EXTRACT THE EDIT CONCEPT - What TYPE of edit is this? Examples:
   - "Fails/bloopers compilation"
   - "Highlights/best moments montage"
   - "Before/after transformation"
   - "POV storytelling with cuts"

2. APPLY TO THEIR NICHE - Once you identify the edit type, translate it to THEIR content:
   - If they do car content and inspiration is "cooking fails" → suggest "car fails compilation" or "driving fails"
   - If they do fitness and inspiration is "celebrity highlights" → suggest "athlete workout highlights"
   - NEVER suggest they recreate the exact same edit with the same subjects

3. FINDING CLIPS - Suggest WHERE to find clips in their niche:
   - YouTube highlights/compilations for their topic
   - Twitter/X for viral clips in their niche
   - Reddit for community-sourced content
   - Stock footage sites if appropriate

4. EDITING TECHNIQUES - Keep the same edit STYLE:
   - Transitions, effects, clip selection, pacing, music sync
   - Beat drops, zooms, speed ramps, text overlays
   - Make it achievable with their editing setup

5. NEVER suggest they need to film celebrities/athletes themselves

Return a JSON object with this EXACT structure:
{
    "title": "<catchy title for their edit idea IN THEIR NICHE>",
    "concept": "<2-3 sentences explaining: 1) What edit concept you extracted, 2) How you adapted it to their niche>",
    "estimatedDuration": "<e.g., '30-45 seconds'>",
    "shotByShot": [
        {
            "shotNumber": 1,
            "timestamp": "0:00-0:03",
            "action": "<what clip to use IN THEIR NICHE and how to edit it>",
            "cameraAngle": "<zoom, pan, or static - for the edit effect>",
            "lighting": "<color grading: dark, vibrant, vintage, etc.>",
            "notes": "<editing tips: speed ramp, beat sync, transition type>"
        }
    ],
    "equipmentNeeded": ["<editing software>", "<where to find source footage FOR THEIR NICHE>"],
    "locationSuggestions": ["<specific YouTube channels, subreddits, or sources FOR THEIR NICHE>"],
    "tipsForSuccess": ["<3-4 specific editing tips to make this pop>"]
}`

            : `You are a TikTok content strategist. Your job is to extract the UNDERLYING CONCEPT or FORMAT from an inspiration video and help the creator apply it to THEIR specific niche and content style.

INSPIRATION VIDEO:
- Content Type: ${inspirationVideo.contentType}
- Duration: ${inspirationVideo.duration} seconds
- Setting: ${inspirationVideo.settingType}
- What Worked: ${inspirationVideo.whatWorked?.join(", ") || "N/A"}
- Scene Breakdown: ${JSON.stringify(inspirationVideo.sceneBreakdown || [])}

VIDEO INTENTION/ABOUT: ${videoIntention}

${creatorContext}

${userAnswers && userAnswers.length > 0 ? `
USER'S SPECIFIC SITUATION (from pre-generation questions):
${userAnswers.map((a: { question: string; answer: string }) => `- ${a.question}: ${a.answer}`).join("\n")}

IMPORTANT: Respect these answers! If they said "no" to something, DO NOT suggest it.
` : ""}

CRITICAL RULES - READ CAREFULLY:
1. EXTRACT THE UNDERLYING CONCEPT - Do NOT just copy the video. Ask yourself: "What is the FORMAT or CONCEPT that made this work?" For example:
   - If the video shows a BMW with a quirky hidden feature → The concept is "showcasing an unexpected/quirky feature of something in your niche"
   - If the video is a cooking fails compilation → The concept is "compilation of funny fails in a specific category"
   - If the video is a POV story → The concept is "POV storytelling format"

2. APPLY THE CONCEPT TO THE CREATOR'S NICHE - Once you identify the concept, translate it to what THEY do:
   - If they review exotic cars and the inspiration shows a "hidden feature reveal" → suggest they find a car with a unique/quirky feature to showcase
   - If they do food content and the inspiration is fails compilation → suggest finding cooking fails clips relevant to their food style
   - NEVER just tell them to recreate the exact same thing - give them the PRINCIPLE to apply

3. FOR EDITS/COMPILATIONS: If this is clearly an edit (multiple different people, celebrities, compilation):
   - The idea should be about FINDING similar clips in their niche and editing them
   - Example: If inspiration is "cooking fails compilation" and they do car content → suggest "car fails compilation" or "car crash fails"
   - Tell them WHERE to find the source clips (YouTube, Twitter, etc.)

4. BE CREATIVE AND ORIGINAL - The best ideas:
   - Take the SPIRIT of what worked
   - Apply it in a new, fresh way to their specific niche
   - Are not obvious copies but clever adaptations

5. TECHNICAL REQUIREMENTS:
   - Generate an idea ADAPTED to their filming resources
   - Provide SPECIFIC shot-by-shot instructions with timestamps
   - Include camera angles and lighting for each shot
   - Make it achievable in their time budget
   - NEVER suggest things they don't have access to

6. DO NOT:
   - End with explicit CTAs like "LIKE & FOLLOW" or "COMMENT BELOW" - TikTok algorithm hates this
   - Suggest black screens or text-only outros asking questions
   - Just tell them to recreate the exact same video

Return a JSON object with this EXACT structure:
{
    "title": "<catchy title for their video idea>",
    "concept": "<2-3 sentences explaining: 1) What concept you extracted from the inspiration, 2) How you adapted it to their niche>",
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
