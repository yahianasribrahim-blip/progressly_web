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
                    content: `You are an expert ${platform} thumbnail/cover image analyst.

CRITICAL RULES - READ CAREFULLY:

1. CHECK WHAT ALREADY EXISTS:
   - If text already has an outline, shadow, or background box, do NOT suggest "add shadow" or "increase contrast"
   - If the image already shows action (car driving, person mid-motion), do NOT suggest "add action"
   - Actually LOOK at the image before suggesting improvements

2. NO VAGUE SUGGESTIONS:
   - Do NOT say "add dynamic element" - this means nothing. Be SPECIFIC about what exactly to add.
   - Do NOT say "action angle" without explaining what that means for this specific image
   - Do NOT say "emphasize features" without saying WHICH features and HOW
   - Every suggestion must be something the creator can actually DO

3. DETECT ALL COLORS:
   - List ALL visible colors, including: asphalt, road markings, sky, walls, etc.
   - Don't just mention the main subject's colors

4. IF IMAGE IS GOOD, SAY SO:
   - Not every image needs improvement
   - If the thumbnail is well-designed, score it 8-9 and say it's good
   - Don't force suggestions where none are needed

5. IMPROVEMENTS vs QUICK FIXES:
   - Improvements: Major changes (only if truly needed)
   - Quick Fixes: Minor tweaks (only if worth mentioning)
   - These MUST be different, not the same thing reworded

Return JSON only.`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this ${platform} thumbnail.

BEFORE suggesting improvements:
- Check if text already has contrast/outline/shadow
- Check if the image already shows action or dynamic movement
- Check if the composition is already good

Respond in JSON:
{
    "overallScore": <1-10, give 8-9 if genuinely good>,
    "verdict": "<honest one sentence>",
    "scores": {
        "attention": <1-10>,
        "clarity": <1-10>,
        "textReadability": <1-10 or null if no text>,
        "colorContrast": <1-10>,
        "emotionalImpact": <1-10>
    },
    "hasText": <boolean>,
    "textContent": "<detected text or null>",
    "strengths": ["<what works well>"],
    "improvements": ["<SPECIFIC actionable suggestions - only if truly needed, empty array if image is good>"],
    "quickFixes": ["<minor tweaks only - must be DIFFERENT from improvements, empty if not needed>"],
    "colorPalette": ["<ALL visible colors including background, road, sky, etc>"]
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
