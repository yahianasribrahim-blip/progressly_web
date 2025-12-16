"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

interface PlanBadgeProps {
    plan: "free" | "starter" | "pro";
    expanded?: boolean;
}

export function PlanBadge({ plan, expanded = true }: PlanBadgeProps) {
    const planLabels = {
        free: "Free Plan",
        starter: "Starter Plan",
        pro: "Pro Plan",
    };

    if (!expanded) {
        return (
            <Link href="/pricing" className="block">
                <div className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 transition-all cursor-pointer">
                    <Sparkles className="h-4 w-4 text-white" />
                </div>
            </Link>
        );
    }

    return (
        <Link href="/pricing" className="block">
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 p-[1px] transition-all hover:shadow-lg hover:shadow-violet-500/25">
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-600/90 to-purple-600/90 px-4 py-3 transition-all group-hover:from-violet-600 group-hover:to-purple-600">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-white">
                            {planLabels[plan]}
                        </p>
                        <p className="text-xs text-white/70">
                            {plan === "free" ? "Click to upgrade" : "View plans"}
                        </p>
                    </div>
                </div>
            </div>
        </Link>
    );
}
