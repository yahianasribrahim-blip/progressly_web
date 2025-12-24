"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    Smartphone,
    Package,
    Clock,
    Sparkles,
    Moon,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Check,
    Video,
    Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreatorOnboardingModalProps {
    isOpen: boolean;
    onComplete: () => void;
}

interface FormData {
    teamSize: number;
    // Content description questions
    contentActivity: string;
    filmingStyle: string;
    resourcesAccess: string;
    contentConstraints: string;
    // Equipment
    primaryDevice: string;
    hasExternalMic: boolean;
    hasLighting: boolean;
    hasGreenScreen: boolean;
    availableProps: string[];
    filmingLocations: string[];
    hoursPerVideo: number;
    videosPerWeek: number;
    experienceLevel: string;
    isMuslimCreator: boolean;
    prefersNoMusic: boolean;
    targetAudience: string;
}

const STEPS = [
    { id: "intro", title: "Welcome", icon: Rocket },
    { id: "team", title: "Your Team", icon: Users },
    { id: "content", title: "Your Content", icon: Video },
    { id: "device", title: "Your Device", icon: Smartphone },
    { id: "equipment", title: "Equipment & Props", icon: Package },
    { id: "time", title: "Time Commitment", icon: Clock },
    { id: "experience", title: "Experience Level", icon: Sparkles },
    { id: "preferences", title: "Content Preferences", icon: Moon },
];

const COMMON_PROPS = [
    "Ring Light",
    "Tripod",
    "Whiteboard",
    "Desk Setup",
    "Plants/Decor",
    "Backdrop",
    "Teleprompter",
    "Props/Costumes",
];


export function CreatorOnboardingModal({ isOpen, onComplete }: CreatorOnboardingModalProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customProp, setCustomProp] = useState("");

    const [formData, setFormData] = useState<FormData>({
        teamSize: 1,
        // Content description
        contentActivity: "",
        filmingStyle: "",
        resourcesAccess: "",
        contentConstraints: "",
        // Equipment
        primaryDevice: "",
        hasExternalMic: false,
        hasLighting: false,
        hasGreenScreen: false,
        availableProps: [],
        filmingLocations: [],
        hoursPerVideo: 2,
        videosPerWeek: 3,
        experienceLevel: "beginner",
        isMuslimCreator: false,
        prefersNoMusic: false,
        targetAudience: "young_adults",
    });

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/creator-setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error("Failed to save setup");
            }

            toast.success("Setup complete! Let's optimize your content.");
            onComplete();
            router.refresh();
        } catch (error) {
            console.error("Error saving setup:", error);
            toast.error("Failed to save setup. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleProp = (prop: string) => {
        setFormData(prev => ({
            ...prev,
            availableProps: prev.availableProps.includes(prop)
                ? prev.availableProps.filter(p => p !== prop)
                : [...prev.availableProps, prop],
        }));
    };


    const addCustomProp = () => {
        if (customProp.trim() && !formData.availableProps.includes(customProp.trim())) {
            setFormData(prev => ({
                ...prev,
                availableProps: [...prev.availableProps, customProp.trim()],
            }));
            setCustomProp("");
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Intro
                return (
                    <div className="space-y-6 text-center py-4">
                        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Rocket className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Let&apos;s Personalize Your Experience</h3>
                            <p className="text-muted-foreground mt-2">
                                You&apos;re about to answer a few quick questions that will shape your entire Progressly experience.
                            </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-left">
                            <p className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                                ⚠️ This is important!
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                <strong>Answer in as much detail as possible.</strong> The quality of your AI recommendations,
                                video ideas, and format suggestions depends entirely on how well we understand your content.
                                Vague answers = generic recommendations. Detailed answers = personalized, actionable insights
                                that actually apply to YOUR content.
                            </p>
                        </div>

                        <div className="space-y-2 text-left bg-muted/50 rounded-lg p-4">
                            <p className="text-sm font-medium">What we&apos;ll cover:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>✓ What kind of content you create</li>
                                <li>✓ Your filming setup and equipment</li>
                                <li>✓ Your time commitment and experience</li>
                                <li>✓ Any preferences or constraints</li>
                            </ul>
                            <p className="text-xs text-muted-foreground mt-3">Takes about 2 minutes</p>
                        </div>
                    </div>
                );

            case 1: // Team
                return (
                    <div className="space-y-6">
                        <div>
                            <Label className="text-base font-semibold">How many people do you have to help film?</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                This helps us suggest realistic video formats for you.
                            </p>
                        </div>
                        <RadioGroup
                            value={formData.teamSize.toString()}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, teamSize: parseInt(value) }))}
                            className="grid gap-3"
                        >
                            {[
                                { value: "1", label: "Just me (solo creator)", description: "I film everything myself" },
                                { value: "2", label: "2 people", description: "Me + 1 helper (partner, friend, etc.)" },
                                { value: "3", label: "3-5 people", description: "Small team" },
                                { value: "6", label: "6+ people", description: "Full production team" },
                            ].map((option) => (
                                <Label
                                    key={option.value}
                                    className={cn(
                                        "flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-all",
                                        formData.teamSize.toString() === option.value
                                            ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                                            : "hover:border-muted-foreground/50"
                                    )}
                                >
                                    <RadioGroupItem value={option.value} />
                                    <div>
                                        <p className="font-medium">{option.label}</p>
                                        <p className="text-sm text-muted-foreground">{option.description}</p>
                                    </div>
                                </Label>
                            ))}
                        </RadioGroup>
                    </div>
                );

            case 2: // Content - Simplified to 3 key questions
                return (
                    <div className="space-y-6">
                        <div>
                            <Label className="text-base font-semibold">Tell us about your content</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                Be as specific as possible — this helps us give you realistic format suggestions.
                            </p>
                        </div>

                        {/* Question 1: What do you film */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">What do you film?</Label>
                            <textarea
                                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Example: I film myself street racing BMWs on public roads and occasionally at private track days. I also create car review content where I break down the specs and performance of different luxury vehicles, mostly German brands like BMW, Mercedes, and Porsche."
                                value={formData.contentActivity}
                                onChange={(e) => setFormData(prev => ({ ...prev, contentActivity: e.target.value }))}
                            />
                        </div>

                        {/* Question 2: How do you film it */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">How do you film it?</Label>
                            <textarea
                                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Example: Most of my content is POV footage from inside the car using a suction mount on the windshield. I use a GoPro for exterior shots of the car in motion. For review content, I set up a tripod outside and walk around the car explaining features. I film alone, so I can't do complex moving shots."
                                value={formData.filmingStyle}
                                onChange={(e) => setFormData(prev => ({ ...prev, filmingStyle: e.target.value }))}
                            />
                        </div>

                        {/* Question 3: Any restrictions or constraints */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Do you have any restrictions or constraints?</Label>
                            <textarea
                                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Example: I can only film on weekends since I work full-time. I don't have track access so I'm limited to public roads and parking lots. I prefer not to show my face on camera, and I have limited video editing skills so I need formats that don't require complex effects or transitions."
                                value={formData.contentConstraints}
                                onChange={(e) => setFormData(prev => ({ ...prev, contentConstraints: e.target.value }))}
                            />
                        </div>
                    </div>
                );

            case 3: // Device
                return (
                    <div className="space-y-6">
                        <div>
                            <Label className="text-base font-semibold">What&apos;s your primary filming device?</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                We&apos;ll tailor suggestions to what your device can do.
                            </p>
                        </div>
                        <Input
                            placeholder="e.g., iPhone 13, Samsung S23, Canon EOS R5..."
                            value={formData.primaryDevice}
                            onChange={(e) => setFormData(prev => ({ ...prev, primaryDevice: e.target.value }))}
                            className="text-lg py-6"
                        />
                        <div className="flex flex-wrap gap-2">
                            {["iPhone 11", "iPhone 13", "iPhone 15 Pro", "Samsung Galaxy", "Android Phone", "DSLR/Mirrorless", "Webcam"].map((device) => (
                                <Button
                                    key={device}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFormData(prev => ({ ...prev, primaryDevice: device }))}
                                    className={cn(
                                        formData.primaryDevice === device && "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                                    )}
                                >
                                    {device}
                                </Button>
                            ))}
                        </div>
                    </div>
                );

            case 4: // Equipment & Props
                return (
                    <div className="space-y-6">
                        <div>
                            <Label className="text-base font-semibold">What equipment and props do you have?</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                Select all that you have access to. This helps us give realistic suggestions.
                            </p>
                        </div>

                        {/* Quick equipment checkboxes */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-muted-foreground">Equipment</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { key: "hasExternalMic", label: "External Microphone" },
                                    { key: "hasLighting", label: "Lighting Setup" },
                                    { key: "hasGreenScreen", label: "Green Screen" },
                                ].map((item) => (
                                    <Label
                                        key={item.key}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                                            formData[item.key as keyof FormData]
                                                ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                                                : "hover:border-muted-foreground/50"
                                        )}
                                    >
                                        <Checkbox
                                            checked={formData[item.key as keyof FormData] as boolean}
                                            onCheckedChange={(checked) =>
                                                setFormData(prev => ({ ...prev, [item.key]: checked }))
                                            }
                                        />
                                        <span className="text-sm">{item.label}</span>
                                    </Label>
                                ))}
                            </div>
                        </div>

                        {/* Props */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-muted-foreground">Props & Accessories</Label>
                            <div className="flex flex-wrap gap-2">
                                {COMMON_PROPS.map((prop) => (
                                    <Button
                                        key={prop}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleProp(prop)}
                                        className={cn(
                                            formData.availableProps.includes(prop) && "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                                        )}
                                    >
                                        {formData.availableProps.includes(prop) && <Check className="h-3 w-3 mr-1" />}
                                        {prop}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add custom prop..."
                                    value={customProp}
                                    onChange={(e) => setCustomProp(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addCustomProp()}
                                />
                                <Button variant="outline" onClick={addCustomProp}>Add</Button>
                            </div>
                        </div>
                    </div>
                );


            case 5: // Time
                return (
                    <div className="space-y-8">
                        <div>
                            <Label className="text-base font-semibold">How much time can you dedicate?</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                Be realistic - we&apos;ll suggest formats that fit your schedule.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label>Hours per video</Label>
                                    <span className="text-lg font-bold text-violet-600">
                                        {formData.hoursPerVideo === 10 ? "10+" : formData.hoursPerVideo} hours
                                    </span>
                                </div>
                                <Slider
                                    value={[formData.hoursPerVideo]}
                                    onValueChange={([value]) => setFormData(prev => ({ ...prev, hoursPerVideo: value }))}
                                    min={1}
                                    max={10}
                                    step={1}
                                    className="py-4"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>1 hour (quick)</span>
                                    <span>10+ hours (polished)</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label>Videos per week (goal)</Label>
                                    <span className="text-lg font-bold text-violet-600">
                                        {formData.videosPerWeek === 7 ? "Daily" : `${formData.videosPerWeek}x/week`}
                                    </span>
                                </div>
                                <Slider
                                    value={[formData.videosPerWeek]}
                                    onValueChange={([value]) => setFormData(prev => ({ ...prev, videosPerWeek: value }))}
                                    min={1}
                                    max={7}
                                    step={1}
                                    className="py-4"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>1x/week</span>
                                    <span>Daily</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 6: // Experience
                return (
                    <div className="space-y-6">
                        <div>
                            <Label className="text-base font-semibold">What&apos;s your content creation experience?</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                We&apos;ll adjust the complexity of our suggestions.
                            </p>
                        </div>
                        <RadioGroup
                            value={formData.experienceLevel}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, experienceLevel: value }))}
                            className="grid gap-3"
                        >
                            {[
                                { value: "beginner", label: "Beginner", description: "Just starting out, learning the basics" },
                                { value: "intermediate", label: "Intermediate", description: "Posted consistently, understand what works" },
                                { value: "advanced", label: "Advanced", description: "Experienced creator, looking to optimize" },
                            ].map((option) => (
                                <Label
                                    key={option.value}
                                    className={cn(
                                        "flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-all",
                                        formData.experienceLevel === option.value
                                            ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                                            : "hover:border-muted-foreground/50"
                                    )}
                                >
                                    <RadioGroupItem value={option.value} />
                                    <div>
                                        <p className="font-medium">{option.label}</p>
                                        <p className="text-sm text-muted-foreground">{option.description}</p>
                                    </div>
                                </Label>
                            ))}
                        </RadioGroup>
                    </div>
                );

            case 7: // Preferences
                return (
                    <div className="space-y-6">
                        <div>
                            <Label className="text-base font-semibold">Content Preferences</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                Help us personalize your experience.
                            </p>
                        </div>

                        {/* Target Audience */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Who is your target audience?</Label>
                            <p className="text-xs text-muted-foreground">
                                This helps us give appropriate suggestions (e.g., CTAs work for kids but not adults).
                            </p>
                            <RadioGroup
                                value={formData.targetAudience}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, targetAudience: value }))}
                                className="grid gap-2"
                            >
                                {[
                                    { value: "kids", label: "Kids (under 12)", description: "Children's content" },
                                    { value: "teens", label: "Teens (12-17)", description: "Teenage audience" },
                                    { value: "young_adults", label: "Young Adults (18-30)", description: "Most common audience" },
                                    { value: "adults", label: "Adults (30+)", description: "Mature audience" },
                                    { value: "professionals", label: "Professionals", description: "Business/career focused" },
                                ].map((option) => (
                                    <Label
                                        key={option.value}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                                            formData.targetAudience === option.value
                                                ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                                                : "hover:border-muted-foreground/50"
                                        )}
                                    >
                                        <RadioGroupItem value={option.value} />
                                        <div>
                                            <p className="font-medium text-sm">{option.label}</p>
                                            <p className="text-xs text-muted-foreground">{option.description}</p>
                                        </div>
                                    </Label>
                                ))}
                            </RadioGroup>
                        </div>

                        {/* Muslim Creator Option */}
                        <div className="space-y-4 pt-4 border-t">
                            <Label
                                className={cn(
                                    "flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all",
                                    formData.isMuslimCreator
                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                                        : "hover:border-muted-foreground/50"
                                )}
                            >
                                <Checkbox
                                    checked={formData.isMuslimCreator}
                                    onCheckedChange={(checked) =>
                                        setFormData(prev => ({
                                            ...prev,
                                            isMuslimCreator: !!checked,
                                            // Auto-set no music preference for Muslim creators
                                            prefersNoMusic: !!checked,
                                        }))
                                    }
                                    className="mt-1"
                                />
                                <div>
                                    <p className="font-medium flex items-center gap-2">
                                        <Moon className="h-4 w-4 text-emerald-600" />
                                        I&apos;m a Muslim creator
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Enable halal-friendly recommendations and content checks
                                    </p>
                                </div>
                            </Label>
                        </div>

                        <div className="rounded-lg bg-gradient-to-r from-violet-500/10 to-purple-500/10 p-4 border border-violet-200 dark:border-violet-800">
                            <p className="text-sm">
                                <strong>You&apos;re all set!</strong> Click &quot;Complete Setup&quot; to start optimizing your content with personalized recommendations.
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="h-5 w-5 text-violet-500" />
                        Welcome to Progressly!
                    </DialogTitle>
                    <DialogDescription>
                        Let&apos;s personalize your experience so we can give you realistic, actionable recommendations.
                    </DialogDescription>
                </DialogHeader>

                {/* Progress indicators */}
                <div className="flex gap-1 my-4">
                    {STEPS.map((step, index) => (
                        <div
                            key={step.id}
                            className={cn(
                                "h-1.5 flex-1 rounded-full transition-all",
                                index <= currentStep
                                    ? "bg-gradient-to-r from-violet-500 to-purple-500"
                                    : "bg-muted"
                            )}
                        />
                    ))}
                </div>

                {/* Step title */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    {(() => {
                        const StepIcon = STEPS[currentStep].icon;
                        return <StepIcon className="h-4 w-4" />;
                    })()}
                    <span>Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}</span>
                </div>

                {/* Step content */}
                <div className="min-h-[300px]">
                    {renderStepContent()}
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between pt-4 border-t">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className="gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>

                    {currentStep < STEPS.length - 1 ? (
                        <Button
                            onClick={handleNext}
                            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Complete Setup
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
