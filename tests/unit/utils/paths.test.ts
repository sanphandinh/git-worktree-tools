import { describe, it, expect } from 'bun:test';
import { sanitizeBranchToFolder, sanitizeFolderToBranch, isValidFolderName } from '../../../src/utils/paths.js';

describe('sanitizeBranchToFolder', () => {
  describe('basic conversions', () => {
    it('should convert slashes to dashes', () => {
      expect(sanitizeBranchToFolder('feature/auth')).toBe('feature-auth');
      expect(sanitizeBranchToFolder('release/v1.0.0')).toBe('release-v1.0.0');
      expect(sanitizeBranchToFolder('hotfix/urgent-bug')).toBe('hotfix-urgent-bug');
    });

    it('should leave valid names unchanged', () => {
      expect(sanitizeBranchToFolder('main')).toBe('main');
      expect(sanitizeBranchToFolder('fix-bug-123')).toBe('fix-bug-123');
      expect(sanitizeBranchToFolder('develop')).toBe('develop');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeBranchToFolder('')).toBe('unnamed-branch');
    });

    it('should handle whitespace-only string', () => {
      expect(sanitizeBranchToFolder('   ')).toBe('unnamed-branch');
    });

    it('should handle multiple slashes', () => {
      expect(sanitizeBranchToFolder('feature/auth/login')).toBe('feature-auth-login');
      expect(sanitizeBranchToFolder('a/b/c/d')).toBe('a-b-c-d');
    });

    it('should remove special characters', () => {
      expect(sanitizeBranchToFolder('feature<test>')).toBe('featuretest');
      expect(sanitizeBranchToFolder('bug:fix')).toBe('bugfix');
      expect(sanitizeBranchToFolder('test|pipe')).toBe('testpipe');
      expect(sanitizeBranchToFolder('wild*card')).toBe('wildcard');
      expect(sanitizeBranchToFolder('quote"test')).toBe('quotetest');
    });

    it('should collapse multiple dashes', () => {
      expect(sanitizeBranchToFolder('feature//auth')).toBe('feature-auth');
      expect(sanitizeBranchToFolder('a---b')).toBe('a-b');
    });

    it('should trim leading and trailing dashes', () => {
      expect(sanitizeBranchToFolder('/feature')).toBe('feature');
      expect(sanitizeBranchToFolder('feature/')).toBe('feature');
      expect(sanitizeBranchToFolder('-feature-')).toBe('feature');
    });

    it('should truncate very long names', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizeBranchToFolder(longName);
      expect(result.length).toBeLessThanOrEqual(250);
      expect(result).toBe('a'.repeat(250));
    });

    it('should return unnamed-branch when result is empty after sanitization', () => {
      expect(sanitizeBranchToFolder('<>"|?*')).toBe('unnamed-branch');
    });
  });
});

describe('sanitizeFolderToBranch', () => {
  describe('basic conversions', () => {
    it('should convert dashes to namespace format', () => {
      expect(sanitizeFolderToBranch('feature-auth')).toBe('feature/auth');
      expect(sanitizeFolderToBranch('release-v1.0.0')).toBe('release/v1.0.0');
    });

    it('should leave main unchanged', () => {
      expect(sanitizeFolderToBranch('main')).toBe('main');
    });

    it('should leave valid namespaced folders unchanged', () => {
      expect(sanitizeFolderToBranch('already/namespaced')).toBe('already/namespaced');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeFolderToBranch('')).toBe('main');
    });

    it('should handle whitespace-only string', () => {
      expect(sanitizeFolderToBranch('   ')).toBe('main');
    });

    it('should handle single segment with dash', () => {
      expect(sanitizeFolderToBranch('fix-bug')).toBe('fix/bug');
    });

    it('should handle names that already have slash', () => {
      expect(sanitizeFolderToBranch('feature/auth')).toBe('feature/auth');
      expect(sanitizeFolderToBranch('hotfix/urgent')).toBe('hotfix/urgent');
    });

    it('should return main for invalid branch names', () => {
      expect(sanitizeFolderToBranch('..')).toBe('main');
      expect(sanitizeFolderToBranch('.hidden')).toBe('main');
    });

    it('should strip leading dashes and validate', () => {
      expect(sanitizeFolderToBranch('-invalid')).toBe('invalid');
      expect(sanitizeFolderToBranch('-feature')).toBe('feature');
    });

    it('should clean and validate names with leading dashes', () => {
      expect(sanitizeFolderToBranch('-feature')).toBe('feature');
    });

    it('should handle names with only dashes', () => {
      expect(sanitizeFolderToBranch('---')).toBe('main');
    });
  });
});

describe('isValidFolderName', () => {
  describe('valid names', () => {
    it('should accept valid folder names', () => {
      expect(isValidFolderName('feature-auth')).toBe(true);
      expect(isValidFolderName('.hidden')).toBe(true);
      expect(isValidFolderName('normal_folder')).toBe(true);
      expect(isValidFolderName('camelCase')).toBe(true);
      expect(isValidFolderName('UPPERCASE')).toBe(true);
    });
  });

  describe('invalid names', () => {
    it('should reject path traversal', () => {
      expect(isValidFolderName('../escape')).toBe(false);
      expect(isValidFolderName('..')).toBe(false);
      expect(isValidFolderName('../..')).toBe(false);
    });

    it('should reject names with slashes', () => {
      expect(isValidFolderName('folder/name')).toBe(false);
      expect(isValidFolderName('a/b')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidFolderName('')).toBe(false);
    });

    it('should reject whitespace-only string', () => {
      expect(isValidFolderName('   ')).toBe(false);
    });

    it('should reject single dot', () => {
      expect(isValidFolderName('.')).toBe(false);
    });

    it('should reject names starting with dash', () => {
      expect(isValidFolderName('-invalid')).toBe(false);
      expect(isValidFolderName('-')).toBe(false);
    });

    it('should reject Windows reserved names', () => {
      expect(isValidFolderName('CON')).toBe(false);
      expect(isValidFolderName('PRN')).toBe(false);
      expect(isValidFolderName('AUX')).toBe(false);
      expect(isValidFolderName('NUL')).toBe(false);
      expect(isValidFolderName('con')).toBe(false);
      expect(isValidFolderName('prn')).toBe(false);
      expect(isValidFolderName('aux')).toBe(false);
      expect(isValidFolderName('nul')).toBe(false);
    });

    it('should reject COM and LPT reserved names', () => {
      expect(isValidFolderName('COM1')).toBe(false);
      expect(isValidFolderName('COM9')).toBe(false);
      expect(isValidFolderName('LPT1')).toBe(false);
      expect(isValidFolderName('LPT9')).toBe(false);
      expect(isValidFolderName('com1')).toBe(false);
      expect(isValidFolderName('lpt1')).toBe(false);
    });

    it('should trim names and accept trimmed version', () => {
      // Function trims input first, so trailing space is removed
      expect(isValidFolderName('folder ')).toBe(true);
      expect(isValidFolderName('  folder  ')).toBe(true);
    });

    it('should reject names ending with dot', () => {
      expect(isValidFolderName('folder.')).toBe(false);
    });

    it('should reject very long names', () => {
      expect(isValidFolderName('a'.repeat(256))).toBe(false);
    });

    it('should reject names with less-than bracket', () => {
      expect(isValidFolderName('folder<name>')).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(isValidFolderName(null as unknown as string)).toBe(false);
      expect(isValidFolderName(undefined as unknown as string)).toBe(false);
      expect(isValidFolderName(123 as unknown as string)).toBe(false);
    });
  });
});
