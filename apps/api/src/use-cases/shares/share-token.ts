import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

/** Jeton de partage : 256 bits aléatoires, sans aucune donnée dedans, encodés pour une URL. */
export function generateShareToken(): string {
    return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** Empreinte SHA-256 du jeton : la seule forme stockée en base. */
export function hashShareToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}
