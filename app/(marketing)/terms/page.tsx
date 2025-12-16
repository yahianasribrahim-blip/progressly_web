import { Metadata } from "next";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export const metadata: Metadata = {
    title: "Terms of Service - Progressly",
    description: "Terms of Service for Progressly - The rules and guidelines for using our platform.",
};

export default function TermsPage() {
    return (
        <div className="py-16">
            <MaxWidthWrapper className="max-w-4xl">
                <h1 className="font-heading text-4xl md:text-5xl font-bold mb-8">Terms of Service</h1>
                <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

                <div className="prose prose-gray dark:prose-invert max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                        <p className="text-muted-foreground">
                            By accessing or using Progressly ("we," "our," or "us"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you may not use the service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
                        <p className="text-muted-foreground mb-4">
                            Progressly is a software platform that provides data-driven insights, patterns, and analysis related to content performance.
                        </p>
                        <p className="text-muted-foreground font-medium">
                            Progressly does not guarantee results, growth, engagement, monetization, or platform success.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">3. Eligibility</h2>
                        <p className="text-muted-foreground">
                            You must be at least 13 years old to use Progressly. By using the service, you confirm that you meet this requirement.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">4. Accounts</h2>
                        <p className="text-muted-foreground mb-4">You are responsible for:</p>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Maintaining the confidentiality of your account credentials</li>
                            <li>All activity that occurs under your account</li>
                        </ul>
                        <p className="text-muted-foreground">
                            We reserve the right to suspend or terminate accounts that violate these Terms.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">5. Subscriptions & Payments</h2>

                        <h3 className="text-xl font-medium mb-3">a. Plans</h3>
                        <p className="text-muted-foreground mb-4">
                            Progressly offers free and paid subscription plans with usage limits. Plan features, limits, and pricing may change at any time.
                        </p>

                        <h3 className="text-xl font-medium mb-3">b. Billing</h3>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Subscriptions are billed monthly or annually, depending on the plan selected</li>
                            <li>Payments are processed through third-party payment providers</li>
                            <li>You authorize us to charge your payment method on a recurring basis</li>
                        </ul>

                        <h3 className="text-xl font-medium mb-3">c. Cancellations</h3>
                        <p className="text-muted-foreground">
                            You may cancel your subscription at any time. Your access will continue until the end of the current billing period. No refunds are provided for partial billing periods.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">6. Usage Limits</h2>
                        <p className="text-muted-foreground">
                            Each plan includes limits (such as number of analyses per week or per day). Attempting to bypass or abuse usage limits may result in account suspension or termination.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">7. Acceptable Use</h2>
                        <p className="text-muted-foreground mb-4">You agree not to:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Use Progressly for illegal or unauthorized purposes</li>
                            <li>Attempt to reverse engineer, scrape, or exploit the platform</li>
                            <li>Interfere with system performance or security</li>
                            <li>Misuse data provided by the service</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
                        <p className="text-muted-foreground mb-4">
                            All content, software, branding, and design on Progressly are owned by Progressly or its licensors.
                        </p>
                        <p className="text-muted-foreground">
                            You are granted a limited, non-exclusive, non-transferable license to use the service for personal or business purposes.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">9. Third-Party Platforms</h2>
                        <p className="text-muted-foreground mb-4">
                            Progressly may reference or analyze publicly available content from third-party platforms.
                        </p>
                        <p className="text-muted-foreground">
                            Progressly is not affiliated with, endorsed by, or responsible for any third-party platform.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">10. Disclaimer of Warranties</h2>
                        <p className="text-muted-foreground mb-4">
                            Progressly is provided "as is" and "as available."
                        </p>
                        <p className="text-muted-foreground mb-4">We make no warranties regarding:</p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Accuracy of insights</li>
                            <li>Platform availability</li>
                            <li>Performance outcomes</li>
                            <li>Business or revenue impact</li>
                        </ul>
                        <p className="text-muted-foreground mt-4">
                            Use of the service is at your own risk.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
                        <p className="text-muted-foreground mb-4">
                            To the maximum extent permitted by law, Progressly shall not be liable for:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Lost revenue or profits</li>
                            <li>Data loss</li>
                            <li>Platform bans or account actions by third parties</li>
                            <li>Indirect or consequential damages</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
                        <p className="text-muted-foreground mb-4">We reserve the right to:</p>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Suspend or terminate accounts</li>
                            <li>Restrict access</li>
                            <li>Modify or discontinue features</li>
                        </ul>
                        <p className="text-muted-foreground">
                            This may occur with or without notice if these Terms are violated.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">13. Modifications to Terms</h2>
                        <p className="text-muted-foreground">
                            We may update these Terms at any time. Continued use of Progressly after changes means you accept the updated Terms.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
                        <p className="text-muted-foreground">
                            These Terms are governed by the laws of Canada/Ontario, without regard to conflict of law principles.
                        </p>
                    </section>
                </div>
            </MaxWidthWrapper>
        </div>
    );
}
