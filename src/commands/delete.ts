import { resolve } from 'path';
import type { DeleteOptions } from '../types/index.js';
import { GitService } from '../services/git.js';
import { loadConfig } from '../services/config.js';
import { executeHooks } from '../services/hooks.js';
import { archiveCommand } from './archive.js';
import { logger } from '../utils/logger.js';
import { pathExists } from '../utils/validation.js';
import chalk from 'chalk';
import readline from 'readline';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function deleteCommand(
  pathArg: string,
  options: DeleteOptions
): Promise<void> {
  const git = new GitService();

  if (!await git.isGitRepo()) {
    logger.error('Not a git repository');
    process.exit(1);
  }

  const worktreePath = resolve(pathArg);
  
  if (!await pathExists(worktreePath)) {
    logger.error(`Worktree not found: ${worktreePath}`);
    process.exit(1);
  }

  const config = await loadConfig();
  const rootPath = await git.getRootPath();
  const worktrees = await git.getWorktrees();
  const targetWorktree = worktrees.find(w => w.path === worktreePath);

  if (!targetWorktree) {
    logger.error(`Not a valid worktree: ${worktreePath}`);
    process.exit(1);
  }

  const warnings: string[] = [];

  if (!options.force) {
    const status = await git.getStatus(worktreePath);
    const { branch } = await git.getBranchInfo(worktreePath);
    const unpushedCount = await git.getUnpushedCount(worktreePath, branch);
    const isMerged = await git.isBranchMerged(worktreePath, branch, config.defaultBranch || 'main');

    if (status.isDirty) {
      warnings.push(`Worktree has uncommitted changes (${status.uncommittedCount} files)`);
    }
    if (unpushedCount > 0) {
      warnings.push(`Worktree has ${unpushedCount} unpushed commits`);
    }
    if (!isMerged) {
      warnings.push('Branch is not merged to main');
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow('\n⚠ Warnings:'));
      warnings.forEach(w => console.log(`  • ${w}`));
      
      const answer = await prompt('\nContinue with deletion? [y/N]: ');
      if (answer.toLowerCase() !== 'y') {
        logger.info('Deletion cancelled');
        return;
      }
    }
  }

  if (options.archive) {
    await archiveCommand(pathArg, {});
  }

  if (!options.noHooks) {
    const { branch } = await git.getBranchInfo(worktreePath);
    const hookResult = await executeHooks(
      config,
      'preRemove',
      {
        worktreePath,
        branch,
        worktreeName: worktreePath.split('/').pop() || '',
        mainPath: rootPath,
      },
      (msg) => logger.info(msg)
    );
    
    if (!hookResult.success) {
      hookResult.errors.forEach(e => logger.warning(e));
    }
  }

  logger.info(`Removing worktree: ${worktreePath}`);
  await git.removeWorktree(worktreePath);
  await git.pruneWorktrees();

  if (!options.noHooks) {
    const { branch } = await git.getBranchInfo(worktreePath);
    const hookResult = await executeHooks(
      config,
      'postRemove',
      {
        worktreePath,
        branch,
        worktreeName: worktreePath.split('/').pop() || '',
        mainPath: rootPath,
      },
      (msg) => logger.info(msg)
    );
    
    if (!hookResult.success) {
      hookResult.errors.forEach(e => logger.warning(e));
    }
  }

  logger.success(`Worktree removed: ${worktreePath}`);
}
