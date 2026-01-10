"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function ReferralLinkPage() {
    const [affiliate, setAffiliate] = useState<{
        affiliateCode: string;
        firstName: string | null;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchAffiliate = async () => {
            try {
                const res = await fetch("/api/affiliate/me");
                const data = await res.json();
                if (data.affiliate) {
                    setAffiliate(data.affiliate);
                }
            } catch (error) {
                console.error("Error fetching affiliate:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAffiliate();
    }, []);

    const referralLink = affiliate
        ? `${process.env.NEXT_PUBLIC_APP_URL || "https://progressly.to"}/?ref=${affiliate.affiliateCode}`
        : "";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy link");
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 md:p-8 max-w-4xl mx-auto">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                    <div className="h-48 bg-muted rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Your Referral Link</h1>
                <p className="text-muted-foreground">
                    Share this link to earn 25% commission on every referral
                </p>
            </div>

            <Card className="border-violet-500/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-violet-600" />
                        Referral Link
                    </CardTitle>
                    <CardDescription>
                        Anyone who signs up through this link will be tracked as your referral
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <div className="flex-1 p-4 bg-muted rounded-lg font-mono text-sm break-all">
                            {referralLink}
                        </div>
                        <Button onClick={handleCopy} size="lg" className="shrink-0">
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Badge variant="secondary" className="gap-1">
                            Your code: <span className="font-mono">{affiliate?.affiliateCode}</span>
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                            30-day cookie
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5 text-violet-600" />
                        How to Share
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-2">In Your Bio</h3>
                            <p className="text-sm text-muted-foreground">
                                Add your link to your TikTok, Instagram, or YouTube bio.
                            </p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-2">In Content</h3>
                            <p className="text-sm text-muted-foreground">
                                Mention it in your videos with a call to action like &quot;Link in bio&quot;.
                            </p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-2">DMs &amp; Groups</h3>
                            <p className="text-sm text-muted-foreground">
                                Share with creator friends who might benefit from Progressly.
                            </p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-2">Tutorials</h3>
                            <p className="text-sm text-muted-foreground">
                                Create content showing how you use Progressly.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                        <p className="text-5xl font-bold text-violet-600">25%</p>
                        <p className="font-semibold">Recurring Commission</p>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            You earn 25% of every payment your referrals make, for as long as they stay subscribed.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
