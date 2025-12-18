// AI-powered insights generation for content analysis

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface AnalysisData {
    niche: string;
    hooks: Array<{ text: string; views: number; likes: number; engagement: string }>;
    hashtags: Array<{ tag: string; category: string; viewCount?: number }>;
    formats: Array<{ name: string; averageLength: string; whyItWorks: string }>;
    videoCount: number;
    topViewCount: number;
}

interface AIInsights {
    summary: string;
    contentIdeas: string[];
    bestPostingStrategy: string;
    hookRecommendations: string[];
    warnings: string[];
}

/**
 * Generate AI-powered insights from the analysis data
 */
export async function generateAIInsights(data: AnalysisData): Promise<AIInsights> {
    if (!OPENAI_API_KEY) {
        console.log("OpenAI API key not set, using template insights");
        return generateTemplateInsights(data);
    }

    try {
        const prompt = buildPrompt(data);

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a social media strategist specializing in TikTok content for Muslim creators. 
                        Analyze the provided data and give specific, actionable insights.
                        Be concise but helpful. Focus on what will actually help them grow.
                        Respond in JSON format with the following structure:
                        {
                            "summary": "2-3 sentence overview of what's working",
                            "contentIdeas": ["idea 1", "idea 2", "idea 3"],
                            "bestPostingStrategy": "When and how often to post",
                            "hookRecommendations": ["hook pattern 1", "hook pattern 2"],
                            "warnings": ["any things to avoid or be careful about"]
                        }`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 800,
            }),
        });

        if (!response.ok) {
            console.error("OpenAI API error:", response.status);
            return generateTemplateInsights(data);
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content;

        if (!content) {
            return generateTemplateInsights(data);
        }

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                summary: parsed.summary || "",
                contentIdeas: parsed.contentIdeas || [],
                bestPostingStrategy: parsed.bestPostingStrategy || "",
                hookRecommendations: parsed.hookRecommendations || [],
                warnings: parsed.warnings || [],
            };
        }

        return generateTemplateInsights(data);
    } catch (error) {
        console.error("Error generating AI insights:", error);
        return generateTemplateInsights(data);
    }
}

function buildPrompt(data: AnalysisData): string {
    const topHooks = data.hooks.slice(0, 5).map(h => `"${h.text}" (${h.views} views)`).join("\n");
    const topHashtags = data.hashtags.slice(0, 5).map(h => `#${h.tag} (${h.category})`).join(", ");
    const formats = data.formats.map(f => `${f.name}: ${f.averageLength}`).join("\n");

    return `
Analyze this TikTok data for the "${data.niche}" niche (Muslim creator focus):

TOP PERFORMING HOOKS (what creators are saying):
${topHooks}

TRENDING HASHTAGS:
${topHashtags}

POPULAR VIDEO FORMATS:
${formats}

STATS:
- Analyzed ${data.videoCount} trending videos
- Top video has ${data.topViewCount.toLocaleString()} views

Based on this real data, provide specific insights for a Muslim content creator in this niche.
What patterns do you see? What should they do this week?
    `.trim();
}

/**
 * Generate template-based insights when AI is not available
 * Now derives content ideas from ACTUAL video patterns, not static templates
 */
function generateTemplateInsights(data: AnalysisData): AIInsights {
    const nicheCapitalized = data.niche.charAt(0).toUpperCase() + data.niche.slice(1);

    // Extract patterns from actual hooks/captions
    const hookPatterns: string[] = [];
    const actualPatterns: string[] = [];

    // Analyze what's actually in the videos
    data.hooks.forEach(h => {
        const text = h.text.toLowerCase();

        // Detect video types from descriptions
        if (text.includes("quran") || text.includes("recit") || text.includes("tilawa")) {
            actualPatterns.push("quran_recitation");
        }
        if (text.includes("kaaba") || text.includes("mecca") || text.includes("umrah") || text.includes("hajj")) {
            actualPatterns.push("kaaba_footage");
        }
        if (text.includes("prayer") || text.includes("salah") || text.includes("rakaa") || text.includes("sujood")) {
            actualPatterns.push("prayer_content");
        }
        if (text.includes("pov") || text.includes("when you") || text.includes("me when")) {
            actualPatterns.push("relatable_meme");
        }
        if (text.includes("hijab") || text.includes("modest")) {
            actualPatterns.push("hijab_fashion");
        }
        if (text.includes("recipe") || text.includes("cook") || text.includes("food")) {
            actualPatterns.push("food_content");
        }
        if (text.includes("dua") || text.includes("dhikr") || text.includes("allah")) {
            actualPatterns.push("spiritual_reminder");
        }
        if (text.includes("story") || text.includes("revert") || text.includes("journey")) {
            actualPatterns.push("personal_story");
        }
    });

    // Get unique patterns
    const uniquePatterns = Array.from(new Set(actualPatterns));

    // Generate content ideas based on WHAT'S ACTUALLY PERFORMING
    const contentIdeas: string[] = [];

    if (uniquePatterns.includes("quran_recitation")) {
        contentIdeas.push("🎧 Record yourself reciting a short surah with English subtitles");
        contentIdeas.push("📖 Share a verse that hits different with your personal reflection");
    }
    if (uniquePatterns.includes("kaaba_footage")) {
        contentIdeas.push("🕋 Create a 'Umrah/Hajj vlog' style video if you've been");
        contentIdeas.push("✨ Share the emotional moment you saw the Kaaba for the first time");
    }
    if (uniquePatterns.includes("prayer_content")) {
        contentIdeas.push("😂 \"When you forget which rakaa you're on\" - relatable prayer moments");
        contentIdeas.push("🙏 Film a peaceful Fajr routine that inspires others");
    }
    if (uniquePatterns.includes("relatable_meme")) {
        contentIdeas.push("🤣 Create a \"POV: Muslim problems\" that everyone relates to");
        contentIdeas.push("😅 Film \"Me trying to explain Eid to my coworkers\"");
    }
    if (uniquePatterns.includes("hijab_fashion")) {
        contentIdeas.push("👗 Film a modest GRWM (Get Ready With Me)");
        contentIdeas.push("💫 Create \"3 ways to style the same hijab\"");
    }
    if (uniquePatterns.includes("food_content")) {
        contentIdeas.push("🍽️ Film your best iftar recipe step-by-step");
        contentIdeas.push("🧑‍🍳 Share your secret family recipe");
    }
    if (uniquePatterns.includes("spiritual_reminder")) {
        contentIdeas.push("💭 Share a dua that was answered for you");
        contentIdeas.push("✨ Create a dhikr morning routine video");
    }
    if (uniquePatterns.includes("personal_story")) {
        contentIdeas.push("📖 Share your journey - what brought you closer to deen");
        contentIdeas.push("💪 Tell a story of when faith helped you through hardship");
    }

    // If no patterns detected, give generic but useful ideas based on niche
    if (contentIdeas.length < 3) {
        contentIdeas.push(`📹 Recreate the top performing video style in your own way`);
        contentIdeas.push(`💬 Film a reaction to a trending topic in ${nicheCapitalized}`);
        contentIdeas.push(`🎯 Answer a common question your audience has`);
    }

    // Limit to 5 ideas
    const finalIdeas = contentIdeas.slice(0, 5);

    // Hook pattern analysis
    if (data.hooks.some(h => h.text.toLowerCase().includes("pov"))) {
        hookPatterns.push("\"POV:\" format is performing well - use it!");
    }
    if (data.hooks.some(h => h.text.toLowerCase().includes("when you") || h.text.toLowerCase().includes("me when"))) {
        hookPatterns.push("Relatable \"when you/me when\" hooks are trending");
    }
    if (data.hooks.some(h => h.text.toLowerCase().includes("this"))) {
        hookPatterns.push("Start with 'This...' to create curiosity");
    }
    if (data.hooks.length > 0) {
        const avgWordCount = Math.round(data.hooks.reduce((sum, h) => sum + h.text.split(' ').length, 0) / data.hooks.length);
        hookPatterns.push(`Keep hooks around ${avgWordCount} words (based on top videos)`);
    }

    const videoCountText = data.videoCount > 0
        ? `Based on ${data.videoCount} trending videos in ${nicheCapitalized}`
        : `Based on current ${nicheCapitalized} trends`;

    const viewsText = data.topViewCount > 10000
        ? ` Top videos average ${Math.round(data.topViewCount / 1000)}K+ views.`
        : ` Focus on authentic content.`;

    // Generate pattern-based summary
    let patternSummary = "";
    if (uniquePatterns.length > 0) {
        const patternNames: Record<string, string> = {
            "quran_recitation": "Quran recitations",
            "kaaba_footage": "Kaaba/Umrah footage",
            "prayer_content": "prayer-related content",
            "relatable_meme": "relatable memes",
            "hijab_fashion": "hijab/modest fashion",
            "food_content": "halal food videos",
            "spiritual_reminder": "spiritual reminders",
            "personal_story": "personal journey stories",
        };
        const topPatterns = uniquePatterns.slice(0, 3).map(p => patternNames[p] || p).join(", ");
        patternSummary = ` We're seeing strong performance from: ${topPatterns}.`;
    }

    return {
        summary: `${videoCountText}.${viewsText}${patternSummary} Create content similar to what's working but add your unique perspective.`,
        contentIdeas: finalIdeas,
        bestPostingStrategy: "Post consistently 4-7 times per week. Best times are typically 7-9 AM and 7-10 PM in your target timezone.",
        hookRecommendations: hookPatterns.length > 0 ? hookPatterns : [
            "Start with a question or bold statement",
            "Use 'POV:' format for relatable content",
            "Open with action, not context",
        ],
        warnings: [
            "Don't just copy - add your unique voice and perspective",
            "Be authentic - audiences can tell when content is forced",
            "Stay consistent with posting to build momentum",
        ],
    };
}

export type { AIInsights, AnalysisData };
