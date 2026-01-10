import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Send } from "lucide-react";

export const metadata = {
    title: "Contact Us – Progressly Affiliate",
    description: "Get in touch with our affiliate team",
};

export default function AffiliateContactPage() {
    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Contact Us</h1>
                <p className="text-muted-foreground">
                    Have questions about the affiliate program? We're here to help.
                </p>
            </div>

            {/* Contact Options */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-violet-600" />
                            Email Us
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            For general inquiries or support, email us directly.
                        </p>
                        <Button asChild className="w-full">
                            <a href="mailto:affiliates@progressly.to">
                                <Send className="h-4 w-4 mr-2" />
                                affiliates@progressly.to
                            </a>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-violet-600" />
                            Support Ticket
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            Create a support ticket for detailed assistance.
                        </p>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/dashboard/tickets">
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Open a Ticket
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* FAQ */}
            <Card>
                <CardHeader>
                    <CardTitle>Common Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="font-semibold">When do I get paid?</h3>
                        <p className="text-sm text-muted-foreground">
                            Payouts are processed monthly via PayPal. You can request a payout once you reach the $50 minimum threshold.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold">How do I track my referrals?</h3>
                        <p className="text-sm text-muted-foreground">
                            Your dashboard shows real-time stats including clicks, signups, and conversions.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold">Can I change my PayPal email?</h3>
                        <p className="text-sm text-muted-foreground">
                            Yes, contact us via email with your new PayPal address and we'll update it.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
