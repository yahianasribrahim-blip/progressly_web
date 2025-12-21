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
You help creators optimize their scripts for maximum engagement, retention, and conversion.

${creatorContext}

IMPORTANT RULES:
1. All suggestions MUST be realistic for this specific creator's setup (team size, equipment, time)
2. If the creator is Muslim and prefers no music, NEVER suggest background music
3. Be specific and actionable - no generic advice
4. Focus on what they can actually do with their resources
5. Keep the script's original voice and message intact`;

        const userPrompt = `Analyze this ${platform} script (target length: ${targetSeconds} seconds${niche ? `, niche: ${niche}` : ""}):

"""
${script}
"""

Respond in this exact JSON format:
{
    "aiScore": <number 1-10>,
    "aiVerdict": "<one sentence verdict>",
    "suggestions": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>"],
    "alternativeHooks": ["<better hook option 1>", "<better hook option 2>"],
    "improvedScript": "<rewritten version of the script with improvements>",
    "ctaSuggestion": "<specific call-to-action they should add or improve>"
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
