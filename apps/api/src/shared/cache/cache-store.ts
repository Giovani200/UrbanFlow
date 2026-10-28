export const CACHE_STORE = Symbol("CACHE_STORE");

export interface CacheStore {
    /**
     * Renvoie la valeur en cache si elle n'a pas expiré, sinon exécute `load`.
     * Des demandes simultanées sur une même clé partagent un seul `load`, et un échec n'est jamais mis en cache.
     */
    getOrLoad<T>(key: string, ttlMilliseconds: number, load: () => Promise<T>): Promise<T>;
}
