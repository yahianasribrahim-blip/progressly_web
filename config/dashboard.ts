import { SidebarNavItem } from "types";

export const sidebarLinks: SidebarNavItem[] = [
  {
    title: "MAIN",
    items: [
      { href: "/dashboard", icon: "dashboard", title: "Dashboard" },
      { href: "/dashboard/analyze-video", icon: "video", title: "Analyze Video" },
      { href: "/dashboard/saved", icon: "bookmark", title: "Saved Analyses" },
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
