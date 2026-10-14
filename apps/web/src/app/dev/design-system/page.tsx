import { notFound } from "next/navigation";
import { DesignSystemShowcase } from "./DesignSystemShowcase";

export const metadata = { title: "Design system", robots: { index: false } };

/** Page de vérification du design system, disponible uniquement en développement. */
export default function DesignSystemPage() {
    if (process.env.NODE_ENV !== "development") {
        notFound();
    }
    return <DesignSystemShowcase />;
}
