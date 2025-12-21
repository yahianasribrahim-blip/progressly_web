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

        const systemPrompt = `You are an expert ${platform} caption optimizer.

${contextInfo}

BANNED WORDS/PHRASES (never use these - they sound AI-generated):
- "powerhouse", "game-changer", "revolutionary", "industry-leading", "world-changing"
- "dive into", "dive in", "unleashing", "defies", "meet the", "discover what makes"
- "embark on", "world of", "ever felt", "ever wondered", "truly"
- Any overly enthusiastic or exaggerated vocabulary that real creators don't use

CRITICAL RULES:

1. AUDIENCE DETECTION:
   - Very young (<12): Comment/tag CTAs work
   - Teens/Adults (12+): Usually NO CTA needed. People engage naturally with good content.
   - Adult niches (cars, tech, business): Definitely no "save this" or "comment below"

2. FOR HOOKS:
   - If the original hook is ALREADY GOOD (e.g., "The Best V12 Ever Made"), SAY SO
   - Don't force changes to good hooks
   - Use simple, common words - what real creators actually say
   - "I genuinely think..." is better than "Have you ever wondered..."

3. FOR CTAs:
   - For adult audiences: NO CTA is often best. Don't suggest "save this for later if you're a car lover"
   - Videos don't end like essays - no open-ended questions at the end
   - "What's your dream car?" type endings are NOT appropriate for adult content

4. FOR SUGGESTIONS:
   - Only suggest what's actually missing
   - If caption already has a good hook, don't say it "lacks engagement"
   - Avoid generic tips

5. DON'T FORCE CHANGES:
   - A simple caption can be perfect for some content
   - Authentic > over-optimized

Return JSON only.`;

        const userPrompt = `Analyze this ${platform} caption for content about: ${contentTopic}

CAPTION:
"""
${caption}
"""

IMPORTANT:
- If the hook is already compelling, say so. Don't force alternatives.
- Do NOT use banned words from the system prompt
- For adult audiences (most car content, tech, business), NO CTA is often best
- Do NOT add essay-style open questions at the end

Respond in this exact JSON format:
{
    "aiScore": <number 1-10 - simple but effective captions can score 7-8>,
    "aiVerdict": "<honest assessment - if it's good, say it's good>",
    "suggestedHookLines": ["<only if original hook needs work - use simple language>"],
    "hashtagSuggestions": ["#relevant1", "#relevant2"],
    "hashtagsToRemove": ["#overused"],
    "ctaSuggestions": ["<for adult audiences, often empty or 'No CTA needed'>"],
    "optimizedCaption": "<minimal changes if original is good, NO open-ended questions, NO fancy vocabulary>",
    "improvements": ["<only suggest what's actually missing, not generic tips>"]
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
