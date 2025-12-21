import { NextResponse } from "next/server";
import { auth } from "@/auth";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const imageFile = formData.get("image") as File | null;
        const imageUrl = formData.get("imageUrl") as string | null;
        const platform = (formData.get("platform") as string) || "tiktok";

        if (!imageFile && !imageUrl) {
            return NextResponse.json(
                { error: "Please provide an image file or URL" },
                { status: 400 }
            );
        }

        let imageData: string;

        if (imageFile) {
            // Convert file to base64
            const bytes = await imageFile.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const base64 = buffer.toString("base64");
            const mimeType = imageFile.type || "image/jpeg";
            imageData = `data:${mimeType};base64,${base64}`;
        } else if (imageUrl) {
            imageData = imageUrl;
        } else {
            return NextResponse.json(
                { error: "Invalid image input" },
                { status: 400 }
            );
        }

        // Use GPT-4 Vision to analyze the cover image
        const analysis = await analyzeCoverWithVision(imageData, platform);

        return NextResponse.json({
            success: true,
            ...analysis,
        });
    } catch (error) {
        console.error("Error grading cover:", error);
        return NextResponse.json(
            { error: "Failed to grade cover. Please try again." },
            { status: 500 }
        );
    }
}

async function analyzeCoverWithVision(imageData: string, platform: string) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",  // Using full gpt-4o for better vision analysis
            messages: [
                {
                    role: "system",
                    content: `You are an expert ${platform} thumbnail analyst.

CRITICAL - READ VERY CAREFULLY:

WHAT IS "OVERLAP"?
- Overlap means the text is DIRECTLY ON TOP OF the subject, making either hard to see
- Text at the TOP of the image while subject is in the MIDDLE/BOTTOM is NOT overlap
- Text at the BOTTOM of the image while subject is in the MIDDLE/TOP is NOT overlap
- If there is CLEAR SPACE between the text and subject, there is NO overlap

BEFORE suggesting ANYTHING about text position:
1. Look at WHERE the text actually is (top, middle, bottom of image)
2. Look at WHERE the subject actually is
3. Is the text LITERALLY covering part of the subject? Only then is it overlap.

RULES:
- If text is in its own space (not covering the subject), do NOT suggest repositioning
- If text has a black outline, do NOT suggest adding outline/shadow
- If you cannot identify a REAL problem, return empty arrays for improvements/quickFixes
- Empty arrays are the correct answer for well-designed thumbnails

Return JSON only.`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this ${platform} thumbnail.

STEP 1: Describe the actual positions:
- Where is the text? (top, middle, bottom of image)
- Where is the main subject? (top, middle, bottom)
- Is there CLEAR SPACE between them, or does text literally cover part of the subject?

STEP 2: Only suggest improvements for REAL problems you can actually see.

IMPORTANT: Text at the top of the image with the subject below is NOT overlap. That is GOOD positioning.

Respond in JSON:
{
    "overallScore": <1-10>,
    "verdict": "<one sentence>",
    "scores": {
        "attention": <1-10>,
        "clarity": <1-10>,
        "textReadability": <1-10 or null if no text>,
        "colorContrast": <1-10>,
        "emotionalImpact": <1-10>
    },
    "hasText": <boolean>,
    "textContent": "<exact text you see>",
    "textPosition": "<where is text: top, middle, bottom, or multiple locations>",
    "subjectPosition": "<where is subject: top, middle, bottom>",
    "textOverlapsSubject": <boolean - ONLY true if text literally covers part of the subject>,
    "textHasOutlineOrShadow": <boolean>,
    "strengths": ["<what works well>"],
    "improvements": ["<ONLY if there is a real problem - empty array is fine>"],
    "quickFixes": ["<ONLY if there is a real problem - empty array is fine>"],
    "colorPalette": ["<all visible colors>"]
}`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageData,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No response from Vision AI");
        }

        // Extract JSON from potential markdown code block
        let jsonContent = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonContent = jsonMatch[1].trim();
        }

        const parsed = JSON.parse(jsonContent);

        return {
            overallScore: parsed.overallScore || 5,
            verdict: parsed.verdict || "Cover analyzed",
            scores: {
                attention: parsed.scores?.attention || 5,
                clarity: parsed.scores?.clarity || 5,
                textReadability: parsed.scores?.textReadability || null,
                colorContrast: parsed.scores?.colorContrast || 5,
                emotionalImpact: parsed.scores?.emotionalImpact || 5,
            },
            hasText: parsed.hasText || false,
            textContent: parsed.textContent || null,
            strengths: parsed.strengths || [],
            improvements: parsed.improvements || [],
            quickFixes: parsed.quickFixes || [],
            colorPalette: parsed.colorPalette || [],
        };
    } catch (error) {
        console.error("Vision AI error:", error);
        return {
            overallScore: 5,
            verdict: "Unable to fully analyze the image. Using basic assessment.",
            scores: {
                attention: 5,
                clarity: 5,
                textReadability: null,
                colorContrast: 5,
                emotionalImpact: 5,
            },
            hasText: false,
            textContent: null,
            strengths: ["Image uploaded successfully"],
            improvements: [
                "Use bright, contrasting colors to stand out",
                "Add clear text overlay if not present",
                "Use expressive facial expressions if showing a person",
            ],
            quickFixes: [
                "Increase saturation slightly",
                "Add a border or frame",
            ],
            colorPalette: [],
        };
    }
}
