"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Users,
    DollarSign,
    Check,
    X,
    Loader2,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    ExternalLink
} from "lucide-react";

interface Affiliate {
    id: string;
    userId: string | null;
    affiliateCode: string;
    status: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    paypalEmail: string | null;
    socialHandle: string | null;
    hasSocialFollowing: boolean;
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
    createdAt: Date;
    user: {
        name: string | null;
        email: string | null;
        image: string | null;
    } | null;
    referrals: { id: string; status: string }[];
    commissions: { id: string; amount: number; status: string }[];
    payouts: { id: string; amount: number; status: string }[];
}

interface Payout {
    id: string;
    amount: number;
    status: string;
    paypalEmail: string;
    requestedAt: Date;
    affiliate: {
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        user: { name: string | null; email: string | null } | null;
    };
}

interface AdminAffiliatesProps {
    affiliates: Affiliate[];
    pendingPayouts: Payout[];
}

export function AdminAffiliates({ affiliates: initialAffiliates, pendingPayouts: initialPayouts }: AdminAffiliatesProps) {
    const [affiliates, setAffiliates] = useState(initialAffiliates);
    const [pendingPayouts, setPendingPayouts] = useState(initialPayouts);
    const [processing, setProcessing] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "pending" | "approved" | "suspended">("all");

    const pendingCount = affiliates.filter(a => a.status === "pending").length;
    const approvedCount = affiliates.filter(a => a.status === "approved").length;
    const totalEarnings = affiliates.reduce((sum, a) => sum + a.totalEarnings, 0);
    const totalPaidOut = affiliates.reduce((sum, a) => sum + a.paidEarnings, 0);

    const filteredAffiliates = filter === "all"
        ? affiliates
        : affiliates.filter(a => a.status === filter);

    const updateAffiliateStatus = async (affiliateId: string, action: "approve" | "suspend") => {
        setProcessing(affiliateId);
        try {
            const res = await fetch(`/api/admin/affiliates/${affiliateId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });

            if (res.ok) {
                setAffiliates(affiliates.map(a =>
                    a.id === affiliateId
                        ? { ...a, status: action === "approve" ? "approved" : "suspended" }
                        : a
                ));
            }
        } catch (error) {
            console.error("Error updating affiliate:", error);
        } finally {
            setProcessing(null);
        }
    };

    const processPayout = async (payoutId: string, action: "complete" | "reject") => {
        setProcessing(payoutId);
        try {
            const res = await fetch(`/api/admin/payouts/${payoutId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });

            if (res.ok) {
                setPendingPayouts(pendingPayouts.filter(p => p.id !== payoutId));
            }
        } catch (error) {
            console.error("Error processing payout:", error);
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Affiliate Management</h1>
                <p className="text-muted-foreground">Manage affiliate applications and payouts</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <Users className="h-8 w-8 text-violet-600 mb-2" />
                        <p className="text-3xl font-bold">{affiliates.length}</p>
                        <p className="text-sm text-muted-foreground">Total Affiliates</p>
                    </CardContent>
                </Card>
                <Card className={pendingCount > 0 ? "border-yellow-500" : ""}>
                    <CardContent className="pt-6">
                        <Clock className="h-8 w-8 text-yellow-600 mb-2" />
                        <p className="text-3xl font-bold">{pendingCount}</p>
                        <p className="text-sm text-muted-foreground">Pending Approval</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
                        <p className="text-3xl font-bold">${totalEarnings.toFixed(0)}</p>
                        <p className="text-sm text-muted-foreground">Total Earned</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <DollarSign className="h-8 w-8 text-blue-600 mb-2" />
                        <p className="text-3xl font-bold">${totalPaidOut.toFixed(0)}</p>
                        <p className="text-sm text-muted-foreground">Paid Out</p>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Payouts */}
            {pendingPayouts.length > 0 && (
                <Card className="border-green-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Pending Payouts ({pendingPayouts.length})
                        </CardTitle>
                        <CardDescription>
                            Process payout requests via PayPal
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {pendingPayouts.map((payout) => (
                                <div key={payout.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                    <div>
                                        <p className="font-semibold">{payout.affiliate.user?.name || payout.affiliate.firstName || "Anonymous"}</p>
                                        <p className="text-sm text-muted-foreground">{payout.paypalEmail}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Requested: {new Date(payout.requestedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="text-2xl font-bold text-green-600">
                                            ${payout.amount.toFixed(2)}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => processPayout(payout.id, "complete")}
                                                disabled={processing === payout.id}
                                            >
                                                {processing === payout.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Check className="h-4 w-4 mr-1" />
                                                        Paid
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => processPayout(payout.id, "reject")}
                                                disabled={processing === payout.id}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Affiliates Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Affiliates</CardTitle>
                        <div className="flex gap-2">
                            {(["all", "pending", "approved", "suspended"] as const).map((f) => (
                                <Button
                                    key={f}
                                    size="sm"
                                    variant={filter === f ? "default" : "outline"}
                                    onClick={() => setFilter(f)}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {filteredAffiliates.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No affiliates found
                            </p>
                        ) : (
                            filteredAffiliates.map((affiliate) => (
                                <div key={affiliate.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                    <div className="flex items-center gap-4">
                                        {affiliate.user?.image && (
                                            <img
                                                src={affiliate.user.image}
                                                alt=""
                                                className="w-10 h-10 rounded-full"
                                            />
                                        )}
                                        <div>
                                            <p className="font-semibold">{affiliate.user?.name || affiliate.firstName || "Anonymous"}</p>
                                            <p className="text-sm text-muted-foreground">{affiliate.user?.email || affiliate.email || "No email"}</p>
                                            <p className="text-xs font-mono text-violet-600">{affiliate.affiliateCode}</p>
                                            {affiliate.socialHandle && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <ExternalLink className="h-3 w-3" />
                                                    {affiliate.socialHandle}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">
                                                {affiliate.referrals.length} referrals •
                                                {affiliate.referrals.filter(r => r.status === "converted").length} converted
                                            </p>
                                            <p className="font-semibold">
                                                ${affiliate.totalEarnings.toFixed(2)} earned
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={
                                                    affiliate.status === "approved" ? "default" :
                                                        affiliate.status === "pending" ? "secondary" : "destructive"
                                                }
                                            >
                                                {affiliate.status}
                                            </Badge>
                                            {affiliate.status === "pending" && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => updateAffiliateStatus(affiliate.id, "approve")}
                                                        disabled={processing === affiliate.id}
                                                    >
                                                        {processing === affiliate.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Check className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => updateAffiliateStatus(affiliate.id, "suspend")}
                                                        disabled={processing === affiliate.id}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            {affiliate.status === "approved" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateAffiliateStatus(affiliate.id, "suspend")}
                                                    disabled={processing === affiliate.id}
                                                >
                                                    Suspend
                                                </Button>
                                            )}
                                            {affiliate.status === "suspended" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateAffiliateStatus(affiliate.id, "approve")}
                                                    disabled={processing === affiliate.id}
                                                >
                                                    Reinstate
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
