"use client";

import { useState } from "react";
import { Copy, Check, Lock, Zap, Mic, MessageSquare, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Hook } from "@/lib/mock-analysis";
import { Icons } from "@/components/shared/icons";

interface HooksCardProps {
    hooks: Hook[];
    isPremium: boolean;
    plan: "free" | "starter" | "pro";
    title?: string;
    type?: "spoken" | "caption" | "hook";
    emptyMessage?: string;
}

export function HooksCard({
    hooks,
    isPremium,
    plan,
    title = "Hooks That Are Working",
    type = "spoken",
    emptyMessage = "No hooks found for this niche"
}: HooksCardProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (hook: Hook) => {
        if (!isPremium) {
            toast.error("Upgrade to copy hooks");
            return;
        }

        navigator.clipboard.writeText(hook.text);
        setCopiedId(hook.id);
        toast.success("Hook copied!");

        setTimeout(() => setCopiedId(null), 2000);
    };

    const getEngagementColor = (engagement: Hook["engagement"]) => {
        switch (engagement) {
            case "High":
                return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
            case "Medium":
                return "bg-amber-500/10 text-amber-600 border-amber-500/20";
            case "Low":
                return "bg-gray-500/10 text-gray-600 border-gray-500/20";
        }
    };

    const getPlatformIcon = (platform: Hook["platform"]) => {
        switch (platform) {
            case "TikTok":
                return <Icons.tiktok className="h-4 w-4" />;
            case "Instagram":
                return <Icons.instagram className="h-4 w-4" />;
            case "YouTube":
                return <Icons.youtube className="h-4 w-4" />;
        }
    };

    const getTypeIcon = () => {
        if (type === "hook") {
            return <Target className="h-5 w-5 text-orange-500" />;
        }
        if (type === "spoken") {
            return <Mic className="h-5 w-5 text-violet-500" />;
        }
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
    };

    // Determine if a hook should be displayed with quotes (verbal) or without (visual)
    const isVerbalHook = (hookText: string): boolean => {
        // Visual hooks typically describe actions, not speech
        const visualIndicators = [
            "show", "pan to", "cut to", "zoom", "transition", "reveal",
            "walk", "pick up", "open", "close", "display", "hold up"
        ];
        const lowerText = hookText.toLowerCase();
        return !visualIndicators.some(indicator => lowerText.startsWith(indicator));
    };

    if (hooks.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        {getTypeIcon()}
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">{emptyMessage}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        {getTypeIcon()}
                        {title}
                    </CardTitle>
                    <Badge variant="secondary" className="font-normal">
                        {hooks.length} hooks
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {hooks.map((hook, index) => (
                    <div
                        key={hook.id}
                        className={cn(
                            "group relative rounded-lg border bg-card p-4 transition-all hover:shadow-md",
                            !isPremium && index >= 3 && "opacity-50 blur-[2px]"
                        )}
                    >
                        <div className="flex items-start gap-4">
                            {/* Platform Icon */}
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                                {getPlatformIcon(hook.platform)}
                            </div>

                            {/* Hook Content */}
                            <div className="flex-1 space-y-2">
                                <p className="text-base font-medium leading-snug">
                                    {isVerbalHook(hook.text) ? `"${hook.text}"` : hook.text}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={cn("text-xs", getEngagementColor(hook.engagement))}
                                    >
                                        {hook.engagement} Engagement
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {hook.platform}
                                    </span>
                                </div>
                            </div>

                            {/* Copy Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={() => handleCopy(hook)}
                                disabled={!isPremium}
                            >
                                {copiedId === hook.id ? (
                                    <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        {/* Lock Overlay for Free Users */}
                        {!isPremium && index >= 3 && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
                                <Lock className="h-5 w-5 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
