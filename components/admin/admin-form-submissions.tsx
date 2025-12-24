"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronUp, User, Calendar, Video, MapPin, Users, Clock } from "lucide-react";

interface CreatorSetup {
    id: string;
    profileId: string;
    teamSize: number;
    primaryDevice: string | null;
    hasExternalMic: boolean;
    hasLighting: boolean;
    hasGreenScreen: boolean;
    availableProps: string[];
    filmingLocations: string[];
    hoursPerVideo: number;
    videosPerWeek: number;
    isMuslimCreator: boolean;
    prefersNoMusic: boolean;
    targetAudience: string;
    experienceLevel: string;
    contentActivity: string | null;
    filmingStyle: string | null;
    resourcesAccess: string | null;
    contentConstraints: string | null;
    contentNiche: string | null;
    createdAt: Date;
    user: {
        name: string | null;
        email: string | null;
    };
}

interface AdminFormSubmissionsProps {
    submissions: CreatorSetup[];
}

export function AdminFormSubmissions({ submissions: initialSubmissions }: AdminFormSubmissionsProps) {
    const [submissions] = useState(initialSubmissions);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const filteredSubmissions = submissions.filter(sub =>
        sub.user.name?.toLowerCase().includes(search.toLowerCase()) ||
        sub.user.email?.toLowerCase().includes(search.toLowerCase()) ||
        sub.contentNiche?.toLowerCase().includes(search.toLowerCase()) ||
        sub.contentActivity?.toLowerCase().includes(search.toLowerCase())
    );

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Form Submissions</h1>
                <p className="text-muted-foreground">
                    {submissions.length} users have completed onboarding
                </p>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name, email, or niche..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Submissions List */}
            <div className="space-y-3">
                {filteredSubmissions.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No form submissions found
                        </CardContent>
                    </Card>
                ) : (
                    filteredSubmissions.map((sub) => (
                        <Card key={sub.id} className="overflow-hidden">
                            {/* Header - Always Visible */}
                            <div
                                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => toggleExpand(sub.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                            {sub.user.name?.charAt(0) || sub.user.email?.charAt(0) || "?"}
                                        </div>
                                        <div>
                                            <p className="font-medium">{sub.user.name || "Unknown"}</p>
                                            <p className="text-sm text-muted-foreground">{sub.user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-sm font-medium truncate max-w-[200px]">
                                                {sub.contentNiche || sub.contentActivity || "No niche set"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(sub.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Badge variant={sub.experienceLevel === "beginner" ? "secondary" : sub.experienceLevel === "intermediate" ? "default" : "outline"}>
                                            {sub.experienceLevel}
                                        </Badge>
                                        {expandedId === sub.id ? (
                                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === sub.id && (
                                <div className="border-t bg-muted/30 p-4">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Content Details */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <Video className="h-4 w-4" />
                                                Content Details
                                            </h3>
                                            <div className="space-y-3 text-sm">
                                                {sub.contentActivity && (
                                                    <div>
                                                        <p className="text-muted-foreground">What they create:</p>
                                                        <p className="font-medium">{sub.contentActivity}</p>
                                                    </div>
                                                )}
                                                {sub.filmingStyle && (
                                                    <div>
                                                        <p className="text-muted-foreground">Filming style:</p>
                                                        <p className="font-medium">{sub.filmingStyle}</p>
                                                    </div>
                                                )}
                                                {sub.contentNiche && (
                                                    <div>
                                                        <p className="text-muted-foreground">Content niche:</p>
                                                        <p className="font-medium">{sub.contentNiche}</p>
                                                    </div>
                                                )}
                                                {sub.resourcesAccess && (
                                                    <div>
                                                        <p className="text-muted-foreground">Resources access:</p>
                                                        <p className="font-medium">{sub.resourcesAccess}</p>
                                                    </div>
                                                )}
                                                {sub.contentConstraints && (
                                                    <div>
                                                        <p className="text-muted-foreground">Constraints:</p>
                                                        <p className="font-medium">{sub.contentConstraints}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Setup & Equipment */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                Setup & Equipment
                                            </h3>
                                            <div className="space-y-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span>Team size: {sub.teamSize === 1 ? "Solo creator" : `${sub.teamSize} people`}</span>
                                                </div>
                                                {sub.primaryDevice && (
                                                    <div className="flex items-center gap-2">
                                                        <Video className="h-4 w-4 text-muted-foreground" />
                                                        <span>Device: {sub.primaryDevice}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span>{sub.hoursPerVideo} hrs/video • {sub.videosPerWeek} videos/week</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {sub.hasExternalMic && <Badge variant="outline" className="text-xs">External Mic</Badge>}
                                                    {sub.hasLighting && <Badge variant="outline" className="text-xs">Lighting</Badge>}
                                                    {sub.hasGreenScreen && <Badge variant="outline" className="text-xs">Green Screen</Badge>}
                                                    {sub.isMuslimCreator && <Badge variant="outline" className="text-xs">Muslim Creator</Badge>}
                                                    {sub.prefersNoMusic && <Badge variant="outline" className="text-xs">No Music</Badge>}
                                                </div>
                                                {sub.filmingLocations.length > 0 && (
                                                    <div>
                                                        <p className="text-muted-foreground flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            Filming locations:
                                                        </p>
                                                        <p className="font-medium">{sub.filmingLocations.join(", ")}</p>
                                                    </div>
                                                )}
                                                {sub.availableProps.length > 0 && (
                                                    <div>
                                                        <p className="text-muted-foreground">Available props:</p>
                                                        <p className="font-medium">{sub.availableProps.join(", ")}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
