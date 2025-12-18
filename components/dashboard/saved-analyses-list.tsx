"use client";

import { useEffect, useState } from "react";
import { Bookmark, Lock, Zap, Trash2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SavedAnalysis {
    id: string;
    niche: string;
    data: {
        hooks?: { text: string }[];
        formats?: { name: string }[];
        hashtags?: { tag: string }[];
        aiInsights?: {
            summary?: string;
            contentIdeas?: string[];
        };
        savedAt?: string;
    };
    savedAt: string;
}

interface SavedAnalysesListProps {
    userId: string;
    plan: "free" | "starter" | "pro";
}

export function SavedAnalysesList({ userId, plan }: SavedAnalysesListProps) {
    const isPremium = plan !== "free";
    const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const fetchSavedAnalyses = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/analysis/save");
            if (response.ok) {
                const data = await response.json();
                setSavedAnalyses(data.analyses || []);
            }
        } catch (error) {
            console.error("Error fetching saved analyses:", error);
            toast.error("Failed to load saved analyses");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setIsDeleting(id);
        try {
            const response = await fetch(`/api/analysis/save?id=${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                setSavedAnalyses((prev) => prev.filter((a) => a.id !== id));
                toast.success("Analysis deleted");
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            console.error("Error deleting analysis:", error);
            toast.error("Failed to delete analysis");
        } finally {
            setIsDeleting(null);
        }
    };

    useEffect(() => {
        if (isPremium) {
            fetchSavedAnalyses();
        } else {
            setIsLoading(false);
        }
    }, [isPremium]);

    if (!isPremium) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="rounded-full bg-muted p-4 mb-4">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                        Saving Analyses is a Premium Feature
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        Upgrade to Starter or Pro plan to save your analyses and access them anytime.
                    </p>
                    <Button className="gap-2" asChild>
                        <a href="/pricing">
                            <Zap className="h-4 w-4" />
                            View Pricing
                        </a>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Loading saved analyses...</p>
                </CardContent>
            </Card>
        );
    }

    if (savedAnalyses.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="rounded-full bg-muted p-4 mb-4">
                        <Bookmark className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                        No Saved Analyses Yet
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        Run an analysis from the dashboard and click &quot;Save Analysis&quot; to access it here later.
                    </p>
                    <Button variant="outline" asChild>
                        <a href="/dashboard">Go to Dashboard</a>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={fetchSavedAnalyses} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savedAnalyses.map((analysis) => (
                    <Card key={analysis.id} className="group relative hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <Badge variant="secondary" className="capitalize">
                                    {analysis.niche}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDelete(analysis.id)}
                                    disabled={isDeleting === analysis.id}
                                >
                                    {isDeleting === analysis.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                    )}
                                </Button>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">
                                    {analysis.data?.hooks?.length || 0} hooks • {analysis.data?.formats?.length || 0} formats
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {analysis.data?.hashtags?.length || 0} hashtags
                                </p>
                            </div>
                            {analysis.data?.aiInsights?.summary && (
                                <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                                    {analysis.data.aiInsights.summary}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-3">
                                Saved on {new Date(analysis.savedAt).toLocaleDateString()}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
