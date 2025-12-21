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
                    content: `You are an expert ${platform} thumbnail analyst.

CRITICAL RULES:

1. NEVER MAKE SUGGESTIONS ABOUT TEXT STYLING:
   - Do NOT suggest changing text color
   - Do NOT suggest adding outlines or shadows
   - Do NOT suggest text contrast changes
   - The AI cannot reliably detect text styling, so skip these entirely

2. TEXT OVERLAP:
   - Text at TOP with subject in MIDDLE/BOTTOM = NOT overlap
   - ONLY call it overlap if text LITERALLY covers the subject
   - Do NOT suggest repositioning unless there's actual overlap

3. ALL SUGGESTIONS MUST BE SPECIFIC AND ACTIONABLE:
   - BAD: "simplify the text" (vague)
   - GOOD: "Shorten 'Alhumdulillah Alhumdulillah Alhumdulillah' to just 'Alhumdulillah' for cleaner look"
   - BAD: "improve font" (vague)
   - GOOD: "Use a bolder font like Impact or Bebas Neue for more punch"

BANNED SUGGESTIONS (never say these):
- Anything about text color
- Anything about outlines or shadows
- Anything about text contrast
- Anything about repositioning text (unless covering subject)

ALLOWED SUGGESTIONS (focus on these):
- Shorten or reword the text (give specific before/after)
- Change font style (name specific fonts)
- Add visual elements (be specific about what and where)
- Composition improvements (rule of thirds, etc.)

Return JSON only.`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this ${platform} thumbnail.

FIRST, check these carefully:
1. Does the text have a dark outline or edge around it? Look closely at the text borders.
2. Where is text vs subject positioned?

THEN provide SPECIFIC, ACTIONABLE suggestions. Every suggestion must say:
- WHAT to change
- HOW to change it
- Example of the result

Example good suggestions:
- "Change the repeated 'Alhumdulillah Alhumdulillah Alhumdulillah' to just 'Alhumdulillah' for a cleaner look"
- "Use a bolder font like Impact or Bebas Neue for more punch"
- "Add a subtle gradient overlay to the bottom for depth"

Respond in JSON:
{
    "overallScore": <1-10>,
    "verdict": "<one sentence>",
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
    "textOverlapsSubject": <boolean>,
    "textHasOutlineOrShadow": <boolean - true if ANY dark edge visible around text>,
    "strengths": ["<what works well>"],
    "improvements": ["<SPECIFIC suggestion with what/how/result>"],
    "quickFixes": ["<SPECIFIC small tweak with clear instruction>"],
    "colorPalette": ["<colors>"]
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
