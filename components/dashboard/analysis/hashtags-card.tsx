"use client";

import { useState } from "react";
import { Copy, Check, Hash, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Hashtag } from "@/lib/mock-analysis";

interface HashtagsCardProps {
    hashtags: Hashtag[];
    isPremium: boolean;
}

export function HashtagsCard({ hashtags, isPremium }: HashtagsCardProps) {
    const [copied, setCopied] = useState(false);

    const broadTags = hashtags.filter((h) => h.category === "Broad");
    const mediumTags = hashtags.filter((h) => h.category === "Medium");
    const nicheTags = hashtags.filter((h) => h.category === "Niche");

    const handleCopyAll = () => {
        if (!isPremium) {
            toast.error("Upgrade to copy hashtags");
            return;
        }

        const allTags = hashtags.map((h) => `#${h.tag}`).join(" ");
        navigator.clipboard.writeText(allTags);
        setCopied(true);
        toast.success("All hashtags copied!");

        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopySingle = (tag: string) => {
        if (!isPremium) {
            toast.error("Upgrade to copy hashtags");
            return;
        }

        navigator.clipboard.writeText(`#${tag}`);
        toast.success("Hashtag copied!");
    };

    const getCategoryColor = (category: Hashtag["category"]) => {
        switch (category) {
            case "Broad":
                return "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20";
            case "Medium":
                return "bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20";
            case "Niche":
                return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20";
        }
    };

    const renderTagGroup = (
        title: string,
        tags: Hashtag[],
        description: string
    ) => (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="font-medium">{title}</h4>
                <span className="text-xs text-muted-foreground">{description}</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {tags.map((hashtag) => (
                    <Badge
                        key={hashtag.tag}
                        variant="outline"
                        className={cn(
                            "cursor-pointer transition-colors text-sm py-1.5 px-3",
                            getCategoryColor(hashtag.category),
                            !isPremium && "opacity-75"
                        )}
                        onClick={() => handleCopySingle(hashtag.tag)}
                    >
                        <Hash className="mr-1 h-3 w-3" />
                        {hashtag.tag}
                    </Badge>
                ))}
            </div>
        </div>
    );

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <span className="text-2xl">#️⃣</span>
                        Hashtags With Momentum
                    </CardTitle>
                    <Button
                        size="sm"
                        variant={copied ? "default" : "outline"}
                        className="gap-2"
                        onClick={handleCopyAll}
                    >
                        {copied ? (
                            <>
                                <Check className="h-4 w-4" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="h-4 w-4" />
                                Copy All Hashtags
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {renderTagGroup("Broad", broadTags, "High volume, wide reach")}
                {renderTagGroup("Medium", mediumTags, "Balanced reach & relevance")}
                {renderTagGroup("Niche", nicheTags, "Targeted, high engagement")}

                {/* Usage Tip */}
                <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Pro tip:</strong> Use 3-4 from each category.
                        Start with niche hashtags for engaged viewers, add medium for discovery,
                        and 1-2 broad for maximum reach.
                    </p>
                </div>

                {/* Upgrade CTA for Free Users */}
                {!isPremium && (
                    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                            Upgrade to copy hashtags and access weekly refreshed data
                        </p>
                        <Button size="sm" className="gap-2" asChild>
                            <a href="/pricing">
                                <Zap className="h-4 w-4" />
                                Upgrade Now
                            </a>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
