"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Mail } from "lucide-react";
import { signIn } from "next-auth/react";

export default function AffiliateLoginPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            setError("Please enter your email");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn("email", {
                email,
                callbackUrl: "/affiliate/dashboard",
                redirect: false,
            });

            if (result?.error) {
                throw new Error("Failed to send login link");
            }

            setEmailSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-pink-950/30 p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-8 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto">
                            <Mail className="h-8 w-8 text-violet-600" />
                        </div>
                        <h2 className="text-2xl font-bold">Check Your Email</h2>
                        <p className="text-muted-foreground">
                            We&apos;ve sent a login link to <strong>{email}</strong>.
                            Click it to access your affiliate dashboard.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => setEmailSent(false)}
                            className="mt-4"
                        >
                            Use a different email
                        </Button>
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
                    <Badge className="bg-violet-600 text-white mb-4">Affiliate Portal</Badge>
                    <h1 className="text-3xl font-bold">Welcome Back</h1>
                    <p className="text-muted-foreground mt-2">
                        Sign in to your affiliate dashboard
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Affiliate Sign In</CardTitle>
                        <CardDescription>
                            Enter your email to receive a login link
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <Button
                                type="submit"
                                disabled={isLoading || !email}
                                className="w-full h-12"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Send Login Link
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an affiliate account?{" "}
                    <Link href="/affiliate/register" className="text-violet-600 hover:underline font-medium">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}
