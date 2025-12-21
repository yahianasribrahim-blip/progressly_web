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
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert ${platform} thumbnail analyst. Your job is to help creators improve their thumbnails.

CRITICAL RULE ABOUT "OVERLAP":
- Text at the TOP of image with subject in MIDDLE/BOTTOM = NOT overlap (this is GOOD)
- Text at the BOTTOM of image with subject in MIDDLE/TOP = NOT overlap (this is GOOD)
- ONLY call it overlap if text is LITERALLY covering the subject

DO NOT SUGGEST:
- Repositioning text that isn't actually overlapping
- Adding outlines if the text already has a visible outline
- Fake problems that don't exist

DO SUGGEST (be helpful with real feedback):
- Font improvements (is the font readable? impactful? appropriate for the niche?)
- Text length (too much text? could it be shorter?)
- Color choices (do the colors grab attention? could they be more vibrant?)
- Composition tips (rule of thirds? visual hierarchy?)
- Emotional appeal (does it create curiosity? urgency?)

Always give at least 1-2 genuine suggestions - but they must be about REAL aspects of the image.

Return JSON only.`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this ${platform} thumbnail and give helpful feedback.

First, note these positions:
- Text position: top, middle, or bottom?
- Subject position: top, middle, or bottom?
- Do they overlap? (ONLY if text literally covers the subject)

Then provide genuine, helpful suggestions about:
- Font choice and readability
- Text length and wording
- Color usage and vibrancy
- Overall composition and visual impact

Respond in JSON:
{
    "overallScore": <1-10>,
    "verdict": "<one sentence assessment>",
    "scores": {
        "attention": <1-10>,
        "clarity": <1-10>,
        "textReadability": <1-10 or null>,
        "colorContrast": <1-10>,
        "emotionalImpact": <1-10>
    },
    "hasText": <boolean>,
    "textContent": "<exact text>",
    "textPosition": "<top/middle/bottom>",
    "subjectPosition": "<top/middle/bottom>",
    "textOverlapsSubject": <boolean - only true if literally covering>,
    "textHasOutlineOrShadow": <boolean>,
    "strengths": ["<2-3 things that work well>"],
    "improvements": ["<1-2 genuine suggestions about font, colors, composition, etc>"],
    "quickFixes": ["<1-2 small tweaks that could help - be specific>"],
    "colorPalette": ["<visible colors>"]
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
