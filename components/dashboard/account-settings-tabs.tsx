"use client";

import { useState, useEffect } from "react";
import { User, Shield, AlertTriangle, Users, Target, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserNameForm } from "@/components/forms/user-name-form";
import { DeleteAccountSection } from "@/components/dashboard/delete-account";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AccountSettingsTabsProps {
    user: {
        id: string;
        name: string | null;
        email: string | null;
    };
}

interface CreatorSetup {
    teamSize: number;
    primaryDevice: string | null;
    hoursPerVideo: number;
    videosPerWeek: number;
    experienceLevel: string;
    targetAudience: string;
    isMuslimCreator: boolean;
    prefersNoMusic: boolean;
}

const TARGET_AUDIENCES = [
    { value: "kids", label: "Kids (under 12)" },
    { value: "teens", label: "Teens (12-17)" },
    { value: "young_adults", label: "Young Adults (18-30)" },
    { value: "adults", label: "Adults (30+)" },
    { value: "professionals", label: "Professionals" },
];

const EXPERIENCE_LEVELS = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
];

export function AccountSettingsTabs({ user }: AccountSettingsTabsProps) {
    const [creatorSetup, setCreatorSetup] = useState<CreatorSetup | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch creator setup on mount
    useEffect(() => {
        async function fetchSetup() {
            try {
                const response = await fetch("/api/creator-setup");
                const data = await response.json();
                if (data.creatorSetup) {
                    setCreatorSetup(data.creatorSetup);
                }
            } catch (error) {
                console.error("Error fetching creator setup:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSetup();
    }, []);

    const handleSaveSetup = async () => {
        if (!creatorSetup) return;

        setIsSaving(true);
        try {
            const response = await fetch("/api/creator-setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(creatorSetup),
            });

            if (!response.ok) throw new Error("Failed to save");

            toast.success("Creator settings saved!");
        } catch (error) {
            console.error("Error saving setup:", error);
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const updateSetup = (field: keyof CreatorSetup, value: string | number | boolean) => {
        setCreatorSetup(prev => prev ? { ...prev, [field]: value } : null);
    };

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
                            Update your personal details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Name Form */}
                        <UserNameForm user={{ id: user.id, name: user.name || "" }} />
                    </CardContent>
                </Card>

                {/* Creator Setup Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-violet-500" />
                            Creator Settings
                        </CardTitle>
                        <CardDescription>
                            Update your creator profile settings. These affect the suggestions you receive.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : creatorSetup ? (
                            <>
                                {/* Target Audience */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Target className="h-4 w-4 text-violet-500" />
                                        Target Audience
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        This affects CTA suggestions (CTAs work for younger audiences, not adults).
                                    </p>
                                    <Select
                                        value={creatorSetup.targetAudience}
                                        onValueChange={(value) => updateSetup("targetAudience", value)}
                                    >
                                        <SelectTrigger className="w-full max-w-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TARGET_AUDIENCES.map((audience) => (
                                                <SelectItem key={audience.value} value={audience.value}>
                                                    {audience.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Experience Level */}
                                <div className="space-y-2 pt-4 border-t">
                                    <Label>Experience Level</Label>
                                    <Select
                                        value={creatorSetup.experienceLevel}
                                        onValueChange={(value) => updateSetup("experienceLevel", value)}
                                    >
                                        <SelectTrigger className="w-full max-w-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EXPERIENCE_LEVELS.map((level) => (
                                                <SelectItem key={level.value} value={level.value}>
                                                    {level.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Team Size */}
                                <div className="space-y-2 pt-4 border-t">
                                    <Label>Team Size</Label>
                                    <RadioGroup
                                        value={creatorSetup.teamSize.toString()}
                                        onValueChange={(value) => updateSetup("teamSize", parseInt(value))}
                                        className="flex flex-wrap gap-2"
                                    >
                                        {[
                                            { value: "1", label: "Solo" },
                                            { value: "2", label: "2 people" },
                                            { value: "3", label: "3-5 people" },
                                            { value: "6", label: "6+ people" },
                                        ].map((option) => (
                                            <Label
                                                key={option.value}
                                                className={cn(
                                                    "flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-all",
                                                    creatorSetup.teamSize.toString() === option.value
                                                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                                                        : "hover:border-muted-foreground/50"
                                                )}
                                            >
                                                <RadioGroupItem value={option.value} />
                                                <span className="text-sm">{option.label}</span>
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </div>

                                {/* Primary Device */}
                                <div className="space-y-2 pt-4 border-t">
                                    <Label>Primary Filming Device</Label>
                                    <Input
                                        value={creatorSetup.primaryDevice || ""}
                                        onChange={(e) => updateSetup("primaryDevice", e.target.value)}
                                        placeholder="e.g., iPhone 13, Canon EOS R5..."
                                        className="max-w-sm"
                                    />
                                </div>

                                {/* Save Button */}
                                <div className="pt-4">
                                    <Button
                                        onClick={handleSaveSetup}
                                        disabled={isSaving}
                                        className="gap-2"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>Complete onboarding to set up your creator profile.</p>
                            </div>
                        )}
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
