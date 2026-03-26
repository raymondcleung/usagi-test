import { ViteUserConfig } from 'vitest/config';

export interface UsagiOptions {
  /** * The base URL used for request() calls when no target is provided.
   * Example: 'http://localhost:3000'
   */
  baseUrl?: string;
  
  /** Enable custom reporting features for Usagi */
  customFeature?: boolean;
}

/**
 * We extend the Vitest UserConfig (which includes 'test' via Vite augmentation)
 * and add our 'usagi' property.
 */
export type UsagiConfig = ViteUserConfig & {
  usagi?: UsagiOptions;
};

// Re-export the utilities found in your vitest/config.d.ts
export { defineProject, configDefaults } from 'vitest/config';

/**
 * Your custom defineConfig helper.
 * We return it as 'any' or 'UsagiConfig' to ensure Vitest doesn't 
 * complain about the extra 'usagi' key during the internal load.
 */
export function defineConfig(config: UsagiConfig): any {
  return config;
}
