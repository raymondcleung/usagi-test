import { beforeAll, afterAll, afterEach } from 'vitest';
import { intercept } from './interceptor.js';

/**
 * Usagi Auto-Lifecycle
 * Automatically manages the MSW Interceptor if running inside Vitest.
 */
if (typeof beforeAll !== 'undefined' && typeof afterEach !== 'undefined' && typeof afterAll !== 'undefined') {
  beforeAll(() => {
    intercept._start();
  });
  
  afterEach(() => {
    intercept.reset();
  });
  
  afterAll(() => {
    intercept._stop();
  });
}

// Re-export Vitest's core API
export * from 'vitest';
export { faker } from '@faker-js/faker';
export { intercept } from './interceptor.js';

// Explicitly export Usagi's "Superpowers" to ensure they 
// override or stand out clearly from the base test runner.
export { request } from './utils/network.js';
export { retry, waitUntil } from './utils/time.js'; 

// Export everything else from utils (like types or secondary helpers)
export * from './utils/index.js';
