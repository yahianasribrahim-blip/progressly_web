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
- "powerhouse", "game-changer", "revolutionary", "industry-leading"
- "dive into", "unleashing", "defies", "meet the", "discover what makes"
- "embark on", "world of", "truly"

YOUR JOB IS TO HELP IMPROVE THE CAPTION. Always provide feedback on:
- Hook effectiveness (is the first line compelling? could it be stronger?)
- Word choices (simpler, punchier alternatives?)
- Hashtag strategy (relevant hashtags, overused ones to remove)
- Caption structure (is it easy to read?)

RULES FOR HOOKS:
- Good hooks spark either INTRIGUE or CURIOSITY:
  * INTRIGUE (bold claim): "The Ferrari 812 is the best V12 out there"
  * CURIOSITY (question): "Have you ever wondered what the sun really is?"
- BOTH styles work - neither is better than the other
- If the original hook is already a bold claim OR good question, acknowledge it's working
- For alternatives, ALWAYS suggest:
  * One BOLD CLAIM style alternative
  * One QUESTION style alternative
- Don't suggest only questions or only statements
- Match to the specific content

RULES FOR CTAs:
- For adult audiences (16+): Don't suggest "save this for later" or "comment below"
- Adult content should just END naturally without asking questions
- Only suggest interactive CTAs for very young audiences (<12)

RULES FOR SCORING - BE HONEST:
- Use the FULL 1-10 range, don't default to safe middle scores
- Excellent hooks: 8-10 | Mediocre hooks: 4-6 | Poor hooks: 1-3
- Same for overall score - genuinely good captions get 8-10

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

Provide helpful feedback on:
1. Hook - is it compelling? suggest alternatives using SIMPLE language
2. Hashtags - which are good? which are overused? what's missing?
3. Structure - easy to read?

Remember:
- Do NOT use banned AI-sounding words
- Do NOT suggest essay-style endings
- For adult content, no CTA is often best

Respond in JSON:
{
    "aiScore": <1-10>,
    "aiVerdict": "<one sentence assessment>",
    "suggestedHookLines": [
        "<alternative hook using simple, natural language>",
        "<second alternative>"
    ],
    "hashtagSuggestions": ["#relevant1", "#relevant2", "#relevant3"],
    "hashtagsToRemove": ["#overused1"],
    "ctaSuggestions": ["<for adult audiences: 'No CTA needed - caption works as is' OR leave empty>"],
    "optimizedCaption": "<improved caption with better hooks/structure - NO essay-style questions, use SIMPLE words>",
    "improvements": [
        "<specific suggestion about hook or structure>",
        "<another specific suggestion>"
    ]
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
