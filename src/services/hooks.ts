import { execa } from 'execa';
import type { WorktreeConfig, HookContext } from '../types/index.js';

export async function executeHooks(
  config: WorktreeConfig,
  hookType: 'postCreate' | 'preRemove' | 'postRemove',
  context: HookContext,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; errors: string[] }> {
  const hooks = config.hooks?.[hookType];
  
  if (!hooks) {
    return { success: true, errors: [] };
  }

  const hookList = Array.isArray(hooks) ? hooks : [hooks];
  const errors: string[] = [];

  for (const hook of hookList) {
    try {
      onProgress?.(`Executing hook: ${hook}`);
      
      await execa(hook, {
        cwd: context.worktreePath,
        env: {
          ...process.env,
          WORKTREE_PATH: context.worktreePath,
          WORKTREE_BRANCH: context.branch,
          WORKTREE_NAME: context.worktreeName,
          WORKTREE_MAIN_PATH: context.mainPath,
          WORKTREE_CREATED: context.createdAt || new Date().toISOString(),
        },
        stdio: 'pipe',
        shell: true,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Hook failed: ${hook} - ${errorMsg}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

export async function copyEnvFiles(
  sourceDir: string,
  targetDir: string,
  config: WorktreeConfig,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; copied: string[]; errors: string[] }> {
  const { copyFiles = [], ignoreFiles = [] } = config;
  const copied: string[] = [];
  const errors: string[] = [];

  if (!config.autoCopy || copyFiles.length === 0) {
    return { success: true, copied, errors };
  }

  for (const pattern of copyFiles) {
    try {
      onProgress?.(`Copying ${pattern}...`);
      
      const { execa } = await import('execa');
      await execa('cp', ['-r', `${sourceDir}/${pattern}`, targetDir]);
      copied.push(pattern);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to copy ${pattern}: ${errorMsg}`);
    }
  }

  return {
    success: errors.length === 0,
    copied,
    errors,
  };
}
