# Draft: wt init Command Implementation

## Project Context
- **CLI Tool**: `wt` - Git worktree manager
- **Framework**: Commander.js + TypeScript
- **Test Framework**: bun test (confirmed in package.json)
- **Config System**: cosmiconfig (.wtconfig.json, .config/wtconfig.json, wtconfig.json, package.json)
- **Dependencies**: chalk, execa, zod, ora, tar-stream

## Codebase Exploration Findings

### Command Structure Pattern
- Commands in `src/commands/*.ts`
- Export async function: `export async function commandName(args, options): Promise<void>`
- Common pattern:
  1. Initialize GitService and check `isGitRepo()`
  2. Load config with `loadConfig()`
  3. Get root path with `git.getRootPath()`
  4. Validate inputs using utilities
  5. Execute operations
  6. Use logger for colored output

### Key Utilities
- **GitService** (`src/services/git.ts`):
  - `isGitRepo()` - Check if git repo
  - `getRootPath()` - Get repository root
  - `getDefaultBranch()` - Detect default branch from origin/HEAD
  - `branchExists(branch)` - Check if branch exists
- **Config** (`src/services/config.ts`):
  - `loadConfig()` - Load and validate config with Zod
  - Uses cosmiconfig for search
- **Logger** (`src/utils/logger.ts`):
  - `logger.info()`, `logger.success()`, `logger.warning()`, `logger.error()`
- **Validation** (`src/utils/validation.ts`):
  - `pathExists()`, `isDirectory()`, `isValidBranchName()`
- **Paths** (`src/utils/paths.ts`):
  - `expandHome()` - Expand ~ to home directory

### Interactive Prompting Pattern
- Uses `readline` interface
- Simple prompt function:
  ```typescript
  function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      rl.question(question, (answer) => { rl.close(); resolve(answer); });
    });
  }
  ```

### Commander.js Registration Pattern
- In `src/cli.ts`:
  ```typescript
  program
    .command('init [path]')
    .description('Initialize worktree configuration')
    .option('--force', 'Overwrite existing config')
    .action(initCommand);
  ```

### Config Schema (from types and constants)
```typescript
interface WorktreeConfig {
  defaultBranch?: string;  // Default: 'main'
  autoInstall?: boolean;   // Default: true
  autoCopy?: boolean;      // Default: true
  copyFiles?: string[];    // Default: ['.env.example']
  ignoreFiles?: string[];  // Default: ['.env', 'node_modules', ...]
  hooks?: {
    postCreate?: string | string[];
    preRemove?: string | string[];
    postRemove?: string | string[];
  };
  archive?: {
    directory?: string;    // Default: '~/.worktree-archives'
    autoArchive?: boolean; // Default: false
    compression?: number;   // Default: 6
  };
}
```

### Existing Test Infrastructure
- **Test Files Found**:
  - `tests/unit/utils/paths.test.ts`
  - `tests/unit/utils/validation.test.ts`
  - `tests/unit/services/package-manager.test.ts`
- **Test Framework**: bun test (from package.json scripts)
- **Pattern**: Tests alongside source files or in tests/unit/ directory

## Requirements Confirmed from User

### Init Command Functionality
1. Check if in git repository (exit if not)
2. Check if config exists - warn about overwriting
3. Auto-detect values:
   - `defaultBranch`: from `origin/HEAD` or check for main/master
   - `ignoreFiles`: parse .gitignore file
   - `copyFiles`: look for .env.example, .env.local.example files
   - `autoInstall`: detect if package.json exists (true if yes)
4. Interactive prompts for:
   - `defaultBranch` (show auto-detected as default)
   - `autoInstall` (default: true if package.json exists)
   - `autoCopy` (default: true)
   - `copyFiles` (show detected .env files)
   - `archive.directory` (default: ~/.worktree-archives)
   - `hooks` setup (optional)
5. Generate `.wtconfig.json` file with all filled values
6. Show success message with path to created config

## Open Questions for User

Before generating the plan, I need to clarify:

### 1. Test Strategy
**Should this work include tests?**
- YES (TDD): Structure tasks as RED-GREEN-REFACTOR with test cases as part of acceptance
- YES (Tests after): Add test tasks after implementation tasks
- NO: Design detailed manual verification procedures instead

### 2. Configuration Priority
**When writing the config file, should we:**
- Always write full config with all defaults
- Only write non-default values (sparse config)
- Write detected values + user overrides only

### 3. Hooks Interactive Setup
**For hooks interactive setup, should we:**
- Just ask "Set up hooks? Y/n" and leave as empty object if no
- Ask for specific hook types (postCreate, preRemove, postRemove) with command input
- Skip hooks question entirely in interactive mode

### 4. Overwrite Behavior
**When config already exists and --force flag is NOT provided:**
- Exit with error immediately
- Show warning and prompt user to confirm overwrite
- Show warning but continue to interactive config update

### 5. Non-Interactive Mode
**Should the init command support non-interactive execution?**
- YES: With flags like `--default-branch main --auto-install --auto-copy`
- NO: Always require interactive prompts

