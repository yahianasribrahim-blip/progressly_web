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
    Bookmark,
    BookmarkCheck,
    X,
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
    contentFormat: "original_content" | "edit_compilation" | "repost";
    celebritiesDetected: string;
    contentDescription: string;
    sceneBySceneBreakdown: SceneBreakdown[];
    peopleCount: string;
    settingType: string;
    audioType: string;
    productionQuality: string;
    lessonsToApply: string[];
    mistakesToAvoid: string[];
    hookAnalysis: {
        hookType: string;
        effectiveness: string;
        score: number;
    };
    replicabilityRequirements: string[];
    analysisMethod: "video_frames" | "thumbnail_only" | "full_video" | "cover_only";
    whyItFlopped?: string | null;
    fallbackReason?: string;
}

interface Analysis {
    performanceScore: number;
    verdict: string;
    strengths: string[];
    improvements: string[];
    keyLearnings: string[];
    whyItFlopped?: string | null;
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

interface GeneratedShotPlan {
    shotNumber: number;
    timestamp: string;
    action: string;
    cameraAngle: string;
    lighting: string;
    notes: string;
}

interface GeneratedVideoIdea {
    title: string;
    concept: string;
    estimatedDuration: string;
    shotByShot: GeneratedShotPlan[];
    equipmentNeeded: string[];
    locationSuggestions: string[];
    tipsForSuccess: string[];
}

interface PreGenerationQuestion {
    id: string;
    question: string;
    type: "yes_no" | "choice";
    relevance: string;
    options?: string[];
}

export function AnalyzeMyVideo({ className }: AnalyzeMyVideoProps) {
    const [videoUrl, setVideoUrl] = useState("");
    const [videoIntention, setVideoIntention] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
    const [generatedIdea, setGeneratedIdea] = useState<GeneratedVideoIdea | null>(null);
    const [video, setVideo] = useState<AnalyzedVideo | null>(null);
    const [stats, setStats] = useState<VideoStats | null>(null);
    const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);
    const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [showQuestionsModal, setShowQuestionsModal] = useState(false);
    const [preQuestions, setPreQuestions] = useState<PreGenerationQuestion[]>([]);
    const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [isSavingIdea, setIsSavingIdea] = useState(false);
    const [isIdeaSaved, setIsIdeaSaved] = useState(false);

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(1) + "K";
        return num.toString();
    };

    const handleSaveBreakdown = async () => {
        if (!video || !videoAnalysis || isSaving) return;

        setIsSaving(true);
        try {
            const response = await fetch("/api/analysis/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    niche: `Video: ${video.creator}`,
                    analysisData: {
                        type: "video_breakdown",
                        video,
                        stats,
                        engagement,
                        videoAnalysis,
                        analysis,
                        videoUrl,
                        videoIntention,
                        savedAt: new Date().toISOString(),
                    },
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save breakdown");
            }

            setIsSaved(true);
            toast.success("Breakdown saved! View it in 'Saved Breakdowns'");
        } catch (error) {
            console.error("Error saving breakdown:", error);
            toast.error("Failed to save breakdown");
        } finally {
            setIsSaving(false);
        }
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

        if (!videoIntention.trim()) {
            toast.error("Please describe the video's intention");
            return;
        }

        if (videoIntention.trim().length < 50) {
            toast.error("Video intention must be at least 50 characters. Please be more descriptive.");
            return;
        }

        // Detect spam/gibberish in video intention
        const intention = videoIntention.trim().toLowerCase();

        // Check for repeated single character (like "aaaaaaaaaaaaa")
        const uniqueChars = new Set(intention.replace(/\s/g, ''));
        if (uniqueChars.size < 5) {
            toast.error("Please provide a genuine description of the video's purpose, not repeated characters.");
            return;
        }

        // Check for single word repeated (like "test test test test")
        const words = intention.split(/\s+/).filter(w => w.length > 0);
        const uniqueWords = new Set(words);
        if (words.length >= 5 && uniqueWords.size <= 2) {
            toast.error("Please provide a meaningful description, not repeated words.");
            return;
        }

        // Check if most words are actual English words (not gibberish)
        // List of common English words for validation
        const commonWords = new Set([
            // Common words
            "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
            "may", "might", "must", "shall", "can", "need", "dare", "ought", "used",
            "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
            "my", "your", "his", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs",
            "this", "that", "these", "those", "who", "whom", "which", "what", "whose",
            "where", "when", "why", "how", "all", "each", "every", "both", "few", "more",
            "most", "other", "some", "any", "no", "not", "only", "own", "same", "so",
            "than", "too", "very", "just", "also", "now", "here", "there", "then",
            "and", "but", "or", "nor", "for", "yet", "so", "because", "although", "if",
            "unless", "until", "while", "as", "since", "before", "after", "when", "where",
            "in", "on", "at", "by", "for", "with", "about", "against", "between", "into",
            "through", "during", "before", "after", "above", "below", "to", "from", "up",
            "down", "out", "off", "over", "under", "again", "further", "once",
            // People words
            "guy", "guys", "girl", "girls", "man", "men", "woman", "women", "person", "people",
            "kid", "kids", "child", "children", "baby", "friend", "friends", "someone", "anyone",
            // Action words
            "showing", "doing", "going", "coming", "taking", "making", "getting", "putting",
            "breaking", "fixing", "cleaning", "washing", "driving", "walking", "running",
            "talking", "eating", "drinking", "cooking", "working", "playing", "waiting",
            "sitting", "standing", "looking", "watching", "trying", "buying", "selling",
            "opening", "closing", "starting", "stopping", "turning", "moving", "leaving",
            // Common nouns
            "car", "cars", "truck", "bike", "house", "door", "window", "phone", "camera",
            "water", "food", "drink", "thing", "things", "stuff", "way", "time", "part",
            "place", "world", "hand", "hands", "head", "face", "eye", "eyes", "body",
            "street", "road", "store", "school", "work", "job", "money", "price", "cost",
            // Descriptive words  
            "mid", "full", "half", "whole", "real", "fake", "main", "side", "back", "front",
            "inside", "outside", "crazy", "funny", "cool", "nice", "bad", "weird", "amazing",
            "beautiful", "ugly", "clean", "dirty", "broken", "fixed", "empty", "stuck",
            // Content creation words
            "video", "content", "tutorial", "review", "vlog", "blog", "comedy", "funny",
            "educational", "informative", "entertainment", "lifestyle", "fashion", "beauty",
            "makeup", "skincare", "fitness", "workout", "health", "wellness", "food",
            "cooking", "recipe", "travel", "adventure", "gaming", "music", "dance",
            "art", "craft", "diy", "howto", "tips", "tricks", "hack", "hacks", "detail",
            "story", "storytime", "day", "life", "routine", "morning", "night", "daily",
            "weekly", "monthly", "challenge", "trend", "trending", "viral", "popular",
            "new", "old", "first", "last", "next", "show", "showing", "share", "sharing",
            "talk", "talking", "explain", "explaining", "teach", "teaching", "learn", "learning",
            "make", "making", "create", "creating", "build", "building", "try", "trying",
            "test", "testing", "unbox", "unboxing", "haul", "shopping", "buy", "buying",
            "get", "getting", "use", "using", "work", "working", "play", "playing",
            "watch", "watching", "listen", "listening", "read", "reading", "write", "writing",
            "asmr", "satisfying", "relaxing", "calming", "soothing", "meditation", "yoga",
            "motivational", "inspirational", "emotional", "personal", "private", "public",
            "family", "friends", "couple", "relationship", "dating", "love", "life",
            "home", "house", "room", "bedroom", "kitchen", "bathroom", "living", "office",
            "outdoor", "indoor", "nature", "city", "urban", "rural", "country",
            "muslim", "islamic", "hijab", "modest", "modesty", "faith", "spiritual", "religious",
            "product", "products", "brand", "service", "company", "business", "shop", "store",
            "good", "great", "best", "better", "bad", "worse", "worst", "top", "bottom",
            "high", "low", "big", "small", "long", "short", "fast", "slow", "quick",
            "easy", "hard", "simple", "complex", "basic", "advanced", "beginner", "expert",
            "like", "love", "hate", "want", "need", "think", "know", "believe", "feel",
            "see", "look", "find", "give", "take", "come", "go", "run", "walk", "move",
            "put", "set", "keep", "let", "begin", "start", "end", "finish", "stop",
            "open", "close", "turn", "change", "follow", "help", "support", "thank",
            "please", "sorry", "hello", "hi", "hey", "bye", "goodbye", "welcome",
            "yes", "no", "maybe", "ok", "okay", "sure", "right", "wrong", "true", "false",
            // Technical/hobby words
            "pressure", "power", "wash", "detail", "detailing", "clean", "cleaning",
            "repair", "fix", "install", "setup", "build", "assemble", "paint", "spray"
        ]);

        // Strip punctuation from words before checking (handle guy's -> guy)
        const cleanWord = (w: string) => w.replace(/[''`]/g, '').replace(/s$/, ''); // Remove apostrophes and trailing s

        // Check how many words are recognizable English
        const wordsToCheck = words.filter(w => w.length > 2); // Skip very short words
        const recognizedWords = wordsToCheck.filter(w =>
            commonWords.has(w) || commonWords.has(cleanWord(w))
        );
        const recognitionRate = wordsToCheck.length > 0 ? recognizedWords.length / wordsToCheck.length : 0;

        // If less than 25% of words are recognized, likely gibberish
        if (wordsToCheck.length >= 5 && recognitionRate < 0.25) {
            toast.error("Please describe the video's purpose using clear, understandable English words.");
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
                body: JSON.stringify({ videoUrl, videoIntention }),
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

    // Step 1: Fetch questions and show modal
    const handleStartGenerateIdea = async () => {
        if (!videoAnalysis || !video) {
            toast.error("Please analyze a video first");
            return;
        }

        setIsLoadingQuestions(true);
        setQuestionAnswers({});

        try {
            const response = await fetch("/api/video/generate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoAnalysis }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate questions");
            }

            setPreQuestions(data.questions);
            setShowQuestionsModal(true);
        } catch (err) {
            console.error("Generate questions error:", err);
            toast.error("Failed to load questions. Generating idea directly...");
            // Fallback: generate idea without questions
            handleGenerateIdeaWithAnswers([]);
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    // Step 2: Generate idea with user's answers
    const handleGenerateIdeaWithAnswers = async (answers: { question: string; answer: string }[]) => {
        if (!videoAnalysis || !video) return;

        setShowQuestionsModal(false);
        setIsGeneratingIdea(true);
        setGeneratedIdea(null);

        try {
            const response = await fetch("/api/video/generate-idea", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inspirationVideo: {
                        description: video.description,
                        duration: video.duration,
                        contentType: videoAnalysis.contentType,
                        contentFormat: videoAnalysis.contentFormat,
                        celebritiesDetected: videoAnalysis.celebritiesDetected,
                        sceneBreakdown: videoAnalysis.sceneBySceneBreakdown,
                        whatWorked: videoAnalysis.lessonsToApply,
                        settingType: videoAnalysis.settingType,
                        productionQuality: videoAnalysis.productionQuality,
                    },
                    videoIntention: videoIntention || videoAnalysis.contentType,
                    userAnswers: answers,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate idea");
            }

            setGeneratedIdea(data.idea);
            toast.success("Video plan generated!");
        } catch (err) {
            console.error("Generate idea error:", err);
            toast.error("Failed to generate video plan");
        } finally {
            setIsGeneratingIdea(false);
        }
    };

    // Handle submitting answers from modal
    const handleSubmitQuestionAnswers = () => {
        const answers = preQuestions.map(q => ({
            question: q.question,
            answer: questionAnswers[q.id] || "no answer"
        }));
        setShowQuestionsModal(false);
        handleGenerateIdeaWithAnswers(answers);
    };

    // Save idea to Content Bank
    const handleSaveToContentBank = async () => {
        if (!generatedIdea || !video) return;

        setIsSavingIdea(true);
        try {
            const response = await fetch("/api/ideas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: generatedIdea.title,
                    concept: generatedIdea.concept,
                    shotByShot: generatedIdea.shotByShot,
                    tips: generatedIdea.tipsForSuccess,
                    sourceVideo: video.url,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to save");
            }

            setIsIdeaSaved(true);
            toast.success("Saved to Content Bank!");
        } catch (err) {
            console.error("Save error:", err);
            toast.error("Failed to save idea");
        } finally {
            setIsSavingIdea(false);
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
        <>
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
                    <CardContent className="space-y-4">
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

                        {/* Video Intention Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Video Intention
                                <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g., ASMR/Satisfying, Educational, Comedy, Storytelling, Product Review, Day in the Life..."
                                value={videoIntention}
                                onChange={(e) => setVideoIntention(e.target.value)}
                                disabled={isAnalyzing}
                                className="text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                Minimum 50 characters. The more specific you are, the better your analysis will be ({videoIntention.length}/50)
                            </p>
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

                        {/* Save Breakdown Button */}
                        <div className="flex justify-end">
                            <Button
                                variant={isSaved ? "secondary" : "outline"}
                                size="sm"
                                onClick={handleSaveBreakdown}
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
                                        Save Breakdown
                                    </>
                                )}
                            </Button>
                        </div>

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
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Brain className="h-5 w-5 text-violet-600" />
                                            Video Content Analysis
                                        </CardTitle>
                                        <Badge
                                            variant={videoAnalysis.analysisMethod === "full_video" ? "default" : "destructive"}
                                            className={videoAnalysis.analysisMethod === "full_video"
                                                ? "bg-emerald-600"
                                                : "bg-amber-600"
                                            }
                                        >
                                            {videoAnalysis.analysisMethod === "full_video"
                                                ? "✓ Full Video Analyzed"
                                                : "⚠️ Thumbnail Only"}
                                        </Badge>
                                    </div>
                                    {videoAnalysis.analysisMethod !== "full_video" && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            {videoAnalysis.fallbackReason || "Video download failed."} Analysis based on thumbnail only - scene breakdown may be incomplete.
                                        </p>
                                    )}
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
                                </CardContent>
                            </Card>
                        )}

                        {/* Scene-by-Scene Breakdown */}
                        {videoAnalysis && videoAnalysis.sceneBySceneBreakdown && videoAnalysis.sceneBySceneBreakdown.length > 0 && (
                            <Card className="border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Clock className="h-5 w-5 text-cyan-600" />
                                        Scene-by-Scene Breakdown
                                    </CardTitle>
                                    <CardDescription>
                                        What happens at each point in the video
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {videoAnalysis.sceneBySceneBreakdown.map((scene, index) => (
                                            <div key={index} className="flex gap-3 p-3 bg-background rounded-lg border">
                                                <Badge variant="outline" className="shrink-0 h-fit">
                                                    {scene.timestamp}
                                                </Badge>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm">{scene.description}</p>
                                                    <p className="text-sm text-muted-foreground mt-1">{scene.whatsHappening}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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

                        {/* Why It Flopped - Only show for low performing videos */}
                        {analysis.whyItFlopped && analysis.performanceScore < 50 && (
                            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg text-red-600">
                                        <AlertCircle className="h-5 w-5" />
                                        Why This Flopped
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm">{analysis.whyItFlopped}</p>
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
                                            Lessons to Apply
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
                                            Mistakes to Avoid
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

                        {/* Generate My Idea Section */}
                        <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Lightbulb className="h-5 w-5 text-violet-500" />
                                    Create Your Version
                                </CardTitle>
                                <CardDescription>
                                    Generate a personalized video plan based on this inspiration and your available resources
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={handleStartGenerateIdea}
                                    disabled={isGeneratingIdea || isLoadingQuestions}
                                    className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                                >
                                    {isLoadingQuestions ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading questions...
                                        </>
                                    ) : isGeneratingIdea ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Generating Your Video Plan...
                                        </>
                                    ) : (
                                        <>
                                            <Lightbulb className="h-4 w-4" />
                                            Generate My Idea
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Generated Idea Display */}
                        {generatedIdea && (
                            <Card className="border-emerald-200 dark:border-emerald-800">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle className="h-5 w-5" />
                                        Your Personalized Video Plan
                                    </CardTitle>
                                    <CardDescription className="text-base font-medium">
                                        {generatedIdea.title}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Concept */}
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Concept</h4>
                                        <p className="text-sm text-muted-foreground">{generatedIdea.concept}</p>
                                    </div>

                                    {/* Duration */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>Estimated Duration: {generatedIdea.estimatedDuration}</span>
                                    </div>

                                    {/* Shot-by-Shot Breakdown */}
                                    <div>
                                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                            <Film className="h-4 w-4" />
                                            Shot-by-Shot Plan
                                        </h4>
                                        <div className="space-y-3">
                                            {generatedIdea.shotByShot.map((shot, i) => (
                                                <div key={i} className="bg-muted/50 rounded-lg p-3 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-sm">Shot {shot.shotNumber}</span>
                                                        <Badge variant="outline" className="text-xs">{shot.timestamp}</Badge>
                                                    </div>
                                                    <p className="text-sm">{shot.action}</p>
                                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                        <span>📷 {shot.cameraAngle}</span>
                                                        <span>💡 {shot.lighting}</span>
                                                    </div>
                                                    {shot.notes && (
                                                        <p className="text-xs text-muted-foreground italic">{shot.notes}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Equipment & Location */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2">Equipment Needed</h4>
                                            <ul className="space-y-1">
                                                {generatedIdea.equipmentNeeded.map((item, i) => (
                                                    <li key={i} className="text-sm flex items-start gap-2">
                                                        <span className="text-muted-foreground">•</span>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2">Location Suggestions</h4>
                                            <ul className="space-y-1">
                                                {generatedIdea.locationSuggestions.map((loc, i) => (
                                                    <li key={i} className="text-sm flex items-start gap-2">
                                                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                                                        {loc}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Tips */}
                                    {generatedIdea.tipsForSuccess.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2">Tips for Success</h4>
                                            <ul className="space-y-1">
                                                {generatedIdea.tipsForSuccess.map((tip, i) => (
                                                    <li key={i} className="text-sm flex items-start gap-2">
                                                        <Lightbulb className="h-3 w-3 text-amber-500 shrink-0 mt-1" />
                                                        {tip}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Save to Content Bank */}
                                    <div className="pt-4 border-t">
                                        <Button
                                            onClick={handleSaveToContentBank}
                                            disabled={isSavingIdea || isIdeaSaved}
                                            className={isIdeaSaved
                                                ? "w-full bg-emerald-600 hover:bg-emerald-600"
                                                : "w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                                            }
                                        >
                                            {isSavingIdea ? (
                                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                                            ) : isIdeaSaved ? (
                                                <><CheckCircle className="h-4 w-4 mr-2" />Saved to Content Bank</>
                                            ) : (
                                                <>Save to Content Bank</>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
            {/* Questions Modal */}
            {showQuestionsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6 border-b flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">Quick Questions</h3>
                                <p className="text-sm text-muted-foreground">
                                    Help us generate the perfect idea for you
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowQuestionsModal(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="p-6 space-y-4">
                            {preQuestions.map((q) => (
                                <div key={q.id} className="space-y-2">
                                    <p className="text-sm font-medium">{q.question}</p>
                                    <p className="text-xs text-muted-foreground">{q.relevance}</p>

                                    {q.type === "yes_no" ? (
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant={questionAnswers[q.id] === "Yes" ? "default" : "outline"}
                                                onClick={() => setQuestionAnswers(prev => ({ ...prev, [q.id]: "Yes" }))}
                                                className={questionAnswers[q.id] === "Yes" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                                            >
                                                Yes
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={questionAnswers[q.id] === "No" ? "default" : "outline"}
                                                onClick={() => setQuestionAnswers(prev => ({ ...prev, [q.id]: "No" }))}
                                                className={questionAnswers[q.id] === "No" ? "bg-red-600 hover:bg-red-700" : ""}
                                            >
                                                No
                                            </Button>
                                        </div>
                                    ) : q.options ? (
                                        <div className="flex flex-wrap gap-2">
                                            {q.options.map((opt) => (
                                                <Button
                                                    key={opt}
                                                    size="sm"
                                                    variant={questionAnswers[q.id] === opt ? "default" : "outline"}
                                                    onClick={() => setQuestionAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                >
                                                    {opt}
                                                </Button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowQuestionsModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                                onClick={handleSubmitQuestionAnswers}
                            >
                                Generate Idea
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
