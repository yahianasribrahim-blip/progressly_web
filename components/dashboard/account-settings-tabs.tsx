"use client";

import { useState } from "react";
import { User, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserNameForm } from "@/components/forms/user-name-form";
import { DeleteAccountSection } from "@/components/dashboard/delete-account";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface AccountSettingsTabsProps {
    user: {
        id: string;
        name: string | null;
        email: string | null;
    };
}

const niches = [
    { value: "hijab", label: "🧕 Hijab Tutorials" },
    { value: "deen", label: "🕌 Deen Information" },
    { value: "cultural", label: "🌙 Cultural" },
    { value: "food", label: "🍳 Food & Cooking" },
    { value: "gym", label: "💪 Gym & Fitness" },
    { value: "pets", label: "🐱 Pets & Animals" },
    { value: "storytelling", label: "📖 Storytelling" },
];

export function AccountSettingsTabs({ user }: AccountSettingsTabsProps) {
    const [preferredNiche, setPreferredNiche] = useState<string>("");

    return (
        <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="personal" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Personal Info</span>
                    <span className="sm:hidden">Personal</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Security</span>
                    <span className="sm:hidden">Security</span>
                </TabsTrigger>
                <TabsTrigger value="danger" className="gap-2 text-destructive data-[state=active]:text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="hidden sm:inline">Danger Zone</span>
                    <span className="sm:hidden">Danger</span>
                </TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>
                            Update your personal details and preferences.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Name Form */}
                        <UserNameForm user={{ id: user.id, name: user.name || "" }} />

                        {/* Preferred Niche */}
                        <div className="space-y-2 pt-4 border-t">
                            <Label htmlFor="niche">Preferred Niche</Label>
                            <p className="text-sm text-muted-foreground">
                                Select your primary content niche for personalized suggestions.
                            </p>
                            <Select value={preferredNiche} onValueChange={setPreferredNiche}>
                                <SelectTrigger className="w-full max-w-sm">
                                    <SelectValue placeholder="Select your niche..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {niches.map((niche) => (
                                        <SelectItem key={niche.value} value={niche.value}>
                                            {niche.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Security Settings</CardTitle>
                        <CardDescription>
                            Manage your account security and authentication.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Email Display */}
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={user.email || ""}
                                    disabled
                                    className="max-w-sm bg-muted"
                                />
                                <span className="text-xs text-muted-foreground">
                                    (Cannot be changed)
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Your email is linked to your Google account and cannot be modified.
                            </p>
                        </div>

                        {/* Password Section */}
                        <div className="space-y-2 pt-4 border-t">
                            <Label>Password</Label>
                            <p className="text-sm text-muted-foreground mb-3">
                                You signed in with Google, so you don't have a password set for Progressly.
                                Your account security is managed by Google.
                            </p>
                            <Button variant="outline" disabled>
                                Change Password
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                                Password changes are not available for Google sign-in users.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Danger Zone Tab */}
            <TabsContent value="danger" className="space-y-6">
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        <CardDescription>
                            Irreversible actions that will permanently affect your account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DeleteAccountSection />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
