import { stat, access } from 'fs/promises';
import { resolve } from 'path';

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
