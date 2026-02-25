import { basename } from 'path';
import type { PackageManager, SetupOptions, WorktreeConfig } from '../types/index.js';
import { detectPackageManager, installDependencies } from './package-manager.js';
import { copyEnvFiles, executeHooks } from './hooks.js';

export interface WorktreeSetupInput {
  config: WorktreeConfig;
  sourcePath: string;
  worktreePath: string;
  branch: string;
  mainPath: string;
  options?: SetupOptions;
  onProgress?: (msg: string) => void;
}

export interface WorktreeSetupResult {
  warnings: string[];
  installedWith?: PackageManager['name'];
  installAttempted: boolean;
  copiedFiles: string[];
  copyAttempted: boolean;
  hooksAttempted: boolean;
  hooksSucceeded: boolean;
}

function hasPostCreateHooks(config: WorktreeConfig): boolean {
  const hooks = config.hooks?.postCreate;
  if (!hooks) {
    return false;
  }

  if (Array.isArray(hooks)) {
    return hooks.length > 0;
  }

  return hooks.trim().length > 0;
}

export async function runWorktreeSetup(input: WorktreeSetupInput): Promise<WorktreeSetupResult> {
  const {
    config,
    sourcePath,
    worktreePath,
    branch,
    mainPath,
    options = {},
    onProgress,
  } = input;

  const warnings: string[] = [];
  const copiedFiles: string[] = [];

  let installedWith: PackageManager['name'] | undefined;
  let installAttempted = false;
  let copyAttempted = false;
  let hooksAttempted = false;
  let hooksSucceeded = true;

  if (!options.noInstall && config.autoInstall) {
    const pm = await detectPackageManager(worktreePath) || await detectPackageManager(sourcePath);
    if (pm) {
      installAttempted = true;
      const result = await installDependencies(worktreePath, pm, onProgress);

      if (result.success) {
        installedWith = pm.name;
      } else {
        warnings.push(result.error || 'Failed to install dependencies');
      }
    }
  }

  if (!options.noCopy && config.autoCopy) {
    if (sourcePath === worktreePath) {
      onProgress?.('Skipping file copy because source and target paths are the same');
    } else {
      copyAttempted = true;
      const result = await copyEnvFiles(sourcePath, worktreePath, config, onProgress);
      copiedFiles.push(...result.copied);
      warnings.push(...result.errors);
    }
  }

  if (!options.noHooks && hasPostCreateHooks(config)) {
    hooksAttempted = true;
    const result = await executeHooks(
      config,
      'postCreate',
      {
        worktreePath,
        branch,
        worktreeName: basename(worktreePath),
        mainPath,
        createdAt: new Date().toISOString(),
      },
      onProgress
    );

    if (!result.success) {
      hooksSucceeded = false;
      warnings.push(...result.errors);
    }
  }

  return {
    warnings,
    installedWith,
    installAttempted,
    copiedFiles,
    copyAttempted,
    hooksAttempted,
    hooksSucceeded,
  };
}
