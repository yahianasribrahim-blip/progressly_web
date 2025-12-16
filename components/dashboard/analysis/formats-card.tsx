"use client";

import { Video, Camera, Type, Clock, Lock, MapPin, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Format } from "@/lib/mock-analysis";

interface FormatsCardProps {
    formats: Format[];
    isPremium: boolean;
    plan: "free" | "starter" | "pro";
}

export function FormatsCard({ formats, isPremium, plan }: FormatsCardProps) {
    const allFormats = [
        ...formats,
        // Show locked formats for free users
        ...(plan === "free" ? [
            { id: "locked-1", name: "🔒 Premium Format", cameraStyle: "", subtitleStyle: "", averageLength: "", whyItWorks: "", environment: "", lighting: "", locked: true },
            { id: "locked-2", name: "🔒 Premium Format", cameraStyle: "", subtitleStyle: "", averageLength: "", whyItWorks: "", environment: "", lighting: "", locked: true },
        ] : []),
    ];

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <span className="text-2xl">🎬</span>
                        Formats That Are Performing
                    </CardTitle>
                    <Badge variant="secondary" className="font-normal">
                        {formats.length} formats
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {allFormats.map((format, index) => {
                    const isLocked = (format as any).locked;

                    return (
                        <div
                            key={format.id}
                            className={cn(
                                "rounded-xl border bg-gradient-to-r from-card to-muted/20 p-5 transition-all",
                                isLocked && "opacity-50"
                            )}
                        >
                            {isLocked ? (
                                <div className="flex items-center justify-center py-8 text-muted-foreground">
                                    <Lock className="mr-2 h-5 w-5" />
                                    <span>Upgrade to unlock more formats</span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Format Name */}
                                    <h3 className="text-lg font-semibold">{format.name}</h3>

                                    {/* Format Details Grid */}
                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-lg bg-blue-500/10 p-2">
                                                <Camera className="h-4 w-4 text-blue-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Camera Style</p>
                                                <p className="text-sm">{format.cameraStyle}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="rounded-lg bg-purple-500/10 p-2">
                                                <Type className="h-4 w-4 text-purple-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Subtitle Style</p>
                                                <p className="text-sm">{format.subtitleStyle}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="rounded-lg bg-amber-500/10 p-2">
                                                <Clock className="h-4 w-4 text-amber-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Average Length</p>
                                                <p className="text-sm">{format.averageLength}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="rounded-lg bg-teal-500/10 p-2">
                                                <MapPin className="h-4 w-4 text-teal-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Environment</p>
                                                <p className="text-sm">{format.environment}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="rounded-lg bg-yellow-500/10 p-2">
                                                <Sun className="h-4 w-4 text-yellow-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Lighting</p>
                                                <p className="text-sm">{format.lighting}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="rounded-lg bg-emerald-500/10 p-2">
                                                <Video className="h-4 w-4 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Why It Works</p>
                                                <p className="text-sm">{format.whyItWorks}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
