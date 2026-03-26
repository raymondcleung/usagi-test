import { it, expect, vi, describe } from 'vitest';
import { existsSync, writeFileSync } from 'fs';
import { initAction } from '../src/cli/init.js';

vi.mock('fs'); // Tell the runner to use fake FS methods

describe('initAction', () => {
  it('should not overwrite if config already exists', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    
    await initAction();
    
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('should create a new file if one does not exist', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    
    await initAction();
    
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('athena.config.ts'),
      expect.stringContaining('defineConfig')
    );
  });
});
