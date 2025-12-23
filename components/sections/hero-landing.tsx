import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

export default async function HeroLanding() {
  return (
    <section className="space-y-6 py-12 sm:py-20 lg:py-24">
      <div className="container flex max-w-5xl flex-col items-center gap-5 text-center">
        <Link
          href="/pricing"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm", rounded: "full" }),
            "px-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40",
          )}
        >
          <span className="mr-2">🔥</span>
          <span className="font-semibold text-amber-700 dark:text-amber-300">Limited Beta Pricing</span>
          <span className="ml-2 text-muted-foreground">— Lock in 50% off forever</span>
        </Link>

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

      </div>
    </section>
  );
}
