import { createInterface } from 'readline';
import { writeFile, access } from 'fs/promises';
import { join } from 'path';
import { GitService } from '../services/git.js';
import { logger } from '../utils/logger.js';
import { loadConfig } from '../services/config.js';
import chalk from 'chalk';

interface InitAnswers {
  defaultBranch: string;
  autoInstall: boolean;
  autoCopy: boolean;
  copyFiles: string[];
  archiveDirectory: string;
  setupHooks: boolean;
  postCreateHooks: string[];
  preRemoveHooks: string[];
}

interface GeneratedConfig {
  defaultBranch: string;
  autoInstall?: boolean;
  autoCopy?: boolean;
  copyFiles?: string[];
  archive?: {
    directory: string;
  };
  hooks?: {
    postCreate?: string[];
    preRemove?: string[];
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function parseGitignore(rootPath: string): Promise<string[]> {
  try {
    const gitignorePath = join(rootPath, '.gitignore');
    const { readFile } = await import('fs/promises');
    const content = await readFile(gitignorePath, 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch {
    return [];
  }
}

async function findEnvExamples(rootPath: string): Promise<string[]> {
  const envExamples: string[] = [];
  const candidates = [
    '.env.example',
    '.env.local.example',
    '.env.sample',
    '.env.template',
    'env.example',
    '.env.development.example',
    '.env.production.example',
    '.env.test.example',
  ];

  for (const candidate of candidates) {
    if (await fileExists(join(rootPath, candidate))) {
      envExamples.push(candidate);
    }
  }

  return envExamples;
}

async function promptForInit(git: GitService, rootPath: string): Promise<InitAnswers> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question: string, defaultValue?: string): Promise<string> => {
    const prompt = defaultValue !== undefined
      ? `${question} [${defaultValue}]: `
      : `${question}: `;
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        const trimmed = answer.trim();
        resolve(trimmed || defaultValue || '');
      });
    });
  };

  const askYesNo = async (question: string, defaultValue: boolean): Promise<boolean> => {
    const defaultStr = defaultValue ? 'Y/n' : 'y/N';
    const answer = await ask(question, defaultStr);
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') return true;
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') return false;
    return defaultValue;
  };

  console.log();
  console.log(chalk.cyan.bold('🌳 Worktree Configuration Setup'));
  console.log(chalk.gray('Answer the following questions to generate your .wtconfig.json'));
  console.log();

  const detectedBranch = await git.getDefaultBranch();
  const envExamples = await findEnvExamples(rootPath);
  const hasPackageJson = await fileExists(join(rootPath, 'package.json'));

  const branchInput = await ask('Default base branch', detectedBranch || 'main');

  const autoInstall = hasPackageJson
    ? await askYesNo('Auto-install dependencies when creating worktrees?', true)
    : false;

  let autoCopy = false;
  let copyFiles: string[] = [];
  if (envExamples.length > 0) {
    autoCopy = await askYesNo('Auto-copy environment files to new worktrees?', true);
    if (autoCopy) {
      console.log(chalk.gray(`  Detected env files: ${envExamples.join(', ')}`));
      const customFiles = await ask('  Additional files to copy (comma-separated, optional)');
      if (customFiles) {
        copyFiles = [
          ...envExamples,
          ...customFiles.split(',').map(f => f.trim()).filter(Boolean),
        ];
      } else {
        copyFiles = envExamples;
      }
    }
  } else {
    const setupEnvCopy = await askYesNo('Setup environment file copying?', false);
    if (setupEnvCopy) {
      autoCopy = true;
      const envFile = await ask('  Env example file to copy', '.env.example');
      copyFiles = envFile ? [envFile] : [];
    }
  }

  const archiveDirectory = await ask('Archive directory', '~/.worktree-archives');

  const setupHooks = await askYesNo('Setup lifecycle hooks?', false);
  let postCreateHooks: string[] = [];
  let preRemoveHooks: string[] = [];

  if (setupHooks) {
    console.log();
    console.log(chalk.cyan('Hook Configuration:'));
    console.log(chalk.gray('  Commands to run after creating a worktree'));
    const postCreateInput = await ask('  Post-create hooks (comma-separated, optional)');
    postCreateHooks = postCreateInput
      ? postCreateInput.split(',').map(h => h.trim()).filter(Boolean)
      : [];

    console.log(chalk.gray('  Commands to run before removing a worktree'));
    const preRemoveInput = await ask('  Pre-remove hooks (comma-separated, optional)');
    preRemoveHooks = preRemoveInput
      ? preRemoveInput.split(',').map(h => h.trim()).filter(Boolean)
      : [];
  }

  rl.close();

  return {
    defaultBranch: branchInput || 'main',
    autoInstall,
    autoCopy,
    copyFiles,
    archiveDirectory,
    setupHooks,
    postCreateHooks,
    preRemoveHooks,
  };
}

function generateConfig(answers: InitAnswers): GeneratedConfig {
  const config: GeneratedConfig = {
    defaultBranch: answers.defaultBranch,
  };

  if (answers.autoInstall !== true) {
    config.autoInstall = answers.autoInstall;
  }

  if (answers.autoCopy) {
    config.autoCopy = true;
    if (answers.copyFiles.length > 0) {
      config.copyFiles = answers.copyFiles;
    }
  } else {
    config.autoCopy = false;
  }

  if (answers.archiveDirectory !== '~/.worktree-archives') {
    config.archive = {
      directory: answers.archiveDirectory,
    };
  }

  if (answers.setupHooks && (answers.postCreateHooks.length > 0 || answers.preRemoveHooks.length > 0)) {
    config.hooks = {};
    if (answers.postCreateHooks.length > 0) {
      config.hooks.postCreate = answers.postCreateHooks;
    }
    if (answers.preRemoveHooks.length > 0) {
      config.hooks.preRemove = answers.preRemoveHooks;
    }
  }

  return config;
}

export async function initCommand(): Promise<void> {
  const git = new GitService();

  if (!(await git.isGitRepo())) {
    logger.error('Not a git repository');
    console.log();
    console.log(chalk.yellow('Please run this command from within a git repository.'));
    process.exit(1);
  }

  const rootPath = await git.getRootPath();
  const configPath = join(rootPath, '.wtconfig.json');

  if (await fileExists(configPath)) {
    console.log();
    console.log(chalk.yellow('⚠️  Configuration file already exists:'));
    console.log(`   ${configPath}`);
    console.log();
    console.log(chalk.cyan('Options:'));
    console.log('  1. Backup and create new: wt init --force');
    console.log('  2. Edit existing file manually');
    console.log();

    try {
      const currentConfig = await loadConfig();
      console.log(chalk.gray('Current configuration:'));
      console.log(chalk.gray(JSON.stringify(currentConfig, null, 2)));
    } catch {
      // Config loading errors are non-fatal here
    }

    console.log();
    console.log(chalk.yellow('Use --force to overwrite the existing configuration.'));
    process.exit(1);
  }

  const answers = await promptForInit(git, rootPath);
  const config = generateConfig(answers);

  try {
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log();
    console.log(chalk.green('✓ Configuration file created successfully!'));
    console.log(`  Path: ${configPath}`);
    console.log();
    console.log(chalk.cyan('Generated configuration:'));
    console.log(JSON.stringify(config, null, 2));
    console.log();
    console.log(chalk.gray('You can edit this file anytime to customize your worktree settings.'));
    console.log(chalk.gray('See README.md for full configuration options.'));
    console.log();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to write configuration file: ${errorMessage}`);
    process.exit(1);
  }
}
