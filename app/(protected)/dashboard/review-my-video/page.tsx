"use client";

import { useState } from "react";
import {
    Video,
    Loader2,
    CheckCircle,
    AlertCircle,
    Lightbulb,
    Target,
    Upload,
    Film,
    Brain,
    TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";

interface VideoAnalysis {
    contentType: string;
    contentFormat: string;
    contentDescription: string;
    sceneBySceneBreakdown: { timestamp: string; description: string; whatsHappening: string }[];
    hookType: string;
    hookAnalysis?: string;
    effectiveness: string;
    score: number;
    replicabilityRequirements: string[];
    strengths: string[];
    improvements: string[];
}

interface Analysis {
    performanceScore: number;
    verdict: string;
    strengths: string[];
    improvements: string[];
    keyLearnings: string[];
}

export default function ReviewMyVideoPage() {
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [videoDescription, setVideoDescription] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!uploadedFile) {
            toast.error("Please select a video file first");
            return;
        }

        if (!videoDescription.trim()) {
            toast.error("Please describe what this video is about");
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setVideoAnalysis(null);
        setAnalysis(null);

        try {
            const formData = new FormData();
            formData.append("video", uploadedFile);
            formData.append("description", videoDescription);

            const res = await fetch("/api/video/analyze-upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to analyze video");
            }

            setVideoAnalysis(data.videoAnalysis);
            setAnalysis(data.analysis);

            toast.success("Video analyzed successfully!");
        } catch (err) {
            console.error("Upload analysis error:", err);
            setError(err instanceof Error ? err.message : "Failed to analyze video");
            toast.error(err instanceof Error ? err.message : "Failed to analyze video");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-500";
        if (score >= 60) return "text-blue-500";
        if (score >= 40) return "text-amber-500";
        return "text-red-500";
    };

    const getScoreGradient = (score: number) => {
        if (score >= 80) return "from-emerald-500 to-green-500";
        if (score >= 60) return "from-blue-500 to-cyan-500";
        if (score >= 40) return "from-amber-500 to-yellow-500";
        return "from-red-500 to-rose-500";
    };

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Review My Video"
                text="Upload your video before posting and get AI feedback on your hook, pacing, and improvements."
            />

            <div className="space-y-6">
                {/* Upload Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Upload className="h-5 w-5 text-violet-500" />
                            Upload Your Video
                        </CardTitle>
                        <CardDescription>
                            Get feedback before you post. Our AI analyzes your content and tells you exactly what to improve.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* File Upload */}
                        <div className="space-y-3">
                            <input
                                type="file"
                                accept="video/mp4,video/quicktime,video/webm,.mov"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setUploadedFile(file);
                                    }
                                }}
                                className="hidden"
                                id="video-upload"
                                disabled={isAnalyzing}
                            />
                            <label
                                htmlFor="video-upload"
                                className={cn(
                                    "flex flex-col items-center gap-3 px-6 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                                    uploadedFile
                                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                        : "border-muted-foreground/25 hover:border-muted-foreground/50",
                                    isAnalyzing && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <Film className="h-10 w-10 text-muted-foreground" />
                                <div className="text-center">
                                    <span className="text-sm font-medium">
                                        {uploadedFile
                                            ? `${uploadedFile.name} (${Math.round(uploadedFile.size / 1024 / 1024 * 10) / 10}MB)`
                                            : "Click to upload video"
                                        }
                                    </span>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        MP4, MOV, or WebM • Max 100MB
                                    </p>
                                </div>
                            </label>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                What is this video about? <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g., Comedy skit about gym bros, recipe tutorial, day in my life..."
                                value={videoDescription}
                                onChange={(e) => setVideoDescription(e.target.value)}
                                disabled={isAnalyzing}
                            />
                        </div>

                        {/* Analyze Button */}
                        <Button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !uploadedFile || !videoDescription.trim()}
                            className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                            size="lg"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Analyzing Your Video...
                                </>
                            ) : (
                                <>
                                    <Brain className="h-4 w-4" />
                                    Analyze Before Posting
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Error */}
                {error && (
                    <Card className="border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <AlertCircle className="h-5 w-5" />
                                <p>{error}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Results */}
                {analysis && videoAnalysis && (
                    <div className="space-y-6">
                        {/* Score Card */}
                        <Card className={cn(
                            "border-2",
                            analysis.performanceScore >= 80 ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20" :
                                analysis.performanceScore >= 60 ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20" :
                                    analysis.performanceScore >= 40 ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20" :
                                        "border-red-300 bg-red-50/50 dark:border-red-700 dark:bg-red-950/20"
                        )}>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r shrink-0",
                                        getScoreGradient(analysis.performanceScore)
                                    )}>
                                        <div className="absolute inset-1.5 rounded-full bg-background flex items-center justify-center">
                                            <span className={cn("text-3xl font-bold", getScoreColor(analysis.performanceScore))}>
                                                {analysis.performanceScore}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">{analysis.verdict}</h3>
                                        <p className="text-muted-foreground mt-1">
                                            Hook Type: <span className="font-medium text-foreground">{videoAnalysis.hookType}</span>
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {videoAnalysis.contentType}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Content Description */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Video className="h-5 w-5 text-violet-500" />
                                    What We Saw
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>{videoAnalysis.contentDescription}</p>
                            </CardContent>
                        </Card>

                        {/* Improvements */}
                        {analysis.improvements && analysis.improvements.length > 0 && (
                            <Card className="border-amber-200 dark:border-amber-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                        <TrendingUp className="h-5 w-5" />
                                        Fix Before Posting
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {analysis.improvements.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}

                        {/* Strengths */}
                        {analysis.strengths && analysis.strengths.length > 0 && (
                            <Card className="border-emerald-200 dark:border-emerald-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle className="h-5 w-5" />
                                        What&apos;s Working
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {analysis.strengths.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}

                        {/* Scene Breakdown */}
                        {videoAnalysis.sceneBySceneBreakdown && videoAnalysis.sceneBySceneBreakdown.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Lightbulb className="h-5 w-5 text-violet-500" />
                                        Scene-by-Scene Breakdown
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {videoAnalysis.sceneBySceneBreakdown.map((scene, i) => (
                                            <div key={i} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                                                <Badge variant="secondary" className="shrink-0">
                                                    {scene.timestamp}
                                                </Badge>
                                                <div>
                                                    <p className="font-medium">{scene.description}</p>
                                                    <p className="text-sm text-muted-foreground">{scene.whatsHappening}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
