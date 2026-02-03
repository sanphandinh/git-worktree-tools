import { stat, access } from 'fs/promises';
import { resolve } from 'path';
import { GitService } from '../services/git.js';

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export function isValidBranchName(name: string): boolean {
  const invalidPattern = /^(\.\.|[\.\-\/])|.*[\.\-\/]$|.*\.\.|.*[~^:\s[:cntrl:]]/;
  return !invalidPattern.test(name) && name.length > 0;
}

export function validatePath(path: string): string | null {
  const resolved = resolve(path);
  if (resolved.includes('\0')) {
    return 'Path contains invalid characters';
  }
  return null;
}

/**
 * Check if a branch exists locally or remotely
 * @param git - GitService instance
 * @param branch - Branch name to check
 * @returns Promise<boolean> - True if branch exists locally or as origin/branch
 */
export async function branchExists(git: GitService, branch: string): Promise<boolean> {
  // Check local branch
  const localExists = await git.branchExists(branch);
  if (localExists) {
    return true;
  }

  // Check remote branch (origin/branch-name)
  try {
    await git.execGit(['show-ref', '--verify', `refs/remotes/origin/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a worktree already exists at the given path
 * @param git - GitService instance
 * @param path - Path to check
 * @returns Promise<boolean> - True if path is already a worktree
 */
export async function worktreeExists(git: GitService, path: string): Promise<boolean> {
  const worktrees = await git.getWorktrees();
  const resolvedPath = resolve(path);
  return worktrees.some(wt => resolve(wt.path) === resolvedPath);
}

/**
 * Comprehensive validation for branch creation
 * @param git - GitService instance
 * @param branch - Branch name to validate
 * @returns Promise<{ valid: boolean; error?: string; suggestion?: string }> - Validation result
 */
export async function validateBranchAvailable(
  git: GitService,
  branch: string
): Promise<{ valid: boolean; error?: string; suggestion?: string }> {
  // Check if branch name is valid
  if (!isValidBranchName(branch)) {
    return {
      valid: false,
      error: `Invalid branch name: "${branch}"`,
      suggestion: 'Branch names cannot start/end with special characters, contain "..", or have spaces/control characters',
    };
  }

  // Check if branch already exists locally
  const exists = await branchExists(git, branch);
  if (exists) {
    const localExists = await git.branchExists(branch);
    const location = localExists ? 'locally' : 'on remote origin';
    return {
      valid: false,
      error: `Branch "${branch}" already exists ${location}`,
      suggestion: localExists
        ? `Use "wt create <path> ${branch}" to create a worktree from existing branch`
        : `Fetch the remote branch first with "git fetch origin ${branch}"`,
    };
  }

  return { valid: true };
}

/**
 * Comprehensive validation for worktree path
 * @param git - GitService instance
 * @param path - Path to validate
 * @returns Promise<{ valid: boolean; error?: string; suggestion?: string }> - Validation result
 */
export async function validateWorktreePath(
  git: GitService,
  path: string
): Promise<{ valid: boolean; error?: string; suggestion?: string }> {
  // Check path format
  const pathError = validatePath(path);
  if (pathError) {
    return {
      valid: false,
      error: pathError,
      suggestion: 'Use a valid path without null characters',
    };
  }

  // Check if path already exists as a worktree
  const exists = await worktreeExists(git, path);
  if (exists) {
    return {
      valid: false,
      error: `A worktree already exists at "${path}"`,
      suggestion: 'Choose a different path or remove the existing worktree first with "wt delete [path]"',
    };
  }

  // Check if path is inside another worktree
  const worktrees = await git.getWorktrees();
  const resolvedPath = resolve(path);
  const parentWorktree = worktrees.find(wt => {
    const wtPath = resolve(wt.path);
    return resolvedPath.startsWith(wtPath + '/') || resolvedPath === wtPath;
  });

  if (parentWorktree) {
    return {
      valid: false,
      error: `Path "${path}" is inside existing worktree at "${parentWorktree.path}"`,
      suggestion: 'Choose a path outside of existing worktrees',
    };
  }

  return { valid: true };
}
