import { Video, TrendingUp, Image, FileText, MessageSquare, Sparkles } from "lucide-react";

const TOOLS = [
    {
        name: "Video Breakdown",
        description: "AI analyzes your video content and provides actionable improvement suggestions",
        icon: Video,
        color: "from-blue-500 to-indigo-600",
        features: ["Hook analysis", "Pacing feedback", "Engagement tips"],
    },
    {
        name: "Trending Formats",
        description: "Discover what's working on TikTok and get personalized format suggestions",
        icon: TrendingUp,
        color: "from-purple-500 to-pink-600",
        features: ["Real TikTok data", "Niche-specific", "How-to-apply ideas"],
    },
    {
        name: "Cover Optimizer",
        description: "Get AI feedback on your thumbnails to maximize click-through rate",
        icon: Image,
        color: "from-green-500 to-emerald-600",
        features: ["Text readability", "Visual impact", "Platform best practices"],
    },
    {
        name: "Script Optimizer",
        description: "Transform your script with proven engagement patterns and hooks",
        icon: FileText,
        color: "from-orange-500 to-red-600",
        features: ["Hook enhancement", "Flow optimization", "CTA suggestions"],
    },
    {
        name: "Caption Optimizer",
        description: "Craft captions that drive engagement and conversions",
        icon: MessageSquare,
        color: "from-cyan-500 to-blue-600",
        features: ["Hashtag strategy", "CTA placement", "Engagement hooks"],
    },
];

export default function ToolsShowcase() {
    return (
        <section className="py-16 sm:py-24">
            <div className="container">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                        <Sparkles className="h-4 w-4" />
                        Powerful AI Tools
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                        Everything You Need to{" "}
                        <span className="text-gradient_indigo-purple">Create Better Content</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Five AI-powered tools designed specifically for content creators who want to grow faster.
                    </p>
                </div>

                {/* Tools Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {TOOLS.map((tool, idx) => {
                        const Icon = tool.icon;
                        return (
                            <div
                                key={idx}
                                className="group relative rounded-2xl border bg-card p-6 hover:shadow-lg transition-all hover:-translate-y-1"
                            >
                                {/* Icon */}
                                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${tool.color} mb-4`}>
                                    <Icon className="h-6 w-6 text-white" />
                                </div>

                                {/* Content */}
                                <h3 className="font-semibold text-xl mb-2">{tool.name}</h3>
                                <p className="text-muted-foreground text-sm mb-4">{tool.description}</p>

                                {/* Features */}
                                <ul className="space-y-1">
                                    {tool.features.map((feature, fIdx) => (
                                        <li key={fIdx} className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {/* Hover gradient */}
                                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                            </div>
                        );
                    })}

                    {/* CTA Card */}
                    <div className="rounded-2xl border-2 border-dashed border-primary/30 p-6 flex flex-col items-center justify-center text-center bg-primary/5">
                        <Sparkles className="h-8 w-8 text-primary mb-3" />
                        <h3 className="font-semibold text-lg mb-1">More Tools Coming</h3>
                        <p className="text-sm text-muted-foreground">
                            We&apos;re constantly adding new AI-powered features to help you grow faster.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
