"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Sparkles } from "lucide-react";

interface UsageBadgeProps {
    type: "optimization" | "analysis" | "formatSearch";
}

interface UsageData {
    used: number;
    limit: number;
    unlimited: boolean;
}

export function UsageBadge({ type }: UsageBadgeProps) {
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsage = async () => {
            try {
                const res = await fetch("/api/usage");
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        switch (type) {
                            case "optimization":
                                setUsage(data.usage.optimizations);
                                break;
                            case "analysis":
                                setUsage(data.usage.analyses);
                                break;
                            case "formatSearch":
                                setUsage(data.usage.formatSearches);
                                break;
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch usage:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsage();
    }, [type]);

    if (loading) {
        return (
            <Badge variant="outline" className="animate-pulse">
                Loading...
            </Badge>
        );
    }

    if (!usage) return null;

    const remaining = usage.unlimited ? -1 : usage.limit - usage.used;
    const Icon = type === "optimization" ? Zap : type === "analysis" ? TrendingUp : Sparkles;

    if (usage.unlimited) {
        return (
            <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                <Icon className="h-3 w-3 mr-1" />
                Unlimited (Pro)
            </Badge>
        );
    }

    const isLow = remaining <= 1;
    const isEmpty = remaining <= 0;

    return (
        <Badge
            variant={isEmpty ? "destructive" : isLow ? "secondary" : "default"}
            className={!isEmpty && !isLow ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white" : ""}
        >
            <Icon className="h-3 w-3 mr-1" />
            {isEmpty ? "No uses left" : `${remaining} ${remaining === 1 ? "use" : "uses"} left`}
        </Badge>
    );
}
