import { Video, TrendingUp, Bookmark, Sparkles, Crown } from "lucide-react";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export default function PreviewLanding() {
  return (
    <div className="pb-6 sm:pb-16">
      <MaxWidthWrapper>
        <div className="rounded-xl md:bg-muted/30 md:p-3.5 md:ring-1 md:ring-inset md:ring-border">
          <div className="relative overflow-hidden rounded-xl border md:rounded-lg bg-background">
            {/* Dashboard Mockup */}
            <div className="flex min-h-[400px] md:min-h-[500px]">
              {/* Sidebar */}
              <div className="hidden sm:flex w-56 bg-muted/50 border-r flex-col p-4">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold">Progressly</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="px-3 py-2 rounded-md bg-primary/10 text-primary font-medium flex items-center gap-2">
                    <Video className="h-4 w-4" /> Video Breakdown
                  </div>
                  <div className="px-3 py-2 rounded-md text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Trending Formats
                  </div>
                  <div className="px-3 py-2 rounded-md text-muted-foreground flex items-center gap-2">
                    <Bookmark className="h-4 w-4" /> Saved Content
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Video Breakdown</h2>
                    <p className="text-sm text-muted-foreground">AI-powered analysis of your content</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium">
                    <Crown className="h-3.5 w-3.5" /> Pro Plan
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-2xl font-bold">47</p>
                    <p className="text-xs text-muted-foreground">Analyses left</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-2xl font-bold">23</p>
                    <p className="text-xs text-muted-foreground">Ideas saved</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-xs text-muted-foreground">Trends saved</p>
                  </div>
                </div>

                {/* Analysis Result Preview */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium">Analysis Complete</span>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-sm font-medium mb-1">🎯 Hook Strength: Strong</p>
                      <p className="text-xs text-muted-foreground">Your opening grabs attention within the first 2 seconds</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-sm font-medium mb-1">📈 Suggested Improvement</p>
                      <p className="text-xs text-muted-foreground">Add a pattern interrupt at 0:15 to maintain engagement</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-sm font-medium mb-1">💡 Video Idea Generated</p>
                      <p className="text-xs text-muted-foreground">&quot;3 mistakes beginners make with...&quot;</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
