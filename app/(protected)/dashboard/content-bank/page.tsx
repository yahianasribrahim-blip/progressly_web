"use client";

import { useState, useEffect } from "react";
import {
    Lightbulb,
    Trash2,
    Loader2,
    Clock,
    Link as LinkIcon,
    CheckCircle,
    PlayCircle,
    Archive,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SavedIdea {
    id: string;
    title: string;
    concept: string;
    shotByShot: unknown;
    tips: string[];
    sourceVideo: string | null;
    status: string;
    notes: string | null;
    createdAt: string;
}

export default function ContentBankPage() {
    const [ideas, setIdeas] = useState<SavedIdea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        fetchIdeas();
    }, [filter]);

    const fetchIdeas = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/ideas?status=${filter}`);
            const data = await response.json();
            if (data.success) {
                setIdeas(data.ideas);
            }
        } catch (error) {
            console.error("Error fetching ideas:", error);
            toast.error("Failed to load ideas");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        setUpdatingId(id);
        try {
            const response = await fetch(`/api/ideas/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                setIdeas(ideas.map(idea =>
                    idea.id === id ? { ...idea, status: newStatus } : idea
                ));
                toast.success(`Marked as ${newStatus}`);
            }
        } catch (error) {
            console.error("Error updating idea:", error);
            toast.error("Failed to update idea");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const response = await fetch(`/api/ideas/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setIdeas(ideas.filter(idea => idea.id !== id));
                toast.success("Idea deleted");
            }
        } catch (error) {
            console.error("Error deleting idea:", error);
            toast.error("Failed to delete idea");
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "saved":
                return <Badge variant="outline" className="text-blue-500 border-blue-500"><Archive className="h-3 w-3 mr-1" />Saved</Badge>;
            case "in_progress":
                return <Badge variant="outline" className="text-amber-500 border-amber-500"><PlayCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
            case "used":
                return <Badge variant="outline" className="text-emerald-500 border-emerald-500"><CheckCircle className="h-3 w-3 mr-1" />Used</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <div className="container max-w-5xl mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Content Bank</h1>
                <p className="text-muted-foreground">
                    Your saved video ideas from Video Breakdown
                </p>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {["all", "saved", "in_progress", "used"].map((status) => (
                    <Button
                        key={status}
                        variant={filter === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter(status)}
                    >
                        {status === "all" ? "All" : status === "in_progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                ))}
            </div>

            {/* Ideas List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : ideas.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No ideas yet</h3>
                        <p className="text-muted-foreground">
                            Generate ideas from Video Breakdown and save them here
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {ideas.map((idea) => (
                        <Card key={idea.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Lightbulb className="h-5 w-5 text-amber-500" />
                                            {idea.title}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(idea.createdAt)}
                                            </span>
                                            {idea.sourceVideo && (
                                                <a
                                                    href={idea.sourceVideo}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-blue-500 hover:underline"
                                                >
                                                    <LinkIcon className="h-3 w-3" />
                                                    Source
                                                </a>
                                            )}
                                        </CardDescription>
                                    </div>
                                    {getStatusBadge(idea.status)}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">{idea.concept}</p>

                                {idea.tips && idea.tips.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium mb-2">Tips</h4>
                                        <ul className="space-y-1">
                                            {idea.tips.slice(0, 3).map((tip, i) => (
                                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                    <span>•</span>
                                                    {tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-2 border-t">
                                    {idea.status !== "in_progress" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleUpdateStatus(idea.id, "in_progress")}
                                            disabled={updatingId === idea.id}
                                        >
                                            {updatingId === idea.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1" />}
                                            Start
                                        </Button>
                                    )}
                                    {idea.status !== "used" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleUpdateStatus(idea.id, "used")}
                                            disabled={updatingId === idea.id}
                                        >
                                            {updatingId === idea.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                            Mark Used
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto"
                                        onClick={() => handleDelete(idea.id)}
                                        disabled={deletingId === idea.id}
                                    >
                                        {deletingId === idea.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
