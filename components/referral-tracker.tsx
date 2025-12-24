"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ReferralTracker() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const refCode = searchParams.get("ref");

        if (refCode) {
            // Track the referral click
            fetch("/api/affiliate/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ affiliateCode: refCode }),
            }).catch(console.error);
        }
    }, [searchParams]);

    return null; // This component doesn't render anything
}
