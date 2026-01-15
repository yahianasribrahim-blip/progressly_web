import { NextResponse } from "next/server";
import { auth } from "@/auth";

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "";
const MODEL = "gemini-2.5-flash-image";

interface ConversationMessage {
    role: "user" | "model";
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { prompt, imageData, mimeType, conversationHistory } = body;

        if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
            return NextResponse.json(
                { error: "Edit prompt is required" },
                { status: 400 }
            );
        }

        if (!imageData || !mimeType) {
            return NextResponse.json(
                { error: "Image data and mime type are required" },
                { status: 400 }
            );
        }

        if (!GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "GOOGLE_GEMINI_API_KEY is not configured" },
                { status: 500 }
            );
        }

        console.log("=== IMAGE EDITING REQUEST ===");
        console.log("User:", session.user.email);
        console.log("Prompt:", prompt.substring(0, 100));
        console.log("Has conversation history:", !!conversationHistory?.length);

        // Build contents array for multi-turn conversation
        const contents: ConversationMessage[] = [];

        // Add previous conversation if exists
        if (conversationHistory && Array.isArray(conversationHistory)) {
            for (const msg of conversationHistory) {
                contents.push(msg);
            }
        }

        // Add current user message with image and prompt
        contents.push({
            role: "user",
            parts: [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: imageData,
                    }
                },
                { text: prompt }
            ]
        });

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY,
                },
                body: JSON.stringify({ contents }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API error:", response.status, errorText);

            return NextResponse.json({
                error: "Image editing failed",
                details: {
                    status: response.status,
                    statusText: response.statusText,
                    model: MODEL,
                    apiError: errorText,
                }
            }, { status: response.status });
        }

        const result = await response.json();
        console.log("Gemini edit response received");

        // Extract response
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

        // Find the image and text parts
        let editedImageData: { data: string; mimeType: string } | null = null;
        let textResponse: string | null = null;

        for (const part of parts) {
            if (part.inlineData) {
                editedImageData = {
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || "image/png",
                };
            } else if (part.text) {
                textResponse = part.text;
            }
        }

        if (!editedImageData) {
            return NextResponse.json({
                error: "No edited image was generated",
                details: {
                    model: MODEL,
                    textResponse: textResponse || "No text response",
                    partsCount: parts.length,
                    partTypes: parts.map((p: { text?: string; inlineData?: unknown }) =>
                        p.text ? "text" : p.inlineData ? "inlineData" : "unknown"
                    ),
                }
            }, { status: 500 });
        }

        console.log("Image edited successfully");

        // Build updated conversation history for next turn
        const updatedHistory: ConversationMessage[] = [...contents];
        updatedHistory.push({
            role: "model",
            parts: parts.map((p: { text?: string; inlineData?: { mimeType: string; data: string } }) => {
                if (p.inlineData) {
                    return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } };
                }
                return { text: p.text || "" };
            }),
        });

        return NextResponse.json({
            success: true,
            image: editedImageData,
            textResponse: textResponse,
            conversationHistory: updatedHistory,
        });

    } catch (error) {
        console.error("Error in image editing:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        return NextResponse.json({
            error: "Image editing failed",
            details: {
                message: errorMessage,
                model: MODEL,
            }
        }, { status: 500 });
    }
}
