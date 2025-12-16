"use client";

import { Bookmark, Lock, Zap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SavedAnalysesListProps {
    userId: string;
    plan: "free" | "starter" | "pro";
}

export function SavedAnalysesList({ userId, plan }: SavedAnalysesListProps) {
    const isPremium = plan !== "free";

    // In production, fetch from database
    const savedAnalyses: any[] = [];

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
                        Run an analysis from the dashboard and save it to access it here later.
                    </p>
                    <Button variant="outline" asChild>
                        <a href="/dashboard">Go to Dashboard</a>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedAnalyses.map((analysis) => (
                <Card key={analysis.id} className="group relative">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                            <Badge variant="secondary">{analysis.niche}</Badge>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {analysis.hooks?.length || 0} hooks • {analysis.formats?.length || 0} formats
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Saved on {new Date(analysis.savedAt).toLocaleDateString()}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
