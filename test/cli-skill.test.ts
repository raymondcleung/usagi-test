import { it, expect, describe, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import { skillAction } from '../src/cli/skill.js';

// 1. Mock the File System
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

// 2. Mock Console to avoid cluttering test output
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('CLI: skill command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create the .usagi directory if it is missing', () => {
    (fs.existsSync as any).mockReturnValue(false);

    skillAction();

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('.usagi'),
      { recursive: true }
    );
  });

  it('should write the ai-skill.md file with the Claude-optimized instructions', () => {
    skillAction();

    // Verification: Now looking for the new header and optimized content
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('ai-skill.md'),
      expect.stringContaining('# SYSTEM PROMPT: Usagi Testing Framework Expert')
    );
    
    // Verify that the new "core_syntax_rules" block exists in the output
    expect(fs.writeFileSync).lastCalledWith(
      expect.any(String),
      expect.stringContaining('<core_syntax_rules>')
    );
  });

  it('should print the updated success message to the terminal', () => {
    skillAction();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Usagi AI Skill updated!')
    );
  });
});
