"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

type GenerationMode = "image" | "video" | "edit";

interface GeneratedMedia {
    type: "image" | "video";
    data: string;
    mimeType: string;
    textResponse?: string;
}

interface EditHistory {
    prompt: string;
    imageData: string;
    mimeType: string;
}

interface ConversationMessage {
    role: "user" | "model";
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

export function AIStudio() {
    const [mode, setMode] = useState<GenerationMode>("image");
    const [prompt, setPrompt] = useState("");
    const [aspectRatio, setAspectRatio] = useState("1:1");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedMedia, setGeneratedMedia] = useState<GeneratedMedia | null>(null);
    const [error, setError] = useState<{ message: string; details?: unknown } | null>(null);

    // For image editing
    const [uploadedImage, setUploadedImage] = useState<{ data: string; mimeType: string } | null>(null);
    const [editHistory, setEditHistory] = useState<EditHistory[]>([]);
    const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(",")[1];
                setUploadedImage({
                    data: base64,
                    mimeType: file.type,
                });
                setEditHistory([]);
                setConversationHistory([]);
                setGeneratedMedia(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".png", ".jpg", ".jpeg", ".webp"],
        },
        maxFiles: 1,
    });

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error("Please enter a prompt");
            return;
        }

        if (mode === "edit" && !uploadedImage) {
            toast.error("Please upload an image to edit");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            let endpoint = "";
            let body: Record<string, unknown> = {};

            if (mode === "image") {
                endpoint = "/api/media/generate-image";
                body = { prompt, aspectRatio };
            } else if (mode === "video") {
                endpoint = "/api/media/generate-video";
                body = { prompt, aspectRatio };
            } else if (mode === "edit") {
                endpoint = "/api/media/edit-image";
                body = {
                    prompt,
                    imageData: uploadedImage!.data,
                    mimeType: uploadedImage!.mimeType,
                    conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
                };
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                setError({
                    message: data.error || "Generation failed",
                    details: data.details,
                });
                toast.error(data.error || "Generation failed");
                return;
            }

            if (mode === "image" && data.image) {
                setGeneratedMedia({
                    type: "image",
                    data: data.image.data,
                    mimeType: data.image.mimeType,
                    textResponse: data.textResponse,
                });
                toast.success("Image generated!");
            } else if (mode === "video") {
                if (data.async) {
                    toast.info("Video generation started - this may take a moment");
                    setError({
                        message: "Video generation is async",
                        details: data,
                    });
                } else if (data.video) {
                    setGeneratedMedia({
                        type: "video",
                        data: data.video.uri || data.video.data || "",
                        mimeType: data.video.mimeType || "video/mp4",
                        textResponse: data.textResponse,
                    });
                    toast.success("Video generated!");
                }
            } else if (mode === "edit" && data.image) {
                setGeneratedMedia({
                    type: "image",
                    data: data.image.data,
                    mimeType: data.image.mimeType,
                    textResponse: data.textResponse,
                });
                setEditHistory([...editHistory, {
                    prompt,
                    imageData: data.image.data,
                    mimeType: data.image.mimeType,
                }]);
                if (data.conversationHistory) {
                    setConversationHistory(data.conversationHistory);
                }
                // Update the uploaded image to the edited one for next iteration
                setUploadedImage({
                    data: data.image.data,
                    mimeType: data.image.mimeType,
                });
                toast.success("Image edited!");
            }

            setPrompt("");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError({ message: errorMessage });
            toast.error(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!generatedMedia) return;

        const extension = generatedMedia.mimeType.split("/")[1] || "png";
        const filename = `ai-${generatedMedia.type}-${Date.now()}.${extension}`;

        // Check if it's a URL or base64
        if (generatedMedia.data.startsWith("http")) {
            window.open(generatedMedia.data, "_blank");
        } else {
            const link = document.createElement("a");
            link.href = `data:${generatedMedia.mimeType};base64,${generatedMedia.data}`;
            link.download = filename;
            link.click();
        }
    };

    const handleReset = () => {
        setPrompt("");
        setGeneratedMedia(null);
        setError(null);
        setUploadedImage(null);
        setEditHistory([]);
        setConversationHistory([]);
    };

    return (
        <div className="space-y-6">
            <Tabs value={mode} onValueChange={(v) => {
                setMode(v as GenerationMode);
                handleReset();
            }}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="image" className="flex items-center gap-2">
                        <Icons.image className="size-4" />
                        Generate Image
                    </TabsTrigger>
                    <TabsTrigger value="video" className="flex items-center gap-2">
                        <Icons.video className="size-4" />
                        Generate Video
                    </TabsTrigger>
                    <TabsTrigger value="edit" className="flex items-center gap-2">
                        <Icons.sparkles className="size-4" />
                        Edit Image
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="image" className="space-y-4 pt-4">
                    <ImageVideoForm
                        prompt={prompt}
                        setPrompt={setPrompt}
                        aspectRatio={aspectRatio}
                        setAspectRatio={setAspectRatio}
                        isGenerating={isGenerating}
                        onGenerate={handleGenerate}
                        mode="image"
                    />
                </TabsContent>

                <TabsContent value="video" className="space-y-4 pt-4">
                    <ImageVideoForm
                        prompt={prompt}
                        setPrompt={setPrompt}
                        aspectRatio={aspectRatio}
                        setAspectRatio={setAspectRatio}
                        isGenerating={isGenerating}
                        onGenerate={handleGenerate}
                        mode="video"
                    />
                </TabsContent>

                <TabsContent value="edit" className="space-y-4 pt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-4">
                            {/* Upload zone */}
                            <div
                                {...getRootProps()}
                                className={`
                                    relative cursor-pointer rounded-lg border-2 border-dashed p-8
                                    transition-colors hover:border-primary/50
                                    ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
                                    ${uploadedImage ? "border-green-500/50" : ""}
                                `}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <Icons.upload className="size-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        {uploadedImage
                                            ? "Image uploaded! Drop another to replace"
                                            : "Drop an image here or click to upload"
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Current image preview */}
                            {uploadedImage && (
                                <div className="overflow-hidden rounded-lg border">
                                    <img
                                        src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`}
                                        alt="Uploaded"
                                        className="h-auto w-full"
                                    />
                                </div>
                            )}

                            {/* Edit prompt */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-prompt">What would you like to change?</Label>
                                <Textarea
                                    id="edit-prompt"
                                    placeholder="E.g., 'Add a rainbow in the sky' or 'Make the colors more vibrant'"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating || !uploadedImage || !prompt.trim()}
                                className="w-full"
                            >
                                {isGenerating ? (
                                    <>
                                        <Icons.spinner className="mr-2 size-4 animate-spin" />
                                        Editing...
                                    </>
                                ) : (
                                    <>
                                        <Icons.sparkles className="mr-2 size-4" />
                                        Apply Edit
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Edit history */}
                        <div className="space-y-4">
                            <Label>Edit History</Label>
                            <div className="max-h-[500px] space-y-2 overflow-y-auto rounded-lg border p-4">
                                {editHistory.length === 0 ? (
                                    <p className="text-center text-sm text-muted-foreground">
                                        No edits yet. Upload an image and describe your changes.
                                    </p>
                                ) : (
                                    editHistory.map((edit, idx) => (
                                        <div key={idx} className="rounded-lg bg-muted p-3">
                                            <p className="mb-2 text-sm font-medium">{edit.prompt}</p>
                                            <img
                                                src={`data:${edit.mimeType};base64,${edit.imageData}`}
                                                alt={`Edit ${idx + 1}`}
                                                className="h-24 w-auto rounded"
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Results area */}
            {(generatedMedia || error) && (
                <Card>
                    <CardContent className="pt-6">
                        {error && (
                            <div className="mb-4 rounded-lg bg-red-500/10 p-4">
                                <p className="font-medium text-red-500">{error.message}</p>
                                {error.details && (
                                    <pre className="mt-2 max-h-64 overflow-auto rounded bg-black/50 p-3 text-xs text-white">
                                        {JSON.stringify(error.details as Record<string, unknown>, null, 2)}
                                    </pre>
                                )}
                            </div>
                        )}

                        {generatedMedia && (
                            <div className="space-y-4">
                                {generatedMedia.textResponse && (
                                    <p className="text-sm text-muted-foreground">
                                        {generatedMedia.textResponse}
                                    </p>
                                )}

                                <div className="flex justify-center">
                                    {generatedMedia.type === "image" ? (
                                        <img
                                            src={
                                                generatedMedia.data.startsWith("http")
                                                    ? generatedMedia.data
                                                    : `data:${generatedMedia.mimeType};base64,${generatedMedia.data}`
                                            }
                                            alt="Generated"
                                            className="max-h-[600px] w-auto rounded-lg shadow-lg"
                                        />
                                    ) : (
                                        <video
                                            src={
                                                generatedMedia.data.startsWith("http")
                                                    ? generatedMedia.data
                                                    : `data:${generatedMedia.mimeType};base64,${generatedMedia.data}`
                                            }
                                            controls
                                            className="max-h-[600px] w-auto rounded-lg shadow-lg"
                                        />
                                    )}
                                </div>

                                <div className="flex justify-center gap-2">
                                    <Button onClick={handleDownload} variant="outline">
                                        <Icons.arrowRight className="mr-2 size-4 rotate-90" />
                                        Download
                                    </Button>
                                    <Button onClick={handleReset} variant="ghost">
                                        Generate New
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Shared form component for image/video generation
function ImageVideoForm({
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    isGenerating,
    onGenerate,
    mode,
}: {
    prompt: string;
    setPrompt: (v: string) => void;
    aspectRatio: string;
    setAspectRatio: (v: string) => void;
    isGenerating: boolean;
    onGenerate: () => void;
    mode: "image" | "video";
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="prompt">
                    Describe your {mode}
                </Label>
                <Textarea
                    id="prompt"
                    placeholder={
                        mode === "image"
                            ? "E.g., 'A futuristic city at sunset with flying cars, cyberpunk style'"
                            : "E.g., 'A cat walking on a beach at sunset, cinematic'"
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                    {prompt.length} characters
                </p>
            </div>

            <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1:1">1:1 (Square)</SelectItem>
                            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                            <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                            <SelectItem value="4:3">4:3</SelectItem>
                            <SelectItem value="3:4">3:4</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    onClick={onGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    size="lg"
                >
                    {isGenerating ? (
                        <>
                            <Icons.spinner className="mr-2 size-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Icons.sparkles className="mr-2 size-4" />
                            Generate {mode === "image" ? "Image" : "Video"}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
