import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest';
import { runUsagiTestCommand, __setStartVitestRunner } from '../src/bin.js'; // Adjust path
import { existsSync } from 'fs';

// Mock the file system and jiti so we can simulate a config file
vi.mock('fs', async (importOriginal) => ({
  ...await importOriginal<typeof import('fs')>(),
  existsSync: vi.fn(),
}));

vi.mock('jiti', () => ({
  createJiti: () => ({
    import: async () => ({ usagi: { baseUrl: 'https://from-config.com' } })
  })
}));

describe('CLI Base URL Priority Engine', () => {
  const originalEnv = process.env.USAGI_BASE_URL;

  beforeEach(() => {
    // Intercept startVitest so tests don't actually run.
    // We pass an empty function and cast the return to 'any' to satisfy TypeScript.
    __setStartVitestRunner(() => Promise.resolve({} as any));
    
    delete process.env.USAGI_BASE_URL;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.USAGI_BASE_URL = originalEnv;
    } else {
      delete process.env.USAGI_BASE_URL;
    }
  });

  test('Priority 1: CLI Options win over everything', async () => {
    process.env.USAGI_BASE_URL = 'https://from-env.com';
    vi.mocked(existsSync).mockReturnValue(true);

    await runUsagiTestCommand([], { baseUrl: 'https://from-cli.com' }, []);

    expect(process.env.USAGI_BASE_URL).toBe('https://from-cli.com');
  });

  test('Priority 2: Env Var wins if no CLI Option is provided', async () => {
    process.env.USAGI_BASE_URL = 'https://from-env.com';
    vi.mocked(existsSync).mockReturnValue(true);

    await runUsagiTestCommand([], {}, []);

    expect(process.env.USAGI_BASE_URL).toBe('https://from-env.com');
  });

  test('Priority 3: Config file wins if neither CLI nor Env Var exist', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    await runUsagiTestCommand([], {}, []);

    expect(process.env.USAGI_BASE_URL).toBe('https://from-config.com');
  });

  test('Fallback: Returns undefined if nothing is provided', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    await runUsagiTestCommand([], {}, []);

    expect(process.env.USAGI_BASE_URL).toBeUndefined();
  });
});
