"use client";

import { useState } from "react";
import {
    FileText,
    Loader2,
    Sparkles,
    Clock,
    Target,
    Zap,
    CheckCircle,
    AlertCircle,
    Lightbulb,
    Copy,
    Check,
    RefreshCw,
    ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScriptAnalysis {
    wordCount: number;
    estimatedSeconds: number;
    targetSeconds: number;
    durationStatus: string;
    hookScore: number;
    hookType: string;
    hookLine: string;
    structure: {
        hasOpening: boolean;
        hasMiddle: boolean;
        hasClosing: boolean;
        lineCount: number;
    };
    aiScore: number;
    aiVerdict: string;
    suggestions: string[];
    alternativeHooks: string[];
    improvedScript: string;
    ctaSuggestion: string;
    hasCreatorContext: boolean;
}

export function ScriptOptimizer() {
    const [script, setScript] = useState("");
    const [targetLength, setTargetLength] = useState("30");
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);
    const [copiedImproved, setCopiedImproved] = useState(false);
    const [copiedHook, setCopiedHook] = useState<number | null>(null);

    const handleOptimize = async () => {
        if (!script.trim()) {
            toast.error("Please enter your script");
            return;
        }

        if (script.trim().length < 10) {
            toast.error("Script must be at least 10 characters");
            return;
        }

        setIsOptimizing(true);
        setAnalysis(null);

        try {
            const response = await fetch("/api/script-optimize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    script,
                    targetPlatform: "tiktok",
                    targetLengthSeconds: parseInt(targetLength),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to optimize script");
            }

            setAnalysis(data);
            toast.success("Script optimized!");
        } catch (err) {
            console.error("Optimization error:", err);
            toast.error("Failed to optimize script");
        } finally {
            setIsOptimizing(false);
        }
    };

    const copyToClipboard = (text: string, type: "improved" | "hook", hookIndex?: number) => {
        navigator.clipboard.writeText(text);
        if (type === "improved") {
            setCopiedImproved(true);
            setTimeout(() => setCopiedImproved(false), 2000);
        } else if (hookIndex !== undefined) {
            setCopiedHook(hookIndex);
            setTimeout(() => setCopiedHook(null), 2000);
        }
        toast.success("Copied to clipboard!");
    };

    const useImprovedScript = () => {
        if (analysis?.improvedScript) {
            setScript(analysis.improvedScript);
            toast.success("Improved script loaded into editor");
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
            <div className="grid gap-6 lg:grid-cols-5">
                {/* Script Editor */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <FileText className="h-5 w-5 text-blue-500" />
                            Your Script
                        </CardTitle>
                        <CardDescription>
                            Paste your video script below and we&apos;ll analyze it for maximum engagement.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder="Enter your script here...

Example:
Wait, this changed everything for me.

I used to spend hours trying to figure out what to post... until I discovered this simple trick.

Here's what you need to do...

Follow for more tips like this!"
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            className="min-h-[300px] resize-none"
                            disabled={isOptimizing}
                        />
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{script.split(/\s+/).filter(w => w.length > 0).length} words</span>
                            <span>~{Math.round(script.split(/\s+/).filter(w => w.length > 0).length / 2.5)}s estimated</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Settings */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Clock className="h-5 w-5 text-violet-500" />
                            Target Length
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <RadioGroup value={targetLength} onValueChange={setTargetLength}>
                            {[
                                { value: "15", label: "15 seconds", desc: "Quick hook + punchline" },
                                { value: "30", label: "30 seconds", desc: "Standard short-form" },
                                { value: "60", label: "60 seconds", desc: "Full explanation" },
                                { value: "90", label: "90 seconds", desc: "In-depth content" },
                            ].map((option) => (
                                <Label
                                    key={option.value}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                                        targetLength === option.value
                                            ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                                            : "hover:border-muted-foreground/50"
                                    )}
                                >
                                    <RadioGroupItem value={option.value} />
                                    <div>
                                        <p className="font-medium">{option.label}</p>
                                        <p className="text-xs text-muted-foreground">{option.desc}</p>
                                    </div>
                                </Label>
                            ))}
                        </RadioGroup>

                        <Button
                            onClick={handleOptimize}
                            disabled={isOptimizing || !script.trim()}
                            className="w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
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
                                    Optimize Script
                                </>
                            )}
                        </Button>

                        {!analysis?.hasCreatorContext && (
                            <p className="text-xs text-muted-foreground text-center">
                                💡 Complete your Creator Profile for personalized suggestions
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Results Section */}
            {analysis && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Score Overview */}
                    <div className="grid gap-4 md:grid-cols-3">
                        {/* AI Score */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r",
                                        getScoreGradient(analysis.aiScore)
                                    )}>
                                        <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                                            <span className={cn("text-2xl font-bold", getScoreColor(analysis.aiScore))}>
                                                {analysis.aiScore}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-semibold">Script Score</p>
                                        <p className="text-sm text-muted-foreground">{analysis.aiVerdict}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Hook Score */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                                        <Target className="h-8 w-8 text-violet-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Hook: {analysis.hookScore}/10</p>
                                        <p className="text-sm text-muted-foreground">{analysis.hookType}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Duration Check */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "flex h-16 w-16 items-center justify-center rounded-full",
                                        analysis.durationStatus === "good" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                                            "bg-amber-100 dark:bg-amber-900/30"
                                    )}>
                                        <Clock className={cn(
                                            "h-8 w-8",
                                            analysis.durationStatus === "good" ? "text-emerald-600" : "text-amber-600"
                                        )} />
                                    </div>
                                    <div>
                                        <p className="font-semibold">~{analysis.estimatedSeconds}s / {analysis.targetSeconds}s</p>
                                        <p className="text-sm text-muted-foreground">
                                            {analysis.durationStatus === "good" ? "Length is good ✓" :
                                                analysis.durationStatus === "too_short" ? "Could be longer" :
                                                    "Consider trimming"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Structure Check */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Zap className="h-5 w-5 text-amber-500" />
                                Script Structure
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3">
                                <Badge
                                    variant="outline"
                                    className={analysis.structure.hasOpening ? "border-emerald-500 text-emerald-600" : "border-red-500 text-red-600"}
                                >
                                    {analysis.structure.hasOpening ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                                    Opening Hook
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={analysis.structure.hasMiddle ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600"}
                                >
                                    {analysis.structure.hasMiddle ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                                    Content Body ({analysis.structure.lineCount} parts)
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={analysis.structure.hasClosing ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600"}
                                >
                                    {analysis.structure.hasClosing ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                                    Call-to-Action
                                </Badge>
                            </div>
                            {!analysis.structure.hasClosing && (
                                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                        💡 Suggested CTA: {analysis.ctaSuggestion}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Alternative Hooks */}
                    {analysis.alternativeHooks.length > 0 && (
                        <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Target className="h-5 w-5 text-violet-600" />
                                    Try These Stronger Hooks
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {analysis.alternativeHooks.map((hook, i) => (
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

                    {/* Suggestions */}
                    {analysis.suggestions.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg text-blue-600">
                                    <Lightbulb className="h-5 w-5" />
                                    Improvement Suggestions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {analysis.suggestions.map((suggestion, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                            <ArrowRight className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                            {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Improved Script */}
                    <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Sparkles className="h-5 w-5 text-emerald-600" />
                                    Improved Script
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(analysis.improvedScript, "improved")}
                                        className="gap-1"
                                    >
                                        {copiedImproved ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        Copy
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={useImprovedScript}
                                        className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Use This
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-background rounded-lg border whitespace-pre-wrap text-sm">
                                {analysis.improvedScript}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
