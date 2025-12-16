import { Metadata } from "next";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export const metadata: Metadata = {
    title: "About Us - Progressly",
    description: "Learn about Progressly - helping creators grow their channels with confidence, not confusion.",
};

export default function AboutPage() {
    return (
        <div className="py-16">
            <MaxWidthWrapper className="max-w-4xl">
                <h1 className="font-heading text-4xl md:text-5xl font-bold mb-8">About Us</h1>

                <div className="prose prose-gray dark:prose-invert max-w-none">
                    <p className="text-xl text-muted-foreground mb-8">
                        Progressly was created for creators who are tired of guessing.
                    </p>

                    <p className="text-muted-foreground mb-4">
                        If you've ever posted a video you genuinely believed in — only for it to flop — you already understand the problem. Creating content today often feels less like a skill and more like a gamble. You try trends, you follow advice, you experiment endlessly, and yet results still feel random.
                    </p>

                    <p className="text-muted-foreground mb-8 font-medium">
                        We built Progressly to change that.
                    </p>

                    <p className="text-muted-foreground mb-12">
                        Creators deserve better than blind trial and error. They deserve clarity. They deserve tools that help them understand what's working right now — without having to rely on luck, recycled advice, or vague motivation.
                    </p>

                    <p className="text-xl font-semibold text-foreground mb-8">
                        Progressly exists to help creators grow their channels with confidence, not confusion.
                    </p>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">Why We Built Progressly</h2>
                        <p className="text-muted-foreground mb-4">
                            Most creators don't fail because they're bad at content.<br />
                            <span className="font-medium text-foreground">They fail because they're forced to guess.</span>
                        </p>
                        <p className="text-muted-foreground mb-4">
                            Algorithms change constantly. Platforms rarely explain what's happening. And most advice online is either outdated, generic, or designed to sell courses rather than help creators improve.
                        </p>
                        <p className="text-muted-foreground mb-4">
                            Progressly was built to remove that noise.
                        </p>
                        <p className="text-muted-foreground mb-4">
                            Instead of asking creators to "just trust the process" or copy random strategies, we focus on helping them:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Understand what formats are actually working in their niche</li>
                            <li>See patterns behind successful content</li>
                            <li>Make informed decisions instead of emotional guesses</li>
                        </ul>
                        <p className="text-muted-foreground font-medium">
                            The goal isn't shortcuts. The goal is skill over luck.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">Our Belief</h2>
                        <p className="text-muted-foreground mb-4">
                            We believe creators shouldn't have to second-guess every post.<br />
                            We believe growth shouldn't feel random.<br />
                            And we believe creators shouldn't need to spend hours researching just to stay competitive.
                        </p>
                        <p className="text-muted-foreground">
                            Platforms like TikTok can feel unfair. One change can wipe out momentum overnight. One bad assumption can waste weeks of effort. Progressly exists to reduce that risk by helping creators make smarter decisions before they post.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">What Progressly Is (and Isn't)</h2>
                        <p className="text-muted-foreground mb-4">
                            Progressly is not a magic growth hack.<br />
                            It doesn't promise virality.<br />
                            It doesn't guarantee results.
                        </p>
                        <p className="text-muted-foreground mb-4 font-medium">
                            What it does offer is clarity.
                        </p>
                        <p className="text-muted-foreground">
                            By analyzing patterns, trends, and signals across content niches, Progressly helps creators understand what's currently working — so they can create with intention instead of hope.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">Who Progressly Is For</h2>
                        <p className="text-muted-foreground mb-4">Progressly is for creators who:</p>
                        <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                            <li>Want to improve through insight, not guesswork</li>
                            <li>Care about consistency and long-term growth</li>
                            <li>Are tired of random strategies and recycled advice</li>
                            <li>Want to grow based on skill, not luck</li>
                        </ul>
                        <p className="text-muted-foreground font-medium">
                            If that sounds like you, you're in the right place.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
                        <p className="text-xl text-foreground font-medium mb-4">
                            Our mission is simple: Help creators grow without guessing.
                        </p>
                        <p className="text-muted-foreground">
                            We're building Progressly to support creators at every stage — so they can focus on creating, not overthinking.
                        </p>
                    </section>
                </div>
            </MaxWidthWrapper>
        </div>
    );
}
