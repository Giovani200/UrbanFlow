import { describe, expect, it, vi } from "vitest";
import { sendShareLink, shareUrl } from "./share-link";

const link = { url: "https://urbanflowapp.fr/suivi#abc", text: "Suis mon trajet vers Chez moi" };

describe("shareUrl", () => {
  it("met le jeton dans le fragment, que le navigateur n'envoie jamais au serveur", () => {
    expect(shareUrl("https://urbanflowapp.fr", "abc")).toBe("https://urbanflowapp.fr/suivi#abc");
  });
});

describe("sendShareLink", () => {
  it("ouvre la feuille de partage quand elle existe", async () => {
    const share = vi.fn(async () => undefined);

    await expect(sendShareLink(link, { share })).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith(link);
  });

  it("copie le lien quand la feuille de partage n'existe pas", async () => {
    const writeText = vi.fn(async () => undefined);

    await expect(sendShareLink(link, { clipboard: { writeText } })).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith(link.url);
  });

  it("une annulation de la feuille de partage n'est pas une erreur", async () => {
    const share = vi.fn(async () => {
      throw new DOMException("annulé", "AbortError");
    });

    await expect(sendShareLink(link, { share })).resolves.toBe("cancelled");
  });

  it("échoue sans feuille de partage ni presse-papiers", async () => {
    await expect(sendShareLink(link, {})).resolves.toBe("failed");
  });
});
