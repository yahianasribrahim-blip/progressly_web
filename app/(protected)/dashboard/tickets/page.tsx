"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, MessageCircle, Plus, Send, X, ArrowLeft, Trash2, Bell } from "lucide-react";

interface Ticket {
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
    messages: Message[];
}

interface Message {
    id: string;
    content: string;
    isAdmin: boolean;
    createdAt: string;
}

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newMessage, setNewMessage] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const response = await fetch("/api/tickets");
            const data = await response.json();
            if (data.success) {
                setTickets(data.tickets);
            }
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    const createTicket = async () => {
        if (!newTitle.trim() || !newDescription.trim()) return;

        setCreating(true);
        try {
            const response = await fetch("/api/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle, description: newDescription }),
            });
            const data = await response.json();
            if (data.success) {
                setTickets([data.ticket, ...tickets]);
                setShowNewTicket(false);
                setNewTitle("");
                setNewDescription("");
                setSelectedTicket(data.ticket);
            }
        } catch (error) {
            console.error("Error creating ticket:", error);
        } finally {
            setCreating(false);
        }
    };

    const sendMessage = async () => {
        if (!selectedTicket || !newMessage.trim()) return;

        setSendingMessage(true);
        try {
            const response = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newMessage }),
            });
            const data = await response.json();
            if (data.success) {
                const updatedTicket = {
                    ...selectedTicket,
                    messages: [...selectedTicket.messages, data.message],
                };
                setSelectedTicket(updatedTicket);
                setTickets(tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t));
                setNewMessage("");
            }
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setSendingMessage(false);
        }
    };

    const closeTicket = async () => {
        if (!selectedTicket) return;

        try {
            const response = await fetch(`/api/tickets/${selectedTicket.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "closed" }),
            });
            if (response.ok) {
                setSelectedTicket({ ...selectedTicket, status: "closed" });
                setTickets(tickets.map(t =>
                    t.id === selectedTicket.id ? { ...t, status: "closed" } : t
                ));
            }
        } catch (error) {
            console.error("Error closing ticket:", error);
        }
    };

    const deleteTicket = async (ticketId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this ticket?")) return;

        setDeleting(ticketId);
        try {
            const response = await fetch(`/api/tickets/${ticketId}`, {
                method: "DELETE",
            });
            if (response.ok) {
                setTickets(tickets.filter(t => t.id !== ticketId));
                if (selectedTicket?.id === ticketId) {
                    setSelectedTicket(null);
                }
            }
        } catch (error) {
            console.error("Error deleting ticket:", error);
        } finally {
            setDeleting(null);
        }
    };

    // Check if ticket has unread admin reply (last message is from admin)
    const hasUnreadAdminReply = (ticket: Ticket) => {
        if (ticket.messages.length === 0) return false;
        const lastMessage = ticket.messages[ticket.messages.length - 1];
        return lastMessage.isAdmin;
    };

    // Get last message preview
    const getLastMessagePreview = (ticket: Ticket) => {
        if (ticket.messages.length === 0) return null;
        const lastMessage = ticket.messages[ticket.messages.length - 1];
        return {
            content: lastMessage.content.length > 60
                ? lastMessage.content.substring(0, 60) + "..."
                : lastMessage.content,
            isAdmin: lastMessage.isAdmin,
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Ticket detail view
    if (selectedTicket) {
        return (
            <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setSelectedTicket(null)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Tickets
                    </Button>
                    <div className="flex gap-2">
                        {selectedTicket.status === "open" && (
                            <Button variant="outline" onClick={closeTicket}>
                                <X className="h-4 w-4 mr-2" />
                                Close Ticket
                            </Button>
                        )}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-xl">{selectedTicket.title}</CardTitle>
                                <CardDescription className="mt-2 text-base">
                                    {selectedTicket.description}
                                </CardDescription>
                            </div>
                            <Badge variant={selectedTicket.status === "open" ? "default" : "secondary"}>
                                {selectedTicket.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Messages */}
                        <div className="border rounded-lg p-6 min-h-[350px] max-h-[500px] overflow-y-auto space-y-4">
                            {selectedTicket.messages.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    No messages yet. Send a message to start the conversation.
                                </p>
                            ) : (
                                selectedTicket.messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`p-4 rounded-lg max-w-[75%] ${msg.isAdmin
                                                ? "bg-purple-100 dark:bg-purple-900/30 ml-auto"
                                                : "bg-muted"
                                            }`}
                                    >
                                        <p className="text-sm">{msg.content}</p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {msg.isAdmin ? "Support Team" : "You"} • {new Date(msg.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Send message */}
                        {selectedTicket.status === "open" && (
                            <div className="flex gap-3">
                                <Input
                                    placeholder="Type your message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && !sendingMessage && sendMessage()}
                                    className="flex-1"
                                />
                                <Button onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()} size="lg">
                                    {sendingMessage ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                        <MessageCircle className="h-7 w-7 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Support Tickets</h1>
                        <p className="text-muted-foreground">
                            Get help with any issues you&apos;re experiencing
                        </p>
                    </div>
                </div>
                <Button onClick={() => setShowNewTicket(true)} size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    New Ticket
                </Button>
            </div>

            {/* New Ticket Form */}
            {showNewTicket && (
                <Card className="border-blue-200 dark:border-blue-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Open a New Ticket</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="Brief summary of the issue"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the problem in detail..."
                                rows={4}
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={createTicket} disabled={creating || !newTitle.trim() || !newDescription.trim()}>
                                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Create Ticket
                            </Button>
                            <Button variant="outline" onClick={() => setShowNewTicket(false)}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tickets List */}
            {tickets.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No tickets yet</p>
                        <Button variant="outline" className="mt-4" onClick={() => setShowNewTicket(true)}>
                            Open your first ticket
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {tickets.map((ticket) => {
                        const lastMessage = getLastMessagePreview(ticket);
                        const hasNewReply = hasUnreadAdminReply(ticket);

                        return (
                            <Card
                                key={ticket.id}
                                className={`cursor-pointer hover:shadow-md transition-shadow ${hasNewReply ? "border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20" : ""
                                    }`}
                                onClick={() => setSelectedTicket(ticket)}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-lg">{ticket.title}</h3>
                                                {hasNewReply && (
                                                    <Badge className="bg-purple-600 text-white">
                                                        <Bell className="h-3 w-3 mr-1" />
                                                        New Reply
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                                {ticket.description}
                                            </p>
                                            {lastMessage && (
                                                <div className="mt-3 p-2 rounded bg-muted/50 text-sm">
                                                    <span className={`font-medium ${lastMessage.isAdmin ? "text-purple-600" : ""}`}>
                                                        {lastMessage.isAdmin ? "Support: " : "You: "}
                                                    </span>
                                                    <span className="text-muted-foreground">{lastMessage.content}</span>
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {new Date(ticket.createdAt).toLocaleDateString()} • {ticket.messages.length} messages
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={ticket.status === "open" ? "default" : "secondary"}>
                                                {ticket.status}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-red-600"
                                                onClick={(e) => deleteTicket(ticket.id, e)}
                                                disabled={deleting === ticket.id}
                                            >
                                                {deleting === ticket.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
