import { it, expect, describe, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { intercept } from '../src/interceptor.js';
import { retry } from '../src/utils/time.js';

describe('Athena Trace (Debug Mode)', () => {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  // CRITICAL: Start the interceptor for this test suite
  beforeAll(() => {
    intercept._start();
  });

  // CRITICAL: Stop the interceptor when done
  afterAll(() => {
    intercept._stop();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    intercept.reset();
    // Reset the debug env var before each test
    delete process.env.ATHENA_DEBUG;
  });

  afterEach(() => {
    delete process.env.ATHENA_DEBUG;
  });

  it('should NOT log traces when debug mode is disabled', async () => {
    intercept.get('https://api.test.com/silent', () => ({ ok: true }));
    
    await fetch('https://api.test.com/silent');

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should log 🛡️ [MOCK] traces when ATHENA_DEBUG is true', async () => {
    process.env.ATHENA_DEBUG = 'true';
    
    intercept.get('https://api.test.com/trace', () => ({ ok: true }));
    
    await fetch('https://api.test.com/trace');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🛡️ [MOCK] GET https://api.test.com/trace -> 200')
    );
  });

  it('should log 🔄 [RETRY] traces during utility failures', async () => {
    process.env.ATHENA_DEBUG = 'true';

    const flakyTask = vi.fn().mockRejectedValue(new Error('Fail'));

    try {
      // Use short delays to keep tests fast
      await retry(flakyTask, { retries: 1, delays: [5] });
    } catch (e) {
      // Expected failure
    }

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🔄 [RETRY] Attempt 1 failed')
    );
  });

  it('should log ⚠️ [WARN] for unhandled requests in debug mode', async () => {
    process.env.ATHENA_DEBUG = 'true';
    
    // We wrap this in a try/catch because we expect the fetch to fail 
    // at the network level (since the URL doesn't exist).
    // Our goal is to see if Athena LOGGED the warning before the crash.
    try {
      await fetch('https://unmocked-external-service.com');
    } catch (e) {
      // We ignore the network error (ENOTFOUND)
    }

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('⚠️ [WARN] Unhandled outbound request')
    );
  });
});
