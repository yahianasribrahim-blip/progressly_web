"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Zap, Sparkles, Crown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PricingSectionProps {
    userId?: string;
    subscriptionPlan?: any;
}

const PLANS = [
    {
        id: "free",
        name: "Free",
        description: "For creators just getting started",
        monthlyPrice: 0,
        yearlyPrice: 0,
        originalYearlyPrice: 0,
        icon: Sparkles,
        color: "from-gray-500 to-gray-600",
        cta: "Try Free",
        features: [
            { text: "1 analysis per week", included: true },
            { text: "3 hooks (limited)", included: true },
            { text: "1 format example", included: true },
            { text: "Example videos", included: false, note: "blurred" },
            { text: "Save analyses", included: false },
            { text: "Copy to clipboard", included: false },
            { text: "Refresh button", included: false },
        ],
    },
    {
        id: "starter",
        name: "Starter",
        description: "Perfect for growing creators",
        monthlyPrice: 29,
        yearlyPrice: 290,
        originalYearlyPrice: 350, // Shows the "original" price crossed out
        icon: Zap,
        color: "from-blue-500 to-indigo-600",
        cta: "Start Posting With Confidence",
        popular: true,
        features: [
            { text: "3 analyses per week", included: true },
            { text: "All hooks (10+)", included: true },
            { text: "All format examples", included: true },
            { text: "Example videos", included: true },
            { text: "Save up to 10 analyses", included: true },
            { text: "Copy to clipboard", included: true },
            { text: "Weekly refreshed data", included: true },
        ],
    },
    {
        id: "pro",
        name: "Pro",
        description: "For serious content creators",
        monthlyPrice: 79,
        yearlyPrice: 790,
        originalYearlyPrice: 950, // Shows the "original" price crossed out
        icon: Crown,
        color: "from-violet-500 to-purple-600",
        cta: "Remove Guesswork Completely",
        features: [
            { text: "1 analysis per day", included: true },
            { text: "Everything in Starter", included: true },
            { text: "Daily refreshed trends", included: true },
            { text: "Unlimited saved analyses", included: true },
            { text: "Faster analysis generation", included: true },
            { text: "Early access to new features", included: true },
            { text: "Priority support", included: true },
        ],
    },
];

export function PricingSection({ userId, subscriptionPlan }: PricingSectionProps) {
    const [isAnnual, setIsAnnual] = useState(false);

    const savings = 17; // 17% savings on annual

    return (
        <div className="container space-y-12">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                    Simple, Transparent Pricing
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Choose the plan that matches your content creation goals
                </p>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
                <Label
                    htmlFor="billing-toggle"
                    className={cn(
                        "text-sm font-medium cursor-pointer",
                        !isAnnual && "text-foreground",
                        isAnnual && "text-muted-foreground"
                    )}
                >
                    Monthly
                </Label>
                <Switch
                    id="billing-toggle"
                    checked={isAnnual}
                    onCheckedChange={setIsAnnual}
                />
                <Label
                    htmlFor="billing-toggle"
                    className={cn(
                        "text-sm font-medium cursor-pointer flex items-center gap-2",
                        isAnnual && "text-foreground",
                        !isAnnual && "text-muted-foreground"
                    )}
                >
                    Annual
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                        Save {savings}%
                    </Badge>
                </Label>
            </div>

            {/* Pricing Cards */}
            <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
                {PLANS.map((plan) => {
                    const Icon = plan.icon;
                    const price = isAnnual ? plan.yearlyPrice : plan.monthlyPrice;
                    const period = isAnnual ? "/year" : "/month";

                    return (
                        <Card
                            key={plan.id}
                            className={cn(
                                "relative overflow-hidden transition-all hover:shadow-lg",
                                plan.popular && "border-2 border-primary shadow-lg scale-105"
                            )}
                        >
                            {/* Popular Badge */}
                            {plan.popular && (
                                <div className="absolute top-0 right-0">
                                    <Badge className="rounded-none rounded-bl-lg bg-primary">
                                        Most Popular
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="text-center pb-2">
                                {/* Icon */}
                                <div
                                    className={cn(
                                        "mx-auto w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br",
                                        plan.color
                                    )}
                                >
                                    <Icon className="h-7 w-7 text-white" />
                                </div>

                                <CardTitle className="text-2xl mt-4">{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>

                                {/* Price */}
                                <div className="pt-4 flex items-baseline justify-center gap-2">
                                    {/* Show original price crossed out for yearly paid plans */}
                                    {isAnnual && plan.originalYearlyPrice > 0 && (
                                        <span className="text-2xl font-medium text-muted-foreground/50 line-through">
                                            ${plan.originalYearlyPrice}
                                        </span>
                                    )}
                                    <span className="text-5xl font-bold">
                                        ${price}
                                    </span>
                                    {price > 0 && (
                                        <span className="text-muted-foreground">{period}</span>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {/* Features */}
                                <ul className="space-y-3">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            {feature.included ? (
                                                <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                                            ) : (
                                                <X className="h-5 w-5 text-muted-foreground/50 shrink-0 mt-0.5" />
                                            )}
                                            <span className={cn(
                                                "text-sm",
                                                !feature.included && "text-muted-foreground line-through"
                                            )}>
                                                {feature.text}
                                                {feature.note && (
                                                    <span className="text-muted-foreground"> ({feature.note})</span>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <Button
                                    className={cn(
                                        "w-full",
                                        plan.popular && "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                                    )}
                                    variant={plan.popular ? "default" : "outline"}
                                    size="lg"
                                    asChild
                                >
                                    <Link href={userId ? "/dashboard/billing" : "/register"}>
                                        {plan.cta}
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Disclaimer */}
            <div className="max-w-2xl mx-auto">
                <div className="flex items-start gap-3 rounded-lg bg-muted/50 border p-4">
                    <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Important:</strong> Progressly does not guarantee virality.
                        It shows patterns from content that is already performing. Your results depend on
                        execution quality, consistency, and audience engagement.
                    </p>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="max-w-3xl mx-auto space-y-8">
                <h2 className="text-2xl font-bold text-center">Frequently Asked Questions</h2>

                <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-2">What counts as an "analysis"?</h3>
                        <p className="text-sm text-muted-foreground">
                            Each time you click "Analyze My Niche" and generate fresh hooks, formats,
                            and hashtags, that counts as one analysis. The results remain visible until
                            you run a new analysis.
                        </p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-2">When do my analysis credits reset?</h3>
                        <p className="text-sm text-muted-foreground">
                            Free and Starter plans reset weekly (every Sunday). Pro plan resets daily at midnight.
                        </p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                        <p className="text-sm text-muted-foreground">
                            Yes! You can cancel your subscription at any time. You'll continue to have
                            access until the end of your billing period.
                        </p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-2">Is my data secure?</h3>
                        <p className="text-sm text-muted-foreground">
                            Absolutely. We use industry-standard encryption and never share your data
                            with third parties. Your saved analyses are private to your account.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
