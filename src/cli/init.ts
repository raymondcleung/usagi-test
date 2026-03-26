import { resolve } from 'path';
import { existsSync, writeFileSync } from 'fs';

const DEFAULT_CONFIG = `import { defineConfig } from 'usagi-test/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
  },
  usagi: {
    baseUrl: 'http://localhost:3000',
  }
});
`;

export async function initAction() {
  const cwd = process.cwd();
  const configPath = resolve(cwd, 'usagi.config.ts');
  
  if (existsSync(configPath)) {
    console.log('⚠️  usagi.config.ts already exists. Skipping init.');
    return;
  }
  
  try {
    writeFileSync(configPath, DEFAULT_CONFIG);
    console.log('✅ Created usagi.config.ts successfully!');
  } catch (err) {
    console.error('❌ Failed to create config:', err);
    process.exit(1);
  }
}
