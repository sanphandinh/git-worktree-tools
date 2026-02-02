import { describe, it, expect, mock } from 'bun:test';
import {
  isValidBranchName,
  pathExists,
  isDirectory,
  branchExists,
  worktreeExists,
  validateBranchAvailable,
  validateWorktreePath,
} from '../../../src/utils/validation.js';
import { expandHome, getWorktreeName } from '../../../src/utils/paths.js';
import { GitService } from '../../../src/services/git.js';

describe('validation', () => {
  describe('isValidBranchName', () => {
    it('should accept valid branch names', () => {
      expect(isValidBranchName('main')).toBe(true);
      expect(isValidBranchName('feature/auth')).toBe(true);
      expect(isValidBranchName('fix-bug-123')).toBe(true);
    });

    it('should reject invalid branch names', () => {
      expect(isValidBranchName('')).toBe(false);
      expect(isValidBranchName('..')).toBe(false);
      expect(isValidBranchName('feature/')).toBe(false);
    });
  });

  describe('pathExists', () => {
    it('should return true for existing paths', async () => {
      expect(await pathExists('.')).toBe(true);
    });

    it('should return false for non-existing paths', async () => {
      expect(await pathExists('/non/existing/path/12345')).toBe(false);
    });
  });

  describe('isDirectory', () => {
    it('should return true for directories', async () => {
      expect(await isDirectory('.')).toBe(true);
    });

    it('should return false for non-existing paths', async () => {
      expect(await isDirectory('/non/existing/path')).toBe(false);
    });
  });

  describe('branchExists', () => {
    it('should return true for existing local branches', async () => {
      const mockGit = {
        branchExists: mock(() => Promise.resolve(true)),
        execGit: mock(() => Promise.resolve('')),
      } as unknown as GitService;

      const result = await branchExists(mockGit, 'main');
      expect(result).toBe(true);
      expect(mockGit.branchExists).toHaveBeenCalledWith('main');
    });

    it('should return true for existing remote branches', async () => {
      const mockGit = {
        branchExists: mock(() => Promise.resolve(false)),
        execGit: mock(() => Promise.resolve('abc123 refs/remotes/origin/feature-branch')),
      } as unknown as GitService;

      const result = await branchExists(mockGit, 'feature-branch');
      expect(result).toBe(true);
      expect(mockGit.execGit).toHaveBeenCalledWith(['show-ref', '--verify', 'refs/remotes/origin/feature-branch']);
    });

    it('should return false for non-existent branches', async () => {
      const mockGit = {
        branchExists: mock(() => Promise.resolve(false)),
        execGit: mock(() => Promise.reject(new Error('not a valid ref'))),
      } as unknown as GitService;

      const result = await branchExists(mockGit, 'non-existent-branch');
      expect(result).toBe(false);
    });
  });

  describe('worktreeExists', () => {
    it('should return true when path matches an existing worktree', async () => {
      const mockGit = {
        getWorktrees: mock(() => Promise.resolve([
          { path: '/home/user/project/main', branch: 'main', head: 'abc123', isMain: true, isDirty: false, uncommittedCount: 0, unpushedCount: 0, isMerged: false, lastCommitDate: new Date() },
          { path: '/home/user/project/feature', branch: 'feature', head: 'def456', isMain: false, isDirty: false, uncommittedCount: 0, unpushedCount: 0, isMerged: false, lastCommitDate: new Date() },
        ])),
      } as unknown as GitService;

      const result = await worktreeExists(mockGit, '/home/user/project/feature');
      expect(result).toBe(true);
    });

    it('should return false when path does not match any worktree', async () => {
      const mockGit = {
        getWorktrees: mock(() => Promise.resolve([
          { path: '/home/user/project/main', branch: 'main', head: 'abc123', isMain: true, isDirty: false, uncommittedCount: 0, unpushedCount: 0, isMerged: false, lastCommitDate: new Date() },
        ])),
      } as unknown as GitService;

      const result = await worktreeExists(mockGit, '/home/user/project/nonexistent');
      expect(result).toBe(false);
    });

    it('should handle path resolution for relative paths', async () => {
      const mockGit = {
        getWorktrees: mock(() => Promise.resolve([
          { path: process.cwd(), branch: 'main', head: 'abc123', isMain: true, isDirty: false, uncommittedCount: 0, unpushedCount: 0, isMerged: false, lastCommitDate: new Date() },
        ])),
      } as unknown as GitService;

      const result = await worktreeExists(mockGit, '.');
      expect(result).toBe(true);
    });
  });

  describe('validateBranchAvailable', () => {
    it('should return valid: true for valid branch name that does not exist', async () => {
      const mockGit = {
        branchExists: mock(() => Promise.resolve(false)),
        execGit: mock(() => Promise.reject(new Error('not a valid ref'))),
      } as unknown as GitService;

      const result = await validateBranchAvailable(mockGit, 'new-feature-branch');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.suggestion).toBeUndefined();
    });

    it('should return valid: false with error for invalid branch name', async () => {
      const mockGit = {} as GitService;

      const result = await validateBranchAvailable(mockGit, 'feature/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid branch name');
      expect(result.suggestion).toContain('Branch names cannot start/end with special characters');
    });

    it('should return valid: false with error for existing local branch', async () => {
      const mockGit = {
        branchExists: mock(() => Promise.resolve(true)),
      } as unknown as GitService;

      const result = await validateBranchAvailable(mockGit, 'main');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already exists locally');
      expect(result.suggestion).toContain('wt create');
    });

    it('should return valid: false with error for existing remote branch', async () => {
      const mockGit = {
        branchExists: mock(() => Promise.resolve(false)),
        execGit: mock(() => Promise.resolve('abc123 refs/remotes/origin/feature-branch')),
      } as unknown as GitService;

      const result = await validateBranchAvailable(mockGit, 'feature-branch');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already exists on remote origin');
      expect(result.suggestion).toContain('git fetch origin');
    });
  });

  describe('validateWorktreePath', () => {
    it('should return valid: true for valid path', async () => {
      const mockGit = {
        getWorktrees: mock(() => Promise.resolve([
          { path: '/home/user/project/main', branch: 'main', head: 'abc123', isMain: true, isDirty: false, uncommittedCount: 0, unpushedCount: 0, isMerged: false, lastCommitDate: new Date() },
        ])),
      } as unknown as GitService;

      const result = await validateWorktreePath(mockGit, '/home/user/project/new-worktree');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.suggestion).toBeUndefined();
    });

    it('should return valid: false with error for path with invalid characters', async () => {
      const mockGit = {
        getWorktrees: mock(() => Promise.resolve([])),
      } as unknown as GitService;

      const result = await validateWorktreePath(mockGit, '/path/with\x00null');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid');
      expect(result.suggestion).toContain('null characters');
    });

    it('should return valid: false with error when path already is a worktree', async () => {
      const mockGit = {
        getWorktrees: mock(() => Promise.resolve([
          { path: '/home/user/project/existing', branch: 'feature', head: 'abc123', isMain: false, isDirty: false, uncommittedCount: 0, unpushedCount: 0, isMerged: false, lastCommitDate: new Date() },
        ])),
      } as unknown as GitService;

      const result = await validateWorktreePath(mockGit, '/home/user/project/existing');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already exists');
      expect(result.suggestion).toContain('wt delete');
    });

    it('should return valid: false with error when path is inside another worktree', async () => {
      const mockGit = {
        getWorktrees: mock(() => Promise.resolve([
          { path: '/home/user/project/main', branch: 'main', head: 'abc123', isMain: true, isDirty: false, uncommittedCount: 0, unpushedCount: 0, isMerged: false, lastCommitDate: new Date() },
        ])),
      } as unknown as GitService;

      const result = await validateWorktreePath(mockGit, '/home/user/project/main/subfolder');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('inside existing worktree');
      expect(result.suggestion).toContain('outside of existing worktrees');
    });
  });
});

describe('paths', () => {
  describe('expandHome', () => {
    it('should expand ~ to home directory', () => {
      const expanded = expandHome('~/test');
      expect(expanded).not.toContain('~');
    });

    it('should leave other paths unchanged', () => {
      expect(expandHome('/usr/local')).toBe('/usr/local');
    });
  });

  describe('getWorktreeName', () => {
    it('should extract name from path', () => {
      expect(getWorktreeName('/home/user/project/feature')).toBe('feature');
      expect(getWorktreeName('feature')).toBe('feature');
    });
  });
});
