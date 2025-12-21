import { SidebarNavItem } from "types";

export const sidebarLinks: SidebarNavItem[] = [
  {
    title: "ANALYZE",
    items: [
      { href: "/dashboard", icon: "home", title: "Home" },
      { href: "/dashboard/analyze-video", icon: "video", title: "Video Breakdown" },
    ],
  },
  {
    title: "OPTIMIZE",
    items: [
      { href: "/dashboard/script-optimizer", icon: "fileText", title: "Script Optimizer" },
      { href: "/dashboard/caption-optimizer", icon: "messageSquare", title: "Caption Optimizer" },
      { href: "/dashboard/cover-grader", icon: "image", title: "Cover Grader" },
      { href: "/dashboard/pre-post-checklist", icon: "checkSquare", title: "Pre-Post Checklist" },
    ],
  },
  {
    title: "LIBRARY",
    items: [
      { href: "/dashboard/saved", icon: "bookmark", title: "Saved Breakdowns" },
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
