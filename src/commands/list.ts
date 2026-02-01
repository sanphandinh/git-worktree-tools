import type { ListOptions, WorktreeInfo } from '../types/index.js';
import { GitService } from '../services/git.js';
import { loadConfig } from '../services/config.js';
import { formatTable, formatJSON, formatPorcelain } from '../utils/format.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export async function listCommand(options: ListOptions): Promise<void> {
  const git = new GitService();
  
  if (!await git.isGitRepo()) {
    logger.error('Not a git repository');
    process.exit(1);
  }

  const config = await loadConfig();
  const worktrees = await git.getWorktrees();
  
  const enrichedWorktrees: WorktreeInfo[] = [];
  const baseBranch = config.defaultBranch || 'main';
  const STALE_THRESHOLD = 30 * 24 * 60 * 60 * 1000;
  
  for (const wt of worktrees) {
    const status = await git.getStatus(wt.path);
    const { branch, head } = await git.getBranchInfo(wt.path);
    const unpushedCount = await git.getUnpushedCount(wt.path, branch);
    const isMerged = await git.isBranchMerged(wt.path, branch, baseBranch);
    const lastCommitDate = await git.getLastCommitDate(wt.path);
    
    const age = Date.now() - lastCommitDate.getTime();
    const isStale = age > STALE_THRESHOLD;

    enrichedWorktrees.push({
      ...wt,
      branch,
      head,
      isDirty: status.isDirty,
      uncommittedCount: status.uncommittedCount,
      unpushedCount,
      isMerged,
      lastCommitDate,
    });
  }

  let filtered = enrichedWorktrees;
  if (options.dirty) {
    filtered = filtered.filter(w => w.isDirty);
  }
  if (options.stale) {
    filtered = filtered.filter(w => {
      const age = Date.now() - w.lastCommitDate.getTime();
      return age > STALE_THRESHOLD;
    });
  }
  if (options.merged) {
    filtered = filtered.filter(w => w.isMerged);
  }

  if (options.json) {
    console.log(formatJSON(filtered));
  } else if (options.porcelain) {
    console.log(formatPorcelain(filtered));
  } else {
    console.log(chalk.bold(`\nWorktrees (${filtered.length} total):\n`));
    if (filtered.length === 0) {
      console.log('  No worktrees match the criteria\n');
    } else {
      console.log(formatTable(filtered));
    }
    console.log();
  }
}
