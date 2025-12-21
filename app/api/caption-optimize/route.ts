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

    // Check for emojis - simple approach that counts common emoji patterns
    const emojiMatches = caption.match(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g) || [];
    const emojiCount = emojiMatches.join('').length;

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
4. Include effective calls-to-action WHEN APPROPRIATE

${contextInfo}

CRITICAL CONTEXT AWARENESS RULES:
First, detect from the caption and content topic:
- VIDEO FORMAT: Is this a talking-to-camera video, action/showcase video, meme/relatable moment, slideshow, etc.?
- TARGET AUDIENCE: Kids/teens (under 16), young adults, professionals, niche community?
- CONTENT TYPE: Educational, comedy, meme, documentary, tutorial, ASMR/satisfying, relatable moment, product showcase?

Then apply these CTA rules:
- For MEME/RELATABLE content for young audiences: "Comment below", "Tag a friend" CTAs are FINE
- For Reddit stories, Daily Dopamine Dose style: Comment/tag CTAs work well
- For PROFESSIONAL/ADULT content: Use statement CTAs that trigger engagement naturally, NOT "let me know in comments"
- For EDUCATIONAL content: "Save this for later" works better than "comment"
- For ASMR/SATISFYING content: Often NO CTA is better - let the content speak

HOOK RULES:
- Match the hook style to the video format
- If it's a talking video, don't suggest hooks that imply action ("Watch me do X")
- If it's a meme compilation, use relatable hooks
- Make hooks feel NATURAL and HUMAN, not AI-generated (avoid words like "defies", "unleashing")

Be specific and actionable. Return JSON only.`;

        const userPrompt = `Analyze and optimize this ${platform} caption for content about: ${contentTopic}

CAPTION:
"""
${caption}
"""

First, silently determine:
1. What's the likely video format? (talking to camera, action, meme, slideshow, etc.)
2. Who's the likely target audience? (kids, teens, young adults, professionals)
3. What's the content type? (comedy, educational, meme, documentary, ASMR, relatable)

Then provide analysis that matches this context. Don't suggest CTAs like "comment below" for professional content, but DO suggest them for meme/kid content if appropriate.

Respond in this exact JSON format:
{
    "aiScore": <number 1-10, give honest varied scores based on actual quality>,
    "aiVerdict": "<one sentence summary>",
    "suggestedHookLines": ["<hook that matches the video format and feels natural>", "<alternative>"],
    "hashtagSuggestions": ["#hashtag1", "#hashtag2", "#hashtag3"],
    "hashtagsToRemove": ["#overused1"],
    "ctaSuggestions": ["<CONTEXT-APPROPRIATE CTA based on detected audience and content type>"],
    "optimizedCaption": "<fully rewritten optimized caption with context-appropriate hook, body, hashtags, and CTA>",
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
