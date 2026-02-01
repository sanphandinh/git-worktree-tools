import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';
import type { WorktreeConfig } from '../types/index.js';
import { DEFAULT_CONFIG, CONFIG_SEARCH_PLACES } from '../constants.js';

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

export async function loadConfig(cwd?: string): Promise<WorktreeConfig> {
  const result = await explorer.search(cwd);
  
  if (!result || !result.config) {
    return DEFAULT_CONFIG;
  }

  const parsed = configSchema.safeParse(result.config);
  
  if (!parsed.success) {
    throw new Error(`Invalid config in ${result.filepath}: ${parsed.error.message}`);
  }

  return {
    ...DEFAULT_CONFIG,
    ...parsed.data,
    hooks: {
      ...DEFAULT_CONFIG.hooks,
      ...parsed.data.hooks,
    },
    archive: {
      ...DEFAULT_CONFIG.archive,
      ...parsed.data.archive,
    },
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
