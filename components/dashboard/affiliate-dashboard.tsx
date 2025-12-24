"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    DollarSign,
    Users,
    MousePointerClick,
    TrendingUp,
    Copy,
    Check,
    Loader2,
    Clock,
    CheckCircle,
    XCircle,
    ExternalLink
} from "lucide-react";

interface AffiliateStats {
    clicks: number;
    signups: number;
    conversions: number;
    conversionRate: string;
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
}

interface Referral {
    id: string;
    status: string;
    signedUpAt: string | null;
    convertedAt: string | null;
    userName: string;
}

interface Commission {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
}

interface Payout {
    id: string;
    amount: number;
    status: string;
    requestedAt: string;
    processedAt: string | null;
}

export function AffiliateDashboard() {
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [status, setStatus] = useState<string | null>(null);
    const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
    const [referralLink, setReferralLink] = useState<string | null>(null);
    const [stats, setStats] = useState<AffiliateStats | null>(null);
    const [recentReferrals, setRecentReferrals] = useState<Referral[]>([]);
    const [recentCommissions, setRecentCommissions] = useState<Commission[]>([]);
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [minimumPayout, setMinimumPayout] = useState(50);
    const [commissionRate, setCommissionRate] = useState(25);
    const [paypalEmail, setPaypalEmail] = useState("");

    useEffect(() => {
        fetchAffiliateData();
    }, []);

    const fetchAffiliateData = async () => {
        try {
            // First check if user is an affiliate
            const applyRes = await fetch("/api/affiliate/apply");
            const applyData = await applyRes.json();

            if (!applyData.affiliate) {
                setStatus(null);
                setLoading(false);
                return;
            }

            // If affiliate exists, get full stats
            const statsRes = await fetch("/api/affiliate/stats");
            const statsData = await statsRes.json();

            if (statsData.success) {
                setStatus(statsData.status);
                setAffiliateCode(statsData.affiliateCode);
                setReferralLink(statsData.referralLink);
                setStats(statsData.stats);
                setRecentReferrals(statsData.recentReferrals || []);
                setRecentCommissions(statsData.recentCommissions || []);
                setPayouts(statsData.payouts || []);
                setMinimumPayout(statsData.minimumPayout);
                setCommissionRate(statsData.commissionRate);
                setPaypalEmail(statsData.paypalEmail || "");
            } else {
                setStatus(applyData.affiliate.status);
            }
        } catch (err) {
            console.error("Error fetching affiliate data:", err);
            setError("Failed to load affiliate data");
        } finally {
            setLoading(false);
        }
    };

    const applyForAffiliate = async () => {
        setApplying(true);
        setError(null);
        try {
            const res = await fetch("/api/affiliate/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paypalEmail }),
            });
            const data = await res.json();

            if (data.success) {
                setStatus("pending");
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error("Error applying:", err);
            setError("Failed to submit application");
        } finally {
            setApplying(false);
        }
    };

    const requestPayout = async () => {
        if (!paypalEmail) {
            setError("Please enter your PayPal email");
            return;
        }

        setRequesting(true);
        setError(null);
        try {
            const res = await fetch("/api/affiliate/payouts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paypalEmail }),
            });
            const data = await res.json();

            if (data.success) {
                fetchAffiliateData(); // Refresh data
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error("Error requesting payout:", err);
            setError("Failed to request payout");
        } finally {
            setRequesting(false);
        }
    };

    const copyLink = () => {
        if (referralLink) {
            navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Not an affiliate yet - show application form
    if (!status) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-2">Join Our Affiliate Program</h1>
                    <p className="text-muted-foreground">
                        Earn 25% recurring commission on every referral
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Apply to Become an Affiliate</CardTitle>
                        <CardDescription>
                            Fill out the form below to apply. We&apos;ll review your application within 24 hours.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="paypal">PayPal Email (for payouts)</Label>
                            <Input
                                id="paypal"
                                type="email"
                                placeholder="you@example.com"
                                value={paypalEmail}
                                onChange={(e) => setPaypalEmail(e.target.value)}
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}
                        <Button onClick={applyForAffiliate} disabled={applying} className="w-full">
                            {applying ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit Application"
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                        <h3 className="font-semibold mb-4">What you&apos;ll get:</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" /> 25% recurring commission on all payments
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" /> Unique referral link with 30-day cookie
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" /> Real-time tracking dashboard
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" /> Monthly PayPal payouts ($50 minimum)
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Pending approval
    if (status === "pending") {
        return (
            <div className="max-w-2xl mx-auto">
                <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10">
                    <CardContent className="pt-6 text-center">
                        <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Application Under Review</h2>
                        <p className="text-muted-foreground">
                            Thank you for applying! We&apos;re reviewing your application and will get back to you within 24 hours.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Suspended
    if (status === "suspended") {
        return (
            <div className="max-w-2xl mx-auto">
                <Card className="border-red-500/50 bg-red-50/50 dark:bg-red-950/10">
                    <CardContent className="pt-6 text-center">
                        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Account Suspended</h2>
                        <p className="text-muted-foreground">
                            Your affiliate account has been suspended. Please contact support for more information.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Approved - full dashboard
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
                    <p className="text-muted-foreground">
                        Track your referrals and earnings
                    </p>
                </div>
                <Badge className="bg-green-600 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                </Badge>
            </div>

            {/* Referral Link */}
            <Card className="border-violet-500/50 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1">
                            <p className="text-sm font-medium mb-2">Your Referral Link</p>
                            <div className="flex gap-2">
                                <Input
                                    value={referralLink || ""}
                                    readOnly
                                    className="bg-white dark:bg-gray-900"
                                />
                                <Button onClick={copyLink} variant="outline">
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="text-center md:text-right">
                            <p className="text-sm text-muted-foreground">Commission Rate</p>
                            <p className="text-2xl font-bold text-violet-600">{commissionRate}%</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <MousePointerClick className="h-8 w-8 text-violet-600 mb-2" />
                        <p className="text-3xl font-bold">{stats?.clicks || 0}</p>
                        <p className="text-sm text-muted-foreground">Clicks</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <Users className="h-8 w-8 text-violet-600 mb-2" />
                        <p className="text-3xl font-bold">{stats?.signups || 0}</p>
                        <p className="text-sm text-muted-foreground">Signups</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <TrendingUp className="h-8 w-8 text-violet-600 mb-2" />
                        <p className="text-3xl font-bold">{stats?.conversions || 0}</p>
                        <p className="text-sm text-muted-foreground">Conversions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <DollarSign className="h-8 w-8 text-green-600 mb-2" />
                        <p className="text-3xl font-bold">${stats?.totalEarnings?.toFixed(2) || "0.00"}</p>
                        <p className="text-sm text-muted-foreground">Total Earned</p>
                    </CardContent>
                </Card>
            </div>

            {/* Earnings & Payout */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Earnings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between p-3 bg-muted rounded-lg">
                            <span className="text-muted-foreground">Pending</span>
                            <span className="font-semibold">${stats?.pendingEarnings?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <span className="text-muted-foreground">Paid Out</span>
                            <span className="font-semibold text-green-600">${stats?.paidEarnings?.toFixed(2) || "0.00"}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Request Payout</CardTitle>
                        <CardDescription>Minimum payout: ${minimumPayout}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="payout-email">PayPal Email</Label>
                            <Input
                                id="payout-email"
                                type="email"
                                placeholder="you@example.com"
                                value={paypalEmail}
                                onChange={(e) => setPaypalEmail(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button
                            onClick={requestPayout}
                            disabled={requesting || (stats?.pendingEarnings || 0) < minimumPayout}
                            className="w-full"
                        >
                            {requesting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Requesting...
                                </>
                            ) : (
                                `Request Payout ($${stats?.pendingEarnings?.toFixed(2) || "0.00"})`
                            )}
                        </Button>
                        {(stats?.pendingEarnings || 0) < minimumPayout && (
                            <p className="text-xs text-muted-foreground text-center">
                                Need ${(minimumPayout - (stats?.pendingEarnings || 0)).toFixed(2)} more to request payout
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Referrals */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Referrals</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentReferrals.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No referrals yet. Share your link to get started!</p>
                    ) : (
                        <div className="space-y-3">
                            {recentReferrals.map((ref) => (
                                <div key={ref.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div>
                                        <p className="font-medium">{ref.userName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {ref.signedUpAt && new Date(ref.signedUpAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Badge variant={ref.status === "converted" ? "default" : "secondary"}>
                                        {ref.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payout History */}
            {payouts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Payout History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {payouts.map((payout) => (
                                <div key={payout.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div>
                                        <p className="font-medium">${payout.amount.toFixed(2)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(payout.requestedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Badge
                                        variant={payout.status === "completed" ? "default" :
                                            payout.status === "rejected" ? "destructive" : "secondary"}
                                    >
                                        {payout.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
