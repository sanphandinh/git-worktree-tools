# wt - Git Worktree Manager

A simple but powerful CLI tool for managing git worktrees with AI agent collaboration support.

## Features

- **Simple CLI** - Clean, git-like interface
- **Auto-Setup** - Automatically installs dependencies and copies env files
- **Package Manager Detection** - Supports npm, yarn, pnpm, and bun
- **Lifecycle Hooks** - Run custom scripts on create/delete
- **Branch Sync** - Keep worktrees up to date with base branch
- **Worktree Archiving** - Backup worktrees before deletion
- **Status Tracking** - See dirty status, unpushed commits, merge status

## Installation

### Global Installation

```bash
npm install -g wt
# or
yarn global add wt
# or
pnpm add -g wt
# or
bun add -g wt
```

Then use `wt` anywhere:

```bash
wt --version
wt list
```

### Project-Local Installation

```bash
npm install --save-dev wt
# or
yarn add -D wt
```

Use via npx:

```bash
npx wt list
npx wt create feature-branch
```

### One-time Usage (no install)

```bash
npx wt list
npx wt create my-feature
```

## Quick Start

```bash
# List all worktrees
wt list

# Create a new worktree from main
wt create feature-auth --branch feature/auth

# Create worktree with auto-detected name
wt create

# Check detailed status
wt status feature-auth

# Sync worktree with main
wt sync feature-auth

# Archive and delete
wt delete feature-auth --archive
```

## Configuration

Create a `.wtconfig.json` file in your project root:

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

Config is searched in this order:
1. `.wtconfig.json` (project root)
2. `.config/wtconfig.json`
3. `~/.wtconfig.json` (global)
4. `wtconfig` key in `package.json`

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

Create a new worktree.

```bash
wt create feature-auth                    # Create from main
wt create -b feature/auth                 # Create with specific branch
wt create -B develop                      # Create from develop branch
wt create --no-install                    # Skip dependency installation
wt create --dry-run                       # Preview what would be done
```

### `wt delete <path>`

Remove a worktree safely.

```bash
wt delete feature-auth                    # Delete with safety checks
wt delete feature-auth --force            # Skip safety checks
wt delete feature-auth --archive          # Archive before deleting
```

### `wt status [path]`

Show detailed status of a worktree.

```bash
wt status                                 # Status of current directory
wt status feature-auth                    # Status of specific worktree
```

### `wt sync [path]`

Sync worktree with base branch.

```bash
wt sync                                   # Sync current worktree
wt sync feature-auth                      # Sync specific worktree
wt sync --merge                           # Use merge instead of rebase
wt sync --no-fetch                        # Skip fetching remote
```

### `wt archive <path>`

Archive a worktree.

```bash
wt archive feature-auth                   # Archive to default location
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
# Agent 1: Feature development
wt create feature-auth --branch feature/auth

# Agent 2: Bug fix  
wt create fix-login --branch fix/login-bug

# Agent 3: Code review
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
