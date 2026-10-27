import { TrendingUp } from "lucide-react";
import Link from "next/link";

export function Logo() {
    return (
        <Link href="/" className="flex min-h-11 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-uf-avatar bg-uf-ink text-uf-on-ink">
                <TrendingUp size={20} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="[font:var(--uf-time)] text-xl">UrbanFlow</span>
        </Link>
    );
}
