import { SidebarNavItem, SiteConfig } from "types";
import { env } from "@/env.mjs";

const site_url = env.NEXT_PUBLIC_APP_URL;

export const siteConfig: SiteConfig = {
  name: "Progressly",
  description:
    "The AI-powered content platform built for Muslim creators. Discover trending topics, get personalized content suggestions, and grow your audience across Instagram, TikTok, and YouTube.",
  url: site_url,
  ogImage: `${site_url}/_static/og.jpg`,
  links: {
    twitter: "https://twitter.com/progresslyai",
  },
  mailSupport: "support@progressly.ai",
};

export const footerLinks: SidebarNavItem[] = [
  {
    title: "Product",
    items: [
      { title: "Features", href: "/#features" },
      { title: "Pricing", href: "/pricing" },
      { title: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Company",
    items: [
      { title: "About", href: "/about" },
      { title: "Terms", href: "/terms" },
      { title: "Privacy", href: "/privacy" },
      { title: "Contact", href: "mailto:support@progressly.ai" },
    ],
  },
];
