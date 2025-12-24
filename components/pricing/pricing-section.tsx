"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Zap, Sparkles, Crown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";
import { generateUserStripe } from "@/actions/generate-user-stripe";
import { env } from "@/env.mjs";

interface PricingSectionProps {
    userId?: string;
    subscriptionPlan?: any;
}

const PLANS = [
    {
        id: "free",
        name: "Free",
        description: "Try out the core features",
        monthlyPrice: 0,
        yearlyPrice: 0,
        originalYearlyPrice: 0,
        icon: Sparkles,
        color: "from-gray-400 to-gray-600",
        cta: "Get Started",
        stripeIds: {
            monthly: null,
            yearly: null,
        },
        features: [
            { text: "3 video analyses/month", included: true },
            { text: "5 optimizations/month", included: true },
            { text: "2 format refreshes/month", included: true },
            { text: "10 saved items", included: true },
            { text: "Save breakdowns", included: false },
            { text: "Priority support", included: false },
        ],
    },
    {
        id: "creator",
        name: "Creator",
        description: "For growing content creators",
        monthlyPrice: 12,
        yearlyPrice: 99,
        originalYearlyPrice: 144, // 12 * 12
        icon: Zap,
        color: "from-blue-500 to-indigo-600",
        cta: "Start Creating",
        popular: true,
        stripeIds: {
            monthly: env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID,
            yearly: env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID,
        },
        features: [
            { text: "20 video analyses/month", included: true },
            { text: "30 optimizations/month", included: true },
            { text: "10 format refreshes/month", included: true },
            { text: "Unlimited saved items", included: true },
            { text: "Save breakdowns", included: true },
            { text: "All trending format details", included: true },
        ],
    },
    {
        id: "pro",
        name: "Pro",
        description: "For serious content creators",
        monthlyPrice: 29,
        yearlyPrice: 249,
        originalYearlyPrice: 348, // 29 * 12
        icon: Crown,
        color: "from-violet-500 to-purple-600",
        cta: "Go Pro",
        stripeIds: {
            monthly: env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID,
            yearly: env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID,
        },
        features: [
            { text: "60 video analyses/month", included: true },
            { text: "Unlimited optimizations", included: true },
            { text: "30 format refreshes/month", included: true },
            { text: "Unlimited saved items", included: true },
            { text: "Priority support", included: true },
            { text: "Early access to new features", included: true },
        ],
    },
];

function PricingButton({
    plan,
    isAnnual,
    userId,
}: {
    plan: typeof PLANS[0];
    isAnnual: boolean;
    userId?: string;
}) {
    const [isPending, startTransition] = useTransition();

    // If no user, link to register
    if (!userId) {
        return (
            <Button
                className={cn(
                    "w-full",
                    plan.popular && "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                )}
                variant={plan.popular ? "default" : "outline"}
                size="lg"
                asChild
            >
                <Link href="/register">{plan.cta}</Link>
            </Button>
        );
    }

    // Free plan - go to dashboard
    if (plan.id === "free") {
        return (
            <Button
                className="w-full"
                variant="outline"
                size="lg"
                asChild
            >
                <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
        );
    }

    // Paid plans - trigger Stripe checkout
    const stripePriceId = isAnnual ? plan.stripeIds.yearly : plan.stripeIds.monthly;

    const handleCheckout = () => {
        if (!stripePriceId) return;

        const generateUserStripeSession = generateUserStripe.bind(null, stripePriceId);
        startTransition(async () => {
            await generateUserStripeSession();
        });
    };

    return (
        <Button
            className={cn(
                "w-full",
                plan.popular && "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            )}
            variant={plan.popular ? "default" : "outline"}
            size="lg"
            disabled={isPending}
            onClick={handleCheckout}
        >
            {isPending ? (
                <>
                    <Icons.spinner className="mr-2 size-4 animate-spin" />
                    Loading...
                </>
            ) : (
                plan.cta
            )}
        </Button>
    );
}

export function PricingSection({ userId, subscriptionPlan }: PricingSectionProps) {
    const [isAnnual, setIsAnnual] = useState(false);

    const savings = 30; // ~30% savings on annual

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
                        "text-sm font-medium transition-colors",
                        !isAnnual ? "text-foreground" : "text-muted-foreground"
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
                        "text-sm font-medium transition-colors",
                        isAnnual ? "text-foreground" : "text-muted-foreground"
                    )}
                >
                    Yearly
                </Label>
                {isAnnual && (
                    <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Save {savings}%
                    </Badge>
                )}
            </div>

            {/* Plans Grid */}
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
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <PricingButton
                                    plan={plan}
                                    isAnnual={isAnnual}
                                    userId={userId}
                                />
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

            {/* Value Propositions - Outcome Focused */}
            <div className="max-w-5xl mx-auto space-y-12 pt-8 border-t">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-3">Stop Guessing. Start Growing.</h2>
                    <p className="text-muted-foreground">The results you&apos;ll actually see</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="text-center space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Zap className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-semibold">Save 5+ Hours Weekly</h3>
                        <p className="text-sm text-muted-foreground">
                            Stop doom-scrolling for inspiration. Get instant breakdowns of what&apos;s working
                            and actionable ideas you can film today.
                        </p>
                    </div>
                    <div className="text-center space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-semibold">Never Run Out of Ideas</h3>
                        <p className="text-sm text-muted-foreground">
                            Turn any video into content ideas tailored to YOUR style and setup.
                            No more staring at a blank screen wondering what to post.
                        </p>
                    </div>
                    <div className="text-center space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <Crown className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-semibold">Post with Confidence</h3>
                        <p className="text-sm text-muted-foreground">
                            Know your hook, script, and thumbnail are optimized BEFORE you post.
                            Stop guessing and start knowing what works.
                        </p>
                    </div>
                </div>

                {/* Before/After Comparison */}
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50">
                        <CardContent className="pt-6">
                            <h3 className="font-semibold mb-3 text-red-700 dark:text-red-400">❌ Without Progressly</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>• Hours scrolling trying to find inspiration</li>
                                <li>• Copying videos without understanding WHY they work</li>
                                <li>• Posting and praying it performs</li>
                                <li>• Running out of ideas after 2 weeks</li>
                                <li>• Inconsistent posting because you don&apos;t know what to make</li>
                            </ul>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50">
                        <CardContent className="pt-6">
                            <h3 className="font-semibold mb-3 text-emerald-700 dark:text-emerald-400">✓ With Progressly</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>• Instant breakdown of any viral video</li>
                                <li>• Personalized ideas based on YOUR filming style</li>
                                <li>• Optimize hooks, scripts, and covers before posting</li>
                                <li>• Endless ideas from trending formats in your niche</li>
                                <li>• Clear shot-by-shot plans you can film immediately</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Problem/Solution Cards */}
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200 dark:border-violet-800/50">
                        <CardContent className="pt-6">
                            <h3 className="font-semibold mb-2">📊 &quot;I found a viral video but don&apos;t know how to make it MY way&quot;</h3>
                            <p className="text-sm text-muted-foreground">
                                Paste any video link → Get a breakdown of why it works → Receive a personalized
                                idea adapted to your equipment, locations, and style.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800/50">
                        <CardContent className="pt-6">
                            <h3 className="font-semibold mb-2">🔥 &quot;I want to know what&apos;s trending before everyone else&quot;</h3>
                            <p className="text-sm text-muted-foreground">
                                Browse trending formats in your niche → See why they&apos;re working →
                                Save them to your Trend Bank and execute when ready.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800/50">
                        <CardContent className="pt-6">
                            <h3 className="font-semibold mb-2">✍️ &quot;My scripts are good but my hooks aren&apos;t grabbing people&quot;</h3>
                            <p className="text-sm text-muted-foreground">
                                Paste your script → Get AI feedback on your hook, pacing, and CTA →
                                Fix weak spots before you waste time filming.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800/50">
                        <CardContent className="pt-6">
                            <h3 className="font-semibold mb-2">🎨 &quot;I don&apos;t know if my thumbnail will make people click&quot;</h3>
                            <p className="text-sm text-muted-foreground">
                                Upload your cover → Get instant feedback on contrast, text, and composition →
                                Maximize your click-through rate before posting.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Bottom CTA */}
                <div className="text-center py-8 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-200 dark:border-violet-800">
                    <h3 className="text-xl font-bold mb-2">Ready to stop guessing?</h3>
                    <p className="text-muted-foreground mb-4">Join creators who know exactly what to post, when to post, and why it works.</p>
                </div>
            </div>


            {/* FAQ Section */}
            <div className="max-w-3xl mx-auto space-y-8">
                <h2 className="text-2xl font-bold text-center">Frequently Asked Questions</h2>

                <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-2">What counts as a &quot;video analysis&quot;?</h3>
                        <p className="text-sm text-muted-foreground">
                            Each time you use the Video Breakdown tool to analyze your content, that counts as one analysis.
                            Cover, Script, and Caption optimizers count toward your monthly optimization limit.
                        </p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-2">When do my credits reset?</h3>
                        <p className="text-sm text-muted-foreground">
                            All plans reset on the 1st of each month. Unused credits do not roll over.
                        </p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                        <p className="text-sm text-muted-foreground">
                            Yes! You can cancel your subscription at any time. You&apos;ll continue to have
                            access until the end of your billing period.
                        </p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-2">What are &quot;optimizations&quot;?</h3>
                        <p className="text-sm text-muted-foreground">
                            Optimizations include Cover Optimizer (thumbnail feedback), Script Optimizer, and Caption Optimizer.
                            These are combined into one monthly limit on Free and Creator plans. Pro gets unlimited.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
