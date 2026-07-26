import { ServiceUnavailableException } from "@nestjs/common";

const DEFAULT_TIMEOUT_MS = 5000;

export async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    unavailableErrorCode: string,
    timeoutMilliseconds: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
    try {
        return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMilliseconds) });
    } catch (cause) {
        throw new ServiceUnavailableException(unavailableErrorCode, { cause });
    }
}
