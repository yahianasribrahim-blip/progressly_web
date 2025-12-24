import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { videoAnalysis } = body;

        if (!videoAnalysis) {
            return NextResponse.json(
                { error: "Video analysis data is required" },
                { status: 400 }
            );
        }

        // Fetch user's content description for personalized questions
        let userContentDescription = "general content";
        try {
            const profile = await prisma.userProfile.findUnique({
                where: { userId: session.user.id },
                include: { creatorSetup: true },
            });

            if (profile?.creatorSetup) {
                const setup = profile.creatorSetup;
                if (setup.contentNiche && setup.contentNiche.trim()) {
                    userContentDescription = setup.contentNiche;
                } else if (setup.contentActivity) {
                    userContentDescription = setup.contentActivity;
                }
            }
        } catch (e) {
            console.log("Could not fetch user niche for questions:", e);
        }

        const isEditCompilation = videoAnalysis.contentFormat === "edit_compilation";

        const prompt = isEditCompilation ? `Based on this video analysis of an EDIT/COMPILATION (using celebrity/athlete footage), generate 3-5 short, practical questions to ask the user BEFORE generating an idea. The questions should help determine if they can recreate a SIMILAR EDIT.

THE USER'S CONTENT: ${userContentDescription}
(Generate questions relevant to THEIR content, not the inspiration video's topic)

VIDEO ANALYSIS:
- Content Type: ${videoAnalysis.contentType}
- Celebrities/Athletes Featured: ${videoAnalysis.celebritiesDetected || "Unknown"}
- Production Quality: ${videoAnalysis.productionQuality}

RULES:
1. This is an EDIT using existing footage - NOT original filming
2. Ask about EDITING capabilities, not filming locations
3. Focus on: editing software, source footage access, editing skills, similar content interests
4. Keep questions SHORT (under 15 words each)
5. Max 5 questions, minimum 3
6. IMPORTANT: Tailor questions to the USER'S content (${userContentDescription}), not the inspiration video's topic

Return a JSON array of questions with this EXACT structure:
[
    {
        "id": "editing_software",
        "question": "Do you have video editing software (CapCut, Premiere, etc.)?",
        "type": "yes_no",
        "relevance": "Needed to create edits"
    },
    {
        "id": "source_footage",
        "question": "Do you have access to footage of this athlete/celebrity?",
        "type": "yes_no",
        "relevance": "The edit uses ${videoAnalysis.celebritiesDetected} footage"
    }
]

Types can be: "yes_no", "choice" (if you want to offer options)
For "choice" type, add an "options" array: ["Option 1", "Option 2", "Option 3"]`

            : `Based on this video analysis, generate 3-5 short, practical questions to ask the user BEFORE generating a video idea.

THE USER'S CONTENT: ${userContentDescription}
(CRITICAL: Generate questions about THEIR content type, NOT the inspiration video's topic!)

If the inspiration is about cooking but the user does "${userContentDescription}", ask about:
- Access to items/locations relevant to ${userContentDescription}
- Equipment for filming ${userContentDescription}
- Props relevant to ${userContentDescription}

VIDEO ANALYSIS (for reference on STYLE, not topic):
- Content Type: ${videoAnalysis.contentType}
- Setting Style: ${videoAnalysis.settingType}
- People Count: ${videoAnalysis.peopleCount}
- Production Quality: ${videoAnalysis.productionQuality}
- Key Requirements: ${videoAnalysis.replicabilityRequirements?.join(", ") || "None specified"}

RULES:
1. Questions must be about the USER'S content (${userContentDescription}), NOT the inspiration video's topic
2. If inspiration is cooking and user does cars → ask about car access, not kitchen access
3. Questions should be yes/no or simple choice format
4. Focus on: location access, equipment, props for THEIR content type
5. Keep questions SHORT (under 15 words each)
6. Don't ask obvious questions (e.g., "do you have a phone to film?")
7. Max 5 questions, minimum 3

Return a JSON array of questions with this EXACT structure:
[
    {
        "id": "relevant_access",
        "question": "Do you have access to [item relevant to ${userContentDescription}]?",
        "type": "yes_no",
        "relevance": "Needed for the style of content shown"
    }
]

Types can be: "yes_no", "choice" (if you want to offer options)
For "choice" type, add an "options" array: ["Option 1", "Option 2", "Option 3"]`;

        // Try multiple model names
        const modelsToTry = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
        ];

        let result;
        for (const modelName of modelsToTry) {
            try {
                console.log(`Generate questions: trying ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent(prompt);
                console.log(`Generate questions: success with ${modelName}`);
                break;
            } catch {
                console.log(`Generate questions: ${modelName} failed`);
            }
        }

        if (!result) {
            throw new Error("All Gemini models failed");
        }

        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error("No JSON found in response");
        }

        const questions = JSON.parse(jsonMatch[0]);

        return NextResponse.json({
            success: true,
            questions,
        });
    } catch (error) {
        console.error("Error generating questions:", error);
        return NextResponse.json(
            { error: "Failed to generate questions. Please try again." },
            { status: 500 }
        );
    }
}
