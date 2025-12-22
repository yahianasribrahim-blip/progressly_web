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
      { href: "/dashboard/analyze-video", icon: "video", title: "Video Breakdown" },
      { href: "/dashboard/script-optimizer", icon: "fileText", title: "Script Optimizer" },
      { href: "/dashboard/caption-optimizer", icon: "messageSquare", title: "Caption Optimizer" },
      { href: "/dashboard/cover-grader", icon: "image", title: "Cover Grader" },
    ],
  },
  {
    title: "LIBRARY",
    items: [
      { href: "/dashboard/saved", icon: "bookmark", title: "Saved Breakdowns" },
      { href: "/dashboard/content-bank", icon: "folder", title: "Content Bank" },
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
];

