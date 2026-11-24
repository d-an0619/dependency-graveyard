// Limited-concurrency task pool (FR-2.2). Results are delivered as they
// settle via the optional onSettled callback; order is preserved in the
// returned array.

/**
 * Run `worker` over `items` with at most `limit` in flight.
 * Workers are responsible for catching their own per-package errors (a
 * failed lookup is a result, not a rejection); a rejection here means a
 * programming error and fails the pool.
 */
export async function runWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onSettled?: (result: R, index: number) => void,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      for (;;) {
        const index = next++;
        if (index >= items.length) break;
        results[index] = await worker(items[index], index);
        onSettled?.(results[index], index);
      }
    },
  );
  await Promise.all(runners);
  return results;
}
