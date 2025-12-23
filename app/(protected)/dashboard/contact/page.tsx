"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, Check, AlertCircle } from "lucide-react";

export default function ContactPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
            setError("Please fill in all fields");
            return;
        }

        setSending(true);
        setError(null);

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, subject, message }),
            });

            if (response.ok) {
                setSent(true);
                setName("");
                setEmail("");
                setSubject("");
                setMessage("");
            } else {
                setError("Failed to send message. Please try again.");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-teal-500/20">
                    <Mail className="h-6 w-6 text-green-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Contact Us</h1>
                    <p className="text-muted-foreground text-sm">
                        For custom features, integrations, or team discounts
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-900 dark:text-amber-100">
                            Have a problem to resolve?
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            Please <a href="/dashboard/tickets" className="underline font-medium">open a support ticket</a> instead.
                            This form is for business inquiries only.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Contact Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Send us a message</CardTitle>
                    <CardDescription>
                        Use this form for:
                    </CardDescription>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>• Custom feature requests</li>
                        <li>• Custom integrations</li>
                        <li>• Custom enterprise plans</li>
                        <li>• Team discounts (5+ users)</li>
                        <li>• Partnership inquiries</li>
                    </ul>
                </CardHeader>
                <CardContent>
                    {sent ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                <Check className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="font-semibold text-lg">Message Sent!</h3>
                            <p className="text-muted-foreground text-center mt-2">
                                Thank you for reaching out. We&apos;ll get back to you as soon as possible.
                            </p>
                            <Button variant="outline" className="mt-4" onClick={() => setSent(false)}>
                                Send another message
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Your name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input
                                    id="subject"
                                    placeholder="What is this about?"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Tell us more about your request..."
                                    rows={5}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-600">{error}</p>
                            )}

                            <Button type="submit" disabled={sending} className="w-full">
                                {sending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Send Message
                                    </>
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
