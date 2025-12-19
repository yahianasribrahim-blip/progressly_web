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
 * Downloads and base64 encodes images to avoid URL access issues
 */
async function analyzeVideoThumbnails(thumbnailUrls: string[], niche: string): Promise<string> {
    if (!OPENAI_API_KEY || !thumbnailUrls || thumbnailUrls.length === 0) {
        console.log("Vision skipped: no API key or thumbnails");
        return "";
    }

    // Only analyze up to 5 thumbnails to control costs
    const urlsToAnalyze = thumbnailUrls.slice(0, 5).filter(url => url && url.startsWith("http"));

    if (urlsToAnalyze.length === 0) {
        console.log("Vision skipped: no valid thumbnail URLs");
        return "";
    }

    try {
        console.log(`Analyzing ${urlsToAnalyze.length} video thumbnails with Vision API...`);
        console.log("Thumbnail URLs:", urlsToAnalyze);

        // Try to download and base64 encode images (more reliable than URL access)
        const base64Images: string[] = [];
        for (const url of urlsToAnalyze) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const base64 = Buffer.from(buffer).toString('base64');
                    const contentType = response.headers.get('content-type') || 'image/jpeg';
                    base64Images.push(`data:${contentType};base64,${base64}`);
                    console.log(`Downloaded thumbnail: ${url.substring(0, 50)}...`);
                }
            } catch (e) {
                console.log(`Failed to download thumbnail: ${url.substring(0, 50)}...`);
            }
        }

        if (base64Images.length === 0) {
            console.log("Vision skipped: could not download any thumbnails");
            return "";
        }

        // Build the content array with base64 images
        const imageContent = base64Images.map(base64Url => ({
            type: "image_url" as const,
            image_url: { url: base64Url, detail: "low" as const }
        }));

        console.log(`Sending ${imageContent.length} images to GPT-4o Vision...`);

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
                                text: `You are analyzing ${imageContent.length} TikTok video thumbnails from the "${niche}" niche.

CRITICAL: Focus on understanding what the video is ABOUT, not just what you SEE.

For each thumbnail, look for:
1. TEXT OVERLAYS or CAPTIONS visible on screen (this often reveals the video's topic)
2. The EXPRESSION or ACTION of people (talking to camera = educational, emotional = storytime, POV style, etc.)
3. Any CONTEXT CLUES about the video's purpose (teaching, entertaining, inspiring, selling)

DO NOT just describe backgrounds, settings, or decorations. A forest background is IRRELEVANT - what matters is WHY the video was made.

Format response:
VIDEOS ANALYZED:
1. [TEXT ON SCREEN: "quote" or None] - [What the video is probably ABOUT, not what you see]
2. ...

COMMON VIDEO TYPE: [What TYPE of content these are - e.g., "Educational analogies", "Spiritual reminders", "POV comedy skits", "Storytime/testimonials", "How-to tutorials"]

SUGGESTED CONTENT IDEA: [One idea that matches the ACTUAL content type, not the visual style. If videos are educational analogies, suggest an analogy topic. If they're POV comedy, suggest a POV scenario.]`
                            },
                            ...imageContent
                        ]
                    }
                ],
                max_tokens: 600,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Vision API error:", response.status, errorText);
            return "";
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || "";
        console.log("Vision analysis SUCCESS:", content);
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
    console.log("=== GENERATE AI INSIGHTS CALLED ===");
    console.log("Has OpenAI API key:", !!OPENAI_API_KEY);
    console.log("Has thumbnails:", data.videoThumbnails?.length || 0);
    console.log("Has descriptions:", data.videoDescriptions?.length || 0);

    if (!OPENAI_API_KEY) {
        console.log("❌ OpenAI API key not set, using template insights");
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
                        content: `You analyze TikTok videos for Muslim creators. Be EXTREMELY literal and STRUCTURAL.

YOUR ONLY JOB: Look at the video descriptions AND visual analysis provided, then describe EXACTLY how the video is structured so creators can recreate it with their own spin.

RULES:
1. Each idea = one video. If there are 2 videos, give 2 ideas. If 1 video, give 1 idea.
2. Describe the VIDEO STRUCTURE: "Start by flashing 3-4 styles quickly, then show each one step by step, end with final reveal"
3. Always add: "Add your own identity: [suggestion]" - e.g., "show styles that match YOUR face shape" or "use YOUR cultural background"
4. NO seasonal stuff (no summer, winter, Ramadan, Eid) - keep ideas usable right now
5. Use simple words: "hijabis" not "individuals", "us" not "creators"

GOOD IDEA FORMAT:
"🎬 Start by flashing 3-4 different looks quickly to hook viewers, then slow down and show each hijab style step by step. End with a side-by-side comparison. Add YOUR touch: show styles for your face shape or skin tone."

BAD (too vague): "Make a hijab tutorial"
GOOD (structural): "Flash multiple looks first → slow down to show each step → final reveal. Add your own: styles for YOUR occasion"

Format:
{
    "summary": "One sentence: what the videos actually show",
    "contentIdeas": ["🎬 [Video structure: first... then... end with...] Add YOUR touch: [personalization idea]"],
    "bestPostingStrategy": "Evening 7-9pm when people are scrolling",
    "hookRecommendations": ["Verbal: 'Start by saying...'", "Visual: First frame should show..."],
    "warnings": ["avoid generic advice"]
}`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.2,  // Very low - no creativity, just literal copying
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
=== VISION ANALYSIS - VIDEO TYPE DETECTION ===
Our AI analyzed the actual video thumbnails to understand what TYPE of content is trending:
${visionAnalysis}
===

IMPORTANT: Use the "COMMON VIDEO TYPE" above to generate ideas. If videos are "Educational analogies", suggest NEW analogy topics. If they're "POV comedy skits", suggest NEW POV scenarios. Match the FORMAT and STYLE, not the visuals.

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
