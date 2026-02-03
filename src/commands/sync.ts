import { resolve } from 'path';
import type { SyncOptions } from '../types/index.js';
import { GitService } from '../services/git.js';
import { loadConfig } from '../services/config.js';
import { logger } from '../utils/logger.js';
import { pathExists } from '../utils/validation.js';
import { findWorktreeByBranch, findWorktreeByPath } from '../utils/worktree-lookup.js';
import chalk from 'chalk';

export async function syncCommand(
  pathArg: string | undefined,
  options: SyncOptions
): Promise<void> {
  const git = new GitService();

  if (!await git.isGitRepo()) {
    logger.error('Not a git repository');
    process.exit(1);
  }

  const config = await loadConfig();
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

  if (!await pathExists(worktreePath)) {
    logger.error(`Path not found: ${worktreePath}`);
    process.exit(1);
  }

  const targetWorktree = worktrees.find(w => w.path === worktreePath) || findWorktreeByPath(worktrees, worktreePath);

  if (!targetWorktree) {
    logger.error(`Not a valid worktree: ${worktreePath}`);
    process.exit(1);
  }

  const { branch } = await git.getBranchInfo(worktreePath);
  const baseBranch = config.defaultBranch || 'main';
  const useMerge = options.merge || false;

  logger.info(`Syncing ${branch} with ${baseBranch}...`);

  if (!options.noFetch) {
    logger.info('Fetching remote...');
    await git.fetch(worktreePath);
  }

  const status = await git.getStatus(worktreePath);
  let stashed = false;

  if (status.isDirty) {
    logger.info('Stashing uncommitted changes...');
    await git.stash(worktreePath);
    stashed = true;
  }

  try {
    if (useMerge) {
      logger.info(`Merging ${baseBranch}...`);
      await git.merge(worktreePath, baseBranch);
    } else {
      logger.info(`Rebasing onto ${baseBranch}...`);
      await git.rebase(worktreePath, baseBranch);
    }

    if (stashed) {
      logger.info('Restoring stashed changes...');
      await git.stashPop(worktreePath);
    }

    logger.success(`Sync complete: ${branch} is up to date with ${baseBranch}`);
  } catch (error) {
    if (stashed) {
      logger.info('Restoring stashed changes due to error...');
      await git.stashPop(worktreePath);
    }
    throw error;
  }
}
