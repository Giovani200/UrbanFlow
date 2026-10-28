import { ambianceScriptSource } from "@/app/lib/ambiance";

/** À placer dans le <head> : pose l'ambiance avant le premier affichage. Le contenu est une constante générée, sans donnée externe. */
export function AmbianceScript() {
    return <script dangerouslySetInnerHTML={{ __html: ambianceScriptSource() }} />;
}
