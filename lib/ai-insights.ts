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
 */
function generateTemplateInsights(data: AnalysisData): AIInsights {
    const nicheCapitalized = data.niche.charAt(0).toUpperCase() + data.niche.slice(1);

    // Extract patterns from hooks
    const hookPatterns: string[] = [];
    if (data.hooks.some(h => h.text.toLowerCase().includes("how"))) {
        hookPatterns.push("Use 'how-to' style openings - they grab attention");
    }
    if (data.hooks.some(h => h.text.toLowerCase().includes("this"))) {
        hookPatterns.push("Start with 'This is...' or 'This changed...' for curiosity");
    }
    if (data.hooks.length > 0) {
        const avgWordCount = Math.round(data.hooks.reduce((sum, h) => sum + h.text.split(' ').length, 0) / data.hooks.length);
        hookPatterns.push(`Keep hooks around ${avgWordCount} words or less`);
    }

    // Generate content ideas based on niche
    const nicheIdeas: Record<string, string[]> = {
        cultural: [
            "Share a Ramadan preparation routine",
            "Document Eid family traditions",
            "Show cultural recipes with modern twists",
        ],
        deen: [
            "Share a powerful Quran verse with context",
            "Create a series on Sunnah practices",
            "Answer common questions about Islam",
        ],
        hijab: [
            "Create a 'Get Ready With Me' hijab tutorial",
            "Share modest fashion for different occasions",
            "Review hijab-friendly products",
        ],
        food: [
            "Make a halal version of a trending recipe",
            "Share iftar/suhoor meal prep tips",
            "Document eating at halal restaurants",
        ],
        gym: [
            "Share modest workout outfit ideas",
            "Create a Ramadan-friendly workout routine",
            "Show gym-friendly hijab styles",
        ],
        default: [
            "Create content around current trending sounds",
            "Share your unique perspective on trending topics",
            "Make a series that keeps viewers coming back",
        ],
    };

    const contentIdeas = nicheIdeas[data.niche.toLowerCase()] || nicheIdeas.default;

    const videoCountText = data.videoCount > 0
        ? `Based on ${data.videoCount} trending videos in ${nicheCapitalized}`
        : `Based on current ${nicheCapitalized} trends`;

    const viewsText = data.topViewCount > 10000
        ? ` Top videos average ${Math.round(data.topViewCount / 1000)}K+ views with`
        : ` The best content features`;

    return {
        summary: `${videoCountText}, we found that authentic, relatable content performs best.${viewsText} strong hooks that immediately grab attention.`,
        contentIdeas,
        bestPostingStrategy: "Post consistently 4-7 times per week. Best times are typically 7-9 AM and 7-10 PM in your target timezone. Ramadan season shows higher engagement for Islamic content.",
        hookRecommendations: hookPatterns.length > 0 ? hookPatterns : [
            "Start with a question or bold statement",
            "Use 'POV:' format for relatable content",
            "Open with action, not context",
        ],
        warnings: [
            "Avoid overusing trending sounds if they don't fit your niche",
            "Don't copy hooks word-for-word - add your unique voice",
            "Be mindful of respectful representation in cultural content",
        ],
    };
}

export type { AIInsights, AnalysisData };
