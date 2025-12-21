import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface CreatorContext {
    teamSize: number;
    primaryDevice: string | null;
    hoursPerVideo: number;
    videosPerWeek: number;
    experienceLevel: string;
    isMuslimCreator: boolean;
    prefersNoMusic: boolean;
    availableProps: string[];
    filmingLocations: string[];
}

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { script, targetPlatform, targetLengthSeconds, niche } = body;

        if (!script || script.trim().length < 10) {
            return NextResponse.json(
                { error: "Please enter a script with at least 10 characters" },
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
                const setup = profile.creatorSetup;
                creatorContext = {
                    teamSize: setup.teamSize,
                    primaryDevice: setup.primaryDevice,
                    hoursPerVideo: setup.hoursPerVideo,
                    videosPerWeek: setup.videosPerWeek,
                    experienceLevel: setup.experienceLevel,
                    isMuslimCreator: setup.isMuslimCreator,
                    prefersNoMusic: setup.prefersNoMusic,
                    availableProps: setup.availableProps,
                    filmingLocations: setup.filmingLocations,
                };
            }
        } catch (e) {
            console.log("Could not fetch creator setup:", e);
        }

        // Analyze locally first (fast feedback)
        const localAnalysis = analyzeScriptLocally(script, targetLengthSeconds || 30);

        // Build personalized context for AI
        const contextInfo = buildCreatorContextPrompt(creatorContext);

        // AI-powered deep analysis
        const aiAnalysis = await getAIScriptAnalysis(
            script,
            targetPlatform || "tiktok",
            targetLengthSeconds || 30,
            niche || "",
            contextInfo
        );

        return NextResponse.json({
            success: true,
            ...localAnalysis,
            ...aiAnalysis,
            hasCreatorContext: !!creatorContext,
        });
    } catch (error) {
        console.error("Error optimizing script:", error);
        return NextResponse.json(
            { error: "Failed to optimize script. Please try again." },
            { status: 500 }
        );
    }
}

function analyzeScriptLocally(script: string, targetSeconds: number) {
    const lines = script.split(/[.!?\n]+/).filter(l => l.trim().length > 0);
    const words = script.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // Estimate duration (average speaking pace: ~150 words/min = 2.5 words/sec)
    const estimatedSeconds = Math.round(wordCount / 2.5);

    // Hook analysis
    const firstLine = lines[0]?.trim() || "";
    let hookScore = 5;
    let hookType = "Statement";

    if (/^(pov|when|what if|imagine|stop|wait|don't skip)/i.test(firstLine)) {
        hookScore = 8;
        hookType = "Pattern Interrupt";
    } else if (/\?$/.test(firstLine)) {
        hookScore = 7;
        hookType = "Question";
    } else if (/^(the secret|nobody|everyone|this is|here's)/i.test(firstLine)) {
        hookScore = 7;
        hookType = "Bold Claim";
    } else if (/^(how to|how i|step|tutorial)/i.test(firstLine)) {
        hookScore = 6;
        hookType = "Tutorial";
    } else if (firstLine.length < 30 && firstLine.length > 0) {
        hookScore = 5;
        hookType = "Short Statement";
    }

    // Detect structure issues
    const hasOpening = lines.length > 0;
    const hasMiddle = lines.length >= 3;
    const hasClosing = /follow|like|comment|share|save|link|dm|subscribe|check/i.test(lines[lines.length - 1] || "");

    // Duration warnings
    const durationStatus = estimatedSeconds <= targetSeconds * 0.8 ? "too_short" :
        estimatedSeconds >= targetSeconds * 1.2 ? "too_long" : "good";

    return {
        wordCount,
        estimatedSeconds,
        targetSeconds,
        durationStatus,
        hookScore,
        hookType,
        hookLine: firstLine.substring(0, 100),
        structure: {
            hasOpening,
            hasMiddle,
            hasClosing,
            lineCount: lines.length,
        },
    };
}

function buildCreatorContextPrompt(context: CreatorContext | null): string {
    if (!context) {
        return "The creator has not provided their setup details.";
    }

    let prompt = "CREATOR CONTEXT (use this to personalize suggestions):\n";

    prompt += `- Team size: ${context.teamSize === 1 ? "Solo creator (films alone)" : `${context.teamSize} people`}\n`;

    if (context.primaryDevice) {
        prompt += `- Camera: ${context.primaryDevice}\n`;
    }

    prompt += `- Time budget: ${context.hoursPerVideo} hours per video\n`;
    prompt += `- Posting frequency: ${context.videosPerWeek}x per week\n`;
    prompt += `- Experience level: ${context.experienceLevel}\n`;

    if (context.availableProps.length > 0) {
        prompt += `- Available props: ${context.availableProps.join(", ")}\n`;
    }

    if (context.filmingLocations.length > 0) {
        prompt += `- Filming locations: ${context.filmingLocations.join(", ")}\n`;
    }

    if (context.isMuslimCreator) {
        prompt += `- Muslim creator: Yes\n`;
        if (context.prefersNoMusic) {
            prompt += `- Audio preference: NO background music (suggest voice, sound effects, or nasheeds only)\n`;
        }
    }

    return prompt;
}

async function getAIScriptAnalysis(
    script: string,
    platform: string,
    targetSeconds: number,
    niche: string,
    creatorContext: string
): Promise<{
    aiScore: number;
    hookScore?: number;
    aiVerdict: string;
    suggestions: string[];
    alternativeHooks: string[];
    hookRanking?: { recommended: string; reasoning: string };
    audienceClassification?: { energyLevel: string; motivation: string; reasoning: string };
    improvedScript: string;
    ctaSuggestion: string;
}> {
    try {
        const systemPrompt = `You are an expert short-form video script consultant specializing in ${platform} content.

${creatorContext}

BANNED WORDS/PHRASES (never use these - they sound AI-generated):
- "powerhouse", "game-changer", "revolutionary", "industry-leading"
- "dive into", "unleashing", "defies", "truly makes your heart race"
- "discover what makes", "meet the", "embark on", "world of"
- "redefine", "redefines", "transcends", "elevates", "epitome"

YOUR JOB IS TO HELP IMPROVE THE SCRIPT. Always provide feedback on:
- Word choices (simpler alternatives, more impactful words)
- Flow and pacing (are some parts too long, too short, awkward?)
- Clarity (are any parts confusing?)
- Structure (does the middle section work? transitions?)
- Specific phrases that could be reworded better

=== NON-BINARY HOOK OPTIMIZATION SYSTEM ===

STEP 1: CLASSIFY THE AUDIENCE (do this first!)

Analyze the script and determine:

A) ENERGY LEVEL:
- HIGH: dominant, hype-driven, status, flex, aggression, intensity
- LOW/MEDIUM: curious, relaxed, entertainment, learning, chill

B) AUDIENCE MOTIVATION:
- Impress / dominate / feel powerful
- Learn / discover / be entertained
- Laugh / relate
- Feel suspense / tension

STEP 2: HOOK TYPE DECISION MATRIX

🔴 BOLD STATEMENT HOOKS work when:
- HIGH energy audience
- Content: supercars, racing, gym, physique, hustle, money, confidence, confrontational opinions
- Emotional goal: authority, shock, aspiration, status
- Examples: "This is the best V12 ever made." / "Most people will never understand this."

🔵 CURIOSITY/QUESTION HOOKS work when:
- LOW/MEDIUM energy audience  
- Content: fun facts, science, experiments, history, memes, chill storytelling
- Emotional goal: wonder, discovery, comfort curiosity
- Examples: "Have you ever wondered why…" / "What happens if you…"

🟡 PATTERN-INTERRUPT HOOKS work when:
- Script is neutral or informational
- Audience is mixed
- Platform is scroll-heavy
- Examples: "Nobody talks about this part…" / "This looks fake, but it's real."

STEP 3: GENERATE ALL 3 HOOK TYPES
- You MUST generate hooks in all 3 styles (bold, curiosity, pattern-interrupt)
- Then RANK them based on: audience alignment, emotional immediacy, scroll-stopping power, natural fit
- Explain WHY the top-ranked hook works best FOR THIS SPECIFIC CONTENT

CRITICAL ANTI-BINARY RULE:
- Never say "X works better than Y" without adding "for this audience/script/context"
- Every recommendation MUST include "This works because..."

STEP 4: SCORING HOOKS HONESTLY
- Use FULL 1-10 range based on how well the hook fits THIS specific content
- A hook that fits the audience perfectly: 8-10
- A hook that's okay but not optimal for this audience: 5-7  
- A hook that doesn't fit this audience at all: 1-4

RULES FOR CTAs:
- CTAs only appear when: audience is very young, platform favors engagement farming, or script doesn't already prompt action
- Otherwise: NO CTA or implicit CTA (curiosity loop)
- Adult content should END naturally, no questions

RULES FOR LANGUAGE:
- Use the banned words list - never include those phrases
- Keep language simple and natural
- Match how real TikTokers/YouTubers in this niche actually talk

Return JSON only.`;

        const userPrompt = `Analyze this ${platform} script (target length: ${targetSeconds} seconds${niche ? `, niche: ${niche}` : ""}).

SCRIPT:
"""
${script}
"""

STEP 1: Classify the audience energy and motivation from this script.
STEP 2: Generate 3 hook alternatives (one bold statement, one curiosity question, one pattern-interrupt).
STEP 3: Rank them by fit for THIS specific content and explain why.

Provide feedback on word choices, flow, clarity, and structure.

Respond in JSON:
{
    "audienceClassification": {
        "energyLevel": "<HIGH or LOW/MEDIUM>",
        "motivation": "<impress/dominate | learn/discover | laugh/relate | suspense/tension>",
        "reasoning": "<why you classified it this way>"
    },
    "aiScore": <1-10 based on how good the script is>,
    "hookScore": <1-10 based on how well current hook fits THIS audience>,
    "aiVerdict": "<one sentence assessment>",
    "suggestions": [
        "<specific suggestion>",
        "<another suggestion>"
    ],
    "hookAlternatives": {
        "boldStatement": "<bold/confident hook for this content>",
        "curiosityQuestion": "<curiosity-based hook for this content>",
        "patternInterrupt": "<pattern-interrupt hook for this content>"
    },
    "hookRanking": {
        "recommended": "<boldStatement | curiosityQuestion | patternInterrupt>",
        "reasoning": "This works for this content because..."
    },
    "improvedScript": "<rewrite with suggestions - use line breaks between sections for readability>",
    "ctaSuggestion": "<for adult: 'No CTA needed' or how to strengthen ending>"
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

        // Convert new hookAlternatives format to alternativeHooks array for frontend compatibility
        let alternativeHooks: string[] = [];
        if (parsed.hookAlternatives) {
            const ha = parsed.hookAlternatives;
            // Order by ranking if available
            const recommended = parsed.hookRanking?.recommended;
            if (recommended === "boldStatement") {
                alternativeHooks = [ha.boldStatement, ha.curiosityQuestion, ha.patternInterrupt].filter(Boolean);
            } else if (recommended === "curiosityQuestion") {
                alternativeHooks = [ha.curiosityQuestion, ha.boldStatement, ha.patternInterrupt].filter(Boolean);
            } else {
                alternativeHooks = [ha.patternInterrupt, ha.boldStatement, ha.curiosityQuestion].filter(Boolean);
            }
        } else if (parsed.alternativeHooks) {
            alternativeHooks = parsed.alternativeHooks;
        }

        return {
            aiScore: parsed.aiScore || 5,
            hookScore: parsed.hookScore,
            aiVerdict: parsed.aiVerdict || "Script analyzed",
            suggestions: parsed.suggestions || [],
            alternativeHooks,
            hookRanking: parsed.hookRanking,
            audienceClassification: parsed.audienceClassification,
            improvedScript: parsed.improvedScript || script,
            ctaSuggestion: parsed.ctaSuggestion || "Add a call-to-action at the end",
        };
    } catch (error) {
        console.error("AI analysis error:", error);
        // Return fallback analysis
        return {
            aiScore: 5,
            aiVerdict: "Unable to perform AI analysis. Here's the basic analysis.",
            suggestions: [
                "Start with a stronger hook in the first line",
                "Make sure your main point is clear within the first 5 seconds",
                "End with a clear call-to-action",
            ],
            alternativeHooks: [],
            improvedScript: script,
            ctaSuggestion: "Ask viewers to follow for more content like this",
        };
    }
}
