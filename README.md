# wt - Git Worktree Manager

A simple but powerful CLI tool for managing git worktrees with AI agent collaboration support.

## Features

- **Interactive Init** - Auto-detect and generate config with `wt init`
- **Smart Naming** - Auto-derives folder/branch names from each other
- **Simple CLI** - Clean, git-like interface
- **Branch-Based Operations** - Reference worktrees by branch name (e.g., `wt status feature/auth`)
- **Auto-Setup** - Automatically installs dependencies and copies env files
- **Manual Setup Command** - Run setup again for an existing worktree with `wt setup`
- **Package Manager Detection** - Supports npm, yarn, pnpm, and bun
- **Lifecycle Hooks** - Run custom scripts on create/delete
- **Branch Sync** - Keep worktrees up to date with base branch
- **Worktree Archiving** - Backup worktrees before deletion
- **Status Tracking** - See dirty status, unpushed commits, merge status

## Installation

### Global Installation

```bash
npm install -g @sanphandinh/wtre
# or
yarn global add @sanphandinh/wtre
# or
pnpm add -g @sanphandinh/wtre
# or
bun add -g @sanphandinh/wtre
```

Then use `wt` anywhere:

```bash
wt --version
wt list
```

### Project-Local Installation

```bash
npm install --save-dev @sanphandinh/wtre
# or
yarn add -D @sanphandinh/wtre
```

Use via npx:

```bash
npx wt list
npx wt create feature-branch
```

### One-time Usage (no install)

```bash
npx @sanphandinh/wtre list
npx @sanphandinh/wtre create my-feature
```

## Quick Start

```bash
# Initialize configuration for your project
wt init

# List all worktrees
wt list

# Create a new worktree (interactive mode)
wt create

# Create with folder name, derive branch from it
wt create feature-auth

# Create with branch name, derive folder from it
wt create -b feature/auth

# Create with both specified
wt create feature-auth --branch feature/auth

# Create from a different base branch
wt create -B develop

# Run setup manually for an existing worktree
wt setup feature-auth                 # By folder name
wt setup feature/auth                 # By branch name
wt setup                              # Current directory

# Check detailed status (by folder or branch name)
wt status feature-auth                # By folder name
wt status feature/auth                # By branch name

# Sync worktree with main (by folder or branch name)
wt sync feature-auth                  # By folder name
wt sync feature/auth                  # By branch name

# Archive worktree (by folder or branch name)
wt archive feature-auth               # By folder name
wt archive feature/auth               # By branch name

# Delete worktree (by folder name, branch name, or interactively)
wt delete feature-auth                # Delete by folder name
wt delete feature/auth                # Delete by branch name
wt delete                             # Interactive mode - select from list

# Archive and delete
wt delete feature-auth --archive
```

## Configuration

### Quick Setup with `wt init`

The easiest way to create a configuration file is using the interactive init command:

```bash
wt init
```

This will guide you through setting up your `.wtconfig.json` with auto-detected values.

### Manual Configuration

You can also create a `.wtconfig.json` file manually in your project root:

```json
{
  "defaultBranch": "main",
  "autoInstall": true,
  "autoCopy": true,
  "copyFiles": [".env.example", ".env.local"],
  "ignoreFiles": [".env", "node_modules"],
  "hooks": {
    "postCreate": ["npm install", "npm run dev:setup"],
    "preRemove": ["docker compose down"],
    "postRemove": ["npm cache clean"]
  },
  "archive": {
    "directory": "~/.worktree-archives",
    "compression": 6
  }
}
```

### Auto-Detection

`wt` automatically detects certain configuration values from your repository:

| Config | Auto-Detection | Priority |
|--------|---------------|----------|
| `defaultBranch` | Detected from `origin/HEAD` or falls back to checking for `main`/`master` branches | User config > Auto-detected > `"main"` |
| `ignoreFiles` | Parsed from `.gitignore` if present | User config > Auto-detected > Default list |

This means you often don't need to specify these values in your config file - `wt` will figure them out automatically.

### Config File Locations

Config is searched in this order:
1. `.wtconfig.json` (project root)
2. `.config/wtconfig.json`
3. `~/.wtconfig.json` (global)
4. `wtconfig` key in `package.json`

**Priority order:** User config > Auto-detected values > Default values

## Commands

### `wt list`

List all worktrees with status information.

```bash
wt list                    # Show all worktrees
wt list --dirty            # Show only dirty worktrees
wt list --stale            # Show only stale worktrees (>30 days)
wt list --merged           # Show only merged worktrees
wt list --json             # JSON output
wt list --porcelain        # Machine-readable output
```

### `wt create [path]`

Create a new worktree with smart name derivation.

#### Usage Patterns

**1. Interactive Mode (neither folder nor branch specified)**
```bash
wt create
# Prompts for folder name and branch name
```

**2. Path Only (derive branch from folder name)**
```bash
wt create feature-auth
# Creates folder: feature-auth
# Creates branch: feature/auth (derived from folder name)
```

**3. Branch Only (derive folder from branch name)**
```bash
wt create -b feature/auth
# Creates folder: feature-auth (derived from branch name)
# Creates branch: feature/auth
```

**4. Both Specified (use as-is)**
```bash
wt create my-folder --branch feature/auth
# Creates folder: my-folder
# Creates branch: feature/auth
```

#### Options

```bash
wt create [path] [options]

Options:
  -b, --branch <name>       Branch name (creates if doesn't exist)
  -B, --branch-from <name>  Base branch to create from (default: main)
  --no-install             Skip dependency installation
  --no-hooks               Skip post-create hooks
  --dry-run                Preview what would be done without executing
```

#### Examples

```bash
# Create from main with auto-derived names
wt create fix-login-bug

# Create from develop branch with specific branch name
wt create -b feature/new-api -B develop

# Dry run to preview what would be created
wt create feature-auth --dry-run

# Skip auto-setup
wt create feature-auth --no-install --no-hooks
```

#### Smart Name Conversion

When deriving names, `wt` automatically converts between folder and branch formats:

| Folder Name | Derived Branch |
|-------------|----------------|
| `feature-auth` | `feature/auth` |
| `fix-bug-123` | `fix/bug-123` |
| `release-v1.0.0` | `release/v1.0.0` |
| `main` | `main` |

| Branch Name | Derived Folder |
|-------------|----------------|
| `feature/auth` | `feature-auth` |
| `hotfix/urgent` | `hotfix-urgent` |
| `release/v1.0.0` | `release-v1.0.0` |
| `main` | `main` |

#### Validation & Error Handling

The `create` command validates inputs before executing:

```bash
# Error: Branch already exists
$ wt create feature-auth
✗ Branch "feature/auth" already exists locally
Suggestion: Use "wt create feature-auth feature/auth" to create a worktree from existing branch

# Error: Path already exists
$ wt create existing-folder
✗ Path already exists: /path/to/existing-folder
Suggestion: Choose a different name or remove the existing directory

# Error: Worktree already exists at path
$ wt create ../existing-worktree
✗ A worktree already exists at "/path/to/existing-worktree"
Suggestion: Choose a different path or remove the existing worktree first with "wt delete [path]"
```

### `wt setup [path]`

Run first-time setup tasks for an existing worktree (without creating one).

This command uses the same setup flow as `wt create`:
- install dependencies (based on lockfile detection)
- copy configured files (like env files)
- run `hooks.postCreate`

```bash
wt setup                              # Setup current directory
wt setup feature-auth                 # Setup by folder name
wt setup feature/auth                 # Setup by branch name
```

#### Options

```bash
wt setup [path] [options]

Options:
  --no-install             Skip dependency installation
  --no-copy                Skip environment file copying
  --no-hooks               Skip post-create hooks
  --dry-run                Preview what would be done without executing
```

#### Examples

```bash
# Setup current worktree after manual git worktree add
wt setup

# Setup another worktree from main directory
wt setup feature/auth

# Copy env files and run hooks, but skip install
wt setup feature-auth --no-install
```

### `wt delete [path]`

Remove a worktree safely. You can specify the worktree by **folder name**, **branch name**, or use **interactive mode** to select from a list.

#### Usage Patterns

**1. Interactive Mode (no argument)**
```bash
wt delete
# Shows numbered list of all worktrees
# Enter number to select which worktree to delete
```

**2. Delete by Folder Name**
```bash
wt delete feature-auth                    # Delete worktree by folder name
wt delete ../my-project/feature-auth      # Delete by full/relative path
```

**3. Delete by Branch Name**
```bash
wt delete feature/auth                    # Delete worktree checked out to branch "feature/auth"
wt delete fix/login-bug                   # Delete by branch name (works with namespaced branches like fix/login-bug)
```

#### Options

```bash
wt delete [path] [options]

Options:
  -f, --force            Skip safety checks (dirty, unpushed, unmerged warnings)
  -a, --archive          Archive worktree before deleting
  --no-hooks             Skip pre/post-remove hooks
```

#### Examples

```bash
# Interactive selection from list
wt delete

# Delete by folder name (with safety checks)
wt delete feature-auth

# Delete by branch name
wt delete feature/auth

# Force delete without confirmation prompts
wt delete feature-auth --force

# Archive before deleting
wt delete feature-auth --archive

# Delete without running hooks
wt delete feature-auth --no-hooks

# Combine options
wt delete feature-auth --archive --force
```

#### How Branch vs Path Detection Works

The command automatically determines whether your input is a **branch name** or **path**:

| Input Pattern | Treated As | Example |
|--------------|------------|---------|
| Starts with `/`, `./`, `../`, or `~` | Path | `../feature-auth`, `/home/user/project` |
| Contains `/` but matches common branch patterns (feature/, fix/, hotfix/, etc.) | Branch | `feature/auth`, `fix/login` |
| Simple name without `/` | Branch | `main`, `develop` |
| Folder-style names with `-` | Path | `feature-auth` → folder name |

If the input matches a branch name, the worktree checked out to that branch will be selected. If no branch match is found, it's treated as a path.

> **Note:** This branch-vs-path detection pattern applies to all commands that accept a worktree identifier: `setup`, `delete`, `status`, `sync`, and `archive`.

### `wt init`

Initialize a `.wtconfig.json` configuration file for your project with interactive prompts.

```bash
wt init
```

This command will:
1. Check if you're in a git repository
2. Auto-detect your default branch (from `origin/HEAD` or main/master)
3. Find environment example files (.env.example, .env.local.example, etc.)
4. Interactively prompt you for:
   - Default base branch
   - Auto-install dependencies setting
   - Auto-copy environment files setting
   - Archive directory location
   - Lifecycle hooks setup (optional)

#### Auto-Detection

The `init` command automatically detects and suggests:

| Setting | Detection Method |
|---------|-----------------|
| `defaultBranch` | From `origin/HEAD` or checks for main/master branches |
| `copyFiles` | Scans for .env.example, .env.local.example, .env.sample, etc. |
| `autoInstall` | Checks for package.json presence |

#### Example Output

```bash
$ wt init

🌳 Worktree Configuration Setup
Answer the following questions to generate your .wtconfig.json

Default base branch [main]:
Auto-install dependencies when creating worktrees? [Y/n]: y
Auto-copy environment files to new worktrees? [Y/n]: y
  Detected env files: .env.example
  Additional files to copy (comma-separated, optional):
Archive directory [~/.worktree-archives]:
Setup lifecycle hooks? [y/N]: n

✓ Configuration file created successfully!
  Path: /path/to/your/project/.wtconfig.json

Generated configuration:
{
  "defaultBranch": "main",
  "autoCopy": true,
  "copyFiles": [".env.example"]
}

You can edit this file anytime to customize your worktree settings.
```

#### Protection Against Overwrites

If `.wtconfig.json` already exists, the command will warn you and exit:

```bash
$ wt init

⚠️  Configuration file already exists:
   /path/to/your/project/.wtconfig.json

Options:
  1. Backup and create new: wt init --force
  2. Edit existing file manually

Use --force to overwrite the existing configuration.
```

### `wt status [path]`

Show detailed status of a worktree. You can specify the worktree by **folder name** or **branch name**.

```bash
wt status                                 # Status of current directory
wt status feature-auth                    # Status by folder name
wt status feature/auth                    # Status by branch name
```

### `wt sync [path]`

Sync worktree with base branch. You can specify the worktree by **folder name** or **branch name**.

```bash
wt sync                                   # Sync current worktree
wt sync feature-auth                      # Sync by folder name
wt sync feature/auth                      # Sync by branch name
wt sync --merge                           # Use merge instead of rebase
wt sync --no-fetch                        # Skip fetching remote
```

### `wt archive <path>`

Archive a worktree. You can specify the worktree by **folder name** or **branch name**.

```bash
wt archive feature-auth                   # Archive by folder name
wt archive feature/auth                   # Archive by branch name
wt archive feature-auth -o backup.tar.gz  # Custom output path
```

## Hook Environment Variables

When hooks execute, these environment variables are available:

| Variable | Description |
|----------|-------------|
| `WORKTREE_PATH` | Absolute path to worktree |
| `WORKTREE_BRANCH` | Branch name |
| `WORKTREE_NAME` | Worktree folder name |
| `WORKTREE_MAIN_PATH` | Path to main worktree |
| `WORKTREE_CREATED` | ISO timestamp of creation |

Example hook:

```json
{
  "hooks": {
    "postCreate": [
      "echo 'Created $WORKTREE_BRANCH at $WORKTREE_PATH'"
    ]
  }
}
```

## Use Cases

### Parallel AI Agent Development

Run multiple AI agents on different branches simultaneously:

```bash
# Agent 1: Feature development (just folder name - branch derived)
wt create feature-auth

# Agent 2: Bug fix (just branch name - folder derived)
wt create -b fix/login-bug

# Agent 3: Code review (both specified)
wt create review-pr-123 --branch pr-123
```

Each agent has an isolated environment with its own dependencies.

### Safe Experimentation

Test risky changes in isolation:

```bash
wt create experiment-refactor
# Try big refactor here
# If it fails: wt delete experiment-refactor --force
```

### Context Switching

Switch between features without stashing:

```bash
# Work on feature A
cd ../feature-a
# ... make changes ...

# Switch to feature B
cd ../feature-b
# ... make changes ...

# Check status of all
wt list
```

## Requirements

- Node.js >= 18
- Git >= 2.5 (for worktree support)

## License

MIT
