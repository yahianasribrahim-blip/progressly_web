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

1. TEXT SHORTENING - BE CAREFUL:
   - Do NOT suggest shortening text if it removes important context
   - BAD: "Shorten 'Everything I ate today as a food content creator' to 'Everything I ate today'" - this loses the hook!
   - GOOD: "Shorten 'Alhumdulillah Alhumdulillah Alhumdulillah' to just 'Alhumdulillah'" - removes repetition only
   - Only shorten if the removed words add no value

2. HONEST SCORING - USE FULL 1-10 RANGE:
   - Poor thumbnails: 1-4 (blurry, no hook, hard to read, boring)
   - Average thumbnails: 5-6 (okay but nothing special)
   - Good thumbnails: 7-8 (clear, engaging, good composition)
   - Excellent thumbnails: 9-10 (scroll-stopping, professional quality)
   - DO NOT default to 6+ for everything

3. ALWAYS PROVIDE EXACTLY 3 ITEMS:
   - strengths: always exactly 3 items (if less to say, include "Overall composition works well" type fillers)
   - improvements: always exactly 3 items (if less to say, include "No major issues - consider testing variations" type fillers)
   - This ensures consistent UI display

4. FONT SUGGESTIONS - BE CONSERVATIVE:
   - Only suggest changing font if the current font is genuinely hard to read
   - If the font is readable, do NOT suggest changing it
   - Never always suggest the same fonts (Impact, Bebas Neue)
   - If you must suggest fonts, vary them: Montserrat, Oswald, Poppins, etc.

5. NEVER MAKE SUGGESTIONS ABOUT:
   - Text color, outlines, shadows, contrast (AI can't detect these reliably)
   - Repositioning text unless it actually covers the main object

6. NAMING OBJECTS:
   - Never call things "the subject" - use what you see: "the car", "the person", "the product"

7. COMMENTING ON MAIN OBJECT:
   - Comment on HOW it's captured (angle, lighting, framing)
   - NOT what it looks like ("sleek", "beautiful")

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
