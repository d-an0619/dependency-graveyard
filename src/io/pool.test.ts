import { describe, expect, it } from 'vitest';
import { runWithConcurrency } from './pool';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('runWithConcurrency', () => {
  it('runs all items and preserves order in the result array', async () => {
    const items = [5, 1, 3, 2, 4];
    const results = await runWithConcurrency(items, 2, async (n) => {
      await delay(n * 5);
      return n * 10;
    });
    expect(results).toEqual([50, 10, 30, 20, 40]);
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);
    await runWithConcurrency(items, 4, async (n) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await delay(5 + (n % 3) * 5);
      inFlight--;
      return n;
    });
    expect(maxInFlight).toBeLessThanOrEqual(4);
  });

  it('delivers results to onSettled as they finish', async () => {
    const settled: number[] = [];
    await runWithConcurrency([30, 10, 20], 3, async (n) => {
      await delay(n);
      return n;
    }, (r) => settled.push(r));
    expect(settled.sort((a, b) => a - b)).toEqual([10, 20, 30]);
    // With three in-flight tasks of 10/20/30ms, finishing order is 10,20,30.
    expect(settled).toEqual([10, 20, 30]);
  });

  it('handles an empty item list', async () => {
    const results = await runWithConcurrency([] as number[], 4, async (n) => n);
    expect(results).toEqual([]);
  });
});
