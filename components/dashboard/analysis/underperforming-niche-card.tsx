"use client";

import { Lightbulb, TrendingUp, Rocket, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UnderperformingNicheCardProps {
    niche: string;
    contentIdeas: string[];
    onTryAnotherNiche: () => void;
}

export function UnderperformingNicheCard({
    niche,
    contentIdeas,
    onTryAnotherNiche,
}: UnderperformingNicheCardProps) {
    return (
        <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200">
                        Emerging Niche
                    </Badge>
                </div>
                <CardTitle className="text-2xl flex items-center gap-3 mt-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                        <TrendingUp className="h-6 w-6 text-amber-600" />
                    </div>
                    Low Competition Opportunity
                </CardTitle>
                <CardDescription className="text-base">
                    We found limited trending Muslim {niche} content. This means less competition and a chance to be a pioneer in this space!
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Video Ideas Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-600" />
                        <h3 className="font-semibold text-lg">AI-Generated Video Ideas for {niche}</h3>
                    </div>

                    <div className="grid gap-3">
                        {contentIdeas.slice(0, 5).map((idea, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-gray-900 border shadow-sm"
                            >
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-foreground">{idea}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA Section */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onTryAnotherNiche}
                    >
                        Try Another Niche
                    </Button>
                    <Button
                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    >
                        <Rocket className="h-4 w-4 mr-2" />
                        Be A Pioneer - Make These Videos
                    </Button>
                </div>

                {/* Encouragement Note */}
                <p className="text-xs text-muted-foreground text-center italic">
                    "The best time to start a niche is before everyone else discovers it."
                </p>
            </CardContent>
        </Card>
    );
}
