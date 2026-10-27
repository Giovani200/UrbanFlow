import type { Metadata, Viewport } from "next";
import { Figtree, Sora } from "next/font/google";
import { AmbianceScript } from "@/app/components/ambiance/AmbianceScript";
import { Providers } from "@/app/components/Providers";
import { AMBIANCE_THEME_COLORS } from "@/app/lib/ambiance";
import "./css/globals.css";

const figtree = Figtree({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-sans", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  applicationName: "UrbanFlow",
  title: {
    default: "UrbanFlow, mobilité en Île-de-France",
    template: "%s · UrbanFlow",
  },
  description: "Trajets, correspondances et temps réel en Île-de-France",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UrbanFlow",
  },
};

export const viewport: Viewport = {
  themeColor: AMBIANCE_THEME_COLORS.jour,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${figtree.variable} ${sora.variable} h-full`} suppressHydrationWarning>
      <head>
        <AmbianceScript />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-uf-ink focus:px-5 focus:py-3 focus:text-[15px] focus:font-bold focus:text-uf-on-ink"
        >
          Aller au contenu principal
        </a>
        <Providers>
          <main id="contenu" className="flex-1 flex flex-col">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
