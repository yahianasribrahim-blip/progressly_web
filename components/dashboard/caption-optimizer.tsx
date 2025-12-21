"use client";

import { useState } from "react";
import {
    MessageSquare,
    Loader2,
    Sparkles,
    Hash,
    Target,
    Zap,
    CheckCircle,
    AlertCircle,
    Copy,
    Check,
    RefreshCw,
    ArrowRight,
    Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CaptionAnalysis {
    hookLine: string;
    hookLineScore: number;
    charCount: number;
    lengthStatus: string;
    hashtags: string[];
    hashtagCount: number;
    hashtagStatus: string;
    hasCTA: boolean;
    emojiCount: number;
    lineCount: number;
    aiScore: number;
    aiVerdict: string;
    suggestedHookLines: string[];
    hashtagSuggestions: string[];
    hashtagsToRemove: string[];
    ctaSuggestions: string[];
    optimizedCaption: string;
    improvements: string[];
    hasCreatorContext: boolean;
}

export function CaptionOptimizer() {
    const [caption, setCaption] = useState("");
    const [contentTopic, setContentTopic] = useState("");
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [analysis, setAnalysis] = useState<CaptionAnalysis | null>(null);
    const [copiedOptimized, setCopiedOptimized] = useState(false);
    const [copiedHook, setCopiedHook] = useState<number | null>(null);
    const [copiedHashtag, setCopiedHashtag] = useState<string | null>(null);

    const handleOptimize = async () => {
        if (!caption.trim()) {
            toast.error("Please enter your caption");
            return;
        }

        if (!contentTopic.trim()) {
            toast.error("Please describe what your video is about");
            return;
        }

        setIsOptimizing(true);
        setAnalysis(null);

        try {
            const response = await fetch("/api/caption-optimize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    caption,
                    contentTopic,
                    targetPlatform: "tiktok",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to optimize caption");
            }

            setAnalysis(data);
            toast.success("Caption optimized!");
        } catch (err) {
            console.error("Optimization error:", err);
            toast.error("Failed to optimize caption");
        } finally {
            setIsOptimizing(false);
        }
    };

    const copyToClipboard = (text: string, type: "optimized" | "hook" | "hashtag", index?: number | string) => {
        navigator.clipboard.writeText(text);
        if (type === "optimized") {
            setCopiedOptimized(true);
            setTimeout(() => setCopiedOptimized(false), 2000);
        } else if (type === "hook" && typeof index === "number") {
            setCopiedHook(index);
            setTimeout(() => setCopiedHook(null), 2000);
        } else if (type === "hashtag" && typeof index === "string") {
            setCopiedHashtag(index);
            setTimeout(() => setCopiedHashtag(null), 2000);
        }
        toast.success("Copied!");
    };

    const useOptimizedCaption = () => {
        if (analysis?.optimizedCaption) {
            setCaption(analysis.optimizedCaption);
            toast.success("Optimized caption loaded into editor");
        }
    };

    const copyAllHashtags = () => {
        if (analysis?.hashtagSuggestions) {
            const hashtagsText = analysis.hashtagSuggestions.join(" ");
            navigator.clipboard.writeText(hashtagsText);
            toast.success("All hashtags copied!");
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 8) return "text-emerald-500";
        if (score >= 6) return "text-blue-500";
        if (score >= 4) return "text-amber-500";
        return "text-red-500";
    };

    const getScoreGradient = (score: number) => {
        if (score >= 8) return "from-emerald-500 to-green-500";
        if (score >= 6) return "from-blue-500 to-cyan-500";
        if (score >= 4) return "from-amber-500 to-yellow-500";
        return "from-red-500 to-rose-500";
    };

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Caption Editor */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <MessageSquare className="h-5 w-5 text-emerald-500" />
                            Your Caption
                        </CardTitle>
                        <CardDescription>
                            Paste your video caption and we&apos;ll optimize it for maximum engagement.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder="Enter your caption here...

Example:
This changed everything for me 🔥

I used to struggle with getting views until I learned this simple trick.

What's your biggest challenge with content creation? Comment below! 👇

#fyp #contentcreator #tiktok"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="min-h-[250px] resize-none"
                            disabled={isOptimizing}
                        />
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{caption.length} characters</span>
                            <span className={caption.length > 2200 ? "text-red-500" : ""}>
                                {caption.length > 150 ? "Will be truncated in feed" : "Fully visible"}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Target className="h-5 w-5 text-violet-500" />
                            Context
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="topic" className="flex items-center gap-1">
                                What&apos;s the video about?
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="topic"
                                placeholder="e.g., morning routine, cooking hack, fitness tip, meme compilation..."
                                value={contentTopic}
                                onChange={(e) => setContentTopic(e.target.value)}
                                disabled={isOptimizing}
                            />
                            <p className="text-xs text-muted-foreground">
                                Helps us suggest context-appropriate hooks and hashtags
                            </p>
                        </div>

                        <Button
                            onClick={handleOptimize}
                            disabled={isOptimizing || !caption.trim() || !contentTopic.trim()}
                            className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                            size="lg"
                        >
                            {isOptimizing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Optimizing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Optimize Caption
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Results Section */}
            {analysis && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Score Overview */}
                    <div className="grid gap-4 md:grid-cols-4">
                        {/* AI Score */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r",
                                        getScoreGradient(analysis.aiScore)
                                    )}>
                                        <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                                            <span className={cn("text-lg font-bold", getScoreColor(analysis.aiScore))}>
                                                {analysis.aiScore}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Score</p>
                                        <p className="text-xs text-muted-foreground">Overall</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Hook Score */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                                        <Target className="h-6 w-6 text-violet-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{analysis.hookLineScore}/10</p>
                                        <p className="text-xs text-muted-foreground">Hook</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Hashtag Status */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "flex h-12 w-12 items-center justify-center rounded-full",
                                        analysis.hashtagStatus === "good" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                                    )}>
                                        <Hash className={cn(
                                            "h-6 w-6",
                                            analysis.hashtagStatus === "good" ? "text-emerald-600" : "text-amber-600"
                                        )} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{analysis.hashtagCount} tags</p>
                                        <p className="text-xs text-muted-foreground">
                                            {analysis.hashtagStatus === "good" ? "Optimal" :
                                                analysis.hashtagStatus === "none" ? "Add tags" :
                                                    analysis.hashtagStatus === "too_few" ? "Add more" : "Too many"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* CTA Check */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "flex h-12 w-12 items-center justify-center rounded-full",
                                        analysis.hasCTA ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                                    )}>
                                        <Zap className={cn(
                                            "h-6 w-6",
                                            analysis.hasCTA ? "text-emerald-600" : "text-amber-600"
                                        )} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{analysis.hasCTA ? "Has CTA" : "No CTA"}</p>
                                        <p className="text-xs text-muted-foreground">Call to action</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* AI Verdict */}
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm">{analysis.aiVerdict}</p>
                        </CardContent>
                    </Card>

                    {/* Better Hook Lines */}
                    {analysis.suggestedHookLines.length > 0 && (
                        <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Target className="h-5 w-5 text-violet-600" />
                                    Try These Hook Lines
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {analysis.suggestedHookLines.map((hook, i) => (
                                        <div key={i} className="flex items-center justify-between gap-4 p-3 bg-background rounded-lg border">
                                            <p className="text-sm flex-1">&quot;{hook}&quot;</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(hook, "hook", i)}
                                            >
                                                {copiedHook === i ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Hashtag Suggestions */}
                    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Hash className="h-5 w-5 text-blue-600" />
                                    Suggested Hashtags
                                </CardTitle>
                                <Button variant="outline" size="sm" onClick={copyAllHashtags}>
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy All
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {analysis.hashtagSuggestions.map((tag, i) => (
                                    <Badge
                                        key={i}
                                        variant="secondary"
                                        className="cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                        onClick={() => copyToClipboard(tag, "hashtag", tag)}
                                    >
                                        {copiedHashtag === tag ? <Check className="h-3 w-3 mr-1" /> : null}
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                            {analysis.hashtagsToRemove.length > 0 && (
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-sm text-muted-foreground mb-2">Consider removing (overused):</p>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.hashtagsToRemove.map((tag, i) => (
                                            <Badge key={i} variant="outline" className="text-red-500 border-red-300">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* CTA Suggestions */}
                    {analysis.ctaSuggestions.length > 0 && !analysis.hasCTA && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg text-amber-600">
                                    <Zap className="h-5 w-5" />
                                    Add a Call-to-Action
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {analysis.ctaSuggestions.map((cta, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                                            <ArrowRight className="h-4 w-4 text-amber-500" />
                                            {cta}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Improvements */}
                    {analysis.improvements.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg text-blue-600">
                                    <CheckCircle className="h-5 w-5" />
                                    Quick Improvements
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {analysis.improvements.map((improvement, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm">
                                            <ArrowRight className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                            {improvement}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Optimized Caption */}
                    <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Sparkles className="h-5 w-5 text-emerald-600" />
                                    Optimized Caption
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(analysis.optimizedCaption, "optimized")}
                                        className="gap-1"
                                    >
                                        {copiedOptimized ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        Copy
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-background rounded-lg border whitespace-pre-wrap text-sm">
                                {analysis.optimizedCaption}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
