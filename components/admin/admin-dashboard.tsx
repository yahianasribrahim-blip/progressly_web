"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CreditCard, MessageCircle, TrendingUp, Folder, Send, Loader2 } from "lucide-react";

interface Ticket {
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    user: { name: string | null; email: string | null };
    messages: { id: string; content: string; isAdmin: boolean; createdAt: Date | string }[];
}

interface AdminStats {
    totalUsers: number;
    usersThisMonth: number;
    activeSubscriptions: number;
    openTickets: number;
    totalSavedIdeas: number;
    totalSavedTrends: number;
    totalTickets: number;
    subscriptionBreakdown: { stripePriceId: string | null; _count: number }[];
}

interface AdminDashboardProps {
    stats: AdminStats;
    tickets: Ticket[];
}

export function AdminDashboard({ stats, tickets: initialTickets }: AdminDashboardProps) {
    const [tickets, setTickets] = useState(initialTickets);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [replyMessage, setReplyMessage] = useState("");
    const [sending, setSending] = useState(false);

    const sendReply = async () => {
        if (!selectedTicket || !replyMessage.trim()) return;

        setSending(true);
        try {
            const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: replyMessage }),
            });

            if (response.ok) {
                const data = await response.json();
                // Update local state
                setSelectedTicket({
                    ...selectedTicket,
                    messages: [...selectedTicket.messages, data.message],
                });
                setReplyMessage("");
            }
        } catch (error) {
            console.error("Error sending reply:", error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage Progressly and view analytics</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            +{stats.usersThisMonth} this month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
                        <p className="text-xs text-muted-foreground">
                            Paying customers
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.openTickets}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.totalTickets} total tickets
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Content Saved</CardTitle>
                        <Folder className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalSavedIdeas + stats.totalSavedTrends}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.totalSavedIdeas} ideas, {stats.totalSavedTrends} trends
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Subscription Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Subscription Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.subscriptionBreakdown.length === 0 ? (
                        <p className="text-muted-foreground">No active subscriptions yet</p>
                    ) : (
                        <div className="space-y-2">
                            {stats.subscriptionBreakdown.map((sub, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                                    <span className="text-sm font-mono">{sub.stripePriceId || "Free"}</span>
                                    <Badge variant="secondary">{sub._count} users</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tickets Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Support Tickets
                    </CardTitle>
                    <CardDescription>Respond to user support requests</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Tickets List */}
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-muted p-2 font-medium text-sm">All Tickets</div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {tickets.length === 0 ? (
                                    <p className="p-4 text-muted-foreground text-center">No tickets yet</p>
                                ) : (
                                    tickets.map((ticket) => (
                                        <div
                                            key={ticket.id}
                                            className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${selectedTicket?.id === ticket.id ? "bg-muted" : ""
                                                }`}
                                            onClick={() => setSelectedTicket(ticket)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium text-sm">{ticket.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {ticket.user.name || ticket.user.email}
                                                    </p>
                                                </div>
                                                <Badge variant={ticket.status === "open" ? "default" : "secondary"}>
                                                    {ticket.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Ticket Detail */}
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-muted p-2 font-medium text-sm">
                                {selectedTicket ? selectedTicket.title : "Select a ticket"}
                            </div>
                            {selectedTicket ? (
                                <div className="flex flex-col h-[350px]">
                                    {/* Description */}
                                    <div className="p-3 border-b bg-muted/30">
                                        <p className="text-sm">{selectedTicket.description}</p>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                        {selectedTicket.messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`p-2 rounded text-sm max-w-[85%] ${msg.isAdmin
                                                    ? "bg-purple-100 dark:bg-purple-900/30 ml-auto"
                                                    : "bg-muted"
                                                    }`}
                                            >
                                                <p>{msg.content}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {msg.isAdmin ? "You" : "User"} • {new Date(msg.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Reply */}
                                    {selectedTicket.status === "open" && (
                                        <div className="p-2 border-t flex gap-2">
                                            <Input
                                                placeholder="Type your reply..."
                                                value={replyMessage}
                                                onChange={(e) => setReplyMessage(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && !sending && sendReply()}
                                            />
                                            <Button onClick={sendReply} disabled={sending || !replyMessage.trim()}>
                                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground">
                                    Click a ticket to view details
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
