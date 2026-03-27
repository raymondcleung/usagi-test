#!/usr/bin/env node
import { Command } from 'commander';
import { parseCLI, startVitest } from 'vitest/node';
import { resolve as resolvePath } from 'path';
import { existsSync } from 'fs';
import { styleText } from 'node:util';
import { createJiti } from 'jiti';
import { initAction } from './cli/init.js';
import { skillAction } from './cli/skill.js';

let startVitestRunner = startVitest;
export function __setStartVitestRunner(fn: typeof startVitest) {
  startVitestRunner = fn;
}

const program = new Command();

program
  .name('usagi')
  .description(`
Zero-config API testing suite powered by Vitest.

Supports all Vitest CLI options. Common options include:
  --run                    Run tests once (non-watch mode)
  --watch                  Run tests in watch mode
  --reporter <name>       Specify reporter (json, junit, verbose, etc.)
  --coverage               Enable coverage reporting
  -t, --testNamePattern <pattern> Filter tests by name pattern
  --config <path>          Path to config file
  --root <path>            Project root directory
  --baseUrl <url>          Override the Base URL for API requests
  --debug                  Enable Usagi trace logging
  --json                   Output results in JSON format

Examples:
  $ usagi                                      # Run all tests
  $ usagi --run                                # Run once, non-watch
  $ usagi --baseUrl https://staging-api.com    # Run with custom Base URL
  $ usagi --reporter junit                     # JUnit output
  $ usagi --json                               # JSON output
  $ usagi -t="SMOKE"                           # Filter by test name
  $ usagi --debug                              # Enable trace logging
`)
  .version('1.0.0')
  .allowUnknownOption();

program
  .command('init')
  .description('Initialize Usagi config')
  .action(initAction);

program
  .command('skill')
  .description('Generate AI Skill for local LLMs')
  .action(skillAction);

program
  .command('run [files...]')
  .description('Run tests once (alias for usagi --run)')
  .action(async (files) => {
    await runUsagiTestCommand(files, {}, ['--run']);
  });

program
  .command('watch [files...]')
  .description('Run tests in watch mode (alias for usagi --watch)')
  .action(async (files) => {
    await runUsagiTestCommand(files, {}, ['--watch']);
  });

export async function runUsagiTestCommand(files: string[], options: { baseUrl?: string; debug?: boolean; testNamePattern?: string; reporter?: string; outputFile?: string; json?: boolean }, vitestArgs: string[]) {
  const cwd = process.cwd();

  if (options.debug) {
    process.env.USAGI_DEBUG = 'true';
    console.log(styleText('cyan', '\n🚀 Usagi Trace Mode: Active'));
  }

  const configFiles = ['usagi.config.ts', 'usagi.config.js', 'usagi.config.mjs'];
  const foundConfig = configFiles.find(file => existsSync(resolvePath(cwd, file)));

  let usagiConfig: any = {};
  if (foundConfig) {
    try {
      const configPath = resolvePath(cwd, foundConfig);
      const loadConfig = createJiti(cwd, { interopDefault: true });
      const imported: any = await loadConfig.import(configPath);
      usagiConfig = imported.usagi || imported.default?.usagi || {};
    } catch (err) {
      if (options.debug) console.error('Failed to load config:', err);
    }
  }

  // Priority Order: 1. CLI Arg | 2. Env Variable | 3. Config File
  const finalBaseUrl = options.baseUrl || process.env.USAGI_BASE_URL || usagiConfig.baseUrl;
  
  if (finalBaseUrl) {
    process.env.USAGI_BASE_URL = finalBaseUrl;
  }

  // Sync Commander captured options into the array passed to Vitest
  const finalArgs = [...vitestArgs];
  if (options.testNamePattern) finalArgs.push('--testNamePattern', options.testNamePattern);
  if (options.reporter) finalArgs.push('--reporter', options.reporter);
  if (options.outputFile) finalArgs.push('--outputFile', options.outputFile);
  if (options.json) finalArgs.push('--json');

  const parsed = parseCLI(['vitest', ...finalArgs], { allowUnknownOptions: true });

  // Clean filters so flags/options aren't treated as filenames
  const combinedFilters = [...files, ...(parsed.filter || [])];
  const cliFilters = combinedFilters.filter(f => f && !f.startsWith('-'));

  const vitestOptions = {
    ...parsed.options,
    watch: parsed.options.watch || false, 
    config: foundConfig,
    root: cwd,
    provide: {
      usagi: {
        ...usagiConfig,
        baseUrl: finalBaseUrl,
      }
    }
  };

  // Ensure JSON reporter is active if requested via flag
  if (options.json || parsed.options.json) {
    vitestOptions.reporters = ['json'];
  }

  await startVitestRunner('test', cliFilters, vitestOptions);
}

program
  .argument('[files...]', 'Test files to run')
  .option('--baseUrl <url>', 'Override the Base URL')
  .option('--debug', 'Enable Usagi Trace')
  .option('-t, --testNamePattern <pattern>', 'Filter tests by name')
  .option('--reporter <name>', 'Specify reporter')
  .option('--outputFile <path>', 'Specify output file path')
  .option('--json', 'Output results in JSON format')
  .action(async (files, options) => {
    // Separate actual files from potential flags
    const actualFiles = files.filter((f: string) => !f.startsWith('-'));
    const vitestArgs = files.filter((f: string) => f.startsWith('-'));
    
    // Pass the options object so debug, json, and reporters work seamlessly
    await runUsagiTestCommand(actualFiles, options, vitestArgs);
  });

program.parse();
