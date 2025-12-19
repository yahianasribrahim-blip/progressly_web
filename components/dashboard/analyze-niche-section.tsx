"use client";

import { useState } from "react";
import { Sparkles, Loader2, Zap, Lock, Bookmark, BookmarkCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NicheViewsChart } from "@/components/dashboard/analysis/niche-views-chart";
import { FormatsCard } from "@/components/dashboard/analysis/formats-card";
import { HooksCard } from "@/components/dashboard/analysis/hooks-card";
import { HashtagsCard } from "@/components/dashboard/analysis/hashtags-card";
import { ExampleVideosCard } from "@/components/dashboard/analysis/example-videos-card";
import { BenchmarkCard } from "@/components/dashboard/analysis/benchmark-card";
import { AIInsightsCard } from "@/components/dashboard/analysis/ai-insights-card";
import { VideoIdeaGenerator } from "@/components/dashboard/analysis/video-idea-generator";
import { NicheSelector } from "@/components/dashboard/niche-selector";
import { AnalysisResult } from "@/lib/mock-analysis";

interface AIInsights {
    summary: string;
    contentIdeas: string[];
    bestPostingStrategy: string;
    hookRecommendations: string[];
    warnings: string[];
}

interface AnalyzeNicheSectionProps {
    userId: string;
    userName: string;
    plan: "free" | "starter" | "pro";
    canAnalyze: boolean;
    remaining: number;
    limitMessage?: string;
}

export function AnalyzeNicheSection({
    userId,
    userName,
    plan,
    canAnalyze,
    remaining,
    limitMessage,
}: AnalyzeNicheSectionProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [selectedNiche, setSelectedNiche] = useState<string>("");
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [aiInsights, setAIInsights] = useState<AIInsights | null>(null);
    const [nicheWarning, setNicheWarning] = useState<string | null>(null);

    const handleSaveAnalysis = async () => {
        if (!analysisResult || isSaving) return;

        setIsSaving(true);
        try {
            const response = await fetch("/api/analysis/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    niche: analysisResult.niche,
                    analysisData: {
                        ...analysisResult,
                        aiInsights,
                        savedAt: new Date().toISOString(),
                    },
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save analysis");
            }

            setIsSaved(true);
            toast.success("Analysis saved! View it in 'Saved Analyses'");
        } catch (error) {
            console.error("Error saving analysis:", error);
            toast.error("Failed to save analysis");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyze = async () => {
        if (!canAnalyze) {
            toast.error(limitMessage || "Analysis limit reached");
            return;
        }

        if (!selectedNiche) {
            toast.error("Please select your niche first");
            return;
        }

        setIsAnalyzing(true);

        try {
            // Record usage
            await fetch("/api/analysis/record", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });

            // Call the real TikTok API
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ niche: selectedNiche }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to analyze niche");
            }

            const { data } = await response.json();

            // Debug: Log what we received
            console.log("Received data from API:", {
                hooksCount: data.hooks?.length,
                captionsCount: data.captions?.length,
                spokenHooksCount: data.spokenHooks?.length,
                hashtagsCount: data.hashtags?.length,
                examplesCount: data.examples?.length,
                firstHook: data.hooks?.[0]?.text,
            });

            // Transform API response to match AnalysisResult format
            const result = {
                niche: data.niche,
                hooks: data.hooks.map((hook: { id: string; text: string; engagement: string; platform: string; views?: number; likes?: number }) => ({
                    ...hook,
                    platform: hook.platform || "TikTok",
                })),
                captions: data.captions?.map((caption: { id: string; text: string; engagement: string; platform: string; views?: number; likes?: number }) => ({
                    ...caption,
                    platform: caption.platform || "TikTok",
                })) || [],
                spokenHooks: data.spokenHooks?.map((hook: { id: string; text: string; engagement: string; platform: string; views?: number; likes?: number }) => ({
                    ...hook,
                    platform: hook.platform || "TikTok",
                })) || [],
                formats: data.formats.map((format: { id: string; name: string; averageLength: string; whyItWorks: string; popularity?: number }, index: number) => ({
                    id: format.id || `f${index + 1}`,
                    name: format.name,
                    cameraStyle: "See example videos below ↓",
                    subtitleStyle: "See example videos below ↓",
                    averageLength: format.averageLength,
                    whyItWorks: format.whyItWorks,
                    environment: "See example videos below ↓",
                    lighting: "See example videos below ↓",
                })),
                exampleVideos: data.examples.map((video: { id: string; thumbnail: string; creator: string; platform: string; views: string; url: string }) => ({
                    id: video.id,
                    thumbnail: video.thumbnail,
                    creator: video.creator,
                    platform: video.platform || "TikTok",
                    views: video.views,
                    url: video.url,
                })),
                hashtags: data.hashtags.map((hashtag: { tag: string; category: string; viewCount?: number }) => ({
                    tag: hashtag.tag,
                    category: hashtag.category,
                })),
                benchmark: data.benchmark,
                generatedAt: new Date(data.generatedAt),
            };

            console.log("Transformed result:", {
                hooksCount: result.hooks.length,
                firstHookText: result.hooks[0]?.text,
            });

            setAnalysisResult(result);

            // Set niche warning if present
            if (data.nicheWarning) {
                setNicheWarning(data.nicheWarning);
            } else {
                setNicheWarning(null);
            }

            // Set AI insights if available
            if (data.aiInsights) {
                setAIInsights(data.aiInsights);
                console.log("AI Insights loaded:", data.aiInsights.contentIdeas?.length, "content ideas");
            }

            toast.success("Analysis complete! Real TikTok data loaded.");
        } catch (error) {
            console.error("Analysis error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to generate analysis");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const isPremium = plan !== "free";

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="text-center space-y-4 pt-4">
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                    Progressly
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    What's working right now in your niche.
                </p>
            </div>

            {/* Niche Selector & Analyze Button */}
            <Card className="max-w-2xl mx-auto overflow-hidden border-2">
                <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10 p-1">
                    <CardContent className="bg-background rounded-lg p-6 space-y-6">
                        {/* Niche Selection */}
                        <NicheSelector
                            value={selectedNiche}
                            onChange={setSelectedNiche}
                        />

                        {/* Analyze Button */}
                        <Button
                            size="lg"
                            className={cn(
                                "w-full h-16 text-lg font-semibold gap-3",
                                "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700",
                                "transition-all duration-300 shadow-lg hover:shadow-xl",
                                !canAnalyze && "opacity-50"
                            )}
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !canAnalyze || !selectedNiche}
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    Analyzing Your Niche...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-6 w-6" />
                                    Analyze My Niche
                                </>
                            )}
                        </Button>

                        {/* Credits Info */}
                        <div className="text-center text-sm text-muted-foreground">
                            {canAnalyze ? (
                                <p>
                                    <span className="font-medium text-foreground">{remaining}</span>
                                    {" "}analysis credit{remaining !== 1 ? "s" : ""} remaining
                                    {plan === "pro" ? " today" : " this week"}
                                </p>
                            ) : (
                                <div className="flex items-center justify-center gap-2 text-amber-600">
                                    <Lock className="h-4 w-4" />
                                    <span>{limitMessage}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </div>
            </Card>

            {/* Analysis Results */}
            {analysisResult && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Niche Warning Banner */}
                    {nicheWarning && (
                        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                            <CardContent className="py-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        {nicheWarning}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Save Analysis Button */}
                    <div className="flex justify-end">
                        <Button
                            variant={isSaved ? "secondary" : "outline"}
                            size="sm"
                            onClick={handleSaveAnalysis}
                            disabled={isSaving || isSaved}
                            className="gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : isSaved ? (
                                <>
                                    <BookmarkCheck className="h-4 w-4 text-emerald-500" />
                                    Saved
                                </>
                            ) : (
                                <>
                                    <Bookmark className="h-4 w-4" />
                                    Save Analysis
                                </>
                            )}
                        </Button>
                    </div>

                    {/* 0. AI Insights Card (Most Important First) */}
                    {aiInsights && (
                        <div className="space-y-4">
                            <AIInsightsCard insights={aiInsights} />
                            {/* Video Idea Generator Button */}
                            <div className="flex justify-center">
                                <VideoIdeaGenerator
                                    niche={analysisResult.niche}
                                    hooks={analysisResult.hooks}
                                    hashtags={analysisResult.hashtags}
                                />
                            </div>
                        </div>
                    )}

                    {/* 1. Niche Views Chart */}
                    <NicheViewsChart niche={analysisResult.niche} />

                    {/* 2. Formats Card */}
                    <FormatsCard
                        formats={analysisResult.formats}
                        isPremium={isPremium}
                        plan={plan}
                    />

                    {/* 3. Hooks Card - Both verbal and visual hooks from trending videos */}
                    {analysisResult.spokenHooks && analysisResult.spokenHooks.length > 0 && (
                        <HooksCard
                            hooks={analysisResult.spokenHooks}
                            isPremium={isPremium}
                            plan={plan}
                            title="🎯 Hooks"
                            type="hook"
                            emptyMessage="No hooks found for this niche"
                        />
                    )}

                    {/* 4. Viral Captions Card - Trending captions from descriptions */}
                    <HooksCard
                        hooks={analysisResult.captions || analysisResult.hooks}
                        isPremium={isPremium}
                        plan={plan}
                        title="📝 Viral Captions"
                        type="caption"
                        emptyMessage="No viral captions found"
                    />

                    {/* 4. Hashtags Card */}
                    <HashtagsCard
                        hashtags={analysisResult.hashtags}
                        isPremium={isPremium}
                    />

                    {/* 5. Example Videos Card */}
                    <ExampleVideosCard
                        videos={analysisResult.exampleVideos}
                        isPremium={isPremium}
                        plan={plan}
                    />

                    {/* 6. Benchmark Card (Estimate at bottom) */}
                    <BenchmarkCard
                        benchmark={analysisResult.benchmark}
                    />

                    {/* Single Upgrade CTA at the very bottom - only for free users */}
                    {plan === "free" && (
                        <Card className="border-2 border-violet-500/30 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-pink-500/5">
                            <CardContent className="py-8 text-center space-y-4">
                                <div className="inline-flex items-center gap-2 text-violet-600 dark:text-violet-400">
                                    <Zap className="h-6 w-6" />
                                    <span className="text-xl font-semibold">Unlock Full Analysis</span>
                                </div>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Get access to all hooks, formats, example videos, and more insights to grow your content faster.
                                </p>
                                <a
                                    href="/pricing"
                                    className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-md text-sm font-medium bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white transition-colors"
                                >
                                    <Zap className="h-5 w-5" />
                                    Upgrade Now
                                </a>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
