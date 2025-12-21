"use client";

import { useState, useEffect } from "react";
import {
    CheckSquare,
    Square,
    AlertTriangle,
    CheckCircle2,
    Sparkles,
    Target,
    MessageSquare,
    Hash,
    Image,
    Music,
    Clock,
    Zap,
    Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChecklistItem {
    id: string;
    category: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    critical: boolean;
    halalOnly?: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
    // Hook & Opening
    {
        id: "hook-first-second",
        category: "Hook",
        label: "First second grabs attention",
        description: "The very first frame or second makes viewers want to stay",
        icon: <Target className="h-4 w-4" />,
        critical: true,
    },
    {
        id: "hook-text-overlay",
        category: "Hook",
        label: "Text hook is visible",
        description: "On-screen text in the first 1-3 seconds if using text hooks",
        icon: <Target className="h-4 w-4" />,
        critical: false,
    },
    {
        id: "hook-curiosity",
        category: "Hook",
        label: "Creates curiosity",
        description: "Viewer wants to know what happens next",
        icon: <Target className="h-4 w-4" />,
        critical: true,
    },
    // Content
    {
        id: "content-clear-value",
        category: "Content",
        label: "Clear value proposition",
        description: "Viewers know what they'll get from watching",
        icon: <Zap className="h-4 w-4" />,
        critical: true,
    },
    {
        id: "content-pacing",
        category: "Content",
        label: "Good pacing throughout",
        description: "No slow or boring sections that lose viewers",
        icon: <Clock className="h-4 w-4" />,
        critical: false,
    },
    {
        id: "content-payoff",
        category: "Content",
        label: "Satisfying payoff/ending",
        description: "The video delivers on what it promised",
        icon: <Zap className="h-4 w-4" />,
        critical: true,
    },
    // Caption
    {
        id: "caption-hook-line",
        category: "Caption",
        label: "Strong first line",
        description: "Caption starts with a hook that makes people want to read more",
        icon: <MessageSquare className="h-4 w-4" />,
        critical: true,
    },
    {
        id: "caption-cta",
        category: "Caption",
        label: "Call-to-action included",
        description: "Asks viewers to like, comment, share, follow, or save",
        icon: <MessageSquare className="h-4 w-4" />,
        critical: false,
    },
    {
        id: "caption-hashtags",
        category: "Caption",
        label: "Relevant hashtags (3-10)",
        description: "Using hashtags that match your content and target audience",
        icon: <Hash className="h-4 w-4" />,
        critical: false,
    },
    // Cover/Thumbnail
    {
        id: "cover-eye-catching",
        category: "Cover",
        label: "Cover/thumbnail is eye-catching",
        description: "The static preview image stands out in the feed",
        icon: <Image className="h-4 w-4" />,
        critical: true,
    },
    {
        id: "cover-text",
        category: "Cover",
        label: "Text is readable (if any)",
        description: "Any text on the cover is clear and not too small",
        icon: <Image className="h-4 w-4" />,
        critical: false,
    },
    // Audio
    {
        id: "audio-clear",
        category: "Audio",
        label: "Audio is clear",
        description: "Voice and sounds are crisp, no background noise",
        icon: <Music className="h-4 w-4" />,
        critical: true,
    },
    {
        id: "audio-trending",
        category: "Audio",
        label: "Using trending sound (if applicable)",
        description: "If using music/sounds, consider trending ones for reach",
        icon: <Music className="h-4 w-4" />,
        critical: false,
    },
    // Halal-only items
    {
        id: "halal-no-music",
        category: "Halal Check",
        label: "No background music",
        description: "Video uses voice, nasheeds, or sound effects only - no music",
        icon: <Shield className="h-4 w-4" />,
        critical: true,
        halalOnly: true,
    },
    {
        id: "halal-appropriate",
        category: "Halal Check",
        label: "Content is appropriate",
        description: "Nothing inappropriate in visuals or message",
        icon: <Shield className="h-4 w-4" />,
        critical: true,
        halalOnly: true,
    },
];

interface PrePostChecklistProps {
    isMuslimCreator?: boolean;
}

export function PrePostChecklist({ isMuslimCreator = false }: PrePostChecklistProps) {
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    const [showHalalChecks, setShowHalalChecks] = useState(isMuslimCreator);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load saved state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("progressly-checklist");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setCheckedItems(new Set(parsed.checkedItems || []));
                setShowHalalChecks(parsed.showHalalChecks ?? isMuslimCreator);
            } catch (e) {
                console.error("Failed to load checklist state", e);
            }
        }
        setIsLoaded(true);
    }, [isMuslimCreator]);

    // Save state to localStorage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("progressly-checklist", JSON.stringify({
                checkedItems: Array.from(checkedItems),
                showHalalChecks,
            }));
        }
    }, [checkedItems, showHalalChecks, isLoaded]);

    const filteredItems = CHECKLIST_ITEMS.filter(
        item => !item.halalOnly || showHalalChecks
    );

    const criticalItems = filteredItems.filter(item => item.critical);
    const completedCritical = criticalItems.filter(item => checkedItems.has(item.id)).length;
    const totalCompleted = filteredItems.filter(item => checkedItems.has(item.id)).length;

    const allCriticalComplete = completedCritical === criticalItems.length;
    const allComplete = totalCompleted === filteredItems.length;

    const progress = Math.round((totalCompleted / filteredItems.length) * 100);

    const toggleItem = (id: string) => {
        setCheckedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const resetChecklist = () => {
        setCheckedItems(new Set());
        toast.success("Checklist reset!");
    };

    const categories = Array.from(new Set(filteredItems.map(item => item.category)));

    return (
        <div className="space-y-6">
            {/* Status Card */}
            <Card className={cn(
                "border-2 transition-all",
                allComplete ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" :
                    allCriticalComplete ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20" :
                        "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
            )}>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "flex h-16 w-16 items-center justify-center rounded-full",
                                allComplete ? "bg-emerald-100 dark:bg-emerald-900/50" :
                                    allCriticalComplete ? "bg-blue-100 dark:bg-blue-900/50" :
                                        "bg-amber-100 dark:bg-amber-900/50"
                            )}>
                                {allComplete ? (
                                    <Sparkles className="h-8 w-8 text-emerald-600" />
                                ) : allCriticalComplete ? (
                                    <CheckCircle2 className="h-8 w-8 text-blue-600" />
                                ) : (
                                    <AlertTriangle className="h-8 w-8 text-amber-600" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">
                                    {allComplete ? "🎉 Ready to Post!" :
                                        allCriticalComplete ? "Almost there!" :
                                            "Not ready yet"}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {totalCompleted}/{filteredItems.length} items complete
                                    {!allCriticalComplete && ` • ${completedCritical}/${criticalItems.length} critical done`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Progress value={progress} className="w-32" />
                            <span className="text-sm font-medium">{progress}%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Halal Toggle */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-violet-600" />
                            <div>
                                <Label htmlFor="halal-toggle" className="font-medium">Halal Content Checks</Label>
                                <p className="text-xs text-muted-foreground">Include music detection and appropriateness checks</p>
                            </div>
                        </div>
                        <Switch
                            id="halal-toggle"
                            checked={showHalalChecks}
                            onCheckedChange={setShowHalalChecks}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Checklist Categories */}
            <div className="space-y-4">
                {categories.map(category => {
                    const categoryItems = filteredItems.filter(item => item.category === category);
                    const categoryCompleted = categoryItems.filter(item => checkedItems.has(item.id)).length;
                    const isComplete = categoryCompleted === categoryItems.length;

                    return (
                        <Card key={category} className={cn(
                            "transition-all",
                            isComplete && "border-emerald-300 dark:border-emerald-700"
                        )}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        {categoryItems[0]?.icon}
                                        {category}
                                    </CardTitle>
                                    <Badge variant={isComplete ? "default" : "outline"} className={cn(
                                        isComplete && "bg-emerald-500"
                                    )}>
                                        {categoryCompleted}/{categoryItems.length}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-2">
                                    {categoryItems.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleItem(item.id)}
                                            className={cn(
                                                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                checkedItems.has(item.id)
                                                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700"
                                                    : "hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="mt-0.5">
                                                {checkedItems.has(item.id) ? (
                                                    <CheckSquare className="h-5 w-5 text-emerald-600" />
                                                ) : (
                                                    <Square className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className={cn(
                                                        "font-medium text-sm",
                                                        checkedItems.has(item.id) && "line-through text-muted-foreground"
                                                    )}>
                                                        {item.label}
                                                    </p>
                                                    {item.critical && (
                                                        <Badge variant="outline" className="text-xs border-red-300 text-red-600">
                                                            Critical
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-4">
                <Button variant="outline" onClick={resetChecklist}>
                    Reset Checklist
                </Button>
                {allComplete && (
                    <Button className="bg-gradient-to-r from-emerald-600 to-green-600 gap-2">
                        <Sparkles className="h-4 w-4" />
                        Post with Confidence!
                    </Button>
                )}
            </div>
        </div>
    );
}
