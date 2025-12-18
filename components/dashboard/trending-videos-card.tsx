"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play, TrendingUp, ExternalLink, RefreshCw, AlertTriangle } from "lucide-react";
import { Icons } from "@/components/shared/icons";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TrendingVideo {
    id: string;
    description: string;
    creator: string;
    views: number;
    likes: number;
    url: string;
}

interface TrendingVideosCardProps {
    niche: string;
    className?: string;
}

export function TrendingVideosCard({ niche, className }: TrendingVideosCardProps) {
    const [videos, setVideos] = useState<TrendingVideo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [pendingUrl, setPendingUrl] = useState<string | null>(null);

    const formatViews = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(1) + "K";
        return num.toString();
    };

    const fetchTrendingVideos = async () => {
        if (!niche) return;

        setIsLoading(true);
        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ niche }),
            });

            if (response.ok) {
                const data = await response.json();
                // Extract videos from examples
                const trendingVideos = (data.data?.examples || []).map((video: any, index: number) => ({
                    id: video.id || `v${index}`,
                    description: video.description || "",
                    creator: video.creator || "Unknown",
                    views: parseInt(video.views?.replace(/[^0-9]/g, '') || '0') * 1000,
                    likes: 0,
                    url: video.url || "#",
                }));
                setVideos(trendingVideos.slice(0, 6));
            }
        } catch (error) {
            console.error("Error fetching trending videos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVideoClick = (url: string) => {
        setPendingUrl(url);
        setShowDisclaimer(true);
    };

    const confirmOpenVideo = () => {
        if (pendingUrl) {
            window.open(pendingUrl, "_blank", "noopener,noreferrer");
        }
        setShowDisclaimer(false);
        setPendingUrl(null);
    };

    useEffect(() => {
        if (niche) {
            fetchTrendingVideos();
        } else {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [niche]);

    if (!niche) {
        return null;
    }

    return (
        <>
            <Card className={cn("", className)}>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <TrendingUp className="h-5 w-5 text-rose-500" />
                            Trending in {niche.charAt(0).toUpperCase() + niche.slice(1)}
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchTrendingVideos}
                            disabled={isLoading}
                            className="gap-1"
                        >
                            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : videos.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No trending videos found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {videos.map((video, index) => (
                                <div
                                    key={video.id}
                                    className="group flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                                >
                                    {/* Rank */}
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-sm font-bold text-white">
                                        {index + 1}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium line-clamp-2 mb-1">
                                            {video.description || "Trending video"}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{video.creator}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Play className="h-3 w-3" />
                                                {formatViews(video.views)} views
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleVideoClick(video.url)}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Music Disclaimer Dialog */}
            <Dialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                            <AlertTriangle className="h-5 w-5" />
                            Important Reminder
                        </DialogTitle>
                        <DialogDescription className="text-left pt-4 space-y-3">
                            <p>
                                According to the majority of scholars, <strong>music with instruments is considered haram</strong>.
                                Many trending videos contain music that may not align with Islamic values.
                            </p>
                            <p>
                                We strongly encourage you to <strong>avoid using music in your content</strong>.
                                Barakah (blessing) comes from following Allah&apos;s guidance, not from chasing views.
                            </p>
                            <p className="text-sm text-muted-foreground italic">
                                This video is shown for educational reference only.
                            </p>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDisclaimer(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmOpenVideo}
                            className="w-full sm:w-auto"
                        >
                            I Understand, Open Video
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
