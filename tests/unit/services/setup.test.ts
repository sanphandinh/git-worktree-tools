import { describe, expect, it } from 'bun:test';
import { access, mkdtemp, readFile, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { WorktreeConfig } from '../../../src/types/index.js';
import { runWorktreeSetup } from '../../../src/services/setup.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('runWorktreeSetup', () => {
  it('copies files even when install is disabled by option', async () => {
    const base = await mkdtemp(join(tmpdir(), 'wt-setup-test-'));
    const sourceDir = join(base, 'source');
    const targetDir = join(base, 'target');

    await mkdir(sourceDir);
    await mkdir(targetDir);
    await writeFile(join(sourceDir, '.env.local'), 'API_KEY=123');

    const config: WorktreeConfig = {
      autoInstall: true,
      autoCopy: true,
      copyFiles: ['.env.local'],
    };

    const result = await runWorktreeSetup({
      config,
      sourcePath: sourceDir,
      worktreePath: targetDir,
      branch: 'feature/test',
      mainPath: sourceDir,
      options: {
        noInstall: true,
        noHooks: true,
      },
    });

    expect(result.installAttempted).toBe(false);
    expect(result.copyAttempted).toBe(true);
    expect(result.copiedFiles).toEqual(['.env.local']);
    expect(result.warnings).toEqual([]);

    const copiedContent = await readFile(join(targetDir, '.env.local'), 'utf-8');
    expect(copiedContent).toBe('API_KEY=123');
  });

  it('skips copy when source and target paths are the same', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wt-setup-test-'));
    await writeFile(join(dir, '.env.local'), 'API_KEY=123');

    const config: WorktreeConfig = {
      autoCopy: true,
      copyFiles: ['.env.local'],
    };

    const result = await runWorktreeSetup({
      config,
      sourcePath: dir,
      worktreePath: dir,
      branch: 'feature/test',
      mainPath: dir,
      options: {
        noInstall: true,
        noHooks: true,
      },
    });

    expect(result.copyAttempted).toBe(false);
    expect(result.copiedFiles).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('executes configured postCreate hooks', async () => {
    const base = await mkdtemp(join(tmpdir(), 'wt-setup-test-'));
    const sourceDir = join(base, 'source');
    const targetDir = join(base, 'target');

    await mkdir(sourceDir);
    await mkdir(targetDir);

    const markerFile = join(targetDir, '.wt-setup-hook');
    const config: WorktreeConfig = {
      autoInstall: false,
      autoCopy: false,
      hooks: {
        postCreate: `printf done > "${markerFile}"`,
      },
    };

    const result = await runWorktreeSetup({
      config,
      sourcePath: sourceDir,
      worktreePath: targetDir,
      branch: 'feature/test',
      mainPath: sourceDir,
    });

    expect(result.hooksAttempted).toBe(true);
    expect(result.hooksSucceeded).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(await pathExists(markerFile)).toBe(true);
  });
});
