"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Trash2, Loader2, Search, Shield, CreditCard } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface User {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    createdAt: Date;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    stripeCurrentPeriodEnd: Date | null;
}

interface UsersManagementProps {
    users: User[];
    currentUserId: string;
}

// Plan key to display name
const PLAN_DISPLAY: Record<string, string> = {
    "free": "Free",
    "creator_monthly": "Creator (Monthly)",
    "creator_yearly": "Creator (Yearly)",
    "pro_monthly": "Pro (Monthly)",
    "pro_yearly": "Pro (Yearly)",
};

export function UsersManagement({ users: initialUsers, currentUserId }: UsersManagementProps) {
    const [users, setUsers] = useState(initialUsers);
    const [search, setSearch] = useState("");
    const [deleting, setDeleting] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())
    );

    const deleteUser = async (userId: string) => {
        if (userId === currentUserId) {
            alert("You cannot delete your own account.");
            return;
        }
        if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;

        setDeleting(userId);
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
            });
            if (response.ok) {
                setUsers(users.filter(u => u.id !== userId));
            } else {
                const data = await response.json();
                alert(data.error || "Failed to delete user");
            }
        } catch (error) {
            console.error("Error deleting user:", error);
        } finally {
            setDeleting(null);
        }
    };

    const updateUserRole = async (userId: string, newRole: string) => {
        setUpdating(userId);
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });
            if (response.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            }
        } catch (error) {
            console.error("Error updating user:", error);
        } finally {
            setUpdating(null);
        }
    };

    const updateUserPlan = async (userId: string, newPlan: string) => {
        setUpdating(userId);
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: newPlan }),
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(users.map(u => u.id === userId ? {
                    ...u,
                    stripePriceId: data.user.stripePriceId,
                    stripeSubscriptionId: data.user.stripeSubscriptionId,
                    stripeCurrentPeriodEnd: data.user.stripeCurrentPeriodEnd,
                } : u));
            }
        } catch (error) {
            console.error("Error updating user plan:", error);
        } finally {
            setUpdating(null);
        }
    };

    const getPlanKey = (priceId: string | null, subId: string | null): string => {
        if (!subId || !priceId) return "free";
        if (priceId.includes("price_1Sb7hN")) return "creator_monthly";
        if (priceId.includes("price_1Sem3G")) return "creator_yearly";
        if (priceId.includes("price_1Sb7i1")) return "pro_monthly";
        if (priceId.includes("price_1Sem3y")) return "pro_yearly";
        return "free";
    };

    const getPlanName = (priceId: string | null, subId: string | null) => {
        if (!subId) return "Free";
        if (priceId?.includes("price_1Sb7hN") || priceId?.includes("price_1Sem3G")) return "Creator";
        if (priceId?.includes("price_1Sb7i1") || priceId?.includes("price_1Sem3y")) return "Pro";
        return "Paid";
    };

    const isSubscriptionActive = (periodEnd: Date | null) => {
        if (!periodEnd) return false;
        return new Date(periodEnd) > new Date();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-muted-foreground">Manage all {users.length} users</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <Users className="h-8 w-8 text-blue-500" />
                        <div>
                            <p className="text-2xl font-bold">{users.length}</p>
                            <p className="text-sm text-muted-foreground">Total Users</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <CreditCard className="h-8 w-8 text-green-500" />
                        <div>
                            <p className="text-2xl font-bold">
                                {users.filter(u => isSubscriptionActive(u.stripeCurrentPeriodEnd)).length}
                            </p>
                            <p className="text-sm text-muted-foreground">Active Subscribers</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <Shield className="h-8 w-8 text-purple-500" />
                        <div>
                            <p className="text-2xl font-bold">
                                {users.filter(u => u.role === "ADMIN").length}
                            </p>
                            <p className="text-sm text-muted-foreground">Admins</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>View and manage user accounts</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="text-left p-3 font-medium">User</th>
                                    <th className="text-left p-3 font-medium">Role</th>
                                    <th className="text-left p-3 font-medium">Plan</th>
                                    <th className="text-left p-3 font-medium">Joined</th>
                                    <th className="text-right p-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => {
                                    const isCurrentUser = user.id === currentUserId;
                                    return (
                                        <tr key={user.id} className={`border-t hover:bg-muted/50 ${isCurrentUser ? "bg-primary/5" : ""}`}>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <p className="font-medium">
                                                            {user.name || "No name"}
                                                            {isCurrentUser && <span className="text-xs text-primary ml-2">(You)</span>}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <Select
                                                    value={user.role}
                                                    onValueChange={(value) => updateUserRole(user.id, value)}
                                                    disabled={updating === user.id}
                                                >
                                                    <SelectTrigger className="w-28">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="USER">User</SelectItem>
                                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="p-3">
                                                <Select
                                                    value={getPlanKey(user.stripePriceId, user.stripeSubscriptionId)}
                                                    onValueChange={(value) => updateUserPlan(user.id, value)}
                                                    disabled={updating === user.id}
                                                >
                                                    <SelectTrigger className="w-40">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="free">Free</SelectItem>
                                                        <SelectItem value="creator_monthly">Creator (Monthly)</SelectItem>
                                                        <SelectItem value="creator_yearly">Creator (Yearly)</SelectItem>
                                                        <SelectItem value="pro_monthly">Pro (Monthly)</SelectItem>
                                                        <SelectItem value="pro_yearly">Pro (Yearly)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="p-3 text-sm text-muted-foreground">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="p-3 text-right">
                                                {!isCurrentUser && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-red-600"
                                                        onClick={() => deleteUser(user.id)}
                                                        disabled={deleting === user.id}
                                                    >
                                                        {deleting === user.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <p className="p-8 text-center text-muted-foreground">No users found</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
