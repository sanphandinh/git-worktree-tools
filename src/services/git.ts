import { execa } from 'execa';
import { dirname, join } from 'path';
import type { WorktreeInfo } from '../types/index.js';

export class GitService {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  async execGit(args: string[]): Promise<string> {
    const { stdout } = await execa('git', args, { cwd: this.cwd });
    return stdout;
  }

  async isGitRepo(): Promise<boolean> {
    try {
      await this.execGit(['rev-parse', '--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  async getRootPath(): Promise<string> {
    const rootPath = await this.execGit(['rev-parse', '--show-toplevel']);
    return rootPath.trim();
  }

  async getWorktrees(): Promise<WorktreeInfo[]> {
    const stdout = await this.execGit(['worktree', 'list', '--porcelain']);
    return this.parseWorktreeList(stdout);
  }

  async createWorktree(path: string, branch: string, baseBranch?: string): Promise<void> {
    const args = ['worktree', 'add'];
    
    if (baseBranch) {
      args.push('-b', branch, path, baseBranch);
    } else {
      args.push(path, branch);
    }
    
    await this.execGit(args);
  }

  async removeWorktree(path: string): Promise<void> {
    await this.execGit(['worktree', 'remove', path]);
  }

  async pruneWorktrees(): Promise<void> {
    await this.execGit(['worktree', 'prune']);
  }

  async getStatus(path: string): Promise<{ isDirty: boolean; uncommittedCount: number }> {
    const stdout = await this.execGit(['-C', path, 'status', '--porcelain']);
    const lines = stdout.split('\n').filter(line => line.trim());
    
    return {
      isDirty: lines.length > 0,
      uncommittedCount: lines.length,
    };
  }

  async getBranchInfo(path: string): Promise<{ branch: string; head: string }> {
    const branch = await this.execGit(['-C', path, 'rev-parse', '--abbrev-ref', 'HEAD']);
    const head = await this.execGit(['-C', path, 'rev-parse', '--short', 'HEAD']);
    return { branch, head };
  }

  async getUnpushedCount(path: string, branch: string): Promise<number> {
    try {
      const stdout = await this.execGit([
        '-C', path, 'rev-list', '--count',
        `origin/${branch}..${branch}`,
      ]);
      return parseInt(stdout, 10) || 0;
    } catch {
      return 0;
    }
  }

  async isBranchMerged(path: string, branch: string, baseBranch: string): Promise<boolean> {
    try {
      const stdout = await this.execGit([
        '-C', path, 'branch', '--merged', baseBranch,
      ]);
      return stdout.includes(branch);
    } catch {
      return false;
    }
  }

  async getLastCommitDate(path: string): Promise<Date> {
    const stdout = await this.execGit([
      '-C', path, 'log', '-1', '--format=%ci',
    ]);
    return new Date(stdout.trim());
  }

  async branchExists(branch: string): Promise<boolean> {
    try {
      await this.execGit(['show-ref', '--verify', `refs/heads/${branch}`]);
      return true;
    } catch {
      return false;
    }
  }

  async getDefaultBranch(): Promise<string | null> {
    try {
      const originHead = await this.execGit(['symbolic-ref', 'refs/remotes/origin/HEAD']);
      const match = originHead.trim().match(/refs\/remotes\/origin\/(.+)$/);
      if (match) {
        return match[1];
      }
    } catch {}

    const candidates = ['main', 'master'];
    for (const branch of candidates) {
      const existsLocally = await this.branchExists(branch);
      if (existsLocally) {
        return branch;
      }
      try {
        await this.execGit(['show-ref', '--verify', `refs/remotes/origin/${branch}`]);
        return branch;
      } catch {}
    }

    return null;
  }

  async stash(path: string): Promise<void> {
    await this.execGit(['-C', path, 'stash', 'push', '-u', '-m', 'wt-auto-stash']);
  }

  async stashPop(path: string): Promise<void> {
    await this.execGit(['-C', path, 'stash', 'pop']);
  }

  async fetch(path: string): Promise<void> {
    await this.execGit(['-C', path, 'fetch', 'origin']);
  }

  async rebase(path: string, branch: string): Promise<void> {
    await this.execGit(['-C', path, 'rebase', branch]);
  }

  async merge(path: string, branch: string): Promise<void> {
    await this.execGit(['-C', path, 'merge', branch]);
  }

  private parseWorktreeList(stdout: string): WorktreeInfo[] {
    const worktrees: WorktreeInfo[] = [];
    const entries = stdout.trim().split('\n\n');

    for (const entry of entries) {
      const lines = entry.split('\n');
      let path = '';
      let branch = '';
      let head = '';
      let isMain = false;

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          path = line.substring(9).trim();
        } else if (line.startsWith('branch ')) {
          branch = line.substring(7).trim();
        } else if (line.startsWith('HEAD ')) {
          head = line.substring(5).trim();
        } else if (line === 'bare') {
          isMain = true;
        }
      }

      if (path) {
        worktrees.push({
          path,
          branch: branch || 'detached',
          head: head || 'unknown',
          isMain,
          isDirty: false,
          uncommittedCount: 0,
          unpushedCount: 0,
          isMerged: false,
          lastCommitDate: new Date(),
        });
      }
    }

    return worktrees;
  }
}
