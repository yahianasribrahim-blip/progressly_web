import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Image, FileText, Video, Copy, Check, MessageSquare } from "lucide-react";
import Link from "next/link";

export const metadata = {
    title: "Marketing Assets – Affiliate Dashboard",
    description: "Download marketing materials to promote Progressly",
};

async function getAffiliateStatus(userId: string) {
    const affiliate = await prisma.affiliate.findUnique({
        where: { userId },
        select: { status: true, affiliateCode: true },
    });
    return affiliate;
}

export default async function AffiliateAssetsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    const affiliate = await getAffiliateStatus(session.user.id);

    if (!affiliate || affiliate.status !== "approved") {
        redirect("/dashboard/affiliate");
    }

    const referralLink = `https://progressly.so?ref=${affiliate.affiliateCode}`;

    const assets = [
        {
            title: "Instagram Carousel Templates",
            description: "Ready-to-use carousel designs for Instagram. Edit in Canva.",
            icon: Image,
            items: [
                { name: "\"5 Mistakes Killing Your TikToks\" Carousel", type: "Canva Link" },
                { name: "\"Why Smart Creators Use This Tool\" Carousel", type: "Canva Link" },
                { name: "\"My Secret to Viral Videos\" Carousel", type: "Canva Link" },
            ]
        },
        {
            title: "Story Templates",
            description: "Instagram/TikTok story templates with swipe-up ready.",
            icon: Video,
            items: [
                { name: "\"Tool That Changed My Content\" Story", type: "Image" },
                { name: "\"Analyzing a Viral Video\" Story Series", type: "Image Set" },
                { name: "\"Before vs After\" Story", type: "Image" },
            ]
        },
        {
            title: "Video Script Templates",
            description: "Proven scripts for promoting Progressly on video.",
            icon: FileText,
            items: [
                { name: "30-Second \"Quick Review\" Script", type: "Text" },
                { name: "60-Second \"Full Demo\" Script", type: "Text" },
                { name: "\"Day in My Life as a Creator\" Integration", type: "Text" },
            ]
        },
        {
            title: "Email & DM Templates",
            description: "Templates for reaching out to your audience.",
            icon: MessageSquare,
            items: [
                { name: "Newsletter Recommendation Template", type: "Text" },
                { name: "DM Response Template", type: "Text" },
                { name: "Collaboration Pitch Template", type: "Text" },
            ]
        },
    ];

    const videoScripts = {
        quick: `"Okay so I found this tool that literally breaks down why videos go viral.

You paste any TikTok link, and it tells you exactly what hook they used, why the pacing works, and how to replicate it for YOUR niche.

It's called Progressly - link in bio. Trust me, this changed everything for me."`,

        full: `"Let me show you something that changed my content game.

So you know how some videos just... hit? And you're like 'what did they do?'

There's this tool called Progressly that breaks down ANY viral video - like literally tells you the hook type, the pacing, why it worked.

But here's the part I love - it then generates video ideas specifically for YOUR content style.

I put in my niche, answered a few questions about how I film, and now I have like 50 video ideas I can actually make.

Link's in my bio if you want to try it."`,

        integration: `"Part of my morning routine is checking Progressly for trending formats in my niche.

*shows screen recording of the app*

It shows me what's working RIGHT NOW so I'm never behind on trends.

Then I pick an idea, and I film.

Simple as that. Link in bio."`
    };

    return (
        <div className="container max-w-5xl py-8">
            {/* Header */}
            <div className="mb-8">
                <Badge className="mb-2">Affiliate Resources</Badge>
                <h1 className="text-3xl font-bold mb-2">Marketing Assets</h1>
                <p className="text-muted-foreground">
                    Ready-to-use templates and scripts to help you promote Progressly.
                </p>
            </div>

            {/* Your Link */}
            <Card className="mb-8 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-200 dark:border-violet-800">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex-1">
                            <p className="font-medium mb-1">Your Referral Link</p>
                            <code className="text-sm bg-background px-3 py-2 rounded border block overflow-x-auto">
                                {referralLink}
                            </code>
                        </div>
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => navigator.clipboard.writeText(referralLink)}
                        >
                            <Copy className="h-4 w-4" />
                            Copy Link
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Video Scripts (Most Important) */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-violet-500" />
                        Video Scripts
                    </CardTitle>
                    <CardDescription>
                        Copy and adapt these scripts for your promotional videos
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Badge variant="outline">30 seconds</Badge>
                            Quick Review Script
                        </h4>
                        <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">
                            {videoScripts.quick}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Badge variant="outline">60 seconds</Badge>
                            Full Demo Script
                        </h4>
                        <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">
                            {videoScripts.full}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Badge variant="outline">Integration</Badge>
                            Day in My Life Integration
                        </h4>
                        <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">
                            {videoScripts.integration}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Other Assets */}
            <div className="grid md:grid-cols-2 gap-6">
                {assets.map((category) => {
                    const Icon = category.icon;
                    return (
                        <Card key={category.title}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Icon className="h-5 w-5 text-violet-500" />
                                    {category.title}
                                </CardTitle>
                                <CardDescription>{category.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {category.items.map((item) => (
                                        <div
                                            key={item.name}
                                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            <div>
                                                <p className="text-sm font-medium">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.type}</p>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                                Coming Soon
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Tips */}
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Tips for Success</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>✓ <strong>Be authentic</strong> - Share your genuine experience with Progressly</li>
                        <li>✓ <strong>Show, don&apos;t tell</strong> - Screen recordings perform better than just talking</li>
                        <li>✓ <strong>Add your link to bio</strong> - Always have your referral link accessible</li>
                        <li>✓ <strong>Post consistently</strong> - One mention per week keeps you top of mind</li>
                        <li>✓ <strong>Engage with commenters</strong> - Answer questions about the tool</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
