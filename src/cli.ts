import { Command } from 'commander';
import { VERSION } from './constants.js';
import { listCommand } from './commands/list.js';
import { createCommand } from './commands/create.js';
import { deleteCommand } from './commands/delete.js';
import { statusCommand } from './commands/status.js';
import { syncCommand } from './commands/sync.js';
import { archiveCommand } from './commands/archive.js';

export function cli(): void {
  const program = new Command();

  program
    .name('wt')
    .description('Git worktree management tool')
    .version(VERSION);

  program
    .command('list')
    .description('List all worktrees with status')
    .option('-d, --dirty', 'Show only dirty worktrees')
    .option('-s, --stale', 'Show only stale worktrees (>30 days)')
    .option('-m, --merged', 'Show only merged worktrees')
    .option('--porcelain', 'Machine-readable output')
    .option('-j, --json', 'JSON output')
    .action(listCommand);

  program
    .command('create [path]')
    .description('Create a new worktree')
    .option('-b, --branch <name>', 'Branch name (creates if not exists)')
    .option('-B, --branch-from <branch>', 'Base branch to create from', 'main')
    .option('--no-install', 'Skip dependency installation')
    .option('--no-hooks', 'Skip post-create hooks')
    .option('--dry-run', 'Show what would be done without executing')
    .action(createCommand);

  program
    .command('delete [path]')
    .description('Remove a worktree by path or branch name (interactive if no argument)')
    .option('-f, --force', 'Skip safety checks')
    .option('-a, --archive', 'Archive before deleting')
    .option('--no-hooks', 'Skip pre/post-remove hooks')
    .action(deleteCommand);

  program
    .command('status [path]')
    .description('Show detailed worktree status')
    .action(statusCommand);

  program
    .command('sync [path]')
    .description('Sync worktree with base branch')
    .option('-m, --merge', 'Use merge instead of rebase')
    .option('--no-fetch', 'Skip fetching remote')
    .action(syncCommand);

  program
    .command('archive <path>')
    .description('Archive a worktree')
    .option('-o, --output <path>', 'Custom archive path')
    .action(archiveCommand);

  program.parse();
}
