# Git Worktree Management Tool - Implementation Plan

## TL;DR

> **A simple but powerful CLI tool for managing git worktrees with AI agent collaboration in mind.**
>
> **Deliverables**:
> - `wt` global CLI command
> - `npx wt` project-local usage
> - Core: create, list, delete, status, sync, archive
> - Auto-setup: package manager detection, dependency install, env copy
> - Config: `.wtconfig.json` with cosmiconfig
>
> **Estimated Effort**: Medium (~2-3 weeks for experienced dev)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Core Commands → Config System → Auto-Setup → Polish

---

## Context

### Original Request
Create a Git Worktree Management Tool optimized for AI agent collaboration - new project from scratch.

### User Requirements (Confirmed)
- **Deployment**: BOTH global CLI (`wt`) + project-local (`npx wt`)
- **UI Style**: Simple CLI output (like `git status`), NOT interactive TUI
- **Core Features**:
  - create, list, delete, status commands
  - branch sync (auto-fetch/pull from base branch)
  - worktree archiving (save state before delete)
  - create from specific branch
  - create to specific folder
  - auto-detect sibling folder if no destination defined
- **Auto-Setup**:
  - Auto-detect package manager (npm/yarn/pnpm/bun) via lockfiles
  - Install dependencies automatically
  - Copy configurable dotenv files
  - Run configurable post-create hooks
- **Environment**: Bun + TypeScript, minimal but useful, no bloat

### Research Findings
**Similar Tools Analyzed**:
- `git-worktree-runner` (gtr) - 1.2k stars, MCP integration, editor adapters
- `grove` - Bare clone workflow, shell integration
- `gw` - Go-based, auto package manager detection
- `worktree-cli` - MCP server for Claude Code

**Key Patterns**:
- Git porcelain output parsing (`git worktree list --porcelain`)
- Layered config: project `.wtconfig.json` + user git config + env vars
- Lifecycle hooks: post_create, pre_remove, post_remove
- Package manager detection via lockfile presence
- File copying with include/exclude patterns

---

## Work Objectives

### Core Objective
Build a lightweight, fast CLI tool that simplifies git worktree management with intelligent auto-setup for modern development workflows.

### Concrete Deliverables
| Deliverable | Description |
|-------------|-------------|
| `wt` CLI | Global and local npm package |
| 6 core commands | create, list, delete, status, sync, archive |
| Config system | `.wtconfig.json` with cosmiconfig (JSON format) |
| Auto-setup engine | Package manager detection, dependency install, env copy |
| Hook system | post_create, pre_remove, post_remove lifecycle hooks |
| State tracking | Dirty status, unpushed commits, last active |
| Documentation | README, CLI help, examples |

### Definition of Done
- [ ] All 6 core commands implemented and tested
- [ ] Can install globally: `npm install -g wt`
- [ ] Can use locally: `npx wt <command>`
- [ ] Auto-detects package manager and installs deps
- [ ] Copies configured env files on create
- [ ] All tests pass (unit + integration)
- [ ] Published to npm registry
- [ ] README with usage examples

### Must Have (IN Scope)
1. Simple CLI commands with clean output
2. Package manager auto-detection (npm, yarn, pnpm, bun)
3. Configurable dotenv file copying
4. Lifecycle hooks (post_create, pre_remove, post_remove)
5. State tracking (dirty, unpushed, merged status)
6. Both global and local installation modes
7. Branch sync capability
8. Worktree archiving

### Must NOT Have (Guardrails)
1. **NO** interactive TUI (Ink/React-based) - keep it simple CLI
2. **NO** plugin system - avoid complexity
3. **NO** Docker integration (user didn't request)
4. **NO** MCP server in v1 - can add later
5. **NO** editor/AI tool launching in v1 - hooks cover this
6. **NO** bare clone workflow - stick to standard git worktrees
7. **NO** fuzzy finding - keep commands explicit
8. **NO** port management - out of scope

---

## Tech Stack Recommendation

### Core Stack

| Component | Choice | Justification |
|-----------|--------|---------------|
| **Runtime** | Bun | User preference, fast, built-in TypeScript, excellent test runner |
| **Language** | TypeScript | Type safety, modern DX, excellent ecosystem |
| **CLI Framework** | Commander.js | Battle-tested (27.9k stars), simple API, great TypeScript support via `@commander-js/extra-typings`, perfect for our use case |
| **Config Loader** | cosmiconfig | Industry standard, supports JSON config, hierarchical config |
| **Schema Validation** | Zod | TypeScript-first, excellent error messages, validates at runtime |

### Why Commander.js over alternatives?

**Chosen: Commander.js**
- ✅ Perfect complexity level for our needs
- ✅ Minimal setup, maximum productivity  
- ✅ Excellent TypeScript support with `extra-typings`
- ✅ Automatic help generation
- ✅ Bun compatibility actively being fixed
- ✅ Zero dependencies, ~208KB

**Not Chosen:**
- Oclif: Too heavy, plugin system overkill
- Ink: React-based TUI, violates "simple CLI" requirement
- Clipanion: Smaller community, class-based design heavier
- Gluegun: No longer actively developed

### Supporting Libraries

| Library | Purpose |
|---------|---------|
| `execa` | Better child process execution than native `child_process` |
| `chalk` | Terminal colors for status output |
| `ora` | Loading spinners for long operations |
| `simple-git` | Optional - wraps git commands (or use execa directly) |

### Development Tools

| Tool | Purpose |
|------|---------|
| **Test Runner** | Bun's built-in test runner (`bun test`) |
| **Linter** | ESLint + @typescript-eslint |
| **Formatter** | Prettier |
| **Type Checking** | `tsc --noEmit` |

---

## Feature Specification

### Command Structure

```
wt <command> [options] [arguments]
```

### Commands Overview

| Command | Arguments | Description |
|---------|-----------|-------------|
| `create` | `[path]` `[options]` | Create new worktree |
| `list` | `[options]` | List all worktrees with status |
| `delete` | `<path>` `[options]` | Remove worktree |
| `status` | `[path]` | Show detailed worktree status |
| `sync` | `[path]` `[options]` | Sync worktree with base branch |
| `archive` | `<path>` `[options]` | Archive worktree before deletion |

### Detailed Command Specifications

#### 1. `wt create [path]`

**Purpose**: Create a new git worktree with optional auto-setup

**Arguments**:
- `path` (optional): Directory name for worktree. If omitted, auto-detects sibling folder.

**Options**:
- `-b, --branch <name>`: Branch name (creates if doesn't exist)
- `-B, --branch-from <branch>`: Create branch from this base (default: main)
- `--no-install`: Skip dependency installation
- `--no-hooks`: Skip post-create hooks
- `--dry-run`: Show what would be done without executing

**Behavior**:
1. If no path provided, suggest name based on branch or generate `wt-{timestamp}`
2. Validate path doesn't exist and isn't inside another worktree
3. Create worktree: `git worktree add <path> <branch>`
4. If branch doesn't exist, create it: `git worktree add -b <branch> <path> <base>`
5. Auto-detect package manager from lockfile in main worktree
6. Install dependencies (if autoInstall enabled)
   - If install fails, show warning but continue (worktree is still created)
7. Copy configured env files (from main worktree to new worktree)
   - If copy fails, show warning but continue
8. Run post_create hooks
   - If hooks fail, show warning but continue
9. Output success message with path and branch (including any warnings)

**Example Output**:
```
✓ Created worktree: feature-auth
  Path: ../feature-auth
  Branch: feature/auth (from main)
  Package manager: npm
  Installed dependencies: ✓
  Copied files: .env, .env.local
  Hooks executed: 2
```

#### 2. `wt list [options]`

**Purpose**: List all worktrees with status information

**Options**:
- `-d, --dirty`: Show only dirty worktrees
- `-s, --stale`: Show only stale worktrees (>30 days)
- `-m, --merged`: Show only merged worktrees
- `--porcelain`: Machine-readable output
- `-j, --json`: JSON output

**Behavior**:
1. Parse `git worktree list --porcelain`
2. For each worktree:
   - Get branch name
   - Check dirty status: `git status --porcelain`
   - Count unpushed commits: `git log <upstream>..HEAD --oneline`
   - Check merge status: `git branch --merged main`
   - Get last commit date: `git log -1 --format=%ci`
   - Calculate age
3. Display formatted table (or JSON/porcelain)

**Example Output**:
```
Worktrees (4 total):

main            ../main           main           ✓ clean    0 unpushed  2h ago
feature-auth    ../feature-auth   feature/auth   ✗ dirty    3 unpushed  2d ago
fix-bug         ../fix-bug        fix/bug-123    ✓ clean    0 unpushed  5d ago  ✓ merged
experiment      ../experiment     experiment     ✓ clean    12 unpushed 30d ago  ✗ stale
```

#### 3. `wt delete <path> [options]`

**Purpose**: Safely remove a worktree

**Arguments**:
- `path` (required): Path or name of worktree to delete

**Options**:
- `-f, --force`: Skip safety checks
- `-a, --archive`: Archive before deleting
- `--no-hooks`: Skip pre_remove/post_remove hooks

**Behavior**:
1. Validate worktree exists
2. **Safety checks** (unless --force):
   - Check for uncommitted changes
   - Check for unpushed commits
   - Warn if branch not merged to main
3. Run pre_remove hooks (if configured)
4. If `--archive`, create archive first (see `wt archive`)
5. Remove worktree: `git worktree remove <path>`
6. Clean up: `git worktree prune`
7. Run post_remove hooks
8. Output success message

**Example Output**:
```
⚠ Worktree has uncommitted changes: feature-auth
⚠ Worktree has 3 unpushed commits
Continue? [y/N]: y

✓ Archived to: ~/.worktree-archives/feature-auth-20260131-120000.tar.gz
✓ Removed worktree: feature-auth
  Pruned worktree metadata
```

#### 4. `wt status [path]`

**Purpose**: Show detailed status of a specific worktree

**Arguments**:
- `path` (optional): Worktree path/name (default: current directory)

**Behavior**:
1. Identify worktree (current dir if not specified)
2. Collect detailed info:
   - Path, branch, HEAD commit
   - Dirty status (files changed)
   - Uncommitted changes count
   - Unpushed commits with messages
   - Merge status
   - Age (last commit)
   - Disk usage
3. Display formatted report

**Example Output**:
```
Worktree: feature-auth
Path: /Users/dev/project/feature-auth
Branch: feature/auth
HEAD: a1b2c3d (feat: add OAuth integration)

Git Status:
  Working tree: ✗ dirty (3 modified files)
  Uncommitted: 3 files
  Unpushed: 2 commits
    - a1b2c3d feat: add OAuth integration
    - d4e5f6g fix: handle token refresh
  Merged to main: ✗ no
  Last activity: 2 hours ago

Environment:
  Package manager: npm
  Dependencies installed: ✓
  Node version: v20.11.0

Size: 245MB (node_modules: 198MB)
```

#### 5. `wt sync [path] [options]`

**Purpose**: Sync worktree with its base branch (fetch + rebase/merge)

**Arguments**:
- `path` (optional): Worktree path/name (default: current directory)

**Options**:
- `-m, --merge`: Use merge instead of rebase
- `-r, --rebase`: Use rebase (default)
- `--no-fetch`: Skip fetching remote

**Behavior**:
1. Identify worktree and its tracking branch
2. Fetch remote updates (unless --no-fetch)
3. Stash any uncommitted changes
4. Rebase (or merge) onto base branch
5. Restore stashed changes
6. Report result

**Example Output**:
```
Syncing feature-auth with main...
Fetching origin... ✓
Stashing changes... ✓ (3 files)
Rebasing onto main... ✓
Restoring stashed changes... ✓

✓ Sync complete: feature-auth is up to date with main
  3 commits rebased
```

#### 6. `wt archive <path> [options]`

**Purpose**: Archive a worktree (backup before deletion)

**Arguments**:
- `path` (required): Worktree path/name to archive

**Options**:
- `-o, --output <path>`: Custom archive path
- `-c, --compress`: Compress archive (gzip)
- `--no-git`: Exclude .git directory

**Behavior**:
1. Validate worktree exists
2. Create timestamped archive name: `<name>-YYYYMMDD-HHMMSS.tar.gz`
3. Default archive location: `~/.worktree-archives/`
4. Archive contents:
   - All files (respecting .gitignore)
   - Git metadata (unless --no-git)
   - Archive manifest with metadata (branch, commit, date)
5. Output archive path

**Example Output**:
```
Archiving feature-auth...

Creating archive: ~/.worktree-archives/feature-auth-20260131-120000.tar.gz
Files archived: 1,247
Size: 156MB (compressed: 42MB)
Manifest: ~/.worktree-archives/feature-auth-20260131-120000.json

✓ Archive complete
```

---

## Architecture Design

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ create  │ │  list   │ │ delete  │ │ status  │           │
│  │  sync   │ │ archive │ │  help   │ │  --version│          │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
└───────┼───────────┼───────────┼───────────┼─────────────────┘
        │           │           │           │
        └───────────┴───────────┴───────────┘
                    │
        ┌───────────▼───────────┐
        │    Command Handlers    │
        │  (src/commands/*.ts)   │
        └───────────┬───────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼───┐     ┌────▼────┐    ┌─────▼─────┐
│ Git   │     │ Config  │    │ Auto-Setup│
│Service│     │ Loader  │    │  Engine   │
└───┬───┘     └────┬────┘    └─────┬─────┘
    │              │               │
    │         ┌────▼────┐    ┌─────▼─────┐
    │         │cosmiconfig│   │ Package   │
    │         └─────────┘    │  Manager  │
    │                        │  Detector │
    │                        └─────┬─────┘
    │                              │
    └──────────────┬───────────────┘
                   │
           ┌───────▼───────┐
           │   git binary  │
           └───────────────┘
```

### Module Breakdown

#### 1. CLI Layer (`src/cli.ts`)
- Entry point
- Commander.js setup
- Command registration
- Global error handling

#### 2. Command Handlers (`src/commands/`)
Each command as separate module:
- `create.ts`: Handle `wt create`
- `list.ts`: Handle `wt list`
- `delete.ts`: Handle `wt delete`
- `status.ts`: Handle `wt status`
- `sync.ts`: Handle `wt sync`
- `archive.ts`: Handle `wt archive`

#### 3. Services (`src/services/`)
Core business logic:
- `git.ts`: Git operations wrapper
- `config.ts`: Configuration loading
- `worktree.ts`: Worktree state management
- `package-manager.ts`: Package manager detection
- `hooks.ts`: Hook execution
- `archive.ts`: Archiving logic

#### 4. Utilities (`src/utils/`)
- `logger.ts`: Console output formatting
- `paths.ts`: Path utilities
- `validation.ts`: Input validation
- `format.ts`: Output formatting (table, JSON)

### Data Flow

#### Create Command Flow
```
User Input
    ↓
Parse args (Commander)
    ↓
Validate path/branch
    ↓
Load config (cosmiconfig)
    ↓
Execute git worktree add
    ↓
Detect package manager
    ↓
Install dependencies
    ↓
Copy env files
    ↓
Run post_create hooks
    ↓
Output success
```

#### List Command Flow
```
Parse args
    ↓
Load config
    ↓
Get worktree list (git worktree list --porcelain)
    ↓
For each worktree:
  ├─ Get branch info
  ├─ Check dirty status (git status --porcelain)
  ├─ Count unpushed commits
  ├─ Check merge status
  └─ Get last commit date
    ↓
Format output (table/JSON/porcelain)
    ↓
Display
```

### Key Interfaces

```typescript
// Worktree metadata
interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
  isMain: boolean;
  isDirty: boolean;
  uncommittedCount: number;
  unpushedCount: number;
  isMerged: boolean;
  lastCommitDate: Date;
  size?: number; // disk usage in bytes
}

// Configuration schema
interface WorktreeConfig {
  defaultBranch?: string;
  autoInstall?: boolean;
  autoCopy?: boolean;
  copyFiles?: string[];
  ignoreFiles?: string[];
  hooks?: {
    postCreate?: string | string[];
    preRemove?: string | string[];
    postRemove?: string | string[];
  };
  archiveDir?: string;
}

// Package manager info
interface PackageManager {
  name: 'npm' | 'yarn' | 'pnpm' | 'bun';
  lockfile: string;
  installCommand: string;
  runCommand: string;
}
```

---

## Project Structure

### Directory Layout

```
wt/
├── src/
│   ├── index.ts              # Entry point
│   ├── cli.ts                # Commander setup
│   ├── commands/
│   │   ├── create.ts         # wt create
│   │   ├── list.ts           # wt list
│   │   ├── delete.ts         # wt delete
│   │   ├── status.ts         # wt status
│   │   ├── sync.ts           # wt sync
│   │   └── archive.ts        # wt archive
│   ├── services/
│   │   ├── git.ts            # Git operations
│   │   ├── config.ts         # Config loading
│   │   ├── worktree.ts       # Worktree state
│   │   ├── package-manager.ts # PM detection
│   │   ├── hooks.ts          # Hook execution
│   │   └── archive.ts        # Archiving
│   ├── utils/
│   │   ├── logger.ts         # Output formatting
│   │   ├── paths.ts          # Path utilities
│   │   ├── validation.ts     # Input validation
│   │   └── format.ts         # Output formatting
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   └── constants.ts          # Constants
├── tests/
│   ├── unit/
│   │   ├── commands/         # Command unit tests
│   │   ├── services/         # Service unit tests
│   │   └── utils/            # Utility tests
│   ├── integration/
│   │   └── cli.test.ts       # Full CLI integration tests
│   └── fixtures/
│       └── repos/            # Test git repos
├── bin/
│   └── wt.js                 # CLI entry wrapper
├── dist/                     # Compiled output
├── docs/
│   └── examples/             # Usage examples
├── .wtconfig.json            # Example config
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Package entry, exports for programmatic use |
| `src/cli.ts` | CLI setup, command registration, error handling |
| `bin/wt.js` | Shebang wrapper for global CLI |
| `src/services/git.ts` | All git operations wrapper |
| `src/services/config.ts` | cosmiconfig integration |
| `package.json` | Scripts, dependencies, bin entry |

---

## Implementation Phases

### Phase Overview

```
Wave 1: Foundation
├── Task 1: Project setup (package.json, tsconfig, build)
├── Task 2: Config system (cosmiconfig + schema)
└── Task 3: Git service wrapper

Wave 2: Core Commands
├── Task 4: wt list command
├── Task 5: wt create command
└── Task 6: wt delete command

Wave 3: Extended Features
├── Task 7: wt status command
├── Task 8: wt sync command
└── Task 9: wt archive command

Wave 4: Polish & Distribution
├── Task 10: Auto-setup engine (package manager + hooks)
├── Task 11: Testing (unit + integration)
└── Task 12: Documentation + npm publish
```

### Phase 1: Foundation (Wave 1)

**Task 1.1: Project Setup** ⭐ Critical Path
```
Priority: HIGH
Dependencies: None
Duration: 2-4 hours

TODOs:
- [ ] Initialize package.json with bin entry
  - name: wt
  - version: 0.1.0
  - bin: { wt: "./bin/wt.js" }
  - main: "./dist/index.js"
  - types: "./dist/index.d.ts"
  
- [ ] Setup TypeScript (tsconfig.json)
  - target: ES2022
  - module: NodeNext
  - strict: true
  - outDir: ./dist
  
- [ ] Configure Bun test runner
  - test script: "bun test"
  - coverage: built-in
  
- [ ] Add build script
  - "build": "tsc"
  - "dev": "tsc --watch"
  
- [ ] Create bin/wt.js wrapper
  - Shebang: #!/usr/bin/env node
  - Import compiled CLI
  - Handle uncaught errors

Acceptance Criteria:
- bun install succeeds
- bun run build compiles without errors
- ./bin/wt.js --version outputs version
```

**Task 1.2: Config System**
```
Priority: HIGH
Dependencies: Task 1.1
Duration: 3-5 hours

TODOs:
- [ ] Install cosmiconfig
  - bun add cosmiconfig
  
- [ ] Define Zod schema (src/types/index.ts)
  - WorktreeConfig interface
  - Validation for all fields
  
- [ ] Create config service (src/services/config.ts)
  - Load config from .wtconfig.json
  - Merge with defaults
  - Cache loaded config
  
- [ ] Implement config search paths
  - .wtconfig.json (project root)
  - .config/wtconfig.json
  - ~/.wtconfig.json (global)
  - "wtconfig" key in package.json

Acceptance Criteria:
- Config loads from .wtconfig.json
- Invalid config shows helpful error
- Defaults applied when fields missing
```

**Task 1.3: Git Service Wrapper** ⭐ Critical Path
```
Priority: HIGH
Dependencies: Task 1.1
Duration: 4-6 hours

TODOs:
- [ ] Install execa for process execution
  - bun add execa
  
- [ ] Create git service (src/services/git.ts)
  - execute(): Run git commands
  - getWorktrees(): Parse git worktree list --porcelain
  - createWorktree(): git worktree add
  - removeWorktree(): git worktree remove
  - getStatus(): git status --porcelain
  
- [ ] Parse porcelain formats
  - WorktreeListParser
  - StatusParser
  
- [ ] Error handling
  - GitNotRepoError
  - GitCommandError
  - WorktreeExistsError

Acceptance Criteria:
- Can list worktrees in current repo
- Can create worktree
- Proper error messages for git failures
```

### Phase 2: Core Commands (Wave 2)

**Task 2.1: wt list Command** ⭐ Critical Path
```
Priority: HIGH
Dependencies: Task 1.2, Task 1.3
Duration: 4-6 hours

TODOs:
- [ ] Implement command (src/commands/list.ts)
  - Parse worktree list
  - Get status for each
  - Format output
  
- [ ] Add CLI integration (src/cli.ts)
  - Register 'list' command
  - Add options (--dirty, --stale, --merged)
  - Add output formats (--porcelain, --json)
  
- [ ] Create formatter (src/utils/format.ts)
  - Table formatter for human output
  - JSON formatter
  - Porcelain formatter (machine-readable)
  
- [ ] Add status indicators
  - Dirty: ✓/✗
  - Stale: >30 days
  - Merged: check against main

Acceptance Criteria:
- wt list shows all worktrees
- --json outputs valid JSON
- --dirty filters correctly
- Output matches design spec
```

**Task 2.2: wt create Command** ⭐ Critical Path
```
Priority: HIGH
Dependencies: Task 1.2, Task 1.3
Duration: 6-8 hours

TODOs:
- [ ] Implement command (src/commands/create.ts)
  - Parse arguments
  - Validate path
  - Handle branch creation
  - Execute git worktree add
  
- [ ] Add auto-setup integration
  - Call package manager detection
  - Copy env files
  - Run hooks
  
- [ ] Add CLI options
  - -b, --branch
  - -B, --branch-from
  - --no-install
  - --no-hooks
  - --dry-run
  
- [ ] Handle edge cases
  - Branch already exists
  - Path already exists
  - Invalid branch names

Acceptance Criteria:
- Can create worktree with branch
- Auto-detects folder name if not provided
- Dry-run shows planned actions
- Proper error messages
```

**Task 2.3: wt delete Command** ⭐ Critical Path
```
Priority: HIGH
Dependencies: Task 2.2
Duration: 4-6 hours

TODOs:
- [ ] Implement command (src/commands/delete.ts)
  - Validate worktree exists
  - Run safety checks
  - Run hooks
  - Execute removal
  
- [ ] Add safety checks
  - Check dirty status
  - Check unpushed commits
  - Check merge status
  - Prompt for confirmation
  
- [ ] Add force option
  - Skip all checks with --force
  
- [ ] Add archive integration
  - Call archive command if --archive

Acceptance Criteria:
- Warns before deleting dirty worktree
- Can force delete with --force
- Runs hooks correctly
- Prunes worktree after removal
```

### Phase 3: Extended Features (Wave 3)

**Task 3.1: wt status Command**
```
Priority: MEDIUM
Dependencies: Task 2.1
Duration: 3-4 hours

TODOs:
- [ ] Implement detailed status (src/commands/status.ts)
  - Collect all metadata
  - Format detailed report
  
- [ ] Add disk usage calculation
  - du -sh equivalent
  
- [ ] Add environment info
  - Package manager
  - Node version
  - Dependencies installed?

Acceptance Criteria:
- Shows detailed status for worktree
- Includes git and environment info
- Handles current directory correctly
```

**Task 3.2: wt sync Command**
```
Priority: MEDIUM
Dependencies: Task 1.3
Duration: 3-4 hours

TODOs:
- [ ] Implement sync (src/commands/sync.ts)
  - Fetch remote
  - Stash changes
  - Rebase/merge
  - Restore stash
  
- [ ] Add options
  - --merge vs --rebase
  - --no-fetch
  
- [ ] Handle conflicts
  - Detect rebase conflicts
  - Provide helpful message

Acceptance Criteria:
- Syncs worktree with base branch
- Handles dirty worktree (stash/restore)
- Shows progress and result
```

**Task 3.3: wt archive Command**
```
Priority: MEDIUM
Dependencies: Task 1.3
Duration: 4-5 hours

TODOs:
- [ ] Implement archiving (src/commands/archive.ts)
  - Create tar.gz archive
  - Include metadata manifest
  
- [ ] Add options
  - --output (custom path)
  - --compress
  - --no-git
  
- [ ] Create archive directory
  - ~/.worktree-archives/ (default)
  - Create if doesn't exist

Acceptance Criteria:
- Creates archive with timestamp
- Includes manifest JSON
- Respects .gitignore
```

### Phase 4: Polish & Distribution (Wave 4)

**Task 4.1: Auto-Setup Engine** ⭐ Critical Path
```
Priority: HIGH
Dependencies: Task 2.2
Duration: 6-8 hours

TODOs:
- [ ] Package manager detection (src/services/package-manager.ts)
  - Detect from lockfiles:
    - package-lock.json → npm
    - yarn.lock → yarn
    - pnpm-lock.yaml → pnpm
    - bun.lockb → bun
  
- [ ] Install dependencies
  - Run appropriate install command
  - Show progress spinner
  
- [ ] Env file copying
  - Copy files from config.copyFiles
  - Respect config.ignoreFiles
  
- [ ] Hook system (src/services/hooks.ts)
  - Execute post_create hooks
  - Execute pre_remove hooks
  - Execute post_remove hooks
  - Pass environment variables
  
- [ ] Error handling (non-blocking)
  - **Failed install → show warning but continue**
    - Worktree is still created and usable
    - User can manually run install later
  - **Failed env copy → show warning but continue**
  - **Hook failure → show warning but continue**
    - Worktree creation should never fail due to hooks
  - All warnings collected and shown in final summary

Acceptance Criteria:
- Auto-detects package manager correctly
- Installs dependencies on create
- **If install fails, worktree is still created with warning**
- Copies configured env files
- **If copy fails, worktree is still created with warning**
- Runs hooks with env vars
- **If hooks fail, worktree is still created with warning**
```

**Task 4.2: Testing Strategy**
```
Priority: HIGH
Dependencies: All previous tasks
Duration: 8-12 hours

TODOs:
- [ ] Unit tests (tests/unit/)
  - Test each service in isolation
  - Mock git commands
  - Test config loading
  - Test package manager detection
  
- [ ] Integration tests (tests/integration/)
  - Create temp git repos in fixtures/
  - Test full command workflows
  - Test CLI end-to-end
  
- [ ] Test fixtures
  - Sample git repos with worktrees
  - Various config files
  
- [ ] Coverage
  - Target: 80%+ coverage
  - Use bun test --coverage

Acceptance Criteria:
- All services have unit tests
- Critical paths have integration tests
- Tests run with bun test
- Coverage report generated
```

**Task 4.3: Documentation & Distribution**
```
Priority: MEDIUM
Dependencies: All previous tasks
Duration: 4-6 hours

TODOs:
- [ ] Write README.md
  - Installation (global + local)
  - Quick start guide
  - Command reference
  - Configuration guide
  
- [ ] Add examples
  - Basic usage examples
  - Config examples (.wtconfig.json)
  - Hook examples
  
- [ ] Setup npm publishing
  - npm login
  - npm publish
  - Add .npmignore
  
- [ ] Add LICENSE
  - MIT recommended
  
- [ ] Final polish
  - CLI help text
  - Error messages
  - Version bump

Acceptance Criteria:
- README is comprehensive
- npm install -g works
- npx wt works
- Published to npm registry
```

### Dependency Matrix

| Task | Depends On | Blocks | Parallel With |
|------|------------|--------|---------------|
| 1.1 Project Setup | None | 1.2, 1.3 | - |
| 1.2 Config System | 1.1 | 2.1, 2.2 | 1.3 |
| 1.3 Git Service | 1.1 | 2.1, 2.2, 3.2, 3.3 | 1.2 |
| 2.1 wt list | 1.2, 1.3 | 2.2, 2.3, 3.1 | - |
| 2.2 wt create | 1.2, 1.3 | 2.3, 4.1 | 2.1 |
| 2.3 wt delete | 2.2 | 4.1 | 2.1 |
| 3.1 wt status | 2.1 | - | 3.2, 3.3 |
| 3.2 wt sync | 1.3 | - | 3.1, 3.3 |
| 3.3 wt archive | 1.3 | - | 3.1, 3.2 |
| 4.1 Auto-Setup | 2.2, 2.3 | - | 4.2 (partial) |
| 4.2 Testing | All | - | 4.1 (partial) |
| 4.3 Docs & Publish | All | - | - |

### Parallel Execution Summary

**Wave 1** (Days 1-2): Foundation
- Run 1.1 first (blocking)
- Then 1.2 and 1.3 in parallel

**Wave 2** (Days 3-5): Core Commands
- Run 2.1 first (provides worktree listing for others)
- Then 2.2 and 2.3 in parallel

**Wave 3** (Days 6-7): Extended Features
- Run 3.1, 3.2, 3.3 in parallel

**Wave 4** (Days 8-10): Polish & Distribution
- Run 4.1 first (critical for full functionality)
- Then 4.2 and 4.3

**Estimated Timeline**: 8-10 days for experienced TypeScript developer

---

## Configuration Schema

### Configuration File Format

Uses cosmiconfig to find configuration:
- `.wtconfig.json` (project root - **recommended**)
- `.config/wtconfig.json`
- `~/.wtconfig.json` (global user config)
- `wtconfig` key in `package.json`

### JSON Configuration

```json
{
  "defaultBranch": "main",
  "autoInstall": true,
  "autoCopy": true,
  "copyFiles": [
    ".env.example",
    ".env.local",
    ".env.development",
    ".editorconfig",
    ".prettierrc",
    ".eslintrc"
  ],
  "ignoreFiles": [
    ".env",
    "node_modules",
    "dist",
    "build",
    ".next"
  ],
  "hooks": {
    "postCreate": [
      "npm install",
      "npm run setup"
    ],
    "preRemove": [
      "docker compose down"
    ],
    "postRemove": [
      "npm cache clean --force"
    ]
  },
  "archive": {
    "directory": "~/.worktree-archives",
    "autoArchive": false,
    "compression": 6
  }
}
```

### Environment Variables

Hooks receive these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `WORKTREE_PATH` | Absolute path to worktree | `/Users/dev/project/feature-auth` |
| `WORKTREE_BRANCH` | Branch name | `feature/auth` |
| `WORKTREE_NAME` | Worktree folder name | `feature-auth` |
| `WORKTREE_MAIN_PATH` | Path to main worktree | `/Users/dev/project` |
| `WORKTREE_CREATED` | ISO timestamp of creation | `2026-01-31T12:00:00Z` |

### Default Configuration

```typescript
const defaultConfig: WorktreeConfig = {
  defaultBranch: 'main',
  autoInstall: true,
  autoCopy: true,
  copyFiles: ['.env.example'],
  ignoreFiles: ['.env', 'node_modules', 'dist', 'build'],
  hooks: {},
  archive: {
    directory: '~/.worktree-archives',
    autoArchive: false,
    compression: 6
  }
};
```

---

## Testing Strategy

### Test Architecture

```
tests/
├── unit/                     # Unit tests (isolated)
│   ├── services/
│   │   ├── git.test.ts
│   │   ├── config.test.ts
│   │   ├── package-manager.test.ts
│   │   └── hooks.test.ts
│   ├── utils/
│   │   ├── validation.test.ts
│   │   └── format.test.ts
│   └── commands/
│       └── (command logic tests)
├── integration/              # Integration tests
│   └── cli.test.ts          # Full CLI workflows
└── fixtures/                # Test data
    └── repos/              # Sample git repositories
```

### Testing Tools

| Tool | Purpose |
|------|---------|
| **Test Runner** | Bun's built-in test runner (`bun:test`) |
| **Assertions** | `expect` from `bun:test` |
| **Mocking** | `bun:test` mock functions |
| **Fixtures** | Real git repos in `tests/fixtures/repos/` |
| **Coverage** | `bun test --coverage` |

### Unit Testing

**Git Service Tests**:
```typescript
// tests/unit/services/git.test.ts
import { describe, it, expect, mock } from 'bun:test';
import { GitService } from '../../../src/services/git';

describe('GitService', () => {
  it('should parse worktree list', async () => {
    const git = new GitService();
    const worktrees = await git.getWorktrees();
    
    expect(worktrees).toBeArray();
    expect(worktrees[0]).toHaveProperty('path');
    expect(worktrees[0]).toHaveProperty('branch');
  });
  
  it('should create worktree', async () => {
    const git = new GitService();
    // Mock execa or use temp repo
    const result = await git.createWorktree('./test-wt', 'test-branch');
    expect(result.path).toBe('./test-wt');
  });
});
```

**Package Manager Detection Tests**:
```typescript
// tests/unit/services/package-manager.test.ts
import { describe, it, expect } from 'bun:test';
import { detectPackageManager } from '../../../src/services/package-manager';

describe('detectPackageManager', () => {
  it('should detect npm from package-lock.json', () => {
    // Create temp dir with package-lock.json
    const pm = detectPackageManager('/tmp/npm-project');
    expect(pm.name).toBe('npm');
    expect(pm.installCommand).toBe('npm install');
  });
  
  it('should detect bun from bun.lockb', () => {
    const pm = detectPackageManager('/tmp/bun-project');
    expect(pm.name).toBe('bun');
    expect(pm.installCommand).toBe('bun install');
  });
});
```

### Integration Testing

**CLI Integration Tests**:
```typescript
// tests/integration/cli.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import { setupTestRepo, cleanupTestRepo } from '../helpers';

describe('wt CLI', () => {
  let testDir: string;
  
  beforeAll(async () => {
    testDir = await setupTestRepo();
  });
  
  afterAll(async () => {
    await cleanupTestRepo(testDir);
  });
  
  it('should list worktrees', async () => {
    const result = await $`cd ${testDir} && wt list`.text();
    expect(result).toContain('main');
  });
  
  it('should create worktree', async () => {
    await $`cd ${testDir} && wt create test-feature --branch test/feature`;
    const result = await $`cd ${testDir} && wt list`.text();
    expect(result).toContain('test-feature');
  });
  
  it('should delete worktree', async () => {
    await $`cd ${testDir} && wt delete test-feature --force`;
    const result = await $`cd ${testDir} && wt list`.text();
    expect(result).not.toContain('test-feature');
  });
});
```

### Test Fixtures

Create realistic test repositories:

```
tests/fixtures/repos/
├── npm-project/           # Has package-lock.json
├── yarn-project/          # Has yarn.lock
├── pnpm-project/          # Has pnpm-lock.yaml
└── bun-project/           # Has bun.lockb
```

Each fixture:
- Initialized git repo
- Has main branch with some commits
- Has various worktrees
- Has .env.example file

### Test Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Services | 90%+ |
| Commands | 80%+ |
| Utils | 90%+ |
| Overall | 80%+ |

### Running Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test file
bun test tests/unit/services/git.test.ts

# Run in watch mode
bun test --watch
```

### CI/CD Testing

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: bun test --coverage
```

---

## Distribution & Publishing Plan

### npm Package Setup

**package.json Configuration**:

```json
{
  "name": "wt",
  "version": "0.1.0",
  "description": "Simple but powerful CLI for managing git worktrees",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "wt": "./bin/wt.js"
  },
  "files": [
    "dist/",
    "bin/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "prepublishOnly": "bun run build && bun test"
  },
  "keywords": [
    "git",
    "worktree",
    "cli",
    "developer-tools",
    "productivity"
  ],
  "author": "Your Name",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "cosmiconfig": "^9.0.0",
    "zod": "^3.22.0",
    "execa": "^8.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0"
  },
  "devDependencies": {
    "@commander-js/extra-typings": "^12.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  }
}
```

### Installation Methods

**1. Global Installation**:
```bash
npm install -g wt
# or
yarn global add wt
# or
pnpm add -g wt
# or
bun add -g wt

# Then use anywhere:
wt --version
wt list
```

**2. Project-local Installation**:
```bash
# In your project:
npm install --save-dev wt
# or
yarn add -D wt

# Use via npx:
npx wt list
npx wt create feature-auth --branch feature/auth

# Or add to package.json scripts:
{
  "scripts": {
    "wt": "wt",
    "worktree:create": "wt create"
  }
}
```

**3. One-time Usage (no install)**:
```bash
npx wt list
npx wt create my-feature
```

### Publishing Checklist

Before publishing to npm:

- [ ] Version bumped appropriately (semver)
- [ ] CHANGELOG.md updated
- [ ] All tests passing
- [ ] Build succeeds without errors
- [ ] README.md complete with examples
- [ ] LICENSE file included
- [ ] .npmignore configured (exclude src/, tests/, etc.)
- [ ] bin/wt.js has correct shebang
- [ ] package.json "files" field correct
- [ ] Login to npm: `npm login`

### Publish Commands

```bash
# Build and test
bun run build
bun test

# Version bump (choose one)
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0

# Publish
npm publish

# Or publish beta/alpha
npm publish --tag beta
```

### Post-Publish Verification

```bash
# Test global install
npm install -g wt
wt --version

# Test npx
npx wt --version

# Test in fresh project
mkdir test-project && cd test-project
git init
git commit --allow-empty -m "initial"
npx wt list
```

### Release Strategy

**Versioning** (Semantic Versioning):
- `0.1.0` - Initial release (MVP)
- `0.2.0` - Add sync command
- `0.3.0` - Add archive command
- `1.0.0` - Stable, all features complete

**Release Channels**:
- `latest` - Stable releases
- `beta` - Pre-release testing
- `next` - Development builds

### Distribution Platforms

**Primary**: npm registry

**Future Considerations**:
- Homebrew formula (for macOS users)
- AUR package (for Arch Linux)
- GitHub Releases with binaries (if compiling to native)

---

## Guardrails & Anti-Patterns

### Scope Boundaries (Must NOT Do)

**Explicitly OUT of Scope**:
1. ❌ Interactive TUI (Ink/React-based interface) - Keep it CLI-only per user requirement
2. ❌ Plugin system - Avoid complexity, keep core tool focused
3. ❌ Docker integration - Not requested, avoid feature creep
4. ❌ MCP server in v1 - Can add in future version, not required for MVP
5. ❌ Editor/AI tool launching built-in - Hooks system covers this use case
6. ❌ Bare clone workflow - Stick to standard git worktree implementation
7. ❌ Fuzzy finding/selection UI - Keep commands explicit and simple
8. ❌ Port management - Out of scope for worktree management
9. ❌ tmux integration - Terminal session management not required
10. ❌ Windows-specific features - Focus on Unix-like systems first (macOS/Linux)

### AI-Slop Patterns to Avoid

**DON'T**:
- ❌ Add 15 error checks for simple git operations
- ❌ Create 5 levels of abstraction for running shell commands
- ❌ Write JSDoc for every internal function
- ❌ Add 50 configuration options when 10 suffice
- ❌ Build a plugin architecture for a simple tool
- ❌ Implement fuzzy finding when explicit paths work fine
- ❌ Create complex progress bars for simple operations
- ❌ Add telemetry/analytics without user consent

**DO**:
- ✅ Keep commands simple and predictable
- ✅ Use git porcelain formats for reliable parsing
- ✅ Provide helpful error messages
- ✅ Follow Unix philosophy (do one thing well)
- ✅ Respect user configuration without being overwhelming

### Error Handling Principles

1. **Fail Fast**: Validate inputs immediately
2. **Clear Messages**: Explain what went wrong and how to fix
3. **Graceful Degradation**: If auto-setup fails, still create worktree
4. **No Silent Failures**: Always report errors to user

### Performance Considerations

- Cache git worktree list results within command execution
- Use `git status --porcelain` (fast) not `git status` (slow with full output)
- Run package manager install in background when possible
- Avoid unnecessary git operations

---

## Appendix: Quick Reference

### Command Cheat Sheet

```bash
# Create worktrees
wt create                    # Auto-detect name, create from main
wt create feature-auth       # Create worktree named feature-auth
wt create -b feature/auth    # Create with specific branch
wt create -B develop         # Create from develop branch

# List worktrees
wt list                      # Show all worktrees
wt list --dirty              # Show only dirty worktrees
wt list --json               # JSON output

# Delete worktrees
wt delete feature-auth       # Delete with safety checks
wt delete feature-auth -f    # Force delete
wt delete feature-auth -a    # Archive then delete

# Other commands
wt status                    # Show detailed status
wt sync                      # Sync with base branch
wt archive feature-auth      # Archive worktree
```

### Configuration Quick Start

```json
// .wtconfig.json - place in project root
{
  "defaultBranch": "main",
  "autoInstall": true,
  "copyFiles": [".env.example", ".env.local"],
  "hooks": {
    "postCreate": ["npm install", "npm run setup"]
  }
}
```

### Development Quick Start

```bash
# Setup
git clone <repo>
cd wt
bun install

# Development
bun run dev        # Watch mode
bun test           # Run tests
bun test --coverage # With coverage

# Build
bun run build

# Local testing
./bin/wt.js --version
./bin/wt.js list
```

---

## Summary

This implementation plan provides:

✅ **Tech Stack**: Bun + TypeScript + Commander.js + cosmiconfig + Zod
✅ **Features**: 6 core commands with exact behavior specifications
✅ **Architecture**: Modular design with clear data flow
✅ **Project Structure**: Organized directory layout
✅ **Implementation**: 4 waves of parallelizable tasks
✅ **Configuration**: Simple `.wtconfig.json` format
✅ **Testing**: Unit + integration test strategy with Bun test runner
✅ **Distribution**: npm publishing for both global and local usage

**Next Step**: Run `/start-work` to begin implementation with this plan.

**Estimated Effort**: 8-10 days for experienced TypeScript developer
**Risk Level**: Low (well-defined scope, proven patterns, clear architecture)
