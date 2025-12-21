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
    Link as LinkIcon,
    Target,
    Users,
    MapPin,
    Film,
    Brain,
    TrendingUp,
    TrendingDown,
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
    engagementRating: "viral" | "strong" | "good" | "average" | "below_average" | "low";
    engagementFeedback: string;
    viewsRating: "viral" | "high" | "moderate" | "low" | "very_low";
    viewsFeedback: string;
    likeRate: number;
    commentRate: number;
    shareRate: number;
    overallVerdict: string;
}

interface SceneBreakdown {
    timestamp: string;
    description: string;
    whatsHappening: string;
}

interface VideoAnalysis {
    contentType: string;
    contentDescription: string;
    sceneBySceneBreakdown: SceneBreakdown[];
    peopleCount: string;
    settingType: string;
    audioType: string;
    productionQuality: string;
    whatWorked: string[];
    whatToImprove: string[];
    hookAnalysis: {
        hookType: string;
        effectiveness: string;
        score: number;
    };
    replicabilityRequirements: string[];
    analysisMethod: "video_frames" | "thumbnail_only";
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
    const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null);
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
        setVideoAnalysis(null);
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
            setVideoAnalysis(data.videoAnalysis);
            setAnalysis(data.analysis);
            toast.success("Video analyzed!");
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

    const getViewsColor = (rating: string) => {
        switch (rating) {
            case "viral": return "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30";
            case "high": return "text-blue-500 bg-blue-100 dark:bg-blue-900/30";
            case "moderate": return "text-amber-500 bg-amber-100 dark:bg-amber-900/30";
            case "low": return "text-orange-500 bg-orange-100 dark:bg-orange-900/30";
            default: return "text-red-500 bg-red-100 dark:bg-red-900/30";
        }
    };

    const getViewsLabel = (rating: string) => {
        switch (rating) {
            case "viral": return "Viral";
            case "high": return "High Reach";
            case "moderate": return "Moderate Reach";
            case "low": return "Low Reach";
            default: return "Flopped";
        }
    };

    const getEngagementColor = (rating: string) => {
        switch (rating) {
            case "viral":
            case "strong": return "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30";
            case "good": return "text-blue-500 bg-blue-100 dark:bg-blue-900/30";
            case "average": return "text-amber-500 bg-amber-100 dark:bg-amber-900/30";
            default: return "text-orange-500 bg-orange-100 dark:bg-orange-900/30";
        }
    };

    const getEngagementLabel = (rating: string) => {
        switch (rating) {
            case "viral": return "Viral Engagement";
            case "strong": return "Strong Engagement";
            case "good": return "Good Engagement";
            case "average": return "Average";
            case "below_average": return "Below Average";
            default: return "Low";
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
                        Paste any TikTok video URL. Our AI analyzes the content and gives you specific, actionable feedback.
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

                    {/* Overall Verdict Banner */}
                    <Card className={cn(
                        "border-2",
                        analysis.performanceScore >= 80 ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20" :
                            analysis.performanceScore >= 60 ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20" :
                                analysis.performanceScore >= 40 ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20" :
                                    "border-red-300 bg-red-50/50 dark:border-red-700 dark:bg-red-950/20"
                    )}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r shrink-0",
                                    getScoreGradient(analysis.performanceScore)
                                )}>
                                    <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                                        <span className={cn("text-2xl font-bold", getScoreColor(analysis.performanceScore))}>
                                            {analysis.performanceScore}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <p className="font-bold text-lg">{analysis.verdict}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatNumber(stats.views)} views • {engagement.engagementRate}% engagement
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Video Info */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex gap-4">
                                {video.coverUrl && (
                                    <img
                                        src={video.coverUrl}
                                        alt="Video thumbnail"
                                        className="w-20 h-28 object-cover rounded-lg shrink-0"
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

                    {/* Stats Grid */}
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
                        <Card>
                            <CardContent className="p-3 text-center">
                                <Eye className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                                <p className="text-lg font-bold">{formatNumber(stats.views)}</p>
                                <p className="text-xs text-muted-foreground">Views</p>
                            </CardContent>
                        </Card>
                        <Card className={getViewsColor(engagement.viewsRating)}>
                            <CardContent className="p-3 text-center">
                                {engagement.viewsRating === "viral" || engagement.viewsRating === "high" ?
                                    <TrendingUp className="h-4 w-4 mx-auto mb-1" /> :
                                    <TrendingDown className="h-4 w-4 mx-auto mb-1" />
                                }
                                <p className="text-sm font-bold">{getViewsLabel(engagement.viewsRating)}</p>
                                <p className="text-xs opacity-80">Reach</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-3 text-center">
                                <Heart className="h-4 w-4 mx-auto text-rose-500 mb-1" />
                                <p className="text-lg font-bold">{formatNumber(stats.likes)}</p>
                                <p className="text-xs text-muted-foreground">{engagement.likeRate}%</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-3 text-center">
                                <MessageCircle className="h-4 w-4 mx-auto text-violet-500 mb-1" />
                                <p className="text-lg font-bold">{formatNumber(stats.comments)}</p>
                                <p className="text-xs text-muted-foreground">{engagement.commentRate}%</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-3 text-center">
                                <Share2 className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                                <p className="text-lg font-bold">{formatNumber(stats.shares)}</p>
                                <p className="text-xs text-muted-foreground">{engagement.shareRate}%</p>
                            </CardContent>
                        </Card>
                        <Card className={getEngagementColor(engagement.engagementRating)}>
                            <CardContent className="p-3 text-center">
                                <Target className="h-4 w-4 mx-auto mb-1" />
                                <p className="text-sm font-bold">{engagement.engagementRate}%</p>
                                <p className="text-xs opacity-80">{getEngagementLabel(engagement.engagementRating)}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Context Cards */}
                    <div className="grid gap-3 md:grid-cols-2">
                        <Card>
                            <CardContent className="p-3">
                                <p className="text-sm">{engagement.viewsFeedback}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-3">
                                <p className="text-sm">{engagement.engagementFeedback}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Video Content Analysis */}
                    {videoAnalysis && (
                        <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Brain className="h-5 w-5 text-violet-600" />
                                    Video Content Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Content Type & Description */}
                                <div className="p-3 bg-background rounded-lg border">
                                    <Badge className="mb-2">{videoAnalysis.contentType}</Badge>
                                    <p className="text-sm">{videoAnalysis.contentDescription}</p>
                                </div>

                                {/* Video Details Grid */}
                                <div className="grid gap-2 md:grid-cols-4">
                                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                                        <Users className="h-4 w-4 text-blue-500 shrink-0" />
                                        <span className="text-sm truncate">{videoAnalysis.peopleCount}</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                                        <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                                        <span className="text-sm truncate">{videoAnalysis.settingType}</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                                        <Film className="h-4 w-4 text-amber-500 shrink-0" />
                                        <span className="text-sm truncate">{videoAnalysis.productionQuality}</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                                        <span className="text-sm truncate">{videoAnalysis.audioType}</span>
                                    </div>
                                </div>

                                {/* Scene-by-Scene Breakdown */}
                                {videoAnalysis.sceneBySceneBreakdown.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium">Scene-by-Scene Breakdown:</p>
                                            <Badge variant="outline" className="text-xs">
                                                {videoAnalysis.analysisMethod === "video_frames" ? "Full Analysis" : "Thumbnail Only"}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2">
                                            {videoAnalysis.sceneBySceneBreakdown.map((scene, i) => (
                                                <div key={i} className="p-3 bg-background rounded-lg border">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="secondary" className="text-xs font-mono">
                                                            {scene.timestamp}
                                                        </Badge>
                                                        <span className="text-sm font-medium">{scene.description}</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{scene.whatsHappening}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Hook Analysis */}
                    {videoAnalysis && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Target className="h-5 w-5 text-amber-500" />
                                    Hook Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline">{videoAnalysis.hookAnalysis.hookType}</Badge>
                                    <div className="flex items-center gap-2">
                                        <Progress
                                            value={videoAnalysis.hookAnalysis.score * 10}
                                            className="w-24 h-2"
                                        />
                                        <span className="text-sm font-medium">{videoAnalysis.hookAnalysis.score}/10</span>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {videoAnalysis.hookAnalysis.effectiveness}
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
                                    Key Insights
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

                    {/* What You Need to Replicate */}
                    {videoAnalysis && videoAnalysis.replicabilityRequirements.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">What You Need to Replicate This</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-1">
                                    {videoAnalysis.replicabilityRequirements.map((req, i) => (
                                        <li key={i} className="text-sm flex items-start gap-2">
                                            <span className="text-muted-foreground">•</span>
                                            {req}
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
