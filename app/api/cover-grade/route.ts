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
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert ${platform} thumbnail analyst.

CRITICAL: You MUST actually analyze the image. Do NOT suggest fixes for problems that don't exist.

BEFORE suggesting anything, you must verify:
1. TEXT POSITION: Does the text actually overlap with the main subject, or is it positioned separately?
2. TEXT STYLING: Does the text already have an outline, shadow, or contrasting background?
3. COMPOSITION: Is the image already well-composed?

RULES:
- If text does NOT overlap the subject, don't suggest repositioning
- If text already HAS an outline/shadow, don't suggest adding one
- If you suggest "reduce text", specify WHICH words to remove
- Empty arrays are fine if no changes needed
- Be SPECIFIC: "Move the top text 20px left" not "adjust positioning"

Return JSON only.`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this ${platform} thumbnail.

FIRST, describe what you actually see:
- Where is the text positioned relative to the main subject?
- Does the text have any outline, shadow, or background?
- What is the overall composition?

THEN, only suggest improvements for REAL problems. If something is already done well, don't suggest it.

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
    "textHasOutlineOrShadow": <boolean - does the text already have styling?>,
    "textOverlapsSubject": <boolean - does text actually overlap the main subject?>,
    "strengths": ["<what works well>"],
    "improvements": ["<ONLY suggest if truly needed - empty array if image is good>"],
    "quickFixes": ["<minor tweaks ONLY if needed - be SPECIFIC about what exactly to change>"],
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
