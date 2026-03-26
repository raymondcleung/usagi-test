import { it, expect, describe, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { intercept } from '../src/interceptor.js';
import { retry } from '../src/utils/time.js';

describe('Usagi Trace (Debug Mode)', () => {
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
    delete process.env.USAGI_DEBUG;
  });

  afterEach(() => {
    delete process.env.USAGI_DEBUG;
  });

  it('should NOT log traces when debug mode is disabled', async () => {
    intercept.get('https://api.test.com/silent', () => ({ ok: true }));
    
    await fetch('https://api.test.com/silent');

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should log 🛡️ [MOCK] traces when USAGI_DEBUG is true', async () => {
    process.env.USAGI_DEBUG = 'true';
    
    intercept.get('https://api.test.com/trace', () => ({ ok: true }));
    
    await fetch('https://api.test.com/trace');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🛡️ [MOCK] GET https://api.test.com/trace -> 200')
    );
  });

  it('should log 🔄 [RETRY] traces during utility failures', async () => {
    process.env.USAGI_DEBUG = 'true';

    const flakyTask = vi.fn().mockRejectedValue(new Error('Fail'));

    try {
      // Use short delays to keep tests fast
      await retry(flakyTask, { retries: 1, delays: [5] });
    } catch {
      // Expected failure
    }

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🔄 [RETRY] Attempt 1 failed')
    );
  });

  it('should log ⚠️ [WARN] for unhandled requests in debug mode', async () => {
    process.env.USAGI_DEBUG = 'true';
    
    // 1. Use an external URL so MSW doesn't silently bypass it via the localhost rule
    const unmockedUrl = 'https://jsonplaceholder.typicode.com/unmocked-trace-test';

    // 2. Fetch it. Since it's external, it will pass through MSW, 
    // trigger the Usagi WARN trace, and then hit the real network (returning a 404)
    await fetch(unmockedUrl);

    // 3. Verify Usagi logged the trace
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(`⚠️ [WARN] Unhandled outbound request: GET ${unmockedUrl}`)
    );
  });
});
