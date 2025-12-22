import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

        const prompt = `Based on this video analysis, generate 3-5 short, practical questions to ask the user BEFORE generating a video idea. The questions should help determine if they can realistically film a similar video.

VIDEO ANALYSIS:
- Content Type: ${videoAnalysis.contentType}
- Setting: ${videoAnalysis.settingType}
- People Count: ${videoAnalysis.peopleCount}
- Production Quality: ${videoAnalysis.productionQuality}
- Key Requirements: ${videoAnalysis.replicabilityRequirements?.join(", ") || "None specified"}

RULES:
1. Only ask questions that are RELEVANT to this specific video
2. Questions should be yes/no or simple choice format
3. Focus on: location access, equipment, props, willing collaborators
4. Keep questions SHORT (under 15 words each)
5. Don't ask obvious questions (e.g., "do you have a phone to film?")
6. Max 5 questions, minimum 3

Return a JSON array of questions with this EXACT structure:
[
    {
        "id": "gym_access",
        "question": "Do you have access to a gym?",
        "type": "yes_no",
        "relevance": "The video was filmed at a gym"
    },
    {
        "id": "willing_public",
        "question": "Are you comfortable filming in public?",
        "type": "yes_no",
        "relevance": "Video was shot in a public space"
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
