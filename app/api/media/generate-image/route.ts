import { NextResponse } from "next/server";
import { auth } from "@/auth";

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "";
const MODEL = "gemini-2.0-flash-exp";

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { prompt, aspectRatio } = body;

        if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
            return NextResponse.json(
                { error: "Prompt is required and must be a non-empty string" },
                { status: 400 }
            );
        }

        if (!GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "GOOGLE_GEMINI_API_KEY is not configured" },
                { status: 500 }
            );
        }

        console.log("=== IMAGE GENERATION REQUEST ===");
        console.log("User:", session.user.email);
        console.log("Prompt:", prompt.substring(0, 100));
        console.log("Aspect Ratio:", aspectRatio || "default");

        // Build prompt with aspect ratio hint
        let enhancedPrompt = prompt;
        if (aspectRatio) {
            const aspectHints: Record<string, string> = {
                "1:1": "Generate a square image.",
                "16:9": "Generate a wide landscape image (16:9 aspect ratio).",
                "9:16": "Generate a tall portrait image (9:16 aspect ratio).",
                "4:3": "Generate a 4:3 aspect ratio image.",
                "3:4": "Generate a 3:4 aspect ratio image.",
            };
            if (aspectHints[aspectRatio]) {
                enhancedPrompt = `${aspectHints[aspectRatio]} ${prompt}`;
            }
        }

        // Build the request payload - no generationConfig for image generation
        const requestPayload = {
            contents: [{
                parts: [{ text: `Generate an image: ${enhancedPrompt}` }]
            }],
            generationConfig: {
                responseModalities: ["TEXT", "IMAGE"]
            }
        };

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY,
                },
                body: JSON.stringify(requestPayload),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API error:", response.status, errorText);

            // Return detailed error to the user
            return NextResponse.json({
                error: "Image generation failed",
                details: {
                    status: response.status,
                    statusText: response.statusText,
                    model: MODEL,
                    apiError: errorText,
                }
            }, { status: response.status });
        }

        const result = await response.json();
        console.log("Gemini response received");

        // Extract image data from response
        const parts = result.candidates?.[0]?.content?.parts;

        if (!parts || parts.length === 0) {
            return NextResponse.json({
                error: "No content generated",
                details: {
                    model: MODEL,
                    candidates: result.candidates?.length || 0,
                    finishReason: result.candidates?.[0]?.finishReason || "unknown",
                    safetyRatings: result.candidates?.[0]?.safetyRatings || [],
                }
            }, { status: 500 });
        }

        // Find the image part
        let imageData: { data: string; mimeType: string } | null = null;
        let textResponse: string | null = null;

        for (const part of parts) {
            if (part.inlineData) {
                imageData = {
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || "image/png",
                };
            } else if (part.text) {
                textResponse = part.text;
            }
        }

        if (!imageData) {
            return NextResponse.json({
                error: "No image was generated",
                details: {
                    model: MODEL,
                    textResponse: textResponse || "No text response either",
                    partsCount: parts.length,
                    partTypes: parts.map((p: { text?: string; inlineData?: unknown }) =>
                        p.text ? "text" : p.inlineData ? "inlineData" : "unknown"
                    ),
                }
            }, { status: 500 });
        }

        console.log("Image generated successfully, mime:", imageData.mimeType);

        return NextResponse.json({
            success: true,
            image: imageData,
            textResponse: textResponse,
        });

    } catch (error) {
        console.error("Error in image generation:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        return NextResponse.json({
            error: "Image generation failed",
            details: {
                message: errorMessage,
                model: MODEL,
            }
        }, { status: 500 });
    }
}
