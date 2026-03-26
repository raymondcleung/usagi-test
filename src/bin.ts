#!/usr/bin/env node
import { Command } from 'commander';
import { parseCLI, startVitest } from 'vitest/node';
import { resolve as resolvePath } from 'path';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
import { styleText } from 'node:util';
import { initAction } from './cli/init.js';
import { skillAction } from './cli/skill.js';

let startVitestRunner = startVitest;
export function __setStartVitestRunner(fn: typeof startVitest) {
  startVitestRunner = fn;
}

const program = new Command();

program
  .name('athena')
  .description(`
Zero-config API testing suite powered by Vitest.

Supports all Vitest CLI options. Common options include:
  --run                    Run tests once (non-watch mode)
  --watch                  Run tests in watch mode
  --reporter <name>       Specify reporter (json, verbose, etc.)
  --coverage               Enable coverage reporting
  --testNamePattern <pattern> Filter tests by name pattern
  --config <path>          Path to config file
  --root <path>            Project root directory

Examples:
  $ athena                    # Run all tests
  $ athena --run              # Run once, non-watch
  $ athena --json             # JSON output
  $ athena -t="SMOKE"         # Filter by test name
  $ athena --coverage         # With coverage
  $ athena --debug            # Enable Athena trace logging
`)
  .version('1.0.0')
  .allowUnknownOption();

program
  .command('init')
  .description('Initialize Athena config')
  .action(initAction);

program
  .command('skill')
  .description('Generate AI Skill for local LLMs')
  .action(skillAction);

program
  .command('run [files...]')
  .description('Run tests once (alias for athena --run)')
  .action(async (files) => {
    await runAthenaTestCommand(files, {}, ['--run']);
  });

program
  .command('watch [files...]')
  .description('Run tests in watch mode (alias for athena --watch)')
  .action(async (files) => {
    await runAthenaTestCommand(files, {}, ['--watch']);
  });

export async function runAthenaTestCommand(files: string[], options: { baseUrl?: string; debug?: boolean }, vitestArgs: string[]) {
  const cwd = process.cwd();

  if (options.debug) {
    process.env.ATHENA_DEBUG = 'true';
    console.log(styleText('cyan', '\n🚀 Athena Trace Mode: Active'));
  }

  const configFiles = ['athena.config.ts', 'athena.config.js', 'athena.config.mjs'];
  const foundConfig = configFiles.find(file => existsSync(resolvePath(cwd, file)));

  let athenaConfig: any = {};
  if (foundConfig) {
    try {
      const configPath = pathToFileURL(resolvePath(cwd, foundConfig)).href;
      const imported = await import(configPath);
      athenaConfig = imported.default?.athena || {};
    } catch (e) {}
  }

  const finalBaseUrl = options.baseUrl || athenaConfig.baseUrl || 'http://localhost:3000';
  process.env.ATHENA_BASE_URL = finalBaseUrl;

  const parsed = parseCLI(['vitest', ...vitestArgs], { allowUnknownOptions: true });

  const cliFilters = files.length > 0 ? files : parsed.filter;
  const vitestOptions = {
    ...parsed.options,
    run: true,
    config: foundConfig,
    root: cwd,
    provide: {
      athena: {
        ...athenaConfig,
        baseUrl: finalBaseUrl,
      }
    }
  };

  if (parsed.options.json) {
    vitestOptions.reporters = ['json'];
  }

  await startVitestRunner('test', cliFilters, vitestOptions);
}

program
  .argument('[files...]', 'Test files to run')
  .option('--baseUrl <url>', 'Override the Base URL')
  .option('--debug', 'Enable Athena Trace')
  .action(async (files, options) => {
    const actualFiles = files.filter((f: string) => !f.startsWith('-'));
    const vitestArgs = files.filter((f: string) => f.startsWith('-'));
    await runAthenaTestCommand(actualFiles, options, vitestArgs);
  });

program.parse();
