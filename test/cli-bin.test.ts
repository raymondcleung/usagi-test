import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { runUsagiTestCommand, __setStartVitestRunner } from '../src/bin.js';
import { existsSync } from 'node:fs';
import { startVitest as nativeStartVitest } from 'vitest/node';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

const mockedExistsSync = existsSync as unknown as Mock;

describe('runUsagiTestCommand', () => {
  const savedArgv = process.argv;
  let startVitestMock: Mock;

  beforeEach(() => {
    mockedExistsSync.mockClear();
    mockedExistsSync.mockReturnValue(false);

    startVitestMock = vi.fn().mockResolvedValue({ shouldKeepServer: () => true });
    __setStartVitestRunner(startVitestMock as any);
  });

  afterEach(() => {
    process.argv = savedArgv;
    delete process.env.USAGI_BASE_URL;
    __setStartVitestRunner(nativeStartVitest as any);
  });

  it('forwards -t flag to Vitest testNamePattern option', async () => {
    process.argv = ['node', 'usagi', '-t=SMOKE'];

    await runUsagiTestCommand([], {}, ['-t=SMOKE']);

    expect(startVitestMock).toHaveBeenCalledTimes(1);
    const [, , vitestOptions] = startVitestMock.mock.calls[0];
    expect(vitestOptions.testNamePattern).toBe('SMOKE');
  });

  it('forwards --json to Vitest options', async () => {
    process.argv = ['node', 'usagi', '--json'];

    await runUsagiTestCommand([], {}, ['--json']);

    expect(startVitestMock).toHaveBeenCalledTimes(1);
    const [, , vitestOptions] = startVitestMock.mock.calls[0];
    expect(vitestOptions.reporters).toEqual(['json']);
  });

  it('run command forwards --run flag to Vitest', async () => {
    await runUsagiTestCommand(['test.js'], {}, ['--run']);

    expect(startVitestMock).toHaveBeenCalledTimes(1);
    const [, , vitestOptions] = startVitestMock.mock.calls[0];
    expect(vitestOptions.run).toBe(true);
  });

  it('watch command forwards --watch flag to Vitest', async () => {
    await runUsagiTestCommand(['test.js'], {}, ['--watch']);

    expect(startVitestMock).toHaveBeenCalledTimes(1);
    const [, , vitestOptions] = startVitestMock.mock.calls[0];
    expect(vitestOptions.watch).toBe(true);
  });

  it('handles multiple Vitest flags correctly', async () => {
    await runUsagiTestCommand(['test.js'], {}, ['--run', '--json']);

    expect(startVitestMock).toHaveBeenCalledTimes(1);
    const [, , vitestOptions] = startVitestMock.mock.calls[0];
    expect(vitestOptions.run).toBe(true);
    expect(vitestOptions.reporters).toEqual(['json']);
  });

  it('handles --debug option correctly', async () => {
    await runUsagiTestCommand(['test.js'], { debug: true }, []);

    expect(process.env.USAGI_DEBUG).toBe('true');
    expect(startVitestMock).toHaveBeenCalledTimes(1);
  });
});
