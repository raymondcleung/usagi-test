import { describe, expect, test, vi } from 'vitest';
import { sleep, retry, waitUntil } from '../src/utils/time.js';

describe('Usagi Utils: Unit Tests', () => {
  
  describe('retry()', () => {
    test('should return value on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should retry exactly the specified number of times', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      
      // We expect this to throw after 2 retries (3 total attempts)
      await expect(retry(fn, { retries: 2, delays: [10] }))
        .rejects.toThrow('fail');
        
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('should handle single-value delay arrays (repeat delay)', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockRejectedValueOnce(new Error('2'))
        .mockResolvedValue('win');

      const result = await retry(fn, { retries: 5, delays: [50] });
      
      expect(result).toBe('win');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('waitUntil()', () => {
    test('should resolve when predicate becomes true', async () => {
      let flag = false;
      setTimeout(() => { flag = true; }, 50);

      await expect(waitUntil(() => flag === true, { interval: 10 }))
        .resolves.toBeUndefined();
    });

    test('should throw error on timeout', async () => {
      await expect(waitUntil(() => false, { timeout: 100, interval: 20 }))
        .rejects.toThrow(/timed out/);
    });
  });

  describe('sleep()', () => {
    test('should pause for at least the specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });
});
