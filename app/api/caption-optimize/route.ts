import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface CreatorContext {
    isMuslimCreator: boolean;
    prefersNoMusic: boolean;
    niche?: string;
}

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { caption, contentTopic, targetPlatform } = body;

        if (!caption || caption.trim().length < 5) {
            return NextResponse.json(
                { error: "Please enter a caption with at least 5 characters" },
                { status: 400 }
            );
        }

        // Fetch creator setup for personalized recommendations
        let creatorContext: CreatorContext | null = null;
        try {
            const profile = await prisma.userProfile.findUnique({
                where: { userId: session.user.id },
                include: { creatorSetup: true },
            });
            if (profile?.creatorSetup) {
                creatorContext = {
                    isMuslimCreator: profile.creatorSetup.isMuslimCreator,
                    prefersNoMusic: profile.creatorSetup.prefersNoMusic,
                    niche: profile.niche || undefined,
                };
            }
        } catch (e) {
            console.log("Could not fetch creator setup:", e);
        }

        // Local analysis
        const localAnalysis = analyzeCaptionLocally(caption);

        // AI-powered analysis
        const aiAnalysis = await getAICaptionAnalysis(
            caption,
            contentTopic || "",
            targetPlatform || "tiktok",
            creatorContext
        );

        return NextResponse.json({
            success: true,
            ...localAnalysis,
            ...aiAnalysis,
            hasCreatorContext: !!creatorContext,
        });
    } catch (error) {
        console.error("Error optimizing caption:", error);
        return NextResponse.json(
            { error: "Failed to optimize caption. Please try again." },
            { status: 500 }
        );
    }
}

function analyzeCaptionLocally(caption: string) {
    const lines = caption.split('\n').filter(l => l.trim().length > 0);
    const firstLine = lines[0]?.trim() || "";

    // Extract hashtags
    const hashtags = caption.match(/#\w+/g) || [];
    const hashtagCount = hashtags.length;

    // Analyze hook line (first line before any line breaks)
    let hookLineScore = 5;
    if (/^(pov|when|what if|imagine|stop|wait|don't skip)/i.test(firstLine)) {
        hookLineScore = 9;
    } else if (/\?$/.test(firstLine)) {
        hookLineScore = 8;
    } else if (/^(the secret|nobody|everyone|this is|here's why)/i.test(firstLine)) {
        hookLineScore = 8;
    } else if (firstLine.length > 50) {
        hookLineScore = 5;
    } else if (firstLine.length < 10 && firstLine.length > 0) {
        hookLineScore = 6;
    }

    // Check for CTA
    const hasCTA = /follow|like|comment|share|save|link in bio|dm me|subscribe|check/i.test(caption);

    // Check for emojis
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojis = caption.match(emojiRegex) || [];
    const emojiCount = emojis.length;

    // Caption length analysis
    const charCount = caption.length;
    const lengthStatus = charCount < 50 ? "too_short" :
        charCount > 2200 ? "too_long" :
            charCount > 150 ? "good_with_truncation" : "good";

    // Hashtag analysis
    const hashtagStatus = hashtagCount === 0 ? "none" :
        hashtagCount < 3 ? "too_few" :
            hashtagCount > 10 ? "too_many" : "good";

    return {
        hookLine: firstLine.substring(0, 100),
        hookLineScore,
        charCount,
        lengthStatus,
        hashtags,
        hashtagCount,
        hashtagStatus,
        hasCTA,
        emojiCount,
        lineCount: lines.length,
    };
}

async function getAICaptionAnalysis(
    caption: string,
    contentTopic: string,
    platform: string,
    creatorContext: CreatorContext | null
): Promise<{
    aiScore: number;
    aiVerdict: string;
    suggestedHookLines: string[];
    hashtagSuggestions: string[];
    hashtagsToRemove: string[];
    ctaSuggestions: string[];
    optimizedCaption: string;
    improvements: string[];
}> {
    try {
        const contextInfo = creatorContext
            ? `Creator context: ${creatorContext.isMuslimCreator ? "Muslim creator" : "General creator"}${creatorContext.niche ? `, Niche: ${creatorContext.niche}` : ""}`
            : "";

        const systemPrompt = `You are an expert ${platform} caption optimizer. You help creators write captions that:
1. Stop the scroll with the first line (hook)
2. Drive engagement (likes, comments, shares, saves)
3. Use optimal hashtags for discoverability
4. Include effective calls-to-action

${contextInfo}

Be specific and actionable. Return JSON only.`;

        const userPrompt = `Analyze and optimize this ${platform} caption${contentTopic ? ` for content about: ${contentTopic}` : ""}:

"""
${caption}
"""

Respond in this exact JSON format:
{
    "aiScore": <number 1-10>,
    "aiVerdict": "<one sentence summary>",
    "suggestedHookLines": ["<better first line 1>", "<better first line 2>"],
    "hashtagSuggestions": ["#hashtag1", "#hashtag2", "#hashtag3"],
    "hashtagsToRemove": ["#overused1"],
    "ctaSuggestions": ["<specific CTA 1>", "<specific CTA 2>"],
    "optimizedCaption": "<fully rewritten optimized caption with better hook, body, hashtags, and CTA>",
    "improvements": ["<specific change 1>", "<specific change 2>", "<specific change 3>"]
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No response from AI");
        }

        const parsed = JSON.parse(content);
        return {
            aiScore: parsed.aiScore || 5,
            aiVerdict: parsed.aiVerdict || "Caption analyzed",
            suggestedHookLines: parsed.suggestedHookLines || [],
            hashtagSuggestions: parsed.hashtagSuggestions || [],
            hashtagsToRemove: parsed.hashtagsToRemove || [],
            ctaSuggestions: parsed.ctaSuggestions || [],
            optimizedCaption: parsed.optimizedCaption || caption,
            improvements: parsed.improvements || [],
        };
    } catch (error) {
        console.error("AI analysis error:", error);
        return {
            aiScore: 5,
            aiVerdict: "Basic analysis completed",
            suggestedHookLines: ["Start with a question", "Try 'POV: ...'"],
            hashtagSuggestions: ["#fyp", "#foryou", "#viral"],
            hashtagsToRemove: [],
            ctaSuggestions: ["Follow for more!", "Comment your thoughts below"],
            optimizedCaption: caption,
            improvements: ["Add a stronger hook in the first line", "Include 3-5 relevant hashtags", "End with a clear call-to-action"],
        };
    }
}
