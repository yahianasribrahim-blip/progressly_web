import Link from "next/link";
import { prisma } from "@/lib/db";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

async function getWeeklyAnalysisCount() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const count = await prisma.usageTracking.aggregate({
    _sum: {
      analysesThisMonth: true,
    },
  });

  return count._sum.analysesThisMonth || 0;
}

export default async function HeroLanding() {
  const analysisCount = await getWeeklyAnalysisCount();

  return (
    <section className="space-y-6 py-12 sm:py-20 lg:py-24">
      <div className="container flex max-w-5xl flex-col items-center gap-5 text-center">
        <div
          className="px-4 py-2 rounded-full border bg-muted/50 text-sm text-center max-w-2xl"
        >
          <span className="mr-2">⚡</span>
          <span className="text-muted-foreground">Your competition is still doing video research manually.</span>
          <span className="font-medium text-foreground ml-1">Be the first to let AI do it for you.</span>
        </div>

        <h1 className="text-balance font-urban text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-[66px]">
          Stop Guessing.{" "}
          <span className="text-gradient_indigo-purple font-extrabold">
            Start Growing.
          </span>
        </h1>

        <p
          className="max-w-xl text-balance leading-normal text-muted-foreground sm:text-xl sm:leading-8"
          style={{ animationDelay: "0.35s", animationFillMode: "forwards" }}
        >
          AI-powered video analysis that shows you exactly what works on TikTok.
        </p>

        <div
          className="flex justify-center space-x-2 md:space-x-4"
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
        >
          <Link
            href="/register"
            prefetch={true}
            className={cn(
              buttonVariants({ size: "lg", rounded: "full" }),
              "gap-2",
            )}
          >
            <Icons.sparkles className="size-4" />
            <span>Start Free</span>
            <Icons.arrowRight className="size-4" />
          </Link>
          <Link
            href="/pricing"
            className={cn(
              buttonVariants({
                variant: "outline",
                size: "lg",
                rounded: "full",
              }),
              "px-5",
            )}
          >
            <span>View Pricing</span>
          </Link>
        </div>

        {/* Social Proof */}
        {analysisCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-violet-500 border-2 border-background" />
              <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-background" />
              <div className="w-6 h-6 rounded-full bg-pink-500 border-2 border-background" />
            </div>
            <span>
              <strong className="text-foreground">{analysisCount.toLocaleString()}+</strong> videos analyzed by creators
            </span>
          </div>
        )}

      </div>
    </section>
  );
}
