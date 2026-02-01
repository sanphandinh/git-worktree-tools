import { describe, it, expect } from 'bun:test';
import { isValidBranchName, pathExists, isDirectory } from '../../../src/utils/validation.js';
import { expandHome, getWorktreeName } from '../../../src/utils/paths.js';

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
