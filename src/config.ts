import { ViteUserConfig, defineConfig as vitestDefineConfig } from 'vitest/config';

export interface AthenaOptions {
  /** * The base URL used for request() calls when no target is provided.
   * Example: 'http://localhost:3000'
   */
  baseUrl?: string;
  
  /** Enable custom reporting features for Athena */
  customFeature?: boolean;
}

/**
 * We extend the Vitest UserConfig (which includes 'test' via Vite augmentation)
 * and add our 'athena' property.
 */
export type AthenaConfig = ViteUserConfig & {
  athena?: AthenaOptions;
};

// Re-export the utilities found in your vitest/config.d.ts
export { defineProject, configDefaults } from 'vitest/config';

/**
 * Your custom defineConfig helper.
 * We return it as 'any' or 'AthenaConfig' to ensure Vitest doesn't 
 * complain about the extra 'athena' key during the internal load.
 */
export function defineConfig(config: AthenaConfig): any {
  return config;
}
