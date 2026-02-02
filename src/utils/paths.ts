import { homedir } from 'os';
import { join, resolve, relative, dirname, basename } from 'path';

export function expandHome(path: string): string {
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

export function getWorktreeName(path: string): string {
  return basename(path);
}

export function getRelativePath(from: string, to: string): string {
  return relative(from, to);
}

export function resolvePath(path: string, base?: string): string {
  if (base) {
    return resolve(base, path);
  }
  return resolve(path);
}

const INVALID_FOLDER_CHARS = /[<>:"|?*\x00-\x1f]/g;
const MAX_BRANCH_LENGTH = 250;

/**
 * Convert a git branch name to a safe folder name.
 * Replaces `/` with `-` and removes invalid characters.
 *
 * @param branch - The git branch name to convert
 * @returns A filesystem-safe folder name
 *
 * @example
 * sanitizeBranchToFolder('feature/auth') === 'feature-auth'
 * sanitizeBranchToFolder('fix-bug-123') === 'fix-bug-123'
 * sanitizeBranchToFolder('main') === 'main'
 * sanitizeBranchToFolder('release/v1.0.0') === 'release-v1.0.0'
 */
export function sanitizeBranchToFolder(branch: string): string {
  if (!branch || branch.trim().length === 0) {
    return 'unnamed-branch';
  }

  let sanitized = branch.trim();
  sanitized = sanitized.replace(/\//g, '-');
  sanitized = sanitized.replace(INVALID_FOLDER_CHARS, '');
  sanitized = sanitized.replace(/-+/g, '-');
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  if (sanitized.length === 0) {
    return 'unnamed-branch';
  }

  if (sanitized.length > MAX_BRANCH_LENGTH) {
    sanitized = sanitized.slice(0, MAX_BRANCH_LENGTH);
    sanitized = sanitized.replace(/-+$/, '');
  }

  return sanitized;
}

function isValidBranchName(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return false;
  }

  if (name.startsWith('.')) {
    return false;
  }

  if (name.includes('..')) {
    return false;
  }

  if (/[\x00-\x20\x7f]/.test(name)) {
    return false;
  }

  if (name.includes('~')) {
    return false;
  }

  if (name.includes('^')) {
    return false;
  }

  if (name.includes(':')) {
    return false;
  }

  if (name.endsWith('/')) {
    return false;
  }

  if (name.endsWith('.')) {
    return false;
  }

  if (/\.lock$/i.test(name)) {
    return false;
  }

  if (name.includes('//')) {
    return false;
  }

  if (name.startsWith('-')) {
    return false;
  }

  if (name === '@') {
    return false;
  }

  if (name.includes('@{')) {
    return false;
  }

  if (name.includes('\\')) {
    return false;
  }

  return true;
}

/**
 * Convert a folder name to a git branch name.
 * Attempts to create namespace from dashes (e.g., 'feature-auth' → 'feature/auth').
 *
 * @param folder - The folder name to convert
 * @returns A valid git branch name
 *
 * @example
 * sanitizeFolderToBranch('feature-auth') === 'feature/auth'
 * sanitizeFolderToBranch('main') === 'main'
 * sanitizeFolderToBranch('release-v1.0.0') === 'release/v1.0.0'
 * sanitizeFolderToBranch('already/namespaced') === 'already/namespaced'
 */
export function sanitizeFolderToBranch(folder: string): string {
  if (!folder || folder.trim().length === 0) {
    return 'main';
  }

  let sanitized = folder.trim();

  if (sanitized.includes('/')) {
    return isValidBranchName(sanitized) ? sanitized : 'main';
  }

  const firstDashIndex = sanitized.indexOf('-');
  if (firstDashIndex > 1) {
    const firstPart = sanitized.slice(0, firstDashIndex);
    const restPart = sanitized.slice(firstDashIndex + 1);

    if (restPart.length > 0) {
      const withNamespace = `${firstPart}/${restPart}`;
      if (isValidBranchName(withNamespace)) {
        sanitized = withNamespace;
      }
    }
  }

  if (!isValidBranchName(sanitized)) {
    sanitized = sanitized.replace(/^-+/, '');
    sanitized = sanitized.replace(/-+$/, '');
    sanitized = sanitized.replace(/-+/g, '-');

    if (!isValidBranchName(sanitized) || sanitized.length === 0) {
      return 'main';
    }
  }

  return sanitized;
}

/**
 * Check if a string is valid as a folder name.
 * Validates against path traversal and invalid characters.
 *
 * @param name - The string to validate
 * @returns True if valid folder name, false otherwise
 *
 * @example
 * isValidFolderName('feature-auth') === true
 * isValidFolderName('../escape') === false
 * isValidFolderName('folder/name') === false
 * isValidFolderName('.hidden') === true
 */
export function isValidFolderName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return false;
  }

  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return false;
  }

  if (trimmed === '..' || trimmed.startsWith('../') || trimmed.endsWith('/..')) {
    return false;
  }

  if (trimmed === '.') {
    return false;
  }

  if (INVALID_FOLDER_CHARS.test(trimmed)) {
    return false;
  }

  if (trimmed.startsWith('-')) {
    return false;
  }

  const upper = trimmed.toUpperCase();
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL'];
  for (let i = 1; i <= 9; i++) {
    reservedNames.push(`COM${i}`, `LPT${i}`);
  }
  if (reservedNames.includes(upper)) {
    return false;
  }

  if (trimmed.endsWith(' ') || trimmed.endsWith('.')) {
    return false;
  }

  if (trimmed.length > 255) {
    return false;
  }

  return true;
}
