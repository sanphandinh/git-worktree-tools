import type { WorktreeInfo } from '../types/index.js';

export function formatTable(worktrees: WorktreeInfo[]): string {
  if (worktrees.length === 0) {
    return 'No worktrees found';
  }

  const maxNameLen = Math.max(...worktrees.map(w => w.branch.length), 10);
  const maxPathLen = Math.max(...worktrees.map(w => w.path.length), 10);

  const lines = worktrees.map(w => {
    const dirty = w.isDirty ? '✗ dirty' : '✓ clean';
    const merged = w.isMerged ? '✓ merged' : '';
    const age = formatAge(w.lastCommitDate);
    return `${w.branch.padEnd(maxNameLen)}  ${w.path.padEnd(maxPathLen)}  ${dirty}  ${w.unpushedCount} unpushed  ${age}  ${merged}`;
  });

  return lines.join('\n');
}

export function formatJSON(worktrees: WorktreeInfo[]): string {
  return JSON.stringify(worktrees, null, 2);
}

export function formatPorcelain(worktrees: WorktreeInfo[]): string {
  return worktrees.map(w => [
    `worktree ${w.path}`,
    `branch ${w.branch}`,
    `head ${w.head}`,
    `dirty ${w.isDirty ? 1 : 0}`,
    `unpushed ${w.unpushedCount}`,
    `merged ${w.isMerged ? 1 : 0}`,
    `date ${w.lastCommitDate.toISOString()}`,
  ].join('\n')).join('\n\n');
}

function formatAge(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return '>30d ago';
}
