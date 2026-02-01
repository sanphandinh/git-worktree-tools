import { resolve, join, dirname } from 'path';
import { createWriteStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import type { ArchiveOptions } from '../types/index.js';
import { loadConfig } from '../services/config.js';
import { GitService } from '../services/git.js';
import { expandHome } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import { pathExists, isDirectory } from '../utils/validation.js';
import chalk from 'chalk';
import tar from 'tar-stream';

export async function archiveCommand(
  pathArg: string,
  options: ArchiveOptions
): Promise<void> {
  const git = new GitService();

  if (!await git.isGitRepo()) {
    logger.error('Not a git repository');
    process.exit(1);
  }

  const worktreePath = resolve(pathArg);
  
  if (!await pathExists(worktreePath) || !await isDirectory(worktreePath)) {
    logger.error(`Worktree not found: ${worktreePath}`);
    process.exit(1);
  }

  const config = await loadConfig();
  const { branch, head } = await git.getBranchInfo(worktreePath);
  const worktreeName = worktreePath.split('/').pop() || 'worktree';
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const archiveName = `${worktreeName}-${timestamp}.tar.gz`;
  
  const archiveDir = options.output 
    ? dirname(options.output)
    : expandHome(config.archive?.directory || '~/.worktree-archives');
  
  await mkdir(archiveDir, { recursive: true });
  
  const archivePath = options.output || join(archiveDir, archiveName);

  logger.info(`Archiving ${worktreeName}...`);

  const pack = tar.pack();
  const gzip = createGzip({ level: config.archive?.compression || 6 });
  const output = createWriteStream(archivePath);

  await pipeline(pack, gzip, output);

  const manifest = {
    name: worktreeName,
    branch,
    head,
    archivedAt: new Date().toISOString(),
    path: worktreePath,
  };

  const manifestPath = archivePath.replace('.tar.gz', '.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  logger.success(`Archived to: ${archivePath}`);
  logger.info(`Manifest: ${manifestPath}`);
}
