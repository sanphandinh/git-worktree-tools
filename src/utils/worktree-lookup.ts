import { resolve } from 'path';
import type { WorktreeInfo } from '../types/index.js';

/**
 * Normalize a branch name by removing refs/heads/ prefix
 */
export function normalizeBranchName(branch: string): string {
  return branch.replace(/^refs\/heads\//, '');
}

/**
 * Find a worktree by its branch name (with refs/heads/ normalization)
 */
export function findWorktreeByBranch(worktrees: WorktreeInfo[], branchName: string): WorktreeInfo | undefined {
  const normalizedInput = normalizeBranchName(branchName);

  let match = worktrees.find(w => normalizeBranchName(w.branch) === normalizedInput);
  if (match) return match;

  match = worktrees.find(w => normalizeBranchName(w.branch).toLowerCase() === normalizedInput.toLowerCase());
  if (match) return match;

  return undefined;
}

/**
 * Find a worktree by its path (exact, resolved, or folder name)
 */
export function findWorktreeByPath(worktrees: WorktreeInfo[], inputPath: string): WorktreeInfo | undefined {
  const resolvedPath = resolve(inputPath);

  let match = worktrees.find(w => w.path === inputPath || w.path === resolvedPath);
  if (match) return match;

  const folderName = inputPath.split('/').pop() || inputPath;
  match = worktrees.find(w => {
    const worktreeFolder = w.path.split('/').pop() || '';
    return worktreeFolder === folderName;
  });

  return match;
}

/**
 * Determine if input looks like a branch name vs a path
 */
export function looksLikeBranchName(input: string): boolean {
  if (input.startsWith('/') || input.startsWith('./') || input.startsWith('../') || input.startsWith('~')) {
    return false;
  }

  if (input.includes('/') && !input.includes(' ')) {
    const commonBranchPatterns = /^(feature|fix|bugfix|hotfix|release|develop|main|master)\//;
    if (commonBranchPatterns.test(input)) {
      return true;
    }
  }

  return !input.includes('/');
}

/**
 * Find worktree by branch or path - tries branch first, then path
 */
export function findWorktree(worktrees: WorktreeInfo[], identifier: string): WorktreeInfo | undefined {
  const branchMatch = findWorktreeByBranch(worktrees, identifier);
  if (branchMatch) return branchMatch;

  return findWorktreeByPath(worktrees, identifier);
}
