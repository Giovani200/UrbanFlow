import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UrbanFlow, mobilité urbaine",
    short_name: "UrbanFlow",
    description: "Planificateur multimodal, empreinte carbone et transports en commun à Grenoble.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F4F0",
    theme_color: "#CC1B36",
    lang: "fr",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}