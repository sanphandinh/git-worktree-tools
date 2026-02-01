import { access } from 'fs/promises';
import { join } from 'path';
import { execa } from 'execa';
import type { PackageManager } from '../types/index.js';
import { PACKAGE_MANAGERS } from '../constants.js';

export async function detectPackageManager(cwd: string): Promise<PackageManager | null> {
  for (const pm of PACKAGE_MANAGERS) {
    try {
      await access(join(cwd, pm.lockfile));
      return pm;
    } catch {
      continue;
    }
  }
  return null;
}

export async function installDependencies(
  cwd: string,
  pm: PackageManager,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    onProgress?.(`Installing dependencies with ${pm.name}...`);
    
    await execa(pm.installCommand, {
      cwd,
      stdio: 'pipe',
    });
    
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to install dependencies: ${errorMsg}`,
    };
  }
}
