import { resolve } from 'path';
import type { DeleteOptions, WorktreeInfo } from '../types/index.js';
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

/**
 * Find a worktree by its branch name
 */
function normalizeBranchName(branch: string): string {
  return branch.replace(/^refs\/heads\//, '');
}

function findWorktreeByBranch(worktrees: WorktreeInfo[], branchName: string): WorktreeInfo | undefined {
  const normalizedInput = normalizeBranchName(branchName);

  let match = worktrees.find(w => normalizeBranchName(w.branch) === normalizedInput);
  if (match) return match;

  match = worktrees.find(w => normalizeBranchName(w.branch).toLowerCase() === normalizedInput.toLowerCase());
  if (match) return match;

  return undefined;
}

/**
 * Find a worktree by its path (exact or resolved)
 */
function findWorktreeByPath(worktrees: WorktreeInfo[], inputPath: string): WorktreeInfo | undefined {
  const resolvedPath = resolve(inputPath);

  // Try exact match first
  let match = worktrees.find(w => w.path === inputPath || w.path === resolvedPath);
  if (match) return match;

  // Try matching the folder name only
  const folderName = inputPath.split('/').pop() || inputPath;
  match = worktrees.find(w => {
    const worktreeFolder = w.path.split('/').pop() || '';
    return worktreeFolder === folderName;
  });

  return match;
}

/**
 * Display worktrees in a numbered list and prompt user to select one
 */
async function promptForWorktreeSelection(worktrees: WorktreeInfo[]): Promise<WorktreeInfo | null> {
  if (worktrees.length === 0) {
    logger.error('No worktrees found');
    return null;
  }

  const deletableWorktrees = worktrees.filter(w => !w.isMain);

  if (deletableWorktrees.length === 0) {
    logger.error('No deletable worktrees found (only main worktree exists)');
    return null;
  }

  console.log(chalk.cyan('\nSelect a worktree to delete:\n'));

  deletableWorktrees.forEach((wt, index) => {
    const folderName = wt.path.split('/').pop() || wt.path;
    console.log(`  ${chalk.bold(`${index + 1}.`)} ${chalk.white(folderName)}`);
    console.log(`     ${chalk.gray('Path:')}  ${wt.path}`);
    console.log(`     ${chalk.gray('Branch:')} ${wt.branch}`);
    if (wt.isDirty) {
      console.log(`     ${chalk.yellow('⚠ Has uncommitted changes')}`);
    }
    console.log();
  });

  const answer = await prompt('Enter number (or press Enter to cancel): ');

  if (!answer.trim()) {
    logger.info('Deletion cancelled');
    return null;
  }

  const selection = parseInt(answer, 10);

  if (isNaN(selection) || selection < 1 || selection > deletableWorktrees.length) {
    logger.error(`Invalid selection: ${answer}`);
    return null;
  }

  return deletableWorktrees[selection - 1];
}

/**
 * Determine if input looks like a branch name vs a path
 * Branches typically don't start with /, ., or ~
 * Paths often contain / or start with special characters
 */
function looksLikeBranchName(input: string): boolean {
  // If it starts with these, it's probably a path
  if (input.startsWith('/') || input.startsWith('./') || input.startsWith('../') || input.startsWith('~')) {
    return false;
  }

  // If it contains path separators, it's likely a path
  if (input.includes('/') && !input.includes(' ')) {
    // But feature/branch-name style branches also contain /
    // Check if it looks like a typical branch pattern
    const commonBranchPatterns = /^(feature|fix|bugfix|hotfix|release|develop|main|master)\//;
    if (commonBranchPatterns.test(input)) {
      return true;
    }
  }

  // Simple names without slashes are likely branches
  return !input.includes('/');
}

export async function deleteCommand(
  pathArg: string | undefined,
  options: DeleteOptions
): Promise<void> {
  const git = new GitService();

  if (!await git.isGitRepo()) {
    logger.error('Not a git repository');
    process.exit(1);
  }

  const config = await loadConfig();
  const rootPath = await git.getRootPath();
  const worktrees = await git.getWorktrees();

  let targetWorktree: WorktreeInfo | undefined;
  let worktreePath: string;

  if (!pathArg) {
      // No argument provided - show interactive selection
    const selected = await promptForWorktreeSelection(worktrees);
    if (!selected) {
      return;
    }
    targetWorktree = selected;
    worktreePath = targetWorktree.path;
  } else {
      // Try to find worktree by branch first, then by path
    const branchMatch = findWorktreeByBranch(worktrees, pathArg);

    if (branchMatch) {
      targetWorktree = branchMatch;
      worktreePath = targetWorktree.path;
      logger.info(`Found worktree for branch "${pathArg}": ${worktreePath}`);
    } else {
      worktreePath = resolve(pathArg);

      if (!await pathExists(worktreePath)) {
        logger.error(`Worktree not found: ${worktreePath}`);
        process.exit(1);
      }

      targetWorktree = findWorktreeByPath(worktrees, pathArg);

      if (!targetWorktree) {
        logger.error(`Not a valid worktree: ${worktreePath}`);
        process.exit(1);
      }
    }
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
    await archiveCommand(worktreePath, {});
  }

  const { branch } = await git.getBranchInfo(worktreePath);

  if (!options.noHooks) {
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
