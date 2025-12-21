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
    aiVerdict: string;
    suggestions: string[];
    alternativeHooks: string[];
    improvedScript: string;
    ctaSuggestion: string;
}> {
    try {
        const systemPrompt = `You are an expert short-form video script consultant specializing in ${platform} content.

${creatorContext}

BANNED WORDS/PHRASES (never use these - they sound AI-generated and cringe):
- "powerhouse", "game-changer", "game-changing", "revolutionary", "industry-leading"
- "dive into", "dive in", "unleashing", "defies", "truly makes your heart race"
- "discover what makes", "meet the", "let me take you", "embark on"
- "world of", "ever felt", "ever wondered", "what if I told you"  
- Any overly enthusiastic or exaggerated language that real creators don't use

CRITICAL RULES:

1. DETECT CONTEXT FIRST:
   - VIDEO FORMAT: talking-to-camera, showcase, meme, narration?
   - AUDIENCE: kids (<12), teens, young adults, professionals, niche community?
   - CONTENT TYPE: comedy, educational, showcase, meme, ASMR, review?

2. FOR HOOKS:
   - If the original hook is ALREADY GOOD, say so! Don't force alternatives
   - Simple, direct statements often work better than questions
   - Real creators say things like "I genuinely think..." not "Have you ever felt..."
   - Use common words, not fancy vocabulary
   - Match how real YouTubers/TikTokers in that niche actually speak

3. FOR CTAs:
   - ADULT audiences (16+): Usually NO CTA needed. They engage naturally.
   - Videos do NOT end like essays. Never suggest open-ended questions like "What's your dream car?"
   - Only suggest CTAs for content aimed at very young audiences (<12)
   - Most viral videos just END on a strong statement, not a question

4. FOR SUGGESTIONS:
   - Only suggest things the script is ACTUALLY missing
   - Don't force "add personal anecdote" if the script is already descriptive and engaging
   - Avoid generic tips that would appear on any "top 10 script tips" list
   - If the script is good, SAY IT'S GOOD. Score it high.

5. KEEP THE ORIGINAL VOICE:
   - The creator's natural way of speaking is often better than "optimized" versions
   - Simple language > fancy vocabulary
   - Authentic > polished

Return JSON only.`;

        const userPrompt = `Analyze this ${platform} script (target length: ${targetSeconds} seconds${niche ? `, niche: ${niche}` : ""}):

"""
${script}
"""

IMPORTANT: 
- If the original hook and script are already good, acknowledge that! Don't force changes.
- Do NOT use any banned words from the system prompt
- Do NOT end with open questions like essays do
- For adult audiences, CTAs are often unnecessary

Respond in this exact JSON format:
{
    "aiScore": <number 1-10 - if script is genuinely good, give 8-9>,
    "aiVerdict": "<honest one sentence - if it's good, say it's good>",
    "suggestions": ["<only suggest if actually needed, be specific to THIS script, not generic tips>"],
    "alternativeHooks": ["<only if original hook needs improvement - use simple, natural language>"],
    "improvedScript": "<keep changes minimal if original is good, NO open-ended question at the end>",
    "ctaSuggestion": "<for adult audiences, often 'No CTA needed - the video ends naturally' is the right answer>"
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
            aiVerdict: parsed.aiVerdict || "Script analyzed",
            suggestions: parsed.suggestions || [],
            alternativeHooks: parsed.alternativeHooks || [],
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
