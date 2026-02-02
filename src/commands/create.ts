import { resolve, dirname, join, basename } from 'path';
import { mkdir } from 'fs/promises';
import type { CreateOptions, CreateScenario, CreatePlan } from '../types/index.js';
import { GitService } from '../services/git.js';
import { loadConfig } from '../services/config.js';
import { detectPackageManager, installDependencies } from '../services/package-manager.js';
import { executeHooks, copyEnvFiles } from '../services/hooks.js';
import { logger } from '../utils/logger.js';
import { 
  pathExists, 
  isValidBranchName,
  validateBranchAvailable,
  validateWorktreePath 
} from '../utils/validation.js';
import { 
  sanitizeBranchToFolder, 
  sanitizeFolderToBranch,
  isValidFolderName 
} from '../utils/paths.js';
import chalk from 'chalk';
import { createInterface } from 'readline';

/**
 * Prompt user for input when folder and branch are not provided
 */
async function promptForCreateInfo(): Promise<{ folderName: string; branchName: string }> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(question, (answer) => resolve(answer.trim()));
    });
  };

  console.log();
  console.log(chalk.cyan('Please provide worktree details:'));
  console.log();

  let folderName = '';
  let branchName = '';

  // Ask for folder name
  while (!folderName) {
    folderName = await ask('Folder name (e.g., feature-auth): ');
    if (!folderName) {
      console.log(chalk.yellow('Folder name is required.'));
    } else if (!isValidFolderName(folderName)) {
      console.log(chalk.yellow(`"${folderName}" is not a valid folder name.`));
      folderName = '';
    }
  }

  // Suggest branch name based on folder
  const suggestedBranch = sanitizeFolderToBranch(folderName);
  const branchInput = await ask(`Branch name [${suggestedBranch}]: `);
  branchName = branchInput || suggestedBranch;

  // Validate branch name
  while (!isValidBranchName(branchName)) {
    console.log(chalk.yellow(`"${branchName}" is not a valid branch name.`));
    branchName = await ask('Branch name: ');
  }

  rl.close();

  return { folderName, branchName };
}

/**
 * Determine the creation scenario based on user inputs
 */
function determineScenario(
  pathArg: string | undefined,
  branchOption: string | undefined
): CreateScenario {
  if (pathArg && branchOption) {
    return 'both-provided';
  }
  if (pathArg && !branchOption) {
    return 'path-only';
  }
  if (!pathArg && branchOption) {
    return 'branch-only';
  }
  return 'neither';
}

/**
 * Build the creation plan based on the scenario
 */
async function buildCreatePlan(
  git: GitService,
  pathArg: string | undefined,
  options: CreateOptions,
  parentDir: string
): Promise<CreatePlan> {
  const scenario = determineScenario(pathArg, options.branch);
  const baseBranch = options.branchFrom || 'main';

  switch (scenario) {
    case 'both-provided': {
      // Use provided values as-is
      const folderName = basename(pathArg!);
      return {
        scenario,
        folderName,
        branchName: options.branch!,
        baseBranch,
        derivedFrom: 'path',
      };
    }

    case 'path-only': {
      // Derive branch from folder name
      const folderName = basename(pathArg!);
      const branchName = sanitizeFolderToBranch(folderName);
      return {
        scenario,
        folderName,
        branchName,
        baseBranch,
        derivedFrom: 'path',
      };
    }

    case 'branch-only': {
      // Derive folder from branch name
      const folderName = sanitizeBranchToFolder(options.branch!);
      return {
        scenario,
        folderName,
        branchName: options.branch!,
        baseBranch,
        derivedFrom: 'branch',
      };
    }

    case 'neither': {
      // Interactive prompt
      const { folderName, branchName } = await promptForCreateInfo();
      return {
        scenario,
        folderName,
        branchName,
        baseBranch,
        derivedFrom: 'prompt',
      };
    }
  }
}

/**
 * Show creation plan preview to user
 */
function showPlanPreview(plan: CreatePlan, worktreePath: string, config: any): void {
  console.log();
  console.log(chalk.cyan('Worktree Creation Plan:'));
  console.log(`  Folder: ${plan.folderName}`);
  console.log(`  Branch: ${plan.branchName}`);
  console.log(`  From: ${plan.baseBranch}`);
  console.log(`  Path: ${worktreePath}`);
  
  if (plan.derivedFrom !== 'path' || plan.scenario === 'branch-only') {
    console.log(chalk.gray(`  (Derived from ${plan.derivedFrom})`));
  }
  
  console.log();
}

/**
 * Main create command handler
 */
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
  const parentDir = dirname(rootPath);

  // Build creation plan
  const plan = await buildCreatePlan(git, pathArg, options, parentDir);
  
  // Resolve full worktree path
  let worktreePath: string;
  if (pathArg) {
    worktreePath = resolve(parentDir, pathArg);
  } else {
    worktreePath = join(parentDir, plan.folderName);
  }

  // Validate worktree path
  const pathValidation = await validateWorktreePath(git, worktreePath);
  if (!pathValidation.valid) {
    logger.error(pathValidation.error!);
    if (pathValidation.suggestion) {
      console.log();
      console.log(chalk.yellow('Suggestion:'), pathValidation.suggestion);
    }
    process.exit(1);
  }

  // Check if physical path exists (separate from worktree validation)
  if (await pathExists(worktreePath)) {
    logger.error(`Path already exists: ${worktreePath}`);
    console.log();
    console.log(chalk.yellow('Suggestion: Choose a different name or remove the existing directory'));
    process.exit(1);
  }

  // Validate branch availability
  const branchValidation = await validateBranchAvailable(git, plan.branchName);
  if (!branchValidation.valid) {
    logger.error(branchValidation.error!);
    if (branchValidation.suggestion) {
      console.log();
      console.log(chalk.yellow('Suggestion:'), branchValidation.suggestion);
    }
    process.exit(1);
  }

  // Show dry run preview
  if (options.dryRun) {
    console.log(chalk.yellow('Dry run - would execute:'));
    showPlanPreview(plan, worktreePath, config);
    console.log(chalk.yellow('  (No changes made - dry run mode)'));
    return;
  }

  // Show plan for user confirmation in interactive mode
  if (plan.scenario === 'neither' || plan.derivedFrom === 'prompt') {
    showPlanPreview(plan, worktreePath, config);
  }

  // Create the worktree directory parent if needed
  await mkdir(dirname(worktreePath), { recursive: true });

  logger.info(`Creating worktree at ${worktreePath}...`);

  // Check if branch already exists (for checkout instead of create)
  const branchExistsLocally = await git.branchExists(plan.branchName);

  try {
    if (branchExistsLocally) {
      await git.createWorktree(worktreePath, plan.branchName);
    } else {
      await git.createWorktree(worktreePath, plan.branchName, plan.baseBranch);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle specific git error: branch already checked out elsewhere
    const worktreeInUseMatch = errorMessage.match(/'([^']+)' is already used by worktree at '([^']+)'/);
    if (worktreeInUseMatch) {
      const [, usedBranch, existingWorktreePath] = worktreeInUseMatch;
      logger.error(`Cannot create worktree: branch '${usedBranch}' is already in use`);
      console.log();
      console.log(chalk.yellow('The branch is currently checked out in another worktree:'));
      console.log(`  ${existingWorktreePath}`);
      console.log();
      console.log(chalk.cyan('Options to resolve this:'));
      console.log(`  1. Use a different branch name:`);
      console.log(`     ${chalk.bold(`wt create ${plan.folderName} --branch <new-branch-name>`)}`);
      console.log();
      console.log(`  2. Remove the existing worktree first:`);
      console.log(`     ${chalk.bold(`wt delete ${existingWorktreePath}`)}`);
      console.log();
      console.log(`  3. Switch to the existing worktree:`);
      console.log(`     ${chalk.bold(`cd ${existingWorktreePath}`)}`);
      console.log();
      process.exit(1);
    }

    throw error;
  }

  logger.success(`Worktree created: ${plan.branchName}`);

  const warnings: string[] = [];

  // Install dependencies
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

  // Copy env files
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

  // Run hooks
  if (!options.noHooks) {
    const result = await executeHooks(
      config,
      'postCreate',
      {
        worktreePath,
        branch: plan.branchName,
        worktreeName: plan.folderName,
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

  // Final output
  console.log();
  console.log(chalk.green('✓ Worktree created successfully'));
  console.log(`  Path: ${worktreePath}`);
  console.log(`  Branch: ${plan.branchName}`);
  
  if (plan.scenario === 'path-only' || plan.scenario === 'branch-only') {
    console.log(chalk.gray(`  (Derived ${plan.scenario === 'path-only' ? 'branch from folder name' : 'folder from branch name'})`));
  }
  
  if (warnings.length > 0) {
    console.log();
    console.log(chalk.yellow('Warnings:'));
    warnings.forEach(w => console.log(`  ⚠ ${w}`));
  }
  
  console.log();
}
