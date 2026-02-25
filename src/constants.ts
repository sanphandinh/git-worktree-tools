import { createRequire } from 'node:module';
import type { WorktreeConfig } from './types/index.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version?: string };

export const PACKAGE_NAME = 'wt';
export const VERSION = packageJson.version ?? '0.0.0';

export const DEFAULT_CONFIG: WorktreeConfig = {
  defaultBranch: 'main',
  autoInstall: true,
  autoCopy: true,
  copyFiles: ['.env.example'],
  ignoreFiles: ['.env', 'node_modules', 'dist', 'build', '.next', '.git'],
  hooks: {},
  archive: {
    directory: '~/.worktree-archives',
    autoArchive: false,
    compression: 6,
  },
};

export const PACKAGE_MANAGERS = [
  {
    name: 'npm' as const,
    lockfile: 'package-lock.json',
    installCommand: 'npm install',
    runCommand: 'npm run',
  },
  {
    name: 'yarn' as const,
    lockfile: 'yarn.lock',
    installCommand: 'yarn install',
    runCommand: 'yarn',
  },
  {
    name: 'pnpm' as const,
    lockfile: 'pnpm-lock.yaml',
    installCommand: 'pnpm install',
    runCommand: 'pnpm run',
  },
  {
    name: 'bun' as const,
    lockfile: 'bun.lockb',
    installCommand: 'bun install',
    runCommand: 'bun run',
  },
];

export const CONFIG_SEARCH_PLACES = [
  '.wtconfig.json',
  '.config/wtconfig.json',
  'wtconfig.json',
];
