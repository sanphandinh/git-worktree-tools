export interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
  isMain: boolean;
  isDirty: boolean;
  uncommittedCount: number;
  unpushedCount: number;
  isMerged: boolean;
  lastCommitDate: Date;
  size?: number;
}

export interface WorktreeConfig {
  defaultBranch?: string;
  autoInstall?: boolean;
  autoCopy?: boolean;
  copyFiles?: string[];
  ignoreFiles?: string[];
  hooks?: {
    postCreate?: string | string[];
    preRemove?: string | string[];
    postRemove?: string | string[];
  };
  archive?: {
    directory?: string;
    autoArchive?: boolean;
    compression?: number;
  };
}

export interface PackageManager {
  name: 'npm' | 'yarn' | 'pnpm' | 'bun';
  lockfile: string;
  installCommand: string;
  runCommand: string;
}

export interface CreateOptions {
  branch?: string;
  branchFrom?: string;
  noInstall?: boolean;
  noHooks?: boolean;
  dryRun?: boolean;
}

export interface DeleteOptions {
  force?: boolean;
  archive?: boolean;
  noHooks?: boolean;
}

export interface ListOptions {
  dirty?: boolean;
  stale?: boolean;
  merged?: boolean;
  porcelain?: boolean;
  json?: boolean;
}

export interface SyncOptions {
  merge?: boolean;
  rebase?: boolean;
  noFetch?: boolean;
}

export interface ArchiveOptions {
  output?: string;
  compress?: boolean;
  noGit?: boolean;
}

export interface HookContext {
  worktreePath: string;
  branch: string;
  worktreeName: string;
  mainPath: string;
  createdAt?: string;
}

/**
 * Response from interactive prompts when user needs to provide missing information
 */
export interface PromptResponse {
  folderName: string;
  branchName: string;
  confirmed: boolean;
}

/**
 * Result from pre-flight validation checks before creating a worktree
 */
export interface CreateValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
  existingWorktrees?: string[];
  existingBranches?: string[];
}

/**
 * The 4 possible creation scenarios based on what user provided
 */
export type CreateScenario = 'both-provided' | 'path-only' | 'branch-only' | 'neither';

/**
 * Planned creation parameters after analyzing inputs and prompts
 */
export interface CreatePlan {
  scenario: CreateScenario;
  folderName: string;
  branchName: string;
  baseBranch: string;
  derivedFrom: 'path' | 'branch' | 'prompt';
}
