import { describe, it, expect } from 'bun:test';
import { detectPackageManager } from '../../../src/services/package-manager.js';
import { mkdtemp, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('detectPackageManager', () => {
  it('should detect npm from package-lock.json', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'wt-test-'));
    await writeFile(join(tmpDir, 'package-lock.json'), '{}');
    
    const pm = await detectPackageManager(tmpDir);
    expect(pm).not.toBeNull();
    expect(pm?.name).toBe('npm');
  });

  it('should detect yarn from yarn.lock', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'wt-test-'));
    await writeFile(join(tmpDir, 'yarn.lock'), '');
    
    const pm = await detectPackageManager(tmpDir);
    expect(pm).not.toBeNull();
    expect(pm?.name).toBe('yarn');
  });

  it('should detect pnpm from pnpm-lock.yaml', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'wt-test-'));
    await writeFile(join(tmpDir, 'pnpm-lock.yaml'), '');
    
    const pm = await detectPackageManager(tmpDir);
    expect(pm).not.toBeNull();
    expect(pm?.name).toBe('pnpm');
  });

  it('should detect bun from bun.lockb', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'wt-test-'));
    await writeFile(join(tmpDir, 'bun.lockb'), '');
    
    const pm = await detectPackageManager(tmpDir);
    expect(pm).not.toBeNull();
    expect(pm?.name).toBe('bun');
  });

  it('should return null when no lockfile found', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'wt-test-'));
    
    const pm = await detectPackageManager(tmpDir);
    expect(pm).toBeNull();
  });
});
