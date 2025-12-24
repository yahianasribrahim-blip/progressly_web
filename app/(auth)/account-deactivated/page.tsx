import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle, Clock, Mail } from "lucide-react";

export const metadata = {
    title: "Account Deactivated – Progressly",
    description: "Your account has been deactivated",
};

export default function AccountDeactivatedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                        <AlertTriangle className="h-8 w-8 text-amber-600" />
                    </div>
                    <CardTitle className="text-2xl">Account Deactivated</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-muted-foreground text-center">
                        Your account has been deactivated and is scheduled for permanent deletion.
                    </p>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                            <Clock className="h-5 w-5" />
                            <span className="font-medium">Want to restore your account?</span>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            You have <strong>7 days</strong> from deactivation to restore your account.
                            After that, your account and all data will be permanently deleted.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="text-center text-sm text-muted-foreground">
                            <p className="font-medium mb-1">To restore your account:</p>
                            <p>Contact us and we&apos;ll help you reactivate.</p>
                        </div>

                        <Button asChild className="w-full gap-2">
                            <Link href="/contact">
                                <Mail className="h-4 w-4" />
                                Contact Support
                            </Link>
                        </Button>

                        <Button asChild variant="outline" className="w-full">
                            <Link href="/">
                                Return to Homepage
                            </Link>
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        Need to create a new account? You must wait until your current account
                        is permanently deleted (7 days from deactivation).
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
