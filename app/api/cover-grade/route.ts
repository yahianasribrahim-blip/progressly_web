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
                    content: `You are an expert ${platform} thumbnail/cover image analyst. You evaluate cover images for their ability to:
1. Stop viewers from scrolling (attention-grabbing)
2. Clearly communicate what the video is about
3. Be readable at small sizes on mobile
4. Stand out from other content in the feed

Be specific, actionable, and honest. Return JSON only.`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this ${platform} video cover/thumbnail image and provide detailed feedback.

Respond in this exact JSON format:
{
    "overallScore": <number 1-10>,
    "verdict": "<one sentence overall assessment>",
    "scores": {
        "attention": <1-10>,
        "clarity": <1-10>,
        "textReadability": <1-10 or null if no text>,
        "colorContrast": <1-10>,
        "emotionalImpact": <1-10>
    },
    "hasText": <boolean>,
    "textContent": "<detected text if any, else null>",
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>"],
    "quickFixes": ["<easy fix 1>", "<easy fix 2>"],
    "colorPalette": ["<color 1>", "<color 2>", "<color 3>"]
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
