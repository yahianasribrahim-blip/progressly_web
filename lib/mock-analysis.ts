// Mock analysis data generator

export interface Hook {
    id: string;
    text: string;
    engagement: "Low" | "Medium" | "High";
    platform: "TikTok" | "Instagram" | "YouTube";
}

export interface Format {
    id: string;
    name: string;
    cameraStyle: string;
    subtitleStyle: string;
    averageLength: string;
    whyItWorks: string;
    environment: string;
    lighting: string;
}

export interface ExampleVideo {
    id: string;
    thumbnail: string;
    creator: string;
    platform: "TikTok" | "Instagram" | "YouTube";
    views: string;
    url: string;
    description?: string;
    daysAgo?: number | null; // How old is the video
}

export interface Hashtag {
    tag: string;
    category: "Broad" | "Medium" | "Niche";
}

export interface Benchmark {
    viewRange: string;
    timeframe: string;
}

export interface AnalysisResult {
    niche: string;
    hooks: Hook[];
    captions?: Hook[]; // Viral captions from video descriptions
    spokenHooks?: Hook[]; // Actual spoken hooks from transcription
    formats: Format[];
    exampleVideos: ExampleVideo[];
    hashtags: Hashtag[];
    benchmark: Benchmark;
    generatedAt: Date;
}

const NICHE_HOOKS: Record<string, Hook[]> = {
    hijab: [
        { id: "h1", text: "POV: You finally found your signature hijab style", engagement: "High", platform: "TikTok" },
        { id: "h2", text: "3 hijab styles that take less than 2 minutes", engagement: "High", platform: "Instagram" },
        { id: "h3", text: "I tried every hijab fabric so you don't have to", engagement: "Medium", platform: "YouTube" },
        { id: "h4", text: "Wedding guest hijab tutorial that won't slip", engagement: "High", platform: "TikTok" },
        { id: "h5", text: "Hijab styles that work with glasses", engagement: "High", platform: "Instagram" },
        { id: "h6", text: "From struggling with hijab to loving it", engagement: "Medium", platform: "TikTok" },
        { id: "h7", text: "No-pin hijab styles for beginners", engagement: "High", platform: "Instagram" },
        { id: "h8", text: "Modest fashion hacks every hijabi needs", engagement: "Medium", platform: "TikTok" },
        { id: "h9", text: "How I style my hijab for different occasions", engagement: "High", platform: "YouTube" },
        { id: "h10", text: "Hijab tutorial for round face shapes", engagement: "Medium", platform: "Instagram" },
    ],
    deen: [
        { id: "h1", text: "This Quran verse changed my perspective", engagement: "High", platform: "TikTok" },
        { id: "h2", text: "The Prophet ﷺ said this about kindness", engagement: "High", platform: "Instagram" },
        { id: "h3", text: "5 Duas for difficult times", engagement: "High", platform: "YouTube" },
        { id: "h4", text: "Things I wish I knew as a new Muslim", engagement: "High", platform: "TikTok" },
        { id: "h5", text: "How to make dhikr a daily habit", engagement: "Medium", platform: "Instagram" },
        { id: "h6", text: "Lessons from Surah Al-Kahf for modern life", engagement: "High", platform: "YouTube" },
        { id: "h7", text: "Beautiful Islamic reminders for your week", engagement: "Medium", platform: "TikTok" },
        { id: "h8", text: "How I connected deeper with my salah", engagement: "High", platform: "Instagram" },
        { id: "h9", text: "Stories of the Sahaba that inspire me", engagement: "Medium", platform: "YouTube" },
        { id: "h10", text: "Simple ways to increase barakah in your life", engagement: "High", platform: "TikTok" },
    ],
    cultural: [
        { id: "h1", text: "Growing up in a Muslim household be like", engagement: "High", platform: "TikTok" },
        { id: "h2", text: "Things only desi Muslims will understand", engagement: "High", platform: "Instagram" },
        { id: "h3", text: "Eid preparations in our home", engagement: "High", platform: "YouTube" },
        { id: "h4", text: "When your ammi finds out you skipped fajr", engagement: "High", platform: "TikTok" },
        { id: "h5", text: "The beauty of Islamic art and calligraphy", engagement: "Medium", platform: "Instagram" },
        { id: "h6", text: "Our Ramadan traditions through generations", engagement: "High", platform: "YouTube" },
        { id: "h7", text: "Cultural fusion: When East meets West", engagement: "Medium", platform: "TikTok" },
        { id: "h8", text: "Teaching my kids about our heritage", engagement: "Medium", platform: "Instagram" },
        { id: "h9", text: "Muslim wedding traditions explained", engagement: "High", platform: "YouTube" },
        { id: "h10", text: "Nostalgic sounds from a Muslim childhood", engagement: "High", platform: "TikTok" },
    ],
    food: [
        { id: "h1", text: "Halal comfort food that hits different", engagement: "High", platform: "TikTok" },
        { id: "h2", text: "My go-to suhoor recipes for energy", engagement: "High", platform: "Instagram" },
        { id: "h3", text: "Easy iftar recipes for busy Muslims", engagement: "High", platform: "YouTube" },
        { id: "h4", text: "When you're craving restaurant food but halal", engagement: "Medium", platform: "TikTok" },
        { id: "h5", text: "Traditional recipes from my grandmother", engagement: "High", platform: "Instagram" },
        { id: "h6", text: "Meal prep for the entire week of Ramadan", engagement: "High", platform: "YouTube" },
        { id: "h7", text: "Halal alternatives to your favorite foods", engagement: "Medium", platform: "TikTok" },
        { id: "h8", text: "Making Eid sweets with the family", engagement: "High", platform: "Instagram" },
        { id: "h9", text: "High protein halal recipes for athletes", engagement: "Medium", platform: "YouTube" },
        { id: "h10", text: "Late night biryani hits different during Ramadan", engagement: "High", platform: "TikTok" },
    ],
    gym: [
        { id: "h1", text: "Working out while fasting - my experience", engagement: "High", platform: "TikTok" },
        { id: "h2", text: "Modest activewear that actually works", engagement: "High", platform: "Instagram" },
        { id: "h3", text: "My fitness journey as a Muslim woman", engagement: "High", platform: "YouTube" },
        { id: "h4", text: "Gym schedule during Ramadan that works", engagement: "High", platform: "TikTok" },
        { id: "h5", text: "Finding women-only fitness spaces", engagement: "Medium", platform: "Instagram" },
        { id: "h6", text: "Full body workout in hijab-friendly clothes", engagement: "High", platform: "YouTube" },
        { id: "h7", text: "How I balance deen and fitness", engagement: "Medium", platform: "TikTok" },
        { id: "h8", text: "Pre and post iftar workout routines", engagement: "High", platform: "Instagram" },
        { id: "h9", text: "Building muscle during Ramadan is possible", engagement: "Medium", platform: "YouTube" },
        { id: "h10", text: "Sports hijab review - which one is best?", engagement: "High", platform: "TikTok" },
    ],
    pets: [
        { id: "h1", text: "Muslims with cats content hits different", engagement: "High", platform: "TikTok" },
        { id: "h2", text: "When your cat joins you for prayer", engagement: "High", platform: "Instagram" },
        { id: "h3", text: "Pets in Islam - what you should know", engagement: "Medium", platform: "YouTube" },
        { id: "h4", text: "My cat during Ramadan vs regular days", engagement: "High", platform: "TikTok" },
        { id: "h5", text: "Setting up a pet-friendly Muslim home", engagement: "Medium", platform: "Instagram" },
        { id: "h6", text: "The sunnah of kindness to animals", engagement: "High", platform: "YouTube" },
        { id: "h7", text: "When you're trying to pray but your cat...", engagement: "High", platform: "TikTok" },
        { id: "h8", text: "Pet care tips for Muslim pet owners", engagement: "Medium", platform: "Instagram" },
        { id: "h9", text: "Rescue stories that restored my faith", engagement: "High", platform: "YouTube" },
        { id: "h10", text: "My birds love hearing Quran recitation", engagement: "High", platform: "TikTok" },
    ],
    storytelling: [
        { id: "h1", text: "The story of how I came to Islam", engagement: "High", platform: "TikTok" },
        { id: "h2", text: "A letter to my younger Muslim self", engagement: "High", platform: "Instagram" },
        { id: "h3", text: "Stories from the Quran that changed me", engagement: "High", platform: "YouTube" },
        { id: "h4", text: "When I realized my prayers were answered", engagement: "High", platform: "TikTok" },
        { id: "h5", text: "Growing up Muslim in the West", engagement: "Medium", platform: "Instagram" },
        { id: "h6", text: "Stories from our Islamic golden age", engagement: "Medium", platform: "YouTube" },
        { id: "h7", text: "The moment everything made sense", engagement: "High", platform: "TikTok" },
        { id: "h8", text: "My grandfather's wisdom I'll never forget", engagement: "High", platform: "Instagram" },
        { id: "h9", text: "Lessons from Prophet Yusuf's story", engagement: "Medium", platform: "YouTube" },
        { id: "h10", text: "That one Ramadan that changed everything", engagement: "High", platform: "TikTok" },
    ],
    default: [
        { id: "h1", text: "POV: You finally figured it out", engagement: "High", platform: "TikTok" },
        { id: "h2", text: "Things I wish I knew sooner as a Muslim", engagement: "High", platform: "Instagram" },
        { id: "h3", text: "I tried this for 30 days during Ramadan", engagement: "Medium", platform: "YouTube" },
        { id: "h4", text: "The truth nobody talks about", engagement: "High", platform: "TikTok" },
        { id: "h5", text: "Stop doing this immediately", engagement: "Medium", platform: "Instagram" },
        { id: "h6", text: "My journey and what I learned", engagement: "High", platform: "YouTube" },
        { id: "h7", text: "This changed everything for me", engagement: "Medium", platform: "TikTok" },
        { id: "h8", text: "Unpopular opinion but...", engagement: "High", platform: "Instagram" },
        { id: "h9", text: "What they don't tell you about...", engagement: "Medium", platform: "TikTok" },
        { id: "h10", text: "My honest experience after 1 year", engagement: "High", platform: "YouTube" },
    ],
};

const FORMATS: Format[] = [
    {
        id: "f1",
        name: "Talking Head with B-Roll",
        cameraStyle: "Face cam at eye level, natural lighting",
        subtitleStyle: "Bold white text with black outline, center-bottom",
        averageLength: "45-90 seconds",
        whyItWorks: "Builds trust through eye contact while B-roll maintains visual interest and prevents drop-off.",
        environment: "Clean, minimal background (bedroom, office, or neutral wall)",
        lighting: "Soft natural light from window or ring light at 45° angle",
    },
    {
        id: "f2",
        name: "POV Storytelling",
        cameraStyle: "First-person perspective, handheld feel",
        subtitleStyle: "Minimal captions, cinematic font",
        averageLength: "15-30 seconds",
        whyItWorks: "Creates immersive experience that makes viewers feel like they're living the moment.",
        environment: "Dynamic locations (streets, stores, nature, events)",
        lighting: "Natural ambient light, golden hour preferred",
    },
    {
        id: "f3",
        name: "Split Screen Comparison",
        cameraStyle: "Static shots, consistent framing both sides",
        subtitleStyle: "Labels on each side, progress indicators",
        averageLength: "30-60 seconds",
        whyItWorks: "Before/after format triggers curiosity and provides clear visual proof of transformation.",
        environment: "Same location for both sides (consistency is key)",
        lighting: "Consistent lighting across both frames",
    },
    {
        id: "f4",
        name: "Carousel Breakdown",
        cameraStyle: "Static product/lifestyle shots",
        subtitleStyle: "Large numbered text, swipe indicators",
        averageLength: "N/A (static)",
        whyItWorks: "Forces engagement through swiping, increases time on post and saves for later reference.",
        environment: "Clean flat lay or lifestyle setting",
        lighting: "Bright, even lighting with no harsh shadows",
    },
    {
        id: "f5",
        name: "GRWM (Get Ready With Me)",
        cameraStyle: "Mirror or front-facing, casual setup",
        subtitleStyle: "Conversational captions, emojis allowed",
        averageLength: "2-5 minutes",
        whyItWorks: "Parasocial intimacy makes viewers feel like friends, driving comments and shares.",
        environment: "Bathroom mirror, vanity, or cozy bedroom",
        lighting: "Warm, flattering light (ring light or vanity lights)",
    },
];

const EXAMPLE_VIDEOS: ExampleVideo[] = [
    {
        id: "v1",
        thumbnail: "/api/placeholder/320/180",
        creator: "@ameenah.styles",
        platform: "TikTok",
        views: "2.4M",
        url: "https://tiktok.com",
    },
    {
        id: "v2",
        thumbnail: "/api/placeholder/320/180",
        creator: "@yusuf.fitness",
        platform: "Instagram",
        views: "890K",
        url: "https://instagram.com",
    },
    {
        id: "v3",
        thumbnail: "/api/placeholder/320/180",
        creator: "@zahra.cooks",
        platform: "YouTube",
        views: "1.2M",
        url: "https://youtube.com",
    },
    {
        id: "v4",
        thumbnail: "/api/placeholder/320/180",
        creator: "@omar.reminders",
        platform: "TikTok",
        views: "567K",
        url: "https://tiktok.com",
    },
];

const HASHTAGS: Record<string, Hashtag[]> = {
    hijab: [
        { tag: "hijab", category: "Broad" },
        { tag: "hijabstyle", category: "Broad" },
        { tag: "modestfashion", category: "Broad" },
        { tag: "hijabtutorial", category: "Medium" },
        { tag: "hijabfashion", category: "Medium" },
        { tag: "muslimfashion", category: "Medium" },
        { tag: "hijabista", category: "Medium" },
        { tag: "modesthijab", category: "Niche" },
        { tag: "hijabinspo", category: "Niche" },
        { tag: "hijabdaily", category: "Niche" },
        { tag: "hijablook", category: "Niche" },
        { tag: "hijabstyles", category: "Niche" },
    ],
    deen: [
        { tag: "islam", category: "Broad" },
        { tag: "muslim", category: "Broad" },
        { tag: "quran", category: "Broad" },
        { tag: "islamicreminders", category: "Medium" },
        { tag: "deenover dunya", category: "Medium" },
        { tag: "islamicquotes", category: "Medium" },
        { tag: "sunnahrevival", category: "Medium" },
        { tag: "islamiccontent", category: "Niche" },
        { tag: "muslimtiktok", category: "Niche" },
        { tag: "quranrecitation", category: "Niche" },
        { tag: "dhikr", category: "Niche" },
        { tag: "islamiceducation", category: "Niche" },
    ],
    cultural: [
        { tag: "muslimlife", category: "Broad" },
        { tag: "eid", category: "Broad" },
        { tag: "ramadan", category: "Broad" },
        { tag: "muslimculture", category: "Medium" },
        { tag: "muslimfamily", category: "Medium" },
        { tag: "islamicart", category: "Medium" },
        { tag: "arabculture", category: "Medium" },
        { tag: "desimuslim", category: "Niche" },
        { tag: "muslimheritage", category: "Niche" },
        { tag: "islamictraditions", category: "Niche" },
        { tag: "muslimwedding", category: "Niche" },
        { tag: "eidmubarak", category: "Niche" },
    ],
    food: [
        { tag: "halalfood", category: "Broad" },
        { tag: "halal", category: "Broad" },
        { tag: "foodie", category: "Broad" },
        { tag: "halaleats", category: "Medium" },
        { tag: "iftarrecipes", category: "Medium" },
        { tag: "suhoorrecipes", category: "Medium" },
        { tag: "ramadanfood", category: "Medium" },
        { tag: "halalrecipes", category: "Niche" },
        { tag: "muslimfoodie", category: "Niche" },
        { tag: "iftarideas", category: "Niche" },
        { tag: "halaltok", category: "Niche" },
        { tag: "biryani", category: "Niche" },
    ],
    gym: [
        { tag: "fitness", category: "Broad" },
        { tag: "gym", category: "Broad" },
        { tag: "workout", category: "Broad" },
        { tag: "muslimfitness", category: "Medium" },
        { tag: "modestworkout", category: "Medium" },
        { tag: "ramadanfitness", category: "Medium" },
        { tag: "hijabifitness", category: "Medium" },
        { tag: "muslimathlete", category: "Niche" },
        { tag: "sportshijab", category: "Niche" },
        { tag: "fastingworkout", category: "Niche" },
        { tag: "modestactivewear", category: "Niche" },
        { tag: "fitmuslimah", category: "Niche" },
    ],
    pets: [
        { tag: "cats", category: "Broad" },
        { tag: "pets", category: "Broad" },
        { tag: "catsofinstagram", category: "Broad" },
        { tag: "muslimswithcats", category: "Medium" },
        { tag: "catlovers", category: "Medium" },
        { tag: "petlover", category: "Medium" },
        { tag: "islamandpets", category: "Medium" },
        { tag: "muslimcat", category: "Niche" },
        { tag: "catsandprayer", category: "Niche" },
        { tag: "sunnahpets", category: "Niche" },
        { tag: "mercytoanimals", category: "Niche" },
        { tag: "muslimpetowner", category: "Niche" },
    ],
    storytelling: [
        { tag: "storytime", category: "Broad" },
        { tag: "muslim", category: "Broad" },
        { tag: "myjourney", category: "Broad" },
        { tag: "revertmuslim", category: "Medium" },
        { tag: "islamicstories", category: "Medium" },
        { tag: "muslimstory", category: "Medium" },
        { tag: "prophetstories", category: "Medium" },
        { tag: "myreversion", category: "Niche" },
        { tag: "islamichistory", category: "Niche" },
        { tag: "muslimyouth", category: "Niche" },
        { tag: "faithjourney", category: "Niche" },
        { tag: "quranstories", category: "Niche" },
    ],
    default: [
        { tag: "muslim", category: "Broad" },
        { tag: "islam", category: "Broad" },
        { tag: "fyp", category: "Broad" },
        { tag: "muslimcreator", category: "Medium" },
        { tag: "muslimtiktok", category: "Medium" },
        { tag: "islamiccontent", category: "Medium" },
        { tag: "muslimreels", category: "Medium" },
        { tag: "musliminfluencer", category: "Niche" },
        { tag: "ummah", category: "Niche" },
        { tag: "muslimcommunity", category: "Niche" },
        { tag: "islamicreminder", category: "Niche" },
        { tag: "muslimcontentcreator", category: "Niche" },
    ],
};

const BENCHMARKS: Record<string, Benchmark> = {
    hijab: { viewRange: "8K–35K", timeframe: "48–72 hours" },
    deen: { viewRange: "10K–50K", timeframe: "24–48 hours" },
    cultural: { viewRange: "5K–25K", timeframe: "48–72 hours" },
    food: { viewRange: "6K–30K", timeframe: "48–72 hours" },
    gym: { viewRange: "4K–20K", timeframe: "48–72 hours" },
    pets: { viewRange: "8K–40K", timeframe: "24–48 hours" },
    storytelling: { viewRange: "10K–45K", timeframe: "48–72 hours" },
    default: { viewRange: "5K–25K", timeframe: "48–72 hours" },
};

export function generateMockAnalysis(
    niche: string,
    plan: "free" | "starter" | "pro"
): AnalysisResult {
    const nicheKey = niche.toLowerCase();

    // Get hooks based on plan limits
    let hooks = NICHE_HOOKS[nicheKey] || NICHE_HOOKS.default;
    if (plan === "free") {
        hooks = hooks.slice(0, 3);
    }

    // Get formats based on plan limits
    let formats = [...FORMATS];
    if (plan === "free") {
        formats = formats.slice(0, 1);
    }

    return {
        niche,
        hooks,
        formats,
        exampleVideos: EXAMPLE_VIDEOS,
        hashtags: HASHTAGS[nicheKey] || HASHTAGS.default,
        benchmark: BENCHMARKS[nicheKey] || BENCHMARKS.default,
        generatedAt: new Date(),
    };
}
