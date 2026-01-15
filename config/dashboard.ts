import { SidebarNavItem } from "types";

export const sidebarLinks: SidebarNavItem[] = [
  {
    title: "DISCOVER",
    items: [
      { href: "/dashboard", icon: "home", title: "Home" },
      { href: "/dashboard/trending-formats", icon: "trendingUp", title: "Trending Formats" },
    ],
  },
  {
    title: "TOOLS",
    items: [
      { href: "/dashboard/ai-studio", icon: "sparkles", title: "AI Studio", authorizeOnly: "ADMIN" },
      { href: "/dashboard/analyze-video", icon: "video", title: "Video Breakdown" },
      { href: "/dashboard/review-my-video", icon: "upload", title: "Review My Video" },
      { href: "/dashboard/script-optimizer", icon: "fileText", title: "Script Optimizer" },
      { href: "/dashboard/caption-optimizer", icon: "messageSquare", title: "Caption Optimizer" },
      { href: "/dashboard/cover-grader", icon: "image", title: "Cover Optimizer" },
    ],
  },
  {
    title: "LIBRARY",
    items: [
      { href: "/dashboard/saved", icon: "bookmark", title: "Saved Breakdowns" },
      { href: "/dashboard/content-bank", icon: "folder", title: "Content Bank" },
      { href: "/dashboard/trend-bank", icon: "trendingUp", title: "Trend Bank" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      {
        href: "/dashboard/billing",
        icon: "billing",
        title: "Billing",
      },
      { href: "/dashboard/settings", icon: "settings", title: "Account" },
    ],
  },
  {
    title: "SUPPORT",
    items: [
      { href: "/dashboard/tickets", icon: "messageCircle", title: "Tickets" },
      { href: "/dashboard/contact", icon: "mail", title: "Contact Us" },
    ],
  },
  {
    title: "ADMIN",
    items: [
      { href: "/admin", icon: "settings", title: "Admin Dashboard", authorizeOnly: "ADMIN" },
      { href: "/admin/affiliates", icon: "users", title: "Affiliates", authorizeOnly: "ADMIN" },
      { href: "/admin/forms", icon: "fileText", title: "Form Submissions", authorizeOnly: "ADMIN" },
    ],
  },
];

// Admin-only links (kept for backwards compatibility)
export const adminLinks: SidebarNavItem[] = [
  {
    title: "ADMIN",
    items: [
      { href: "/admin", icon: "settings", title: "Admin Dashboard" },
      { href: "/admin/affiliates", icon: "users", title: "Affiliates" },
      { href: "/admin/forms", icon: "fileText", title: "Form Submissions" },
    ],
  },
];


