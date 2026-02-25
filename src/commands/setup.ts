import { resolve } from 'path';
import type { SetupOptions, WorktreeConfig, WorktreeInfo } from '../types/index.js';
import { GitService } from '../services/git.js';
import { loadConfig } from '../services/config.js';
import { runWorktreeSetup } from '../services/setup.js';
import { logger } from '../utils/logger.js';
import { pathExists, isDirectory } from '../utils/validation.js';
import { findWorktreeByBranch, findWorktreeByPath } from '../utils/worktree-lookup.js';
import chalk from 'chalk';

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

function getMainWorktreePath(worktrees: WorktreeInfo[], fallback: string): string {
  if (worktrees.length === 0) {
    return fallback;
  }

  return worktrees[0].path;
}

function showSetupPlan(
  worktreePath: string,
  branch: string,
  sourcePath: string,
  options: SetupOptions,
  config: WorktreeConfig
): void {
  const installEnabled = !options.noInstall && !!config.autoInstall;
  const copyEnabled = !options.noCopy && !!config.autoCopy && sourcePath !== worktreePath;
  const hooksEnabled = !options.noHooks && hasPostCreateHooks(config);

  console.log();
  console.log(chalk.cyan('Worktree Setup Plan:'));
  console.log(`  Path: ${worktreePath}`);
  console.log(`  Branch: ${branch}`);
  console.log(`  Source: ${sourcePath}`);
  console.log(`  Install dependencies: ${installEnabled ? 'yes' : 'no'}`);
  console.log(`  Copy env files: ${copyEnabled ? 'yes' : 'no'}`);
  console.log(`  Run postCreate hooks: ${hooksEnabled ? 'yes' : 'no'}`);
  console.log();
}

export async function setupCommand(
  pathArg: string | undefined,
  options: SetupOptions
): Promise<void> {
  const git = new GitService();

  if (!await git.isGitRepo()) {
    logger.error('Not a git repository');
    process.exit(1);
  }

  const config = await loadConfig();
  const rootPath = await git.getRootPath();
  const worktrees = await git.getWorktrees();

  let worktreePath: string;

  if (!pathArg) {
    worktreePath = process.cwd();
  } else {
    const branchMatch = findWorktreeByBranch(worktrees, pathArg);

    if (branchMatch) {
      worktreePath = branchMatch.path;
      logger.info(`Found worktree for branch "${pathArg}": ${worktreePath}`);
    } else {
      worktreePath = resolve(pathArg);
    }
  }

  if (!await pathExists(worktreePath) || !await isDirectory(worktreePath)) {
    logger.error(`Worktree not found: ${worktreePath}`);
    process.exit(1);
  }

  const targetWorktree = worktrees.find(w => w.path === worktreePath) || findWorktreeByPath(worktrees, worktreePath);

  if (!targetWorktree) {
    logger.error(`Not a valid worktree: ${worktreePath}`);
    process.exit(1);
  }

  const sourcePath = getMainWorktreePath(worktrees, rootPath);
  const { branch } = await git.getBranchInfo(worktreePath);

  if (options.dryRun) {
    console.log(chalk.yellow('Dry run - would execute:'));
    showSetupPlan(worktreePath, branch, sourcePath, options, config);
    console.log(chalk.yellow('  (No changes made - dry run mode)'));
    return;
  }

  logger.info(`Running setup for ${worktreePath}...`);

  const result = await runWorktreeSetup({
    config,
    sourcePath,
    worktreePath,
    branch,
    mainPath: sourcePath,
    options,
    onProgress: (msg) => logger.info(msg),
  });

  if (result.installedWith) {
    logger.success(`Installed dependencies with ${result.installedWith}`);
  } else if (result.installAttempted) {
    logger.warning('Dependency installation failed');
  }

  if (result.copiedFiles.length > 0) {
    logger.success(`Copied ${result.copiedFiles.length} files`);
  }

  if (result.hooksAttempted && result.hooksSucceeded) {
    logger.success('Hooks executed');
  }

  if (!result.installAttempted && !result.copyAttempted && !result.hooksAttempted) {
    logger.info('No setup actions were enabled by config/options');
  }

  console.log();
  console.log(chalk.green('✓ Worktree setup completed'));
  console.log(`  Path: ${worktreePath}`);
  console.log(`  Branch: ${branch}`);

  if (result.warnings.length > 0) {
    console.log();
    console.log(chalk.yellow('Warnings:'));
    result.warnings.forEach((warning) => console.log(`  ⚠ ${warning}`));
  }

  console.log();
}
