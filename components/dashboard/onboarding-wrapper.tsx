"use client";

import { useEffect, useState } from "react";
import { CreatorOnboardingModal } from "./creator-onboarding-modal";

interface OnboardingWrapperProps {
    onboardingCompleted: boolean;
    children: React.ReactNode;
}

export function OnboardingWrapper({ onboardingCompleted, children }: OnboardingWrapperProps) {
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        // Show onboarding modal if not completed
        if (!onboardingCompleted) {
            setShowOnboarding(true);
        }
    }, [onboardingCompleted]);

    const handleComplete = () => {
        setShowOnboarding(false);
    };

    return (
        <>
            {children}
            <CreatorOnboardingModal
                isOpen={showOnboarding}
                onComplete={handleComplete}
            />
        </>
    );
}
