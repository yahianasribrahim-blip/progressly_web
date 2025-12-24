"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, Trash2, Search, XCircle, CheckCircle } from "lucide-react";

interface Ticket {
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    user: { name: string | null; email: string | null };
    messages: { id: string; content: string; isAdmin: boolean; createdAt: Date }[];
}

interface AdminTicketsProps {
    tickets: Ticket[];
}

export function AdminTickets({ tickets: initialTickets }: AdminTicketsProps) {
    const [tickets, setTickets] = useState(initialTickets);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [replyMessage, setReplyMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [closing, setClosing] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch =
            ticket.title.toLowerCase().includes(search.toLowerCase()) ||
            ticket.user.name?.toLowerCase().includes(search.toLowerCase()) ||
            ticket.user.email?.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "all" || ticket.status === filter;
        return matchesSearch && matchesFilter;
    });

    const openCount = tickets.filter(t => t.status === "open").length;

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
                const updatedTicket = {
                    ...selectedTicket,
                    messages: [...selectedTicket.messages, data.message],
                };
                setSelectedTicket(updatedTicket);
                setTickets(tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t));
                setReplyMessage("");
            }
        } catch (error) {
            console.error("Error sending reply:", error);
        } finally {
            setSending(false);
        }
    };

    const deleteTicket = async (ticketId: string) => {
        if (!confirm("Are you sure you want to delete this ticket?")) return;

        setDeleting(ticketId);
        try {
            const response = await fetch(`/api/admin/tickets/${ticketId}`, {
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

    const closeTicket = async () => {
        if (!selectedTicket) return;

        setClosing(true);
        try {
            const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/close`, {
                method: "POST",
            });
            if (response.ok) {
                const updatedTicket = { ...selectedTicket, status: "closed" };
                setSelectedTicket(updatedTicket);
                setTickets(tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t));
            }
        } catch (error) {
            console.error("Error closing ticket:", error);
        } finally {
            setClosing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Support Tickets</h1>
                    <p className="text-muted-foreground">
                        {openCount} open tickets • {tickets.length} total
                    </p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, name, or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-1">
                    <Button
                        variant={filter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("all")}
                    >
                        All
                    </Button>
                    <Button
                        variant={filter === "open" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("open")}
                    >
                        Open
                    </Button>
                    <Button
                        variant={filter === "closed" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("closed")}
                    >
                        Closed
                    </Button>
                </div>
            </div>

            {/* Tickets Grid */}
            <div className="grid lg:grid-cols-5 gap-6">
                {/* Tickets List - 2 columns */}
                <div className="lg:col-span-2 border rounded-lg overflow-hidden">
                    <div className="bg-muted p-3 font-medium">
                        Tickets ({filteredTickets.length})
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                        {filteredTickets.length === 0 ? (
                            <p className="p-6 text-muted-foreground text-center">No tickets found</p>
                        ) : (
                            filteredTickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedTicket?.id === ticket.id ? "bg-muted" : ""
                                        }`}
                                    onClick={() => setSelectedTicket(ticket)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{ticket.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {ticket.user.name || ticket.user.email}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {ticket.messages.length} messages • {new Date(ticket.updatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end">
                                            <Badge variant={ticket.status === "open" ? "default" : "secondary"}>
                                                {ticket.status}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteTicket(ticket.id);
                                                }}
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
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Ticket Detail - 3 columns */}
                <div className="lg:col-span-3 border rounded-lg overflow-hidden">
                    <div className="bg-muted p-3 font-medium">
                        {selectedTicket ? selectedTicket.title : "Select a ticket"}
                    </div>
                    {selectedTicket ? (
                        <div className="flex flex-col h-[550px]">
                            {/* User Info + Description */}
                            <div className="p-4 border-b bg-muted/30">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{selectedTicket.user.name || "User"}</p>
                                        <p className="text-sm text-muted-foreground">{selectedTicket.user.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={selectedTicket.status === "open" ? "default" : "secondary"}>
                                            {selectedTicket.status}
                                        </Badge>
                                        {selectedTicket.status === "open" && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={closeTicket}
                                                disabled={closing}
                                                className="gap-1"
                                            >
                                                {closing ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="h-3 w-3" />
                                                )}
                                                Close Ticket
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm mt-3">{selectedTicket.description}</p>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {selectedTicket.messages.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No messages yet</p>
                                ) : (
                                    selectedTicket.messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`p-3 rounded-lg text-sm max-w-[80%] ${msg.isAdmin
                                                ? "bg-purple-100 dark:bg-purple-900/30 ml-auto"
                                                : "bg-muted"
                                                }`}
                                        >
                                            <p>{msg.content}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {msg.isAdmin ? "You" : "User"} • {new Date(msg.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Reply */}
                            {selectedTicket.status === "open" && (
                                <div className="p-4 border-t flex gap-3">
                                    <Input
                                        placeholder="Type your reply..."
                                        value={replyMessage}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && !sending && sendReply()}
                                        className="flex-1"
                                    />
                                    <Button onClick={sendReply} disabled={sending || !replyMessage.trim()}>
                                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-12 text-center text-muted-foreground">
                            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            Click a ticket to view details and reply
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
