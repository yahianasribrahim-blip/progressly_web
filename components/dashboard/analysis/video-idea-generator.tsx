"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    Video,
    Clock,
    MessageSquare,
    Music,
    Camera,
    Lightbulb,
    Copy,
    Check,
    Sparkles,
    RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoIdea {
    title: string;
    hook: string;
    script: string;
    duration: string;
    format: string;
    hashtags: string[];
    sound: string;
    tips: string[];
}

interface VideoIdeaGeneratorProps {
    niche: string;
    hooks: Array<{ text: string }>;
    hashtags: Array<{ tag: string }>;
    className?: string;
}

// Generate a detailed video idea based on the analysis data
function generateVideoIdea(niche: string, hooks: Array<{ text: string }>, hashtags: Array<{ tag: string }>): VideoIdea {
    const nicheIdeas: Record<string, VideoIdea[]> = {
        cultural: [
            {
                title: "Ramadan Morning Routine That Changed My Life",
                hook: "I used to hate waking up for suhoor, until I tried this...",
                script: "Start with you waking up (tired), then show your transformed routine. Share 3-4 things you do: a quick dua, meal prep the night before, a short podcast/quran recitation. End with how you feel more energized now.",
                duration: "30-60 seconds",
                format: "Get Ready With Me / Day in My Life",
                hashtags: ["ramadan", "muslimtiktok", "suhoor", "morningroutine"],
                sound: "Use a trending sound or peaceful nasheed",
                tips: [
                    "Film in natural morning light if possible",
                    "Show real, relatable moments (yawning, sleepy eyes)",
                    "Keep text overlays minimal but impactful",
                    "End with a call to action: 'What's your suhoor routine?'"
                ]
            },
            {
                title: "Things My Non-Muslim Friends Don't Know About Eid",
                hook: "When my friend asked why I get two Eids...",
                script: "Use POV or storytime format. Share 3-4 interesting facts about Eid that might surprise non-Muslims. Keep it educational but fun and relatable. Include your personal experience.",
                duration: "45-90 seconds",
                format: "Educational / Storytime",
                hashtags: ["eid", "eidmubarak", "muslimculture", "learntok"],
                sound: "Trending sound or storytelling background music",
                tips: [
                    "Make it relatable to both Muslims and non-Muslims",
                    "Use humor where appropriate",
                    "Include personal stories or experiences",
                    "Add text for key points"
                ]
            }
        ],
        deen: [
            {
                title: "This Quran Verse Hits Different When You Understand It",
                hook: "I've read this verse 100 times but never understood it until now...",
                script: "Choose one powerful verse. Show the Arabic, then the translation, then explain the deeper meaning or context. Share how it applies to modern life or a situation you're facing.",
                duration: "45-60 seconds",
                format: "Educational / Reflection",
                hashtags: ["quran", "islamic", "muslimtiktok", "islamicreminders"],
                sound: "Soft Quran recitation in background or peaceful music",
                tips: [
                    "Use clean, readable text overlays",
                    "Speak slowly and clearly",
                    "Share personal connection to the verse",
                    "Keep it simple - one verse, one message"
                ]
            },
            {
                title: "Small Sunnah I Started That Changed Everything",
                hook: "This tiny habit takes 30 seconds but the reward is massive...",
                script: "Share one simple Sunnah practice. Explain what it is, how you do it, and what difference it's made in your life. Make it practical and achievable.",
                duration: "30-45 seconds",
                format: "Advice / Personal Story",
                hashtags: ["sunnah", "deenoverdunya", "islamicreminders", "muslimtok"],
                sound: "Calm background or trending audio",
                tips: [
                    "Focus on ONE habit, not multiple",
                    "Make it actionable - viewers should be able to do it today",
                    "Share your personal experience",
                    "Be authentic, not preachy"
                ]
            }
        ],
        hijab: [
            {
                title: "5-Second Hijab Style That Looks Like 5 Minutes",
                hook: "POV: You're running late but still want to look put together...",
                script: "Show a quick, effortless hijab style. Film from your perspective, showing exactly how you wrap it. Add text for each step. Show the final look from multiple angles.",
                duration: "15-30 seconds",
                format: "Tutorial / GRWM",
                hashtags: ["hijabtutorial", "hijabstyle", "modestfashion", "muslimah"],
                sound: "Trending upbeat sound",
                tips: [
                    "Good lighting is essential",
                    "Show your face and the fabric clearly",
                    "Add step-by-step text overlays",
                    "Show the final look from different angles"
                ]
            }
        ],
        food: [
            {
                title: "Halal Version of This Trending Recipe",
                hook: "Everyone's making this but here's the halal version that tastes even better...",
                script: "Show the ingredients, quick cooking process, and final result. Focus on the substitution that makes it halal. Taste test at the end.",
                duration: "30-60 seconds",
                format: "Recipe / Cooking Tutorial",
                hashtags: ["halalfood", "halaleats", "muslimfoodie", "foodtok"],
                sound: "Search 'cooking ASMR' or 'recipe time' on TikTok - sizzling sounds and upbeat music work best",
                tips: [
                    "Use good lighting for food shots",
                    "Show the textures and steam",
                    "Keep ingredient list visible",
                    "Do a genuine taste reaction"
                ]
            },
            {
                title: "What I Eat in a Day as a Muslim Foodie",
                hook: "POV: You're curious what halal eating actually looks like...",
                script: "Document your meals throughout the day. Show breakfast, lunch, snacks, and dinner. Include where you got the food or quick prep shots.",
                duration: "45-90 seconds",
                format: "What I Eat in a Day",
                hashtags: ["halalfood", "whatieatinaday", "halaleats", "foodtok"],
                sound: "Search 'what I eat in a day' on TikTok and use a trending audio from those videos",
                tips: [
                    "Show variety in your meals",
                    "Include some homemade and some restaurant food",
                    "Add text overlays with meal names",
                    "End with your favorite meal of the day"
                ]
            }
        ],
        gym: [
            {
                title: "Modest Gym Fit That Actually Works",
                hook: "Finally found gym clothes that are modest AND functional...",
                script: "Show your outfit from different angles. Demonstrate that it stays in place during exercises. Share where you got each piece.",
                duration: "15-30 seconds",
                format: "Outfit Check / Review",
                hashtags: ["muslimfitness", "modestworkout", "hijabifitness", "gymtok"],
                sound: "Search 'gym motivation' or 'workout music' - use upbeat, energetic audio",
                tips: [
                    "Show the outfit in action, not just standing",
                    "Include price and where to buy",
                    "Show it doesn't ride up or move around",
                    "Film in good gym lighting"
                ]
            }
        ],
        pets: [
            {
                title: "My Cat's Reaction to Quran Recitation",
                hook: "I started playing Quran and my cat did this...",
                script: "Set up your phone to record your pet. Play Quran recitation and capture their genuine reaction. Keep it authentic.",
                duration: "15-45 seconds",
                format: "Pet Reaction / Cute Animals",
                hashtags: ["muslimswithcats", "catsofislam", "quran", "cattok"],
                sound: "Use the actual Quran recitation audio - no additional music needed",
                tips: [
                    "Make sure the audio is clear",
                    "Capture the cat's natural behavior",
                    "Don't force a reaction",
                    "Good lighting on the cat"
                ]
            }
        ],
        storytelling: [
            {
                title: "The Moment I Knew Islam Was True",
                hook: "This one experience changed everything I believed...",
                script: "Share a personal story about your journey. Build up the tension, share the turning point, and end with the lesson. Be vulnerable and authentic.",
                duration: "60-180 seconds",
                format: "Storytime / Personal Journey",
                hashtags: ["storytime", "muslimstory", "revertmuslim", "myjourney"],
                sound: "Search 'storytime' or 'emotional' on TikTok - soft, reflective background music",
                tips: [
                    "Speak from the heart",
                    "Make eye contact with the camera",
                    "Build up to the emotional moment",
                    "End with something viewers can relate to"
                ]
            }
        ],
        default: [
            {
                title: "A Day in My Life as a Content Creator",
                hook: "Nobody told me this about creating content...",
                script: "Share your unique perspective on your niche. What surprised you? What do people not know? Make it personal and relatable.",
                duration: "30-60 seconds",
                format: "POV / Storytime",
                hashtags: ["contentcreator", "creatorlife", "tiktokgrowth"],
                sound: "Search 'day in my life' on TikTok and use a currently trending audio",
                tips: [
                    "Be authentic and genuine",
                    "Share real experiences",
                    "Add your unique personality",
                    "End with a question to boost engagement"
                ]
            }
        ]
    };

    const ideas = nicheIdeas[niche.toLowerCase()] || nicheIdeas.default;
    const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];

    // Customize with actual hooks and hashtags if available
    // Only use hooks that look complete (not truncated)
    const validHooks = hooks.filter(h => {
        const text = h.text.trim();
        // Must be at least 20 chars and either end with punctuation or not end with "..."
        return text.length >= 20 &&
            (text.endsWith('.') || text.endsWith('!') || text.endsWith('?') || text.endsWith('...') || !text.endsWith('"'));
    });

    if (validHooks.length > 0 && Math.random() > 0.3) {
        randomIdea.hook = validHooks[Math.floor(Math.random() * validHooks.length)].text;
    }

    if (hashtags.length > 0) {
        randomIdea.hashtags = hashtags.slice(0, 4).map(h => h.tag);
    }

    return randomIdea;
}

export function VideoIdeaGenerator({ niche, hooks, hashtags, className }: VideoIdeaGeneratorProps) {
    const [videoIdea, setVideoIdea] = useState<VideoIdea | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const handleGenerate = () => {
        const idea = generateVideoIdea(niche, hooks, hashtags);
        setVideoIdea(idea);
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    onClick={() => {
                        handleGenerate();
                        setIsOpen(true);
                    }}
                    className={cn(
                        "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white",
                        className
                    )}
                >
                    <Video className="h-4 w-4 mr-2" />
                    Generate Video Idea
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="h-5 w-5 text-violet-500" />
                        Your Video Idea
                    </DialogTitle>
                    <DialogDescription>
                        A detailed video concept based on what's trending in your niche
                    </DialogDescription>
                </DialogHeader>

                {videoIdea && (
                    <div className="space-y-6 pt-4">
                        {/* Title */}
                        <div className="p-4 bg-violet-500/10 rounded-lg border border-violet-500/20">
                            <h3 className="text-lg font-bold text-violet-700 dark:text-violet-300">
                                {videoIdea.title}
                            </h3>
                        </div>

                        {/* Hook */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                                    <MessageSquare className="h-4 w-4 text-blue-500" />
                                    Opening Hook
                                </h4>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(videoIdea.hook, 'hook')}
                                >
                                    {copied === 'hook' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-lg font-medium p-3 bg-background rounded-lg border">
                                "{videoIdea.hook}"
                            </p>
                        </div>

                        {/* Script/Concept */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                                    <Camera className="h-4 w-4 text-green-500" />
                                    What to Film
                                </h4>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(videoIdea.script, 'script')}
                                >
                                    {copied === 'script' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-sm p-3 bg-background rounded-lg border leading-relaxed">
                                {videoIdea.script}
                            </p>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-background rounded-lg border">
                                <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                                    <Clock className="h-3 w-3" />
                                    Duration
                                </div>
                                <p className="font-medium">{videoIdea.duration}</p>
                            </div>
                            <div className="p-3 bg-background rounded-lg border">
                                <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                                    <Video className="h-3 w-3" />
                                    Format
                                </div>
                                <p className="font-medium">{videoIdea.format}</p>
                            </div>
                        </div>

                        {/* Sound */}
                        <div className="space-y-2">
                            <h4 className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                                <Music className="h-4 w-4 text-pink-500" />
                                Sound/Audio
                            </h4>
                            <p className="text-sm p-3 bg-background rounded-lg border">
                                {videoIdea.sound}
                            </p>
                        </div>

                        {/* Hashtags */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                                Suggested Hashtags
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {videoIdea.hashtags.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-violet-500/20"
                                        onClick={() => copyToClipboard(`#${tag}`, `tag-${i}`)}>
                                        #{tag} {copied === `tag-${i}` && <Check className="h-3 w-3 ml-1" />}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="space-y-2">
                            <h4 className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                                <Lightbulb className="h-4 w-4 text-yellow-500" />
                                Pro Tips
                            </h4>
                            <ul className="space-y-2">
                                {videoIdea.tips.map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm p-2 bg-yellow-500/10 rounded-lg">
                                        <span className="text-yellow-600">💡</span>
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Regenerate Button */}
                        <div className="pt-4 border-t flex justify-center">
                            <Button variant="outline" onClick={handleGenerate}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Generate Another Idea
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
