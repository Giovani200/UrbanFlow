import { TrendingUp } from "lucide-react";
import Link from "next/link";

interface LogoProps {
    size?: "sm" | "md" | "lg";
}

const sizeMap = {
    sm: { icon: 16, text: "text-base", box: "w-6 h-6rounded-md" },
    md: { icon: 20, text: "text-xl", box: "w-8 h-8rounded-lg" },
    lg: { icon: 26, text: "text-2xl", box: "w-10 h-10rounded-xl" },
};

export function Logo({ size = "md" }: LogoProps) {
    const s = sizeMap[size];
    return (
        <Link href="/" className="flex items-center gap-2 no-underline">
            <div className={`${s.box} bg-uf-red flex items-center justify-center flex-shrink-0`}>
                <TrendingUp size={s.icon} color="white" strokeWidth={2.2} />
            </div>
            <span className={`font-bold ${s.text} text-uf-red tracking-tight font-sans`}> UrbanFlow</span>
        </Link>
    );
}