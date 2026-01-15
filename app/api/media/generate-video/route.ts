import { NextResponse } from "next/server";
import { auth } from "@/auth";

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "";
// Veo model for video generation
const MODEL = "veo-2.0-generate-001";

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { prompt, aspectRatio, durationSeconds } = body;

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

        console.log("=== VIDEO GENERATION REQUEST ===");
        console.log("User:", session.user.email);
        console.log("Prompt:", prompt.substring(0, 100));
        console.log("Aspect Ratio:", aspectRatio || "16:9");
        console.log("Duration:", durationSeconds || "5");

        // Build the request payload for Veo
        const requestPayload = {
            instances: [{
                prompt: prompt,
            }],
            parameters: {
                aspectRatio: aspectRatio || "16:9",
                durationSeconds: durationSeconds || 5,
            }
        };

        // Try the Veo endpoint
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY,
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        responseModalities: ["VIDEO"],
                        ...(aspectRatio && { aspectRatio }),
                    }
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Veo API error:", response.status, errorText);

            // Parse error for more details
            let parsedError;
            try {
                parsedError = JSON.parse(errorText);
            } catch {
                parsedError = errorText;
            }

            // Return FULL detailed error to help debug
            return NextResponse.json({
                error: "Video generation failed",
                details: {
                    status: response.status,
                    statusText: response.statusText,
                    model: MODEL,
                    endpoint: `generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
                    requestPayload: requestPayload,
                    apiError: parsedError,
                    hint: response.status === 404
                        ? "Model not found. Veo may not be available in your region or requires Vertex AI access."
                        : response.status === 403
                            ? "Access denied. Veo video generation may require paid API access or approval."
                            : response.status === 400
                                ? "Bad request. Check if the prompt or parameters are valid."
                                : "Unknown error. Check the apiError field for details.",
                }
            }, { status: response.status });
        }

        const result = await response.json();
        console.log("Veo response received:", JSON.stringify(result).substring(0, 500));

        // Check if this is a long-running operation (async)
        if (result.name && result.name.includes("operations/")) {
            // This is an async operation, we need to poll for completion
            return NextResponse.json({
                success: true,
                async: true,
                operationName: result.name,
                message: "Video generation started. Poll the operation endpoint for completion.",
                details: {
                    model: MODEL,
                    operationId: result.name,
                }
            });
        }

        // Extract video data from response
        const parts = result.candidates?.[0]?.content?.parts;

        if (!parts || parts.length === 0) {
            return NextResponse.json({
                error: "No content generated",
                details: {
                    model: MODEL,
                    candidates: result.candidates?.length || 0,
                    finishReason: result.candidates?.[0]?.finishReason || "unknown",
                    safetyRatings: result.candidates?.[0]?.safetyRatings || [],
                    fullResponse: result,
                }
            }, { status: 500 });
        }

        // Find video data
        let videoData: { data?: string; fileUri?: string; mimeType: string } | null = null;
        let textResponse: string | null = null;

        for (const part of parts) {
            if (part.inlineData) {
                videoData = {
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || "video/mp4",
                };
            } else if (part.fileData) {
                videoData = {
                    fileUri: part.fileData.fileUri,
                    mimeType: part.fileData.mimeType || "video/mp4",
                };
            } else if (part.text) {
                textResponse = part.text;
            }
        }

        if (!videoData) {
            return NextResponse.json({
                error: "No video was generated",
                details: {
                    model: MODEL,
                    textResponse: textResponse || "No text response",
                    partsCount: parts.length,
                    partTypes: parts.map((p: { text?: string; inlineData?: unknown; fileData?: unknown }) => {
                        if (p.text) return "text";
                        if (p.inlineData) return "inlineData";
                        if (p.fileData) return "fileData";
                        return "unknown";
                    }),
                    fullParts: parts,
                }
            }, { status: 500 });
        }

        console.log("Video generated successfully, type:", videoData.mimeType);

        return NextResponse.json({
            success: true,
            video: videoData,
            textResponse: textResponse,
        });

    } catch (error) {
        console.error("Error in video generation:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        return NextResponse.json({
            error: "Video generation failed",
            details: {
                message: errorMessage,
                stack: errorStack,
                model: MODEL,
            }
        }, { status: 500 });
    }
}
