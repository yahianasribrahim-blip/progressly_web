"use client";

import { useState } from "react";
import {
    Video,
    Loader2,
    TrendingUp,
    TrendingDown,
    Eye,
    Heart,
    MessageCircle,
    Share2,
    Clock,
    CheckCircle,
    AlertCircle,
    Lightbulb,
    Sparkles,
    Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VideoStats {
    views: number;
    likes: number;
    comments: number;
    shares: number;
}

interface VideoAnalysis {
    score: number;
    verdict: string;
    engagementRate: string;
    engagementContext?: string;
    strengths: string[];
    improvements: string[];
    feedback: string[];
    tips: string[];
}

interface AnalyzedVideo {
    id: string;
    description: string;
    creator: string;
    duration: number;
    stats: VideoStats;
}

interface AnalyzeMyVideoProps {
    className?: string;
}

export function AnalyzeMyVideo({ className }: AnalyzeMyVideoProps) {
    const [videoUrl, setVideoUrl] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [video, setVideo] = useState<AnalyzedVideo | null>(null);
    const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(1) + "K";
        return num.toString();
    };

    const handleAnalyze = async () => {
        if (!videoUrl.trim()) {
            toast.error("Please enter a TikTok video URL");
            return;
        }

        if (!videoUrl.includes("tiktok.com")) {
            toast.error("Please enter a valid TikTok URL");
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setVideo(null);
        setAnalysis(null);

        try {
            const response = await fetch("/api/video/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoUrl }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to analyze video");
            }

            setVideo(data.video);
            setAnalysis(data.analysis);
            toast.success("Video analyzed successfully!");
        } catch (err) {
            console.error("Analysis error:", err);
            setError(err instanceof Error ? err.message : "Failed to analyze video");
            toast.error("Failed to analyze video");
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
        <Card className={cn("", className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Video className="h-5 w-5 text-violet-500" />
                    Analyze My Video
                </CardTitle>
                <CardDescription>
                    Paste your TikTok video URL to get detailed performance insights and improvement suggestions.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* URL Input */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="https://www.tiktok.com/@username/video/..."
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            className="pl-10"
                            disabled={isAnalyzing}
                        />
                    </div>
                    <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !videoUrl}
                        className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Analyze
                            </>
                        )}
                    </Button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-red-600 dark:text-red-400">
                        <p className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </p>
                    </div>
                )}

                {/* Analysis Results */}
                {video && analysis && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Score Card */}
                        <div className="rounded-xl border-2 p-6 bg-gradient-to-r from-violet-500/5 to-purple-500/5">
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                {/* Score Circle */}
                                <div className="flex flex-col items-center">
                                    <div className={cn(
                                        "relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-r",
                                        getScoreGradient(analysis.score)
                                    )}>
                                        <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                                            <span className={cn("text-4xl font-bold", getScoreColor(analysis.score))}>
                                                {analysis.score}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">Performance Score</p>
                                </div>

                                {/* Verdict & Stats */}
                                <div className="flex-1 space-y-4">
                                    <p className="text-lg font-semibold">{analysis.verdict}</p>

                                    {/* Stats Row */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Eye className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium">{formatNumber(video.stats.views)}</span>
                                            <span className="text-muted-foreground">views</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Heart className="h-4 w-4 text-red-500" />
                                            <span className="font-medium">{formatNumber(video.stats.likes)}</span>
                                            <span className="text-muted-foreground">likes</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <MessageCircle className="h-4 w-4 text-emerald-500" />
                                            <span className="font-medium">{formatNumber(video.stats.comments)}</span>
                                            <span className="text-muted-foreground">comments</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Share2 className="h-4 w-4 text-violet-500" />
                                            <span className="font-medium">{formatNumber(video.stats.shares)}</span>
                                            <span className="text-muted-foreground">shares</span>
                                        </div>
                                    </div>

                                    {/* Engagement Rate */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                                            <span className="text-sm">
                                                <span className="font-medium">{analysis.engagementRate}%</span>
                                                <span className="text-muted-foreground"> engagement rate</span>
                                            </span>
                                        </div>
                                        {analysis.engagementContext && (
                                            <p className="text-xs text-muted-foreground ml-6">
                                                {analysis.engagementContext}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Video Info */}
                        <div className="rounded-lg border p-4 bg-muted/30">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                                    <Video className="h-5 w-5 text-violet-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium">@{video.creator}</p>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                        {video.description || "No description"}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>{video.duration}s duration</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Strengths */}
                        {analysis.strengths.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="font-semibold flex items-center gap-2 text-emerald-600">
                                    <CheckCircle className="h-5 w-5" />
                                    What&apos;s Working
                                </h4>
                                <ul className="space-y-2">
                                    {analysis.strengths.map((strength, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                                            {strength}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Improvements */}
                        {analysis.improvements.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="font-semibold flex items-center gap-2 text-amber-600">
                                    <AlertCircle className="h-5 w-5" />
                                    Areas to Improve
                                </h4>
                                <ul className="space-y-2">
                                    {analysis.improvements.map((improvement, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                                            {improvement}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Tips */}
                        <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2 text-blue-600">
                                <Lightbulb className="h-5 w-5" />
                                Pro Tips
                            </h4>
                            <ul className="grid gap-2 md:grid-cols-2">
                                {analysis.tips.map((tip, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                        💡 {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* New Analysis Button */}
                        <div className="text-center pt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setVideoUrl("");
                                    setVideo(null);
                                    setAnalysis(null);
                                }}
                            >
                                Analyze Another Video
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
