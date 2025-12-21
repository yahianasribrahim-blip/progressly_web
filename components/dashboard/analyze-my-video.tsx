"use client";

import { useState } from "react";
import {
    Video,
    Loader2,
    TrendingUp,
    Eye,
    Heart,
    MessageCircle,
    Share2,
    Clock,
    CheckCircle,
    AlertCircle,
    Lightbulb,
    Sparkles,
    Link as LinkIcon,
    Target,
    Zap,
    BookOpen,
    Copy,
    Check,
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

interface HookAnalysis {
    hookLine: string;
    hookType: string;
    hookScore: number;
    hookFeedback: string;
    suggestions: string[];
}

interface ContentStructure {
    phases: { name: string; duration: number; description: string }[];
    estimatedPacing: string;
    hasCTA: boolean;
    ctaFeedback: string;
}

interface Replicability {
    score: number;
    label: string;
    factors: string[];
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
    const [hookAnalysis, setHookAnalysis] = useState<HookAnalysis | null>(null);
    const [contentStructure, setContentStructure] = useState<ContentStructure | null>(null);
    const [keyLearnings, setKeyLearnings] = useState<string[]>([]);
    const [replicability, setReplicability] = useState<Replicability | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copiedHook, setCopiedHook] = useState(false);

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
        setHookAnalysis(null);
        setContentStructure(null);
        setKeyLearnings([]);
        setReplicability(null);

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
            setHookAnalysis(data.hookAnalysis);
            setContentStructure(data.contentStructure);
            setKeyLearnings(data.keyLearnings || []);
            setReplicability(data.replicability);
            toast.success("Video analyzed successfully!");
        } catch (err) {
            console.error("Analysis error:", err);
            setError(err instanceof Error ? err.message : "Failed to analyze video");
            toast.error("Failed to analyze video");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const copyHook = () => {
        if (hookAnalysis?.hookLine) {
            navigator.clipboard.writeText(hookAnalysis.hookLine);
            setCopiedHook(true);
            toast.success("Hook copied!");
            setTimeout(() => setCopiedHook(false), 2000);
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

    const getHookScoreColor = (score: number) => {
        if (score >= 8) return "bg-emerald-500";
        if (score >= 6) return "bg-blue-500";
        if (score >= 4) return "bg-amber-500";
        return "bg-red-500";
    };

    return (
        <div className={cn("space-y-6", className)}>
            {/* URL Input Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Video className="h-5 w-5 text-violet-500" />
                        Video Breakdown
                    </CardTitle>
                    <CardDescription>
                        Paste any TikTok video URL to learn what makes it work and how you can apply it.
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>

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
                    {/* Score and Stats Overview */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Performance Score Card */}
                        <Card className="border-2">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-center">
                                        <div className={cn(
                                            "relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r",
                                            getScoreGradient(analysis.score)
                                        )}>
                                            <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                                                <span className={cn("text-3xl font-bold", getScoreColor(analysis.score))}>
                                                    {analysis.score}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">Performance</p>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <p className="font-semibold">{analysis.verdict}</p>
                                        <div className="flex items-center gap-2 text-sm">
                                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                                            <span className="font-medium">{analysis.engagementRate}%</span>
                                            <span className="text-muted-foreground">engagement</span>
                                        </div>
                                        {analysis.engagementContext && (
                                            <p className="text-xs text-muted-foreground">{analysis.engagementContext}</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stats Card */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="font-semibold">@{video.creator}</p>
                                    <Badge variant="outline" className="gap-1">
                                        <Clock className="h-3 w-3" />
                                        {video.duration}s
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-blue-500" />
                                        <div>
                                            <p className="font-bold">{formatNumber(video.stats.views)}</p>
                                            <p className="text-xs text-muted-foreground">views</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Heart className="h-4 w-4 text-red-500" />
                                        <div>
                                            <p className="font-bold">{formatNumber(video.stats.likes)}</p>
                                            <p className="text-xs text-muted-foreground">likes</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MessageCircle className="h-4 w-4 text-emerald-500" />
                                        <div>
                                            <p className="font-bold">{formatNumber(video.stats.comments)}</p>
                                            <p className="text-xs text-muted-foreground">comments</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Share2 className="h-4 w-4 text-violet-500" />
                                        <div>
                                            <p className="font-bold">{formatNumber(video.stats.shares)}</p>
                                            <p className="text-xs text-muted-foreground">shares</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Hook Analysis Card */}
                    {hookAnalysis && (
                        <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Target className="h-5 w-5 text-violet-600" />
                                    Hook Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge className={getHookScoreColor(hookAnalysis.hookScore)}>
                                                {hookAnalysis.hookScore}/10
                                            </Badge>
                                            <Badge variant="outline">{hookAnalysis.hookType}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">{hookAnalysis.hookFeedback}</p>
                                        {hookAnalysis.hookLine && (
                                            <div className="rounded-lg bg-background border p-3">
                                                <p className="text-sm font-medium mb-1">Caption hook:</p>
                                                <p className="text-sm italic">&quot;{hookAnalysis.hookLine}&quot;</p>
                                            </div>
                                        )}
                                    </div>
                                    {hookAnalysis.hookLine && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={copyHook}
                                            className="shrink-0"
                                        >
                                            {copiedHook ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}
                                </div>

                                {hookAnalysis.suggestions.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Hook suggestions for your videos:</p>
                                        <ul className="space-y-1">
                                            {hookAnalysis.suggestions.map((suggestion, i) => (
                                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                    <span className="text-violet-500">→</span>
                                                    {suggestion}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Content Structure & Replicability */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Content Structure */}
                        {contentStructure && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Zap className="h-5 w-5 text-amber-500" />
                                        Content Structure
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">Pacing: {contentStructure.estimatedPacing}</Badge>
                                        <Badge
                                            variant="outline"
                                            className={contentStructure.hasCTA ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600"}
                                        >
                                            {contentStructure.hasCTA ? "Has CTA ✓" : "No CTA"}
                                        </Badge>
                                    </div>
                                    <div className="space-y-2">
                                        {contentStructure.phases.map((phase, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-20 text-xs font-medium text-muted-foreground">
                                                    {phase.name}
                                                </div>
                                                <Progress value={(phase.duration / video.duration) * 100} className="flex-1 h-2" />
                                                <div className="w-8 text-xs text-muted-foreground">{phase.duration}s</div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{contentStructure.ctaFeedback}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Replicability Score */}
                        {replicability && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Sparkles className="h-5 w-5 text-blue-500" />
                                        Can You Replicate This?
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-3xl font-bold">{replicability.score}/10</div>
                                        <Badge className={
                                            replicability.score >= 8 ? "bg-emerald-500" :
                                                replicability.score >= 5 ? "bg-blue-500" : "bg-amber-500"
                                        }>
                                            {replicability.label}
                                        </Badge>
                                    </div>
                                    {replicability.factors.length > 0 && (
                                        <ul className="space-y-1">
                                            {replicability.factors.map((factor, i) => (
                                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                    {factor}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Key Learnings */}
                    {keyLearnings.length > 0 && (
                        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <BookOpen className="h-5 w-5 text-emerald-600" />
                                    What You Can Learn From This
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {keyLearnings.map((learning, i) => (
                                        <li key={i} className="text-sm bg-background rounded-lg p-3 border">
                                            {learning}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Strengths & Improvements */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Strengths */}
                        {analysis.strengths.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg text-emerald-600">
                                        <CheckCircle className="h-5 w-5" />
                                        What&apos;s Working
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {analysis.strengths.map((strength, index) => (
                                            <li key={index} className="text-sm bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                                                {strength}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}

                        {/* Improvements */}
                        {analysis.improvements.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg text-amber-600">
                                        <AlertCircle className="h-5 w-5" />
                                        Areas to Improve
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {analysis.improvements.map((improvement, index) => (
                                            <li key={index} className="text-sm bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                                                {improvement}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Tips */}
                    {analysis.tips.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg text-blue-600">
                                    <Lightbulb className="h-5 w-5" />
                                    Pro Tips
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="grid gap-2 md:grid-cols-2">
                                    {analysis.tips.map((tip, index) => (
                                        <li key={index} className="text-sm bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                            💡 {tip}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* New Analysis Button */}
                    <div className="text-center pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setVideoUrl("");
                                setVideo(null);
                                setAnalysis(null);
                                setHookAnalysis(null);
                                setContentStructure(null);
                                setKeyLearnings([]);
                                setReplicability(null);
                            }}
                        >
                            Analyze Another Video
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
