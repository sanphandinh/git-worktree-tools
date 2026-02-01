import { resolve, dirname, join } from 'path';
import { mkdir } from 'fs/promises';
import type { CreateOptions } from '../types/index.js';
import { GitService } from '../services/git.js';
import { loadConfig } from '../services/config.js';
import { detectPackageManager, installDependencies } from '../services/package-manager.js';
import { executeHooks, copyEnvFiles } from '../services/hooks.js';
import { logger } from '../utils/logger.js';
import { pathExists, isValidBranchName } from '../utils/validation.js';
import chalk from 'chalk';

export async function createCommand(
  pathArg: string | undefined,
  options: CreateOptions
): Promise<void> {
  const git = new GitService();

  if (!await git.isGitRepo()) {
    logger.error('Not a git repository');
    process.exit(1);
  }

  const config = await loadConfig();
  const rootPath = await git.getRootPath();

  let worktreePath: string;
  if (pathArg) {
    worktreePath = resolve(pathArg);
  } else {
    const parentDir = dirname(rootPath);
    const timestamp = Date.now().toString(36);
    const suggestedName = options.branch || `wt-${timestamp}`;
    worktreePath = join(parentDir, suggestedName);
  }

  if (await pathExists(worktreePath)) {
    logger.error(`Path already exists: ${worktreePath}`);
    process.exit(1);
  }

  const branch = options.branch || 'feature/' + Date.now().toString(36);
  const baseBranch = options.branchFrom || config.defaultBranch || 'main';

  if (!isValidBranchName(branch)) {
    logger.error(`Invalid branch name: ${branch}`);
    process.exit(1);
  }

  if (options.dryRun) {
    console.log(chalk.yellow('Dry run - would execute:'));
    console.log(`  Create worktree: ${worktreePath}`);
    console.log(`  Branch: ${branch} (from ${baseBranch})`);
    console.log(`  Auto-install: ${!options.noInstall && config.autoInstall}`);
    console.log(`  Copy env files: ${!options.noInstall && config.autoCopy}`);
    return;
  }

  await mkdir(dirname(worktreePath), { recursive: true });

  logger.info(`Creating worktree at ${worktreePath}...`);
  
  const branchExists = await git.branchExists(branch);
  if (branchExists) {
    await git.createWorktree(worktreePath, branch);
  } else {
    await git.createWorktree(worktreePath, branch, baseBranch);
  }

  logger.success(`Worktree created: ${branch}`);

  const warnings: string[] = [];

  if (!options.noInstall && config.autoInstall) {
    const pm = await detectPackageManager(rootPath);
    if (pm) {
      const result = await installDependencies(worktreePath, pm, (msg) => {
        logger.info(msg);
      });
      
      if (result.success) {
        logger.success(`Installed dependencies with ${pm.name}`);
      } else {
        warnings.push(result.error || 'Failed to install dependencies');
        logger.warning('Dependency installation failed, but worktree was created');
      }
    }
  }

  if (!options.noInstall && config.autoCopy) {
    const result = await copyEnvFiles(rootPath, worktreePath, config, (msg) => {
      logger.info(msg);
    });
    
    if (result.copied.length > 0) {
      logger.success(`Copied ${result.copied.length} files`);
    }
    
    if (result.errors.length > 0) {
      warnings.push(...result.errors);
    }
  }

  if (!options.noHooks) {
    const result = await executeHooks(
      config,
      'postCreate',
      {
        worktreePath,
        branch,
        worktreeName: worktreePath.split('/').pop() || '',
        mainPath: rootPath,
        createdAt: new Date().toISOString(),
      },
      (msg) => logger.info(msg)
    );
    
    if (result.success) {
      logger.success('Hooks executed');
    } else {
      warnings.push(...result.errors);
    }
  }

  console.log();
  console.log(chalk.green('✓ Worktree created successfully'));
  console.log(`  Path: ${worktreePath}`);
  console.log(`  Branch: ${branch}`);
  
  if (warnings.length > 0) {
    console.log();
    console.log(chalk.yellow('Warnings:'));
    warnings.forEach(w => console.log(`  ⚠ ${w}`));
  }
  
  console.log();
}
