import type { Metadata, Viewport } from "next";
import { Fraunces, Schibsted_Grotesk } from "next/font/google";
import { Providers } from "@/app/components/Providers";
import "./css/globals.css";

const schibstedGrotesk = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  applicationName: "UrbanFlow",
  title: {
    default: "UrbanFlow, Mobilité urbaine Grenoble",
    template: "%s · UrbanFlow",
  },
  description: "Planificateur multimodal pour la métropole grenobloise",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UrbanFlow",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#CC1B36",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${schibstedGrotesk.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
