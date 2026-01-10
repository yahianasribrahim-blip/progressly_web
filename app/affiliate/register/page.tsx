"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, DollarSign, ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";

export default function AffiliateRegisterPage() {
    const [step, setStep] = useState<"form" | "creating-account" | "success">("form");
    const [error, setError] = useState<string | null>(null);

    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [hasTikTokFollowing, setHasTikTokFollowing] = useState(false);
    const [tiktokHandle, setTiktokHandle] = useState("");
    const [hasInstagramFollowing, setHasInstagramFollowing] = useState(false);
    const [instagramHandle, setInstagramHandle] = useState("");

    const handleSubmit = async () => {
        if (!email || !firstName || !lastName) {
            setError("Please fill in all required fields");
            return;
        }

        setStep("creating-account");
        setError(null);

        try {
            const res = await fetch("/api/affiliate/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    firstName,
                    lastName,
                    dateOfBirth: dateOfBirth || null,
                    hasTikTokFollowing,
                    tiktokHandle: hasTikTokFollowing ? tiktokHandle : null,
                    hasInstagramFollowing,
                    instagramHandle: hasInstagramFollowing ? instagramHandle : null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create affiliate account");
            }

            setStep("success");

            await signIn("email", {
                email,
                callbackUrl: "/affiliate/dashboard",
                redirect: false,
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setStep("form");
        }
    };

    if (step === "success") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-pink-950/30 p-4">
                <Card className="max-w-md w-full border-green-500/50">
                    <CardContent className="pt-8 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto">
                            <Check className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold">You&apos;re In!</h2>
                        <p className="text-muted-foreground">
                            We&apos;ve sent a login link to <strong>{email}</strong>.
                            Click it to access your affiliate dashboard.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-pink-950/30 p-4">
            <div className="max-w-md w-full space-y-6">
                <div className="text-center">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <span className="font-bold text-xl">Progressly</span>
                    </Link>
                    <Badge className="bg-violet-600 text-white mb-4">Affiliate Program</Badge>
                    <h1 className="text-3xl font-bold">Become an Affiliate</h1>
                    <p className="text-muted-foreground mt-2">
                        Earn 25% recurring commission on every referral
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Create Your Affiliate Account</CardTitle>
                        <CardDescription>
                            Fill out the form below to get started.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name *</Label>
                                <Input
                                    id="firstName"
                                    placeholder="John"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    disabled={step === "creating-account"}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name *</Label>
                                <Input
                                    id="lastName"
                                    placeholder="Doe"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    disabled={step === "creating-account"}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={step === "creating-account"}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dob">Date of Birth</Label>
                            <Input
                                id="dob"
                                type="date"
                                value={dateOfBirth}
                                onChange={(e) => setDateOfBirth(e.target.value)}
                                disabled={step === "creating-account"}
                            />
                        </div>

                        <div className="pt-4 border-t space-y-4">
                            <p className="text-sm font-medium">
                                Do you have a social media following?
                                <span className="text-muted-foreground block text-xs mt-1">
                                    Higher following = more eligible for higher commission rates
                                </span>
                            </p>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={hasTikTokFollowing}
                                        onChange={(e) => setHasTikTokFollowing(e.target.checked)}
                                        className="h-4 w-4 rounded"
                                        disabled={step === "creating-account"}
                                    />
                                    <span className="text-sm">I have a TikTok following</span>
                                </label>
                                {hasTikTokFollowing && (
                                    <Input
                                        placeholder="@yourtiktok"
                                        value={tiktokHandle}
                                        onChange={(e) => setTiktokHandle(e.target.value)}
                                        disabled={step === "creating-account"}
                                        className="ml-6"
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={hasInstagramFollowing}
                                        onChange={(e) => setHasInstagramFollowing(e.target.checked)}
                                        className="h-4 w-4 rounded"
                                        disabled={step === "creating-account"}
                                    />
                                    <span className="text-sm">I have an Instagram following</span>
                                </label>
                                {hasInstagramFollowing && (
                                    <Input
                                        placeholder="@yourinstagram"
                                        value={instagramHandle}
                                        onChange={(e) => setInstagramHandle(e.target.value)}
                                        disabled={step === "creating-account"}
                                        className="ml-6"
                                    />
                                )}
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <Button
                            onClick={handleSubmit}
                            disabled={step === "creating-account" || !email || !firstName || !lastName}
                            className="w-full h-12"
                        >
                            {step === "creating-account" ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    Create Affiliate Account
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-muted-foreground">
                    Already have an affiliate account?{" "}
                    <Link href="/affiliate/login" className="text-violet-600 hover:underline font-medium">
                        Sign in
                    </Link>
                </p>

                <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                        <h3 className="font-semibold mb-3">What you&apos;ll get:</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                25% recurring commission on all payments
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                Unique referral link with 30-day cookie
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                Real-time tracking dashboard
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                Monthly PayPal payouts ($50 minimum)
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
