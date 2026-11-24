// Fetch wrapper that applies a per-request timeout via AbortController (FR-2.2).

export class TimeoutError extends Error {
  constructor() {
    super('lookup timed out');
    this.name = 'TimeoutError';
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Run `fetchFn` with an abort deadline. The timeout applies to this single
 * request; a timeout throws TimeoutError, anything else propagates.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  fetchFn: FetchLike,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new TimeoutError();
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
