import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import OpenAI from "openai";
import { canUseOptimization, recordOptimizationUsage, PLAN_LIMITS } from "@/lib/user";

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

        // Get user's plan from database
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { stripePriceId: true }
        });

        // Determine plan from stripePriceId
        let plan: "free" | "starter" | "pro" = "free";
        if (user?.stripePriceId) {
            const starterPriceId = process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID;
            const proPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
            if (user.stripePriceId === proPriceId) {
                plan = "pro";
            } else if (user.stripePriceId === starterPriceId) {
                plan = "starter";
            }
        }

        // Check usage limits
        const usageCheck = await canUseOptimization(session.user.id, plan);
        if (!usageCheck.allowed) {
            const planLimits = PLAN_LIMITS[plan];
            return NextResponse.json({
                error: usageCheck.message || "Optimization limit reached",
                limitReached: true,
                currentPlan: plan,
                limit: planLimits.optimizationsPerMonth,
                remaining: 0,
            }, { status: 403 });
        }

        const body = await request.json();
        const { caption, contentTopic, targetPlatform } = body;

        if (!caption || caption.trim().length < 5) {
            return NextResponse.json(
                { error: "Please enter a caption with at least 5 characters" },
                { status: 400 }
            );
        }

        // Content moderation - block inappropriate captions
        const inappropriatePatterns = [
            /\b(boobs?|tits?|ass|pussy|dick|cock|nude|naked|onlyfans|sexy|sex)\b/i,
            /\b(porn|xxx|nsfw|18\+)\b/i,
        ];
        const isInappropriate = inappropriatePatterns.some(pattern => pattern.test(caption));
        if (isInappropriate) {
            return NextResponse.json(
                { error: "This caption contains inappropriate content that cannot be analyzed." },
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

        // Record the usage after successful optimization
        await recordOptimizationUsage(session.user.id);
        const updatedUsage = await canUseOptimization(session.user.id, plan);

        return NextResponse.json({
            success: true,
            ...localAnalysis,
            ...aiAnalysis,
            hasCreatorContext: !!creatorContext,
            remaining: updatedUsage.remaining,
            plan,
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
    hookScore?: number;
    aiVerdict: string;
    suggestedHookLines: string[];
    hookRanking?: { recommended: string; reasoning: string };
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
- "powerhouse", "game-changer", "revolutionary", "industry-leading"
- "dive into", "unleashing", "defies", "meet the", "discover what makes"
- "embark on", "world of", "truly", "redefine", "redefines", "transcends", "elevates"

YOUR JOB IS TO HELP IMPROVE THE CAPTION. Always provide feedback on:
- Hook effectiveness (is the first line compelling?)
- Word choices (simpler, punchier alternatives?)
- Hashtag strategy (relevant hashtags, overused ones to remove)
- Caption structure (is it easy to read?)

=== NON-BINARY CAPTION OPTIMIZATION SYSTEM ===

IMPORTANT: Captions are NOT mini-scripts. Keep them SHORT with one emotional job.

STEP 1: CLASSIFY THE AUDIENCE
A) Energy Level: HIGH (dominant, hype, flex) or LOW/MEDIUM (curious, relaxed, learning)
B) Motivation: impress/dominate | learn/discover | laugh/relate | suspense

STEP 2: CAPTION STYLE BY AUDIENCE

🔴 HIGH-ENERGY AUDIENCE CAPTIONS:
- Reinforcing statement, flex, confidence, emphasis
- Minimal or no CTA
- Example: "Naturally aspirated. No debate."

🔵 CURIOSITY AUDIENCE CAPTIONS:
- Soft question or teaser, emotional intrigue
- Example: "This is way bigger than it looks."

🟡 NEUTRAL/MIXED CAPTIONS:
- Pattern-interrupt style
- Example: "Nobody talks about this part..."

STEP 3: GENERATE 3 HOOK/CAPTION OPTIONS
- One bold statement style
- One curiosity style  
- One pattern-interrupt style
Then RANK them and explain WHY the top choice fits THIS content.

ANTI-BINARY RULE:
- Never say "X works better" without "for this audience/content"
- Always include "This works because..."

SCORING:
- Use FULL 1-10 range based on fit for THIS specific content
- Perfect fit: 8-10 | Okay fit: 5-7 | Wrong fit: 1-4

RULES FOR CTAs:
- ONLY suggest a CTA if genuinely helpful for engagement
- If no CTA is needed, return an EMPTY array for ctaSuggestions
- Never return "No CTA needed" as a suggestion - just leave array empty
- Never force CTAs on adult content

RULES FOR HASHTAGS:
- ALL hashtags must be lowercase - NEVER use capital letters
- BAD: #FoodCreator, #TravelTips
- GOOD: #foodcreator, #traveltips
- Suggest only relevant hashtags for the niche

RULES FOR LANGUAGE:
- Never use words from the banned list
- Keep it simple and natural
- Match how real TikTokers/YouTubers actually caption their videos

Return JSON only.`;

        const userPrompt = `Analyze this ${platform} caption for content about: ${contentTopic}

CAPTION:
"""
${caption}
"""

STEP 1: Classify the audience (energy level + motivation).
STEP 2: Generate 3 caption hook alternatives (bold, curiosity, pattern-interrupt).
STEP 3: Rank and explain which works best FOR THIS content.

Respond in JSON:
{
    "audienceClassification": {
        "energyLevel": "<HIGH or LOW/MEDIUM>",
        "motivation": "<impress/dominate | learn/discover | laugh/relate>",
        "reasoning": "<why>"
    },
    "aiScore": <1-10 overall caption quality>,
    "hookScore": <1-10 how well current hook fits this audience>,
    "aiVerdict": "<one sentence>",
    "hookAlternatives": {
        "boldStatement": "<bold/confident hook for this content>",
        "curiosityQuestion": "<curiosity-based hook for this content>",
        "patternInterrupt": "<pattern-interrupt hook for this content>"
    },
    "hookRanking": {
        "recommended": "<boldStatement | curiosityQuestion | patternInterrupt>",
        "reasoning": "This works for this content because..."
    },
    "hashtagSuggestions": ["#lowercase1", "#neverusecapitals"],
    "hashtagsToRemove": ["#overused1"],
    "ctaSuggestions": [],
    "optimizedCaption": "<improved caption - NO essay questions>",
    "improvements": ["<specific suggestion>"]
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

        // Convert new hookAlternatives format to suggestedHookLines array for frontend compatibility
        let suggestedHookLines: string[] = [];
        if (parsed.hookAlternatives) {
            const ha = parsed.hookAlternatives;
            const recommended = parsed.hookRanking?.recommended;
            if (recommended === "boldStatement") {
                suggestedHookLines = [ha.boldStatement, ha.curiosityQuestion, ha.patternInterrupt].filter(Boolean);
            } else if (recommended === "curiosityQuestion") {
                suggestedHookLines = [ha.curiosityQuestion, ha.boldStatement, ha.patternInterrupt].filter(Boolean);
            } else {
                suggestedHookLines = [ha.patternInterrupt, ha.boldStatement, ha.curiosityQuestion].filter(Boolean);
            }
        } else if (parsed.suggestedHookLines) {
            suggestedHookLines = parsed.suggestedHookLines;
        }

        return {
            aiScore: parsed.aiScore || 5,
            hookScore: parsed.hookScore,
            aiVerdict: parsed.aiVerdict || "Caption analyzed",
            suggestedHookLines,
            hookRanking: parsed.hookRanking,
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
