import { Logger } from "@nestjs/common";
import type { CacheStore } from "./cache-store";

const DEFAULT_MAX_ENTRIES = 5000;

interface CacheEntry {
    value: unknown;
    expiresAt: number;
}

/** Cache d'une seule instance. Le jour où l'API tourne sur plusieurs serveurs, une implémentation Redis prendra le relais. */
export class InMemoryCacheStore implements CacheStore {
    private readonly logger = new Logger(InMemoryCacheStore.name);
    private readonly entries = new Map<string, CacheEntry>();
    private readonly pendingLoads = new Map<string, Promise<unknown>>();

    constructor(
        private readonly now: () => number = Date.now,
        private readonly maxEntries: number = DEFAULT_MAX_ENTRIES,
    ) {}

    async getOrLoad<T>(key: string, ttlMilliseconds: number, load: () => Promise<T>): Promise<T> {
        const entry = this.entries.get(key);
        if (entry && entry.expiresAt > this.now()) {
            this.logger.debug(`succès ${key}`);
            return entry.value as T;
        }

        const pendingLoad = this.pendingLoads.get(key);
        if (pendingLoad) {
            return pendingLoad as Promise<T>;
        }

        this.logger.debug(`échec ${key}`);
        const loading = load()
            .then((value) => {
                this.store(key, value, ttlMilliseconds);
                return value;
            })
            .finally(() => this.pendingLoads.delete(key));
        this.pendingLoads.set(key, loading);
        return loading;
    }

    private store(key: string, value: unknown, ttlMilliseconds: number): void {
        this.entries.delete(key);
        if (this.entries.size >= this.maxEntries) {
            const oldestKey = this.entries.keys().next().value;
            if (oldestKey !== undefined) {
                this.entries.delete(oldestKey);
            }
        }
        this.entries.set(key, { value, expiresAt: this.now() + ttlMilliseconds });
    }
}
