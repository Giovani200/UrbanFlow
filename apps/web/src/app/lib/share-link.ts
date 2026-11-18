export interface ShareLink {
  url: string;
  text: string;
}

export type ShareLinkOutcome = "shared" | "copied" | "cancelled" | "failed";

interface ShareCapabilities {
  share?: (data: ShareLink) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

export function shareUrl(origin: string, token: string): string {
  return `${origin}/suivi#${token}`;
}

/**
 * Feuille de partage du téléphone, sinon copie du lien. Doit être appelée dans le clic : le navigateur exige une action
 * récente de l'utilisateur. Une annulation par l'utilisateur n'est pas une erreur.
 */
export async function sendShareLink(link: ShareLink, capabilities: ShareCapabilities): Promise<ShareLinkOutcome> {
  if (capabilities.share) {
    try {
      await capabilities.share(link);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  if (capabilities.clipboard) {
    try {
      await capabilities.clipboard.writeText(link.url);
      return "copied";
    } catch {
      return "failed";
    }
  }
  return "failed";
}
