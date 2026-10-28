import { Logger } from "@nestjs/common";
import { parisDayKey } from "../time/paris-time";

const WARNING_RATIO = 0.8;
const ONE_SECOND_MILLISECONDS = 1000;

export class QuotaExceededError extends Error {
    constructor(quotaName: string) {
        super(`QUOTA_EXCEEDED:${quotaName}`);
    }
}

export interface QuotaGuardOptions {
    name: string;
    dailyLimit: number;
    perSecond: number;
    now?: () => number;
    sleep?: (milliseconds: number) => Promise<void>;
}

function waitFor(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Compte les appels à une API externe : quota journalier (remis à zéro à minuit, heure de Paris) et lissage par seconde. */
export class QuotaGuard {
    private readonly logger: Logger;
    private readonly now: () => number;
    private readonly sleep: (milliseconds: number) => Promise<void>;
    private dayKey = "";
    private usedToday = 0;
    private warningLogged = false;
    private exhaustionLogged = false;
    private recentCalls: number[] = [];
    private queue: Promise<void> = Promise.resolve();

    constructor(private readonly options: QuotaGuardOptions) {
        this.logger = new Logger(`QuotaGuard:${options.name}`);
        this.now = options.now ?? Date.now;
        this.sleep = options.sleep ?? waitFor;
    }

    /** Réserve un appel. Attend si la limite par seconde est atteinte ; lève QuotaExceededError si le quota du jour est épuisé. */
    acquire(): Promise<void> {
        const turn = this.queue.then(() => this.reserve());
        this.queue = turn.catch(() => undefined);
        return turn;
    }

    usage(): { used: number; limit: number } {
        return { used: this.usedToday, limit: this.options.dailyLimit };
    }

    private async reserve(): Promise<void> {
        this.resetIfNewDay();
        if (this.usedToday >= this.options.dailyLimit) {
            if (!this.exhaustionLogged) {
                this.exhaustionLogged = true;
                this.logger.error(`quota du jour épuisé (${this.options.dailyLimit} appels)`);
            }
            throw new QuotaExceededError(this.options.name);
        }

        await this.waitForSecondSlot();
        this.recentCalls.push(this.now());
        this.usedToday += 1;

        if (!this.warningLogged && this.usedToday >= this.options.dailyLimit * WARNING_RATIO) {
            this.warningLogged = true;
            this.logger.warn(`${this.usedToday}/${this.options.dailyLimit} appels consommés aujourd'hui`);
        }
    }

    private async waitForSecondSlot(): Promise<void> {
        const now = this.now();
        this.recentCalls = this.recentCalls.filter((callTime) => now - callTime < ONE_SECOND_MILLISECONDS);
        if (this.recentCalls.length >= this.options.perSecond) {
            await this.sleep(ONE_SECOND_MILLISECONDS - (now - this.recentCalls[0]));
        }
    }

    private resetIfNewDay(): void {
        const today = parisDayKey(new Date(this.now()));
        if (today !== this.dayKey) {
            this.dayKey = today;
            this.usedToday = 0;
            this.warningLogged = false;
            this.exhaustionLogged = false;
        }
    }
}
