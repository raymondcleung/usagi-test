import { styleText } from 'node:util';

/**
 * Pauses execution for a specified duration.
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const wait = sleep;

/**
 * Advanced polling utility.
 */
export const waitUntil = async (
  predicate: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> => {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await predicate()) return;
    await sleep(interval);
  }

  throw new Error(`[Usagi] waitUntil timed out after ${timeout}ms`);
};

export interface RetryOptions {
  delays?: number[];
  retries?: number;
}

/**
 * Retries a function until it succeeds or hits the retry limit.
 * Enhanced with Live Trace logging.
 */
export const retry = async <T>(
  fn: () => T | Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const { 
    retries = 3, 
    delays = [1000, 2000, 5000] 
  } = options;

  let lastError: unknown;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < retries) {
        const delay = delays[i] || delays[delays.length - 1];
        
        // Live Trace Logging
        if (process.env.USAGI_DEBUG === 'true') {
          const timestamp = new Date().toLocaleTimeString();
          console.log(
            `${styleText('gray', timestamp)} 🔄 [${styleText('yellow', 'RETRY')}] Attempt ${i + 1} failed. Next retry in ${delay}ms`
          );
        }

        await sleep(delay);
      }
    }
  }

  throw lastError;
};
