"use client";

import { useState } from "react";
import {
    Video,
    Loader2,
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
    Users,
    Music,
    MapPin,
    Film,
    Brain,
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

interface EngagementMetrics {
    engagementRate: number;
    engagementRating: "exceptional" | "above_average" | "average" | "below_average" | "poor";
    engagementFeedback: string;
    likeRate: number;
    commentRate: number;
    shareRate: number;
    likeRating: string;
    commentRating: string;
    shareRating: string;
}

interface VisionAnalysis {
    contentType: string;
    contentDescription: string;
    sceneBreakdown: string[];
    peopleCount: string;
    settingType: string;
    hasMusic: boolean;
    musicType: string | null;
    emotionalTone: string;
    productionLevel: string;
    specificStrengths: string[];
    specificImprovements: string[];
    hookAnalysis: {
        hookType: string;
        hookEffectiveness: string;
        hookScore: number;
    };
    replicabilityNotes: string[];
}

interface Analysis {
    performanceScore: number;
    verdict: string;
    strengths: string[];
    improvements: string[];
    keyLearnings: string[];
}

interface AnalyzedVideo {
    id: string;
    url: string;
    description: string;
    creator: string;
    duration: number;
    coverUrl?: string;
}

interface AnalyzeMyVideoProps {
    className?: string;
}

export function AnalyzeMyVideo({ className }: AnalyzeMyVideoProps) {
    const [videoUrl, setVideoUrl] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [video, setVideo] = useState<AnalyzedVideo | null>(null);
    const [stats, setStats] = useState<VideoStats | null>(null);
    const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);
    const [visionAnalysis, setVisionAnalysis] = useState<VisionAnalysis | null>(null);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
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
        setStats(null);
        setEngagement(null);
        setVisionAnalysis(null);
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
            setStats(data.stats);
            setEngagement(data.engagement);
            setVisionAnalysis(data.visionAnalysis);
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

    const getEngagementColor = (rating: string) => {
        switch (rating) {
            case "exceptional": return "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30";
            case "above_average": return "text-blue-500 bg-blue-100 dark:bg-blue-900/30";
            case "average": return "text-amber-500 bg-amber-100 dark:bg-amber-900/30";
            case "below_average": return "text-orange-500 bg-orange-100 dark:bg-orange-900/30";
            default: return "text-red-500 bg-red-100 dark:bg-red-900/30";
        }
    };

    const getEngagementLabel = (rating: string) => {
        switch (rating) {
            case "exceptional": return "Exceptional";
            case "above_average": return "Above Average";
            case "average": return "Average";
            case "below_average": return "Below Average";
            default: return "Needs Work";
        }
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
                        Paste any TikTok video URL. Our AI will watch the video and give you specific, actionable feedback.
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
                            disabled={isAnalyzing || !videoUrl.trim()}
                            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Brain className="h-4 w-4" />
                                    Analyze
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Error State */}
            {error && (
                <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                    <CardContent className="flex items-center gap-3 p-4">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <p className="text-red-700 dark:text-red-300">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {video && stats && engagement && analysis && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Video Info + Performance Score */}
                    <div className="grid gap-4 md:grid-cols-3">
                        {/* Video Preview */}
                        <Card className="md:col-span-2">
                            <CardContent className="p-4">
                                <div className="flex gap-4">
                                    {video.coverUrl && (
                                        <img
                                            src={video.coverUrl}
                                            alt="Video thumbnail"
                                            className="w-24 h-32 object-cover rounded-lg"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold">@{video.creator}</p>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                            {video.description || "No description"}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                            <Clock className="h-4 w-4" />
                                            {video.duration}s
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Performance Score */}
                        <Card>
                            <CardContent className="p-4 flex items-center justify-center">
                                <div className="text-center">
                                    <div className={cn(
                                        "relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r",
                                        getScoreGradient(analysis.performanceScore)
                                    )}>
                                        <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                                            <span className={cn("text-2xl font-bold", getScoreColor(analysis.performanceScore))}>
                                                {analysis.performanceScore}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="mt-2 font-medium">{analysis.verdict}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Stats + Engagement */}
                    <div className="grid gap-4 md:grid-cols-5">
                        <Card>
                            <CardContent className="p-4 text-center">
                                <Eye className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                                <p className="text-lg font-bold">{formatNumber(stats.views)}</p>
                                <p className="text-xs text-muted-foreground">Views</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <Heart className="h-5 w-5 mx-auto text-rose-500 mb-1" />
                                <p className="text-lg font-bold">{formatNumber(stats.likes)}</p>
                                <p className="text-xs text-muted-foreground">Likes ({engagement.likeRate}%)</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <MessageCircle className="h-5 w-5 mx-auto text-violet-500 mb-1" />
                                <p className="text-lg font-bold">{formatNumber(stats.comments)}</p>
                                <p className="text-xs text-muted-foreground">Comments</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <Share2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                                <p className="text-lg font-bold">{formatNumber(stats.shares)}</p>
                                <p className="text-xs text-muted-foreground">Shares</p>
                            </CardContent>
                        </Card>
                        <Card className={getEngagementColor(engagement.engagementRating)}>
                            <CardContent className="p-4 text-center">
                                <Sparkles className="h-5 w-5 mx-auto mb-1" />
                                <p className="text-lg font-bold">{engagement.engagementRate}%</p>
                                <p className="text-xs">{getEngagementLabel(engagement.engagementRating)}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Engagement Feedback */}
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm">{engagement.engagementFeedback}</p>
                        </CardContent>
                    </Card>

                    {/* Vision AI Analysis: What's Actually In The Video */}
                    {visionAnalysis && (
                        <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Brain className="h-5 w-5 text-violet-600" />
                                    AI Video Analysis
                                </CardTitle>
                                <CardDescription>
                                    Our AI analyzed the actual video content
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Content Type & Description */}
                                <div className="p-3 bg-background rounded-lg border">
                                    <Badge className="mb-2">{visionAnalysis.contentType}</Badge>
                                    <p className="text-sm">{visionAnalysis.contentDescription}</p>
                                </div>

                                {/* Video Details Grid */}
                                <div className="grid gap-3 md:grid-cols-4">
                                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                                        <Users className="h-4 w-4 text-blue-500" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">People</p>
                                            <p className="text-sm font-medium">{visionAnalysis.peopleCount}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                                        <MapPin className="h-4 w-4 text-emerald-500" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Setting</p>
                                            <p className="text-sm font-medium">{visionAnalysis.settingType}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                                        <Music className="h-4 w-4 text-rose-500" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Audio</p>
                                            <p className="text-sm font-medium">
                                                {visionAnalysis.hasMusic ? (visionAnalysis.musicType || "Music") : "No music"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                                        <Film className="h-4 w-4 text-amber-500" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Production</p>
                                            <p className="text-sm font-medium capitalize">{visionAnalysis.productionLevel}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Scene Breakdown */}
                                {visionAnalysis.sceneBreakdown.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">Scene Breakdown:</p>
                                        <div className="space-y-1">
                                            {visionAnalysis.sceneBreakdown.map((scene, i) => (
                                                <div key={i} className="flex items-start gap-2 text-sm">
                                                    <span className="text-muted-foreground">{i + 1}.</span>
                                                    {scene}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Hook Analysis */}
                    {visionAnalysis && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Target className="h-5 w-5 text-amber-500" />
                                    Hook Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline">{visionAnalysis.hookAnalysis.hookType}</Badge>
                                    <div className="flex items-center gap-2">
                                        <Progress
                                            value={visionAnalysis.hookAnalysis.hookScore * 10}
                                            className="w-24 h-2"
                                        />
                                        <span className="text-sm font-medium">{visionAnalysis.hookAnalysis.hookScore}/10</span>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {visionAnalysis.hookAnalysis.hookEffectiveness}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Key Learnings */}
                    {analysis.keyLearnings.length > 0 && (
                        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Lightbulb className="h-5 w-5 text-blue-600" />
                                    What You Can Learn (Personalized)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {analysis.keyLearnings.map((learning, i) => (
                                        <div key={i} className="text-sm p-2 bg-background rounded-lg border">
                                            {learning}
                                        </div>
                                    ))}
                                </div>
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
                                        {analysis.strengths.map((strength, i) => (
                                            <li key={i} className="text-sm flex items-start gap-2">
                                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
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
                                        {analysis.improvements.map((improvement, i) => (
                                            <li key={i} className="text-sm flex items-start gap-2">
                                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                                {improvement}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Replicability Notes */}
                    {visionAnalysis && visionAnalysis.replicabilityNotes.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Can You Replicate This?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-1">
                                    {visionAnalysis.replicabilityNotes.map((note, i) => (
                                        <li key={i} className="text-sm flex items-start gap-2">
                                            <span className="text-muted-foreground">•</span>
                                            {note}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
