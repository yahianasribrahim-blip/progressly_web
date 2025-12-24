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
THE CREATOR'S NICHE IS: ${userNiche}

YOUR JOB:
1. STUDY the inspiration video - understand WHY it worked (the format, style, pacing, hook, vibes)
2. EXTRACT the concept/technique that made it successful
3. APPLY that same concept/technique to ${userNiche} content

Example: If inspiration is ASMR cooking with close-ups and satisfying sounds:
- KEEP: Close-up shots, satisfying sounds, no talking, relaxing vibes
- CHANGE: Instead of cooking → apply to ${userNiche} (e.g., car sounds, textures, details)

The value is in understanding WHY the inspiration worked, then recreating that magic in their niche.

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
THE CREATOR'S NICHE IS: ${userNiche}

YOUR JOB:
1. STUDY the inspiration video - understand WHY it worked (the format, style, pacing, hook, vibes)
2. EXTRACT the concept/technique that made it successful
3. APPLY that same concept/technique to ${userNiche} content

The value is in understanding WHY the inspiration worked, then recreating that magic in their niche.

CREATOR'S RESOURCES (Assume basic setup):
- Solo creator
- Smartphone camera
- 1-2 hours per video
- Home filming location
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

CRITICAL RULES FOR EDITS - READ VERY CAREFULLY:

**RULE #1: TRANSLATE THE EDIT TYPE TO THEIR NICHE**
The inspiration shows a compilation or edit in ONE category. You must translate it to THEIR niche.

WRONG vs RIGHT examples:
- Creator does CAR CONTENT, inspiration is "cooking fails compilation"
  ❌ WRONG: "Make a cooking fails compilation" (not their niche!)
  ✓ RIGHT: "Make a CAR fails/crashes compilation - find clips from r/IdiotsInCars or YouTube"

- Creator does FITNESS CONTENT, inspiration is "celebrity basketball highlights"
  ❌ WRONG: "Make basketball highlights"
  ✓ RIGHT: "Make athlete/gym motivation highlights - find clips from fitness YouTube channels"

- Creator does GAMING CONTENT, inspiration is "soccer fails"
  ❌ WRONG: "Make soccer fails compilation"
  ✓ RIGHT: "Make GAMING fails compilation - find clips from Twitch fails, YouTube gaming fails"

**RULE #2: ALWAYS CHECK THE CREATOR'S NICHE FIRST**
Look at "CREATOR'S NICHE/FOCUS" above. The entire idea MUST be about their niche, not the inspiration's topic.

**RULE #3: FIND CLIPS IN THEIR NICHE**
Suggest WHERE to find clips that match their content:
- YouTube: "[their niche] fails", "[their niche] highlights"
- Reddit: subreddits about their topic (r/IdiotsInCars for cars, r/gym for fitness)
- Twitter/X: viral clips in their niche
- Stock footage if appropriate

**RULE #4: KEEP THE EDIT STYLE, CHANGE THE SUBJECT**
- Same editing techniques: transitions, effects, pacing, music sync
- Same vibe: funny, dramatic, satisfying, motivational
- DIFFERENT subject: their niche, not the inspiration's topic

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

CRITICAL RULES - READ VERY CAREFULLY:

**RULE #1: ABSTRACT THE CONCEPT - NEVER COPY THE EXACT SUBJECT**
The inspiration video shows ONE example of a concept. Your job is to identify WHAT CATEGORY it belongs to, then help them find a DIFFERENT example in that category.

WRONG vs RIGHT examples:
- Inspiration: BMW 740d with hidden water dispenser feature
  ❌ WRONG: "Find a BMW 740d with a water dispenser feature" (this is just copying)
  ✓ RIGHT: "Find ANY exotic car with a surprising/quirky hidden feature and reveal it dramatically"
  
- Inspiration: Cooking fails compilation (eggs exploding, kitchen fires)
  ❌ WRONG: "Make a cooking fails compilation" (doesn't apply to their car niche)
  ✓ RIGHT: "Make a CAR fails/crashes compilation" (applies the format to their niche)

- Inspiration: Satisfying soap cutting video
  ❌ WRONG: "Cut soap in a satisfying way"
  ✓ RIGHT: "Create satisfying content in YOUR niche - maybe detailing a car, polishing wheels, etc."

**RULE #2: ALWAYS TRANSLATE TO THE CREATOR'S NICHE**
Look at the creator's niche/focus in their profile. The idea MUST be something they would actually make.
- If they do cars and inspiration is about cooking → translate to cars
- If they do fitness and inspiration is about gaming → translate to fitness
- If inspiration IS already in their niche → still abstract it (don't say "film THIS specific thing", say "find ANY example of this type")

**RULE #3: THE CONCEPT IS ALWAYS MORE GENERAL THAN THE VIDEO**
- Specific BMW feature → General: "unexpected product feature reveal"
- Specific cooking fails → General: "fails/bloopers compilation"
- Specific celebrity highlight → General: "best moments montage"

**RULE #4: NEVER SAY "FIND THE SAME THING"**
If the inspiration shows a BMW with a feature, DON'T say "find a BMW with this feature"
SAY: "Find a car with an interesting/unique feature that will surprise viewers"

**RULE #5: FOR EDITS - FIND CLIPS IN THEIR NICHE**
If they do car content and inspiration is cooking fails:
- Tell them to find "car crash fails" or "driving fails" or "mechanic fails" 
- Suggest sources: YouTube compilations, r/IdiotsInCars, Twitter car content

TECHNICAL REQUIREMENTS:
- Generate an idea ADAPTED to their filming resources
- Provide SPECIFIC shot-by-shot instructions with timestamps
- Include camera angles and lighting for each shot
- Make it achievable in their time budget
- NEVER suggest things they don't have access to

DO NOT:
- End with explicit CTAs like "LIKE & FOLLOW" or "COMMENT BELOW"
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
