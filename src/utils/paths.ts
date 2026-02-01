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
