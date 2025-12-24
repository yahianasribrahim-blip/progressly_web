"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    DollarSign,
    Users,
    TrendingUp,
    Zap,
    Gift,
    ArrowRight,
    CheckCircle2,
    Calculator,
    HelpCircle,
    Sparkles
} from "lucide-react";

export default function AffiliatePage() {
    const [referrals, setReferrals] = useState(10);
    const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");

    // Calculate earnings
    const monthlyPrice = plan === "monthly" ? 12 : 29;
    const yearlyPrice = plan === "yearly" ? 99 : 249;
    const price = plan === "monthly" ? monthlyPrice : yearlyPrice;
    const commission = price * 0.25;
    const monthlyEarnings = referrals * commission;
    const yearlyEarnings = monthlyEarnings * 12;

    return (
        <>
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-pink-950/30 py-20 md:py-32">
                <div className="container px-4 md:px-6">
                    <div className="flex flex-col items-center text-center gap-6 max-w-4xl mx-auto">
                        <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-1">
                            <Gift className="h-4 w-4 mr-2" />
                            Affiliate Program
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                            Earn <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">25% Recurring</span> Commission
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl">
                            Join our affiliate program and earn passive income by sharing Progressly with fellow creators.
                            Get paid every month for as long as your referrals stay subscribed.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 mt-4">
                            <Button size="lg" className="h-14 px-8 text-lg" asChild>
                                <Link href="/login?redirect=/dashboard/affiliate">
                                    Become an Affiliate
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg" asChild>
                                <Link href="#how-it-works">
                                    Learn More
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 border-b">
                <div className="container px-4 md:px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <p className="text-4xl font-bold text-violet-600">25%</p>
                            <p className="text-muted-foreground">Commission Rate</p>
                        </div>
                        <div className="text-center">
                            <p className="text-4xl font-bold text-violet-600">30</p>
                            <p className="text-muted-foreground">Day Cookie</p>
                        </div>
                        <div className="text-center">
                            <p className="text-4xl font-bold text-violet-600">$50</p>
                            <p className="text-muted-foreground">Min. Payout</p>
                        </div>
                        <div className="text-center">
                            <p className="text-4xl font-bold text-violet-600">Monthly</p>
                            <p className="text-muted-foreground">Payouts</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-20">
                <div className="container px-4 md:px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Start earning in three simple steps
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <Card className="relative border-2 hover:border-violet-500/50 transition-colors">
                            <div className="absolute -top-4 left-6">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold">
                                    1
                                </div>
                            </div>
                            <CardHeader className="pt-8">
                                <Users className="h-10 w-10 text-violet-600 mb-4" />
                                <CardTitle>Sign Up</CardTitle>
                                <CardDescription>
                                    Create your free Progressly account and apply for the affiliate program.
                                    We&apos;ll review your application within 24 hours.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                        <Card className="relative border-2 hover:border-violet-500/50 transition-colors">
                            <div className="absolute -top-4 left-6">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold">
                                    2
                                </div>
                            </div>
                            <CardHeader className="pt-8">
                                <Zap className="h-10 w-10 text-violet-600 mb-4" />
                                <CardTitle>Share Your Link</CardTitle>
                                <CardDescription>
                                    Get your unique referral link and share it with your audience.
                                    Use it in your bio, videos, or content.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                        <Card className="relative border-2 hover:border-violet-500/50 transition-colors">
                            <div className="absolute -top-4 left-6">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold">
                                    3
                                </div>
                            </div>
                            <CardHeader className="pt-8">
                                <DollarSign className="h-10 w-10 text-violet-600 mb-4" />
                                <CardTitle>Earn Commission</CardTitle>
                                <CardDescription>
                                    Earn 25% of every payment from users who sign up through your link.
                                    Get paid monthly via PayPal.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Earnings Calculator */}
            <section className="py-20 bg-muted/50">
                <div className="container px-4 md:px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            <Calculator className="inline-block h-10 w-10 mr-3 text-violet-600" />
                            Earnings Calculator
                        </h2>
                        <p className="text-xl text-muted-foreground">
                            See how much you could earn
                        </p>
                    </div>
                    <Card className="max-w-2xl mx-auto">
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-4">
                                <label className="text-sm font-medium">Referrals per month</label>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={referrals}
                                        onChange={(e) => setReferrals(parseInt(e.target.value))}
                                        className="flex-1"
                                    />
                                    <span className="text-2xl font-bold text-violet-600 w-16 text-right">
                                        {referrals}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Plan type</label>
                                <div className="flex gap-4">
                                    <Button
                                        variant={plan === "monthly" ? "default" : "outline"}
                                        onClick={() => setPlan("monthly")}
                                        className="flex-1"
                                    >
                                        Monthly ($12-29)
                                    </Button>
                                    <Button
                                        variant={plan === "yearly" ? "default" : "outline"}
                                        onClick={() => setPlan("yearly")}
                                        className="flex-1"
                                    >
                                        Yearly ($99-249)
                                    </Button>
                                </div>
                            </div>
                            <div className="pt-6 border-t grid grid-cols-2 gap-6">
                                <div className="text-center p-4 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Monthly Earnings</p>
                                    <p className="text-3xl font-bold text-violet-600">
                                        ${monthlyEarnings.toFixed(0)}
                                    </p>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Yearly Earnings</p>
                                    <p className="text-3xl font-bold text-violet-600">
                                        ${yearlyEarnings.toFixed(0)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Benefits */}
            <section className="py-20">
                <div className="container px-4 md:px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Join Our Program?</h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: TrendingUp,
                                title: "Recurring Revenue",
                                description: "Earn 25% every month for as long as your referrals stay subscribed."
                            },
                            {
                                icon: DollarSign,
                                title: "High Commission",
                                description: "One of the highest commission rates in the creator tools space."
                            },
                            {
                                icon: Sparkles,
                                title: "Product That Sells",
                                description: "Creators love Progressly. High conversion rates mean more earnings for you."
                            },
                            {
                                icon: CheckCircle2,
                                title: "Real-Time Tracking",
                                description: "See clicks, signups, and conversions in your affiliate dashboard."
                            },
                            {
                                icon: Gift,
                                title: "Monthly Payouts",
                                description: "Fast, reliable monthly payouts via PayPal with $50 minimum."
                            },
                            {
                                icon: Users,
                                title: "Dedicated Support",
                                description: "Get help from our team whenever you need it."
                            }
                        ].map((benefit, idx) => (
                            <div key={idx} className="flex gap-4 p-4">
                                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 h-fit">
                                    <benefit.icon className="h-6 w-6 text-violet-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">{benefit.title}</h3>
                                    <p className="text-muted-foreground text-sm">{benefit.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 bg-muted/50">
                <div className="container px-4 md:px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            <HelpCircle className="inline-block h-10 w-10 mr-3 text-violet-600" />
                            Frequently Asked Questions
                        </h2>
                    </div>
                    <div className="max-w-3xl mx-auto space-y-4">
                        {[
                            {
                                q: "Who can join the affiliate program?",
                                a: "Anyone with a Progressly account can apply! We especially welcome content creators, marketers, and anyone with an audience interested in content creation tools."
                            },
                            {
                                q: "How much can I earn?",
                                a: "You earn 25% of every payment from users who sign up through your referral link. This is recurring, meaning you earn every month they stay subscribed."
                            },
                            {
                                q: "When do I get paid?",
                                a: "Payouts are processed monthly via PayPal. You can request a payout once you reach the $50 minimum threshold."
                            },
                            {
                                q: "How long does the cookie last?",
                                a: "Our referral cookie lasts 30 days. If someone clicks your link and signs up within 30 days, you get credit for the referral."
                            },
                            {
                                q: "Can I promote Progressly on social media?",
                                a: "Absolutely! You can share your affiliate link on TikTok, Instagram, YouTube, Twitter, and any other platform. Just make sure to disclose it's an affiliate link."
                            }
                        ].map((faq, idx) => (
                            <Card key={idx}>
                                <CardHeader>
                                    <CardTitle className="text-lg">{faq.q}</CardTitle>
                                    <CardDescription className="text-base">
                                        {faq.a}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-violet-600 to-purple-600">
                <div className="container px-4 md:px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to Start Earning?
                    </h2>
                    <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                        Join our affiliate program today and start earning 25% recurring commission on every referral.
                    </p>
                    <Button size="lg" variant="secondary" className="h-14 px-8 text-lg" asChild>
                        <Link href="/login?redirect=/dashboard/affiliate">
                            Apply Now
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </section>
        </>
    );
}
