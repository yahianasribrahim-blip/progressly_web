import { Check, X } from "lucide-react";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

const diyFeatures = [
    "Hours wasted on research",
    "Guessing the next video",
    "Following random trends",
    "Using common hashtags",
    "Brainstorming every video from scratch",
    "Grow by luck",
];

const progresslyFeatures = [
    "Get instant in depth research",
    "Post winning videos every time",
    "Follow trends that actually work",
    "Use winning hashtags",
    "Base your videos off of current winning competitors",
    "Start every video with a template",
    "Grow by skill",
];

export default function ComparisonSection() {
    return (
        <section className="py-20">
            <MaxWidthWrapper>
                <div className="text-center mb-12">
                    <h2 className="font-heading text-3xl md:text-4xl lg:text-[40px] font-bold">
                        Why Progressly Wins
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        See how Progressly compares to doing everything yourself
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {/* Do It Yourself Column */}
                    <div className="rounded-2xl border bg-background p-6 md:p-8">
                        <div className="mb-6">
                            <h3 className="text-xl font-semibold text-foreground">
                                Do It Yourself
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                The old way of growing on social media
                            </p>
                        </div>
                        <ul className="space-y-4">
                            {diyFeatures.map((feature, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                            <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                                        </div>
                                    </div>
                                    <span className="text-muted-foreground">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Progressly Column */}
                    <div className="relative rounded-2xl border-2 border-purple-500/50 bg-background p-6 md:p-8">
                        {/* Recommended badge */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                                Recommended
                            </span>
                        </div>

                        <div className="mb-6 mt-2">
                            <h3 className="text-xl font-semibold text-foreground">
                                Progressly
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Smart, data-driven content creation
                            </p>
                        </div>
                        <ul className="space-y-4">
                            {progresslyFeatures.map((feature, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                                        </div>
                                    </div>
                                    <span className="text-foreground">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </MaxWidthWrapper>
        </section>
    );
}
