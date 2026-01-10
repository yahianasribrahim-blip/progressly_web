"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, Link2, Mail, LogOut, DollarSign } from "lucide-react";

const sidebarLinks = [
    { href: "/affiliate/dashboard", icon: BarChart3, title: "Dashboard" },
    { href: "/affiliate/referral-link", icon: Link2, title: "Referral Link" },
    { href: "/affiliate/contact", icon: Mail, title: "Contact Us" },
];

export function AffiliateSidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex w-64 flex-col border-r bg-card h-screen sticky top-0">
            <div className="p-6 border-b">
                <Link href="/affiliate/dashboard" className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <span className="font-bold text-lg">Progressly</span>
                        <span className="text-xs text-muted-foreground block -mt-1">Affiliate Portal</span>
                    </div>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {sidebarLinks.map((link) => {
                    const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <link.icon className="h-4 w-4" />
                            {link.title}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t">
                <form action="/api/auth/signout" method="POST">
                    <button
                        type="submit"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </form>
            </div>
        </aside>
    );
}
