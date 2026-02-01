import { resolve } from 'path';
import type { WorktreeInfo } from '../types/index.js';
import { GitService } from '../services/git.js';
import { loadConfig } from '../services/config.js';
import { detectPackageManager } from '../services/package-manager.js';
import { logger } from '../utils/logger.js';
import { pathExists, isDirectory } from '../utils/validation.js';
import chalk from 'chalk';
import { execa } from 'execa';

async function getDirectorySize(path: string): Promise<number> {
  try {
    const { stdout } = await execa('du', ['-sb', path]);
    const size = parseInt(stdout.split('\t')[0], 10);
    return isNaN(size) ? 0 : size;
  } catch {
    return 0;
  }
}

export async function statusCommand(pathArg?: string): Promise<void> {
  const git = new GitService();

  if (!await git.isGitRepo()) {
    logger.error('Not a git repository');
    process.exit(1);
  }

  const config = await loadConfig();
  const rootPath = await git.getRootPath();
  const worktreePath = pathArg ? resolve(pathArg) : process.cwd();
  
  if (!await pathExists(worktreePath)) {
    logger.error(`Path not found: ${worktreePath}`);
    process.exit(1);
  }

  const worktrees = await git.getWorktrees();
  const targetWorktree = worktrees.find(w => w.path === worktreePath);

  if (!targetWorktree) {
    logger.error(`Not a valid worktree: ${worktreePath}`);
    process.exit(1);
  }

  const { branch, head } = await git.getBranchInfo(worktreePath);
  const status = await git.getStatus(worktreePath);
  const unpushedCount = await git.getUnpushedCount(worktreePath, branch);
  const isMerged = await git.isBranchMerged(worktreePath, branch, config.defaultBranch || 'main');
  const lastCommitDate = await git.getLastCommitDate(worktreePath);
  const size = await getDirectorySize(worktreePath);

  const pm = await detectPackageManager(worktreePath);
  const nodeVersion = process.version;

  console.log(chalk.bold('\nWorktree Status:\n'));
  console.log(`  Name:     ${targetWorktree.isMain ? 'main' : branch.split('/').pop()}`);
  console.log(`  Path:     ${worktreePath}`);
  console.log(`  Branch:   ${branch}`);
  console.log(`  HEAD:     ${head}`);
  console.log();
  console.log(chalk.bold('Git Status:'));
  console.log(`  Working tree:  ${status.isDirty ? chalk.red('✗ dirty') : chalk.green('✓ clean')} (${status.uncommittedCount} modified files)`);
  console.log(`  Unpushed:      ${unpushedCount} commits`);
  console.log(`  Merged to main: ${isMerged ? chalk.green('✓ yes') : chalk.red('✗ no')}`);
  console.log(`  Last activity: ${lastCommitDate.toLocaleString()}`);
  console.log();
  console.log(chalk.bold('Environment:'));
  console.log(`  Package manager: ${pm ? pm.name : 'none'}`);
  console.log(`  Node version:    ${nodeVersion}`);
  console.log();
  console.log(`Size: ${(size / 1024 / 1024).toFixed(1)} MB`);
  console.log();
}
