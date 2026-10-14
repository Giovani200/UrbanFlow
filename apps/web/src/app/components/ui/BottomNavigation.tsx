"use client";

import { Clock3, History, Leaf, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveRoute, NAVIGATION_ITEMS } from "./navigation-items";

const ICONS: Record<string, LucideIcon> = {
    "/": Clock3,
    "/trips": History,
    "/carbon": Leaf,
    "/profile": UserRound,
};

/** Barre de navigation flottante en verre. `floating` la fixe en bas de l'écran. */
export function BottomNavigation({ floating = true }: { floating?: boolean }) {
    const pathname = usePathname();

    return (
        <nav
            aria-label="Navigation principale"
            className={`uf-glass flex h-[62px] gap-1 rounded-full p-1.5 ${floating ? "fixed inset-x-4 bottom-[max(20px,env(safe-area-inset-bottom))] z-40" : ""}`}
        >
            {NAVIGATION_ITEMS.map(({ label, href }) => {
                const active = isActiveRoute(pathname, href);
                const Icon = ICONS[href];
                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-bold no-underline ${active ? "bg-uf-ink text-uf-on-ink" : "text-uf-ink-2"}`}
                    >
                        <Icon size={18} strokeWidth={2} aria-hidden="true" />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
