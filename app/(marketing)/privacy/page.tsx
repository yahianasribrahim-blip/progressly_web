import { Metadata } from "next";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export const metadata: Metadata = {
    title: "Privacy Policy - Progressly",
    description: "Privacy Policy for Progressly - How we collect, use, store, and protect your information.",
};

export default function PrivacyPage() {
    return (
        <div className="py-16">
            <MaxWidthWrapper className="max-w-4xl">
                <h1 className="font-heading text-4xl md:text-5xl font-bold mb-8">Privacy Policy</h1>
                <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

                <div className="prose prose-gray dark:prose-invert max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                        <p className="text-muted-foreground mb-4">
                            Welcome to Progressly ("we," "our," or "us"). Progressly is a software-as-a-service platform designed to help content creators identify content trends and patterns.
                        </p>
                        <p className="text-muted-foreground mb-4">
                            We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect your information when you use our website and services.
                        </p>
                        <p className="text-muted-foreground">
                            By using Progressly, you agree to the practices described in this policy.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

                        <h3 className="text-xl font-medium mb-3">a. Information You Provide</h3>
                        <p className="text-muted-foreground mb-4">
                            When you create an account or use our services, we may collect:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Email address</li>
                            <li>Name or username</li>
                            <li>Account login credentials</li>
                            <li>Subscription and billing information (processed by third-party payment providers)</li>
                        </ul>
                        <p className="text-muted-foreground mb-4">
                            We do not store full credit card numbers.
                        </p>

                        <h3 className="text-xl font-medium mb-3">b. Usage Data</h3>
                        <p className="text-muted-foreground mb-4">
                            We may collect information about how you use the platform, including:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Pages visited</li>
                            <li>Features used</li>
                            <li>Analyses generated</li>
                            <li>Device type and browser information</li>
                        </ul>
                        <p className="text-muted-foreground mb-4">
                            This data is used to improve the service and user experience.
                        </p>

                        <h3 className="text-xl font-medium mb-3">c. Public Content Data</h3>
                        <p className="text-muted-foreground">
                            Progressly may analyze publicly available content from third-party platforms (e.g., social media platforms). We do not collect private account data or require access to your personal social media accounts.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
                        <p className="text-muted-foreground mb-4">We use your information to:</p>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Provide and maintain the Progressly service</li>
                            <li>Manage user accounts and subscriptions</li>
                            <li>Enforce plan limits and usage rules</li>
                            <li>Improve product functionality and performance</li>
                            <li>Communicate important updates or service-related notices</li>
                        </ul>
                        <p className="text-muted-foreground font-medium">
                            We do not sell your personal data.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">4. Data Sharing</h2>
                        <p className="text-muted-foreground mb-4">We may share limited data only with:</p>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Trusted third-party service providers (e.g., hosting, payments, analytics)</li>
                            <li>Legal authorities if required by law</li>
                        </ul>
                        <p className="text-muted-foreground">
                            All third parties are required to protect your data and use it only for the intended purpose.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">5. Cookies and Tracking</h2>
                        <p className="text-muted-foreground mb-4">Progressly may use cookies or similar technologies to:</p>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Keep you logged in</li>
                            <li>Understand how users interact with the platform</li>
                            <li>Improve performance and usability</li>
                        </ul>
                        <p className="text-muted-foreground">
                            You can disable cookies through your browser settings, though some features may not function properly.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
                        <p className="text-muted-foreground mb-4">
                            We take reasonable technical and organizational measures to protect your data, including:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Secure servers</li>
                            <li>Encrypted connections</li>
                            <li>Access controls</li>
                        </ul>
                        <p className="text-muted-foreground">
                            However, no system is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
                        <p className="text-muted-foreground mb-4">
                            We retain your information only as long as necessary to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Provide the service</li>
                            <li>Meet legal obligations</li>
                            <li>Resolve disputes</li>
                        </ul>
                        <p className="text-muted-foreground">
                            You may request deletion of your account and associated data at any time.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">8. Your Rights</h2>
                        <p className="text-muted-foreground mb-4">
                            Depending on your location, you may have the right to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Access your personal data</li>
                            <li>Correct inaccurate data</li>
                            <li>Request deletion of your data</li>
                        </ul>
                        <p className="text-muted-foreground">
                            To exercise these rights, contact us at support@progressly.ai.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">9. Third-Party Links</h2>
                        <p className="text-muted-foreground">
                            Progressly may contain links to third-party websites or platforms. We are not responsible for their privacy practices or content.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
                        <p className="text-muted-foreground">
                            Progressly is not intended for children under 13. We do not knowingly collect personal information from children.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
                        <p className="text-muted-foreground">
                            We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated date.
                        </p>
                    </section>
                </div>
            </MaxWidthWrapper>
        </div>
    );
}
