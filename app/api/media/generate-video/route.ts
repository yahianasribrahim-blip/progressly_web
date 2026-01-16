import { NextResponse } from "next/server";
import { auth } from "@/auth";

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "";
// Veo 2 model for video generation (cheaper than Veo 3.1)
const MODEL = "veo-2.0-generate-001";

// Helper function to download video with API key authentication
async function downloadVideoWithAuth(uri: string): Promise<string | null> {
    try {
        // Append API key to the URI
        const separator = uri.includes("?") ? "&" : "?";
        const authenticatedUrl = `${uri}${separator}key=${GEMINI_API_KEY}`;

        const response = await fetch(authenticatedUrl);

        if (!response.ok) {
            console.error("Failed to download video:", response.status, response.statusText);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        console.log("Video downloaded successfully, size:", arrayBuffer.byteLength, "bytes");
        return base64;
    } catch (error) {
        console.error("Error downloading video:", error);
        return null;
    }
}

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
        console.log("Duration:", durationSeconds || "8");

        // Build the request payload for Veo using predictLongRunning endpoint
        // Veo only supports 16:9 (landscape) or 9:16 (portrait)
        const validAspectRatio = aspectRatio === "9:16" ? "9:16" : "16:9";

        const requestPayload = {
            instances: [{
                prompt: prompt,
            }],
            parameters: {
                aspectRatio: validAspectRatio,
                durationSeconds: durationSeconds || 8,
            }
        };

        // Use the predictLongRunning endpoint for Veo
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predictLongRunning?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestPayload),
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
                    endpoint: `generativelanguage.googleapis.com/v1beta/models/${MODEL}:predictLongRunning`,
                    requestPayload: requestPayload,
                    apiError: parsedError,
                    hint: response.status === 404
                        ? "Model not found. Veo may require Vertex AI access or a different API plan."
                        : response.status === 403
                            ? "Access denied. Veo requires paid API access. You may need to enable it in Google AI Studio."
                            : response.status === 400
                                ? "Bad request. The API format might have changed."
                                : "Unknown error. Check the apiError field for details.",
                }
            }, { status: response.status });
        }

        const result = await response.json();
        console.log("Veo response received:", JSON.stringify(result).substring(0, 500));

        // Veo uses long-running operations - we get an operation name to poll
        if (result.name) {
            // Start polling for completion
            const videoResult = await pollForVideoCompletion(result.name);

            if (videoResult.error) {
                return NextResponse.json({
                    error: "Video generation failed during processing",
                    details: videoResult,
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                video: videoResult.video,
                textResponse: videoResult.textResponse,
            });
        }

        // Fallback: direct response (shouldn't happen with Veo)
        return NextResponse.json({
            error: "Unexpected response format",
            details: {
                model: MODEL,
                fullResponse: result,
            }
        }, { status: 500 });

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

// Poll for video generation completion
async function pollForVideoCompletion(operationName: string): Promise<{
    video?: { data?: string; uri?: string; mimeType: string };
    textResponse?: string;
    error?: string;
    details?: unknown;
}> {
    const maxAttempts = 120; // 10 minutes max (5 seconds * 120)
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${GEMINI_API_KEY}`
            );

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    error: "Failed to check operation status",
                    details: { status: response.status, error: errorText },
                };
            }

            const result = await response.json();

            // Check if operation is done
            if (result.done) {
                if (result.error) {
                    return {
                        error: "Video generation failed",
                        details: result.error,
                    };
                }

                // Extract video from response
                const response_data = result.response;

                // Check generateVideoResponse format (Veo 3.1)
                if (response_data?.generateVideoResponse?.generatedSamples?.[0]?.video) {
                    const video = response_data.generateVideoResponse.generatedSamples[0].video;

                    // Download the video with API key authentication
                    if (video.uri) {
                        const videoData = await downloadVideoWithAuth(video.uri);
                        if (videoData) {
                            return {
                                video: {
                                    data: videoData,
                                    mimeType: video.mimeType || "video/mp4",
                                },
                            };
                        }
                    }

                    // Fallback to returning URI if download fails
                    return {
                        video: {
                            uri: video.uri,
                            mimeType: video.mimeType || "video/mp4",
                        },
                    };
                }

                // Fallback: check generatedSamples directly
                if (response_data?.generatedSamples?.[0]?.video) {
                    const video = response_data.generatedSamples[0].video;
                    return {
                        video: {
                            uri: video.uri,
                            mimeType: video.mimeType || "video/mp4",
                        },
                    };
                }

                // Alternative response format
                if (response_data?.predictions?.[0]) {
                    const prediction = response_data.predictions[0];
                    return {
                        video: {
                            uri: prediction.videoUri || prediction.video?.uri,
                            data: prediction.videoBytes || prediction.video?.data,
                            mimeType: "video/mp4",
                        },
                    };
                }

                return {
                    error: "Video generated but no video data in response",
                    details: result,
                };
            }

            // Not done yet, wait and poll again
            console.log(`Video generation in progress... (attempt ${attempt + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, pollInterval));

        } catch (err) {
            return {
                error: "Error polling for video completion",
                details: err instanceof Error ? err.message : String(err),
            };
        }
    }

    return {
        error: "Video generation timed out after 10 minutes",
    };
}

