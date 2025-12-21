"use client";

import { useState, useRef } from "react";
import {
    Image as ImageIcon,
    Upload,
    Loader2,
    Sparkles,
    Eye,
    Type,
    Palette,
    Heart,
    CheckCircle,
    AlertCircle,
    Zap,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CoverAnalysis {
    overallScore: number;
    verdict: string;
    scores: {
        attention: number;
        clarity: number;
        textReadability: number | null;
        colorContrast: number;
        emotionalImpact: number;
    };
    hasText: boolean;
    textContent: string | null;
    strengths: string[];
    improvements: string[];
    quickFixes: string[];
    colorPalette: string[];
}

export function CoverGrader() {
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<CoverAnalysis | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                toast.error("Please select an image file");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error("Image must be less than 10MB");
                return;
            }
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
            setAnalysis(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error("Image must be less than 10MB");
                return;
            }
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
            setAnalysis(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const clearImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        setAnalysis(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleAnalyze = async () => {
        if (!selectedImage) {
            toast.error("Please select an image first");
            return;
        }

        setIsAnalyzing(true);
        setAnalysis(null);

        try {
            const formData = new FormData();
            formData.append("image", selectedImage);
            formData.append("platform", "tiktok");

            const response = await fetch("/api/cover-grade", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to grade cover");
            }

            setAnalysis(data);
            toast.success("Cover analyzed!");
        } catch (err) {
            console.error("Analysis error:", err);
            toast.error("Failed to analyze cover");
        } finally {
            setIsAnalyzing(false);
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

    const getScoreBg = (score: number) => {
        if (score >= 8) return "bg-emerald-100 dark:bg-emerald-900/30";
        if (score >= 6) return "bg-blue-100 dark:bg-blue-900/30";
        if (score >= 4) return "bg-amber-100 dark:bg-amber-900/30";
        return "bg-red-100 dark:bg-red-900/30";
    };

    return (
        <div className="space-y-6">
            {/* Upload Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Drop Zone */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <ImageIcon className="h-5 w-5 text-amber-500" />
                            Upload Cover Image
                        </CardTitle>
                        <CardDescription>
                            Upload your video thumbnail or cover image for AI-powered feedback.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {!imagePreview ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
                            >
                                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="font-medium">Click to upload or drag and drop</p>
                                <p className="text-sm text-muted-foreground mt-1">PNG, JPG, WEBP up to 10MB</p>
                            </div>
                        ) : (
                            <div className="relative">
                                <img
                                    src={imagePreview}
                                    alt="Cover preview"
                                    className="w-full h-auto rounded-lg border"
                                />
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={clearImage}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Analysis Button / Quick Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Sparkles className="h-5 w-5 text-violet-500" />
                            AI Cover Analysis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4 text-sm">
                            <div className="flex items-start gap-3">
                                <Eye className="h-5 w-5 text-blue-500 shrink-0" />
                                <div>
                                    <p className="font-medium">Attention Score</p>
                                    <p className="text-muted-foreground">Does it stop the scroll?</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Type className="h-5 w-5 text-violet-500 shrink-0" />
                                <div>
                                    <p className="font-medium">Text Readability</p>
                                    <p className="text-muted-foreground">Is text clear on mobile?</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Palette className="h-5 w-5 text-amber-500 shrink-0" />
                                <div>
                                    <p className="font-medium">Color Contrast</p>
                                    <p className="text-muted-foreground">Does it pop in the feed?</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Heart className="h-5 w-5 text-rose-500 shrink-0" />
                                <div>
                                    <p className="font-medium">Emotional Impact</p>
                                    <p className="text-muted-foreground">Does it evoke curiosity?</p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !selectedImage}
                            className="w-full gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                            size="lg"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Grade My Cover
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Results Section */}
            {analysis && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Overall Score */}
                    <Card className={cn(
                        "border-2",
                        analysis.overallScore >= 8 ? "border-emerald-300 dark:border-emerald-700" :
                            analysis.overallScore >= 6 ? "border-blue-300 dark:border-blue-700" :
                                analysis.overallScore >= 4 ? "border-amber-300 dark:border-amber-700" :
                                    "border-red-300 dark:border-red-700"
                    )}>
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                <div className={cn(
                                    "relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r shrink-0",
                                    getScoreGradient(analysis.overallScore)
                                )}>
                                    <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                                        <span className={cn("text-3xl font-bold", getScoreColor(analysis.overallScore))}>
                                            {analysis.overallScore}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg mb-2">
                                        {analysis.overallScore >= 8 ? "🔥 Excellent Cover!" :
                                            analysis.overallScore >= 6 ? "👍 Good Cover" :
                                                analysis.overallScore >= 4 ? "⚠️ Needs Improvement" :
                                                    "❌ Needs Work"}
                                    </h3>
                                    <p className="text-muted-foreground">{analysis.verdict}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Scores */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: "Attention", score: analysis.scores.attention, icon: Eye, color: "text-blue-500" },
                            { label: "Clarity", score: analysis.scores.clarity, icon: Zap, color: "text-violet-500" },
                            { label: "Color Contrast", score: analysis.scores.colorContrast, icon: Palette, color: "text-amber-500" },
                            { label: "Emotional Impact", score: analysis.scores.emotionalImpact, icon: Heart, color: "text-rose-500" },
                        ].map((item) => (
                            <Card key={item.label}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <item.icon className={cn("h-4 w-4", item.color)} />
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </div>
                                        <Badge className={getScoreBg(item.score)}>
                                            {item.score}/10
                                        </Badge>
                                    </div>
                                    <Progress value={item.score * 10} className="h-2" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Text Readability (if applicable) */}
                    {analysis.hasText && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Type className="h-5 w-5 text-violet-600" />
                                    Text Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Readability Score</span>
                                    <Badge className={getScoreBg(analysis.scores.textReadability || 5)}>
                                        {analysis.scores.textReadability || "N/A"}/10
                                    </Badge>
                                </div>
                                {analysis.textContent && (
                                    <div className="p-3 bg-muted rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Detected text:</p>
                                        <p className="text-sm font-medium">&quot;{analysis.textContent}&quot;</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Color Palette */}
                    {analysis.colorPalette.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Palette className="h-5 w-5 text-amber-600" />
                                    Detected Colors
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.colorPalette.map((color, i) => (
                                        <Badge key={i} variant="outline" className="gap-2">
                                            <div
                                                className="w-4 h-4 rounded-full border"
                                                style={{ backgroundColor: color.toLowerCase().includes('#') ? color : undefined }}
                                            />
                                            {color}
                                        </Badge>
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
                                        Improvements
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

                    {/* Quick Fixes */}
                    {analysis.quickFixes.length > 0 && (
                        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Zap className="h-5 w-5 text-blue-600" />
                                    Quick Fixes (Easy Wins)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.quickFixes.map((fix, i) => (
                                        <Badge key={i} variant="secondary" className="py-2 px-3">
                                            💡 {fix}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
