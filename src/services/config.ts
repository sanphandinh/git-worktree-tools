import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { WorktreeConfig } from '../types/index.js';
import { DEFAULT_CONFIG, CONFIG_SEARCH_PLACES } from '../constants.js';
import { GitService } from './git.js';

const configSchema = z.object({
  defaultBranch: z.string().optional(),
  autoInstall: z.boolean().optional(),
  autoCopy: z.boolean().optional(),
  copyFiles: z.array(z.string()).optional(),
  ignoreFiles: z.array(z.string()).optional(),
  hooks: z.object({
    postCreate: z.union([z.string(), z.array(z.string())]).optional(),
    preRemove: z.union([z.string(), z.array(z.string())]).optional(),
    postRemove: z.union([z.string(), z.array(z.string())]).optional(),
  }).optional(),
  archive: z.object({
    directory: z.string().optional(),
    autoArchive: z.boolean().optional(),
    compression: z.number().min(0).max(9).optional(),
  }).optional(),
});

const explorer = cosmiconfig('wt', {
  searchPlaces: CONFIG_SEARCH_PLACES,
});

async function parseGitignore(rootPath: string): Promise<string[] | null> {
  try {
    const content = await readFile(join(rootPath, '.gitignore'), 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch {
    return null;
  }
}

export async function loadConfig(cwd?: string): Promise<WorktreeConfig> {
  const result = await explorer.search(cwd);
  const git = new GitService(cwd);
  let gitRoot: string | null = null;

  try {
    gitRoot = await git.getRootPath();
  } catch {}

  let autoDetected: Partial<WorktreeConfig> = {};

  if (gitRoot) {
    const detectedBranch = await git.getDefaultBranch();
    if (detectedBranch) {
      autoDetected.defaultBranch = detectedBranch;
    }

    const gitignorePatterns = await parseGitignore(gitRoot);
    if (gitignorePatterns && gitignorePatterns.length > 0) {
      autoDetected.ignoreFiles = gitignorePatterns;
    }
  }

  if (!result || !result.config) {
    return {
      ...DEFAULT_CONFIG,
      ...autoDetected,
    };
  }

  const parsed = configSchema.safeParse(result.config);

  if (!parsed.success) {
    throw new Error(`Invalid config in ${result.filepath}: ${parsed.error.message}`);
  }

  const userConfig = parsed.data;

  return {
    ...DEFAULT_CONFIG,
    ...autoDetected,
    ...userConfig,
    hooks: {
      ...DEFAULT_CONFIG.hooks,
      ...userConfig.hooks,
    },
    archive: {
      ...DEFAULT_CONFIG.archive,
      ...userConfig.archive,
    },
    ignoreFiles: userConfig.ignoreFiles ?? autoDetected.ignoreFiles ?? DEFAULT_CONFIG.ignoreFiles,
    defaultBranch: userConfig.defaultBranch ?? autoDetected.defaultBranch ?? DEFAULT_CONFIG.defaultBranch,
  };
}

export function mergeConfig(base: WorktreeConfig, override: Partial<WorktreeConfig>): WorktreeConfig {
  return {
    ...base,
    ...override,
    hooks: {
      ...base.hooks,
      ...override.hooks,
    },
    archive: {
      ...base.archive,
      ...override.archive,
    },
  };
}
