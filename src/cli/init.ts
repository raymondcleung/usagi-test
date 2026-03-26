import { resolve } from 'path';
import { existsSync, writeFileSync } from 'fs';

const DEFAULT_CONFIG = `import { defineConfig } from 'athena-test/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
  },
  athena: {
    baseUrl: 'http://localhost:3000',
  }
});
`;

export async function initAction() {
  const cwd = process.cwd();
  const configPath = resolve(cwd, 'athena.config.ts');
  
  if (existsSync(configPath)) {
    console.log('⚠️  athena.config.ts already exists. Skipping init.');
    return;
  }
  
  try {
    writeFileSync(configPath, DEFAULT_CONFIG);
    console.log('✅ Created athena.config.ts successfully!');
  } catch (err) {
    console.error('❌ Failed to create config:', err);
    process.exit(1);
  }
}
