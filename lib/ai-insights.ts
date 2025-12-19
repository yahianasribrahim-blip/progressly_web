// AI-powered insights generation for content analysis

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface AnalysisData {
    niche: string;
    hooks: Array<{ text: string; views: number; likes: number; engagement: string }>;
    hashtags: Array<{ tag: string; category: string; viewCount?: number }>;
    formats: Array<{ name: string; averageLength: string; whyItWorks: string }>;
    videoCount: number;
    topViewCount: number;
    videoDescriptions?: string[]; // Text descriptions from TikTok
    videoThumbnails?: string[]; // NEW: Thumbnail URLs for vision analysis
}

interface AIInsights {
    summary: string;
    contentIdeas: string[];
    bestPostingStrategy: string;
    hookRecommendations: string[];
    warnings: string[];
}

/**
 * Analyze video thumbnails using GPT-4o Vision to understand video content
 */
async function analyzeVideoThumbnails(thumbnailUrls: string[], niche: string): Promise<string> {
    if (!OPENAI_API_KEY || !thumbnailUrls || thumbnailUrls.length === 0) {
        return "";
    }

    // Only analyze up to 5 thumbnails to control costs
    const urlsToAnalyze = thumbnailUrls.slice(0, 5).filter(url => url && url.startsWith("http"));

    if (urlsToAnalyze.length === 0) {
        return "";
    }

    try {
        console.log(`Analyzing ${urlsToAnalyze.length} video thumbnails with Vision API...`);

        // Build the content array with images
        const imageContent = urlsToAnalyze.map(url => ({
            type: "image_url" as const,
            image_url: { url, detail: "low" as const } // Low detail for cost efficiency
        }));

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
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `You are analyzing ${urlsToAnalyze.length} TikTok video thumbnails in the "${niche}" niche.

For each thumbnail, briefly describe what you see (person, setting, activity, text overlays).
Then identify the COMMON THEME across these videos.

Format your response as:
INDIVIDUAL VIDEOS:
1. [description]
2. [description]
...

COMMON THEME: [What these videos have in common - be specific like "family reactions to Islamic practices" or "Eid celebration moments"]

SUGGESTED CONTENT IDEA: [One specific, actionable idea based on the common theme]`
                            },
                            ...imageContent
                        ]
                    }
                ],
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            console.error("Vision API error:", response.status);
            return "";
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || "";
        console.log("Vision analysis result:", content.substring(0, 200) + "...");
        return content;
    } catch (error) {
        console.error("Error analyzing thumbnails:", error);
        return "";
    }
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
        // FIRST: Analyze thumbnails visually to understand what videos are actually about
        const visionAnalysis = await analyzeVideoThumbnails(data.videoThumbnails || [], data.niche);

        const prompt = buildPrompt(data, visionAnalysis);

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
                        content: `You are a TikTok content strategist. Your job is to analyze ACTUAL viral video descriptions and find patterns.

CRITICAL RULES:
1. READ the video descriptions provided. What do they have IN COMMON?
2. Generate content ideas that are SPECIFIC to what's actually working
3. NEVER give generic advice like "respond to comments" or "use trending audio"
4. Each idea must be ACTIONABLE: "Film your parent's reaction to learning about X" not "Make relatable content"

EXAMPLE OF WHAT YOU SHOULD DO:
If video descriptions are:
- "My mom's reaction when I told her I'm fasting"
- "Dad found out I'm learning Arabic 😂"
- "When your family sees you wearing modest clothes"

You should notice: All these are about FAMILY REACTIONS to Islamic practices
Your content idea should be: "🎬 Film a family member's genuine reaction to something you do as a Muslim - reactions videos are dominating this niche"

Respond in JSON format:
{
    "summary": "What the top videos have in common - be SPECIFIC (e.g., '4/5 videos are family reaction videos')",
    "contentIdeas": ["SPECIFIC idea based on the pattern", "another specific idea"],
    "bestPostingStrategy": "When to post",
    "hookRecommendations": ["hook pattern from the data"],
    "warnings": ["things to avoid"]
}`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000,
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

function buildPrompt(data: AnalysisData, visionAnalysis?: string): string {
    const topHooks = data.hooks.slice(0, 5).map(h => `"${h.text}" (${h.views} views)`).join("\n");
    const topHashtags = data.hashtags.slice(0, 5).map(h => `#${h.tag} (${h.category})`).join(", ");
    const formats = data.formats.map(f => `${f.name}: ${f.averageLength}`).join("\n");

    // Video descriptions as fallback
    const videoDescriptions = data.videoDescriptions?.slice(0, 5).map((desc, i) =>
        `Video ${i + 1}: "${desc.substring(0, 200)}${desc.length > 200 ? '...' : ''}"`
    ).join("\n") || "No descriptions available";

    // Vision analysis is the MOST IMPORTANT part
    const visionSection = visionAnalysis ? `
=== VISUAL ANALYSIS OF TOP VIDEOS (MOST IMPORTANT!) ===
Our AI analyzed the actual video thumbnails and found:
${visionAnalysis}
===

USE THE VISION ANALYSIS ABOVE TO GENERATE YOUR CONTENT IDEAS. The visual analysis tells you what videos are actually about, not just what their text captions say.

` : "";

    return `
Analyze this TikTok data for the "${data.niche}" niche:

${visionSection}VIDEO TEXT DESCRIPTIONS (often incomplete/unhelpful):
${videoDescriptions}

TOP PERFORMING HOOKS:
${topHooks}

TRENDING HASHTAGS:
${topHashtags}

POPULAR VIDEO FORMATS:
${formats}

STATS:
- Analyzed ${data.videoCount} trending videos
- Top video has ${data.topViewCount.toLocaleString()} views

CRITICAL INSTRUCTIONS:
1. PRIORITIZE the vision analysis above - it tells you what videos are ACTUALLY about
2. Generate content ideas based on the COMMON THEME from vision analysis
3. Be SPECIFIC: "Film an Eid celebration moment with family" not "make relatable content"
4. If vision says "Eid celebrations", suggest Eid content. If it says "reversion stories", suggest reversion content.

Based on this real data, provide specific insights for a content creator in this niche.
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

    // If no patterns detected, analyze video descriptions for common themes
    if (contentIdeas.length < 3 && data.videoDescriptions && data.videoDescriptions.length > 0) {
        const descriptions = data.videoDescriptions.slice(0, 5).join(" ").toLowerCase();

        // Look for common themes in the descriptions
        const themeKeywords = [
            { keywords: ["reaction", "reacted", "face when", "expression"], theme: "reaction", idea: "🎬 Film someone's genuine reaction - reaction videos are trending in this niche" },
            { keywords: ["mom", "dad", "parent", "family", "mom's", "dad's"], theme: "family", idea: "👨‍👩‍👧 Create content involving family members - family content is performing well" },
            { keywords: ["pov:", "pov"], theme: "pov", idea: "🎭 Use the POV format - it's dominating this niche" },
            { keywords: ["how to", "tutorial", "step", "guide"], theme: "tutorial", idea: "📚 Create a how-to or tutorial - educational content is working" },
            { keywords: ["day in", "routine", "morning", "night"], theme: "routine", idea: "☀️ Film a day-in-the-life or routine video - these are trending" },
            { keywords: ["storytime", "story time", "what happened"], theme: "story", idea: "📖 Share a personal storytime - story content is engaging viewers" },
            { keywords: ["vs", "versus", "or", "comparison"], theme: "comparison", idea: "⚖️ Make a comparison or 'this vs that' video - these are getting views" },
            { keywords: ["challenge", "trying", "tried"], theme: "challenge", idea: "🎯 Try a challenge video - challenges are performing well" },
        ];

        for (const { keywords, idea } of themeKeywords) {
            if (keywords.some(k => descriptions.includes(k)) && contentIdeas.length < 5) {
                if (!contentIdeas.includes(idea)) {
                    contentIdeas.push(idea);
                }
            }
        }
    }

    // Absolute fallback - still better than nothing
    if (contentIdeas.length < 2) {
        contentIdeas.push(`📹 Study the example videos and create something similar with your own twist`);
        contentIdeas.push(`🎯 Use one of the hook styles shown above - they're working in this niche`);
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

    // Properly format the view count
    const formatViews = (count: number): string => {
        if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
        if (count >= 1000) return Math.round(count / 1000) + "K";
        return count.toString();
    };

    const viewsText = data.topViewCount > 10000
        ? ` Top videos average ${formatViews(data.topViewCount)}+ views.`
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
