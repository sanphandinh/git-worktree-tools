# Delete Command Refactor - Work Plan

## TL;DR

> **Quick Summary**: Refactor the delete command to support three input modes: interactive selection (no args), branch-based deletion, and path-based deletion (current behavior). Changes the CLI from `delete <path>` (required) to `delete [path]` (optional).
> 
> **Deliverables**:
> - Modified `src/cli.ts` - Change argument from required to optional
> - Refactored `src/commands/delete.ts` - Support all three scenarios
> - New helper functions in `src/commands/delete.ts` for worktree lookup and selection
> 
> **Estimated Effort**: Short (2-3 hours)
> **Parallel Execution**: NO - Single agent recommended for cohesive changes
> **Critical Path**: CLI change → Refactor delete command → Add helper functions

---

## Context

### Original Request
Refactor the delete command to support:
1. Make the path argument optional: `delete [path]` instead of `delete <path>`
2. Support 3 scenarios:
   - No input: Show interactive list of worktrees with index numbers for selection
   - Input matches branch name: Find and delete worktree by branch
   - Input is folder path: Delete by path (existing behavior)

### Interview Summary
**Key Discussions**:
- User provided clear requirements with specific scenarios
- Pattern references: follow create.ts for interactive prompts, list.ts for display
- GitService already has getWorktrees() that returns worktrees with path and branch
- Current delete.ts has validation and warning patterns to preserve

### Research Findings

**CLI Structure**:
- Uses Commander.js v12.0.0
- Commands registered in `/Users/sanphan/workspaces/git-worktree-tools/src/cli.ts`
- Current delete registration: `.command('delete <path>')` (required argument)
- Target: `.command('delete [path]')` (optional argument)

**delete.ts Current Implementation**:
- Location: `/Users/sanphan/workspaces/git-worktree-tools/src/commands/delete.ts`
- Current signature: `deleteCommand(pathArg: string, options: DeleteOptions)`
- Target signature: `deleteCommand(pathArg: string | undefined, options: DeleteOptions)`
- Uses validation and warning patterns with confirmation prompts

**Interactive Prompt Patterns** (from create.ts):
```typescript
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
};
```

**Worktree Display Patterns** (from list.ts):
```typescript
console.log(chalk.bold(`\nWorktrees (${filtered.length} total):\n`));
// Shows: branch, path, dirty status, unpushed count, age, merged status
```

**GitService Worktree Retrieval**:
- `git.getWorktrees()` returns `Promise<WorktreeInfo[]>`
- `WorktreeInfo` interface: `{ path, branch, head, isMain, isDirty, uncommittedCount, unpushedCount, isMerged, lastCommitDate }`

---

## Work Objectives

### Core Objective
Refactor the delete command to accept optional input and support interactive selection, branch-based lookup, and path-based deletion while maintaining all existing validation and safety features.

### Concrete Deliverables
- Modified `/Users/sanphan/workspaces/git-worktree-tools/src/cli.ts` - Change argument definition
- Refactored `/Users/sanphan/workspaces/git-worktree-tools/src/commands/delete.ts` - New implementation with helper functions
- All existing delete functionality preserved (force flag, archive option, hooks, warnings)

### Definition of Done
- [ ] `wt delete` (no args) shows interactive numbered list of worktrees
- [ ] User can select worktree by entering index number
- [ ] `wt delete branch-name` finds worktree by branch and deletes
- [ ] `wt delete /path/to/worktree` deletes by path (existing behavior)
- [ ] All safety checks and warnings still work
- [ ] Force flag skips all prompts
- [ ] Archive option still works
- [ ] Pre/post hooks still execute

### Must Have
- All three input scenarios working correctly
- Interactive selection with clear numbered list
- Branch name detection and lookup
- Path-based deletion (existing behavior)
- Preservation of all validation, warnings, and safety features
- Force flag to skip prompts
- Archive before delete option
- Hook execution (pre/post remove)

### Must NOT Have (Guardrails)
- No changes to other commands
- No changes to GitService
- No changes to type definitions (DeleteOptions interface)
- No breaking changes to existing path-based deletion
- No removal of safety warnings (unless --force)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (no test framework detected in project)
- **User wants tests**: NO (not mentioned)
- **Framework**: None
- **QA approach**: Manual verification via CLI commands

### Manual Verification Procedures

**Scenario 1: Interactive Selection (No Args)**
```bash
# Agent runs:
cd /Users/sanphan/workspaces/git-worktree-tools
./bin/wt.js delete
# Expected: Shows numbered list of worktrees
# Expected: Prompts "Select worktree to delete (number): "
# Enter: 1 (or appropriate number)
# Expected: Shows warnings if any, prompts for confirmation
# Enter: y
# Expected: "Worktree removed: /path/to/worktree"
```

**Scenario 2: Branch Name Input**
```bash
# Agent runs:
./bin/wt.js delete feature-branch-name
# Expected: Finds worktree with branch "feature-branch-name"
# Expected: Shows warnings if any, prompts for confirmation (or deletes if force)
# Expected: "Worktree removed: /path/to/worktree"
```

**Scenario 3: Path Input (Existing Behavior)**
```bash
# Agent runs:
./bin/wt.js delete /path/to/existing/worktree
# Expected: Validates path is a worktree
# Expected: Shows warnings if any
# Expected: "Worktree removed: /path/to/worktree"
```

**Scenario 4: Force Flag**
```bash
# Agent runs:
./bin/wt.js delete /path/to/worktree --force
# Expected: No prompts, immediate deletion
# Expected: "Worktree removed: /path/to/worktree"
```

**Scenario 5: Archive Option**
```bash
# Agent runs:
./bin/wt.js delete /path/to/worktree --archive
# Expected: Archives worktree before deletion
# Expected: "Worktree removed: /path/to/worktree"
```

**Scenario 6: Non-existent Input**
```bash
# Agent runs:
./bin/wt.js delete nonexistent-branch-or-path
# Expected: Error message: "No worktree found for 'nonexistent-branch-or-path'"
# Expected: Exit code 1
```

**Evidence to Capture**:
- [ ] Terminal output from each verification command
- [ ] Exit codes checked (0 for success, 1 for errors)

---

## Execution Strategy

### Sequential Execution (Single Agent)
This refactor involves cohesive changes across 2 files with interdependent logic. A single agent should handle all tasks sequentially to ensure consistency.

### Execution Order:
1. Modify CLI argument definition (cli.ts)
2. Refactor delete command main function (delete.ts)
3. Add helper functions (delete.ts)
4. Test all scenarios

### Agent Dispatch Summary

| Task | Recommended Agent Profile |
|------|--------------------------|
| 1-3 | Single agent with TypeScript/Node.js skills, familiarity with Commander.js patterns |

---

## TODOs

### Task 1: Modify CLI Argument Definition

**What to do**:
- Change the delete command registration from required to optional argument
- Change: `.command('delete <path>')` → `.command('delete [path]')`

**Must NOT do**:
- Do not change any other command registrations
- Do not modify option definitions (force, archive, noHooks)

**Recommended Agent Profile**:
- **Category**: quick
- **Skills**: TypeScript, Commander.js
- **Reason**: Simple CLI configuration change

**Parallelization**:
- **Can Run In Parallel**: NO - Must be done before delete.ts changes
- **Blocked By**: None (can start immediately)
- **Blocks**: Task 2 (delete.ts refactoring depends on new signature)

**References**:
- Pattern: `/Users/sanphan/workspaces/git-worktree-tools/src/cli.ts:38-44` - Current delete command registration
- Pattern: `/Users/sanphan/workspaces/git-worktree-tools/src/cli.ts:30-36` - create command uses `[path]` (optional) pattern

**Acceptance Criteria**:
- [ ] `src/cli.ts` has `.command('delete [path]')` (with square brackets)
- [ ] All other command registrations unchanged
- [ ] All option definitions unchanged

**Commit**: YES
- Message: `refactor(cli): make delete path argument optional`
- Files: `src/cli.ts`
- Pre-commit: `npm run build` passes

---

### Task 2: Refactor deleteCommand Function

**What to do**:
- Change function signature to accept optional pathArg
- Implement logic to handle three scenarios:
  1. If no pathArg: call promptForWorktreeSelection() to get selection
  2. If pathArg looks like branch: call findWorktreeByBranch()
  3. If pathArg looks like path: use existing path logic
- Preserve all existing validation, warnings, and safety checks

**Must NOT do**:
- Do not remove force flag functionality
- Do not remove archive option
- Do not remove hook execution
- Do not remove warning checks (dirty, unpushed, unmerged)

**Recommended Agent Profile**:
- **Category**: quick
- **Skills**: TypeScript, Node.js, readline
- **Reason**: Refactoring existing function with new logic branches

**Parallelization**:
- **Can Run In Parallel**: NO - Depends on Task 1 (CLI signature change)
- **Blocked By**: Task 1
- **Blocks**: None (can proceed to Task 3)

**References**:
- Current implementation: `/Users/sanphan/workspaces/git-worktree-tools/src/commands/delete.ts:25-130`
- Interactive pattern: `/Users/sanphan/workspaces/git-worktree-tools/src/commands/create.ts:26-70` (ask() wrapper)
- Worktree lookup: `/Users/sanphan/workspaces/git-worktree-tools/src/utils/validation.ts:64-68` (worktreeExists)
- Branch lookup: `/Users/sanphan/workspaces/git-worktree-tools/src/utils/validation.ts:42-56` (branchExists)

**Acceptance Criteria**:
- [ ] Function signature changed to `deleteCommand(pathArg: string | undefined, options: DeleteOptions)`
- [ ] Logic handles three scenarios (no args → interactive, branch → lookup, path → direct)
- [ ] All existing safety checks preserved (dirty, unpushed, unmerged warnings)
- [ ] Force flag still skips all prompts
- [ ] Archive option still works
- [ ] Hooks still execute (pre/post remove)

**Commit**: YES (grouped with Task 3)
- Message: `refactor(delete): support optional path and interactive selection`
- Files: `src/commands/delete.ts`
- Pre-commit: `npm run build` passes

---

### Task 3: Add Helper Functions

**What to do**:
Add four helper functions to `src/commands/delete.ts`:

1. `findWorktreeByBranch(worktrees: WorktreeInfo[], branchName: string): WorktreeInfo | undefined`
   - Search worktrees array for matching branch (case-sensitive exact match)
   - Return matching worktree or undefined

2. `findWorktreeByPath(worktrees: WorktreeInfo[], inputPath: string): WorktreeInfo | undefined`
   - Resolve input path to absolute
   - Search worktrees array for matching path
   - Return matching worktree or undefined

3. `promptForWorktreeSelection(worktrees: WorktreeInfo[]): Promise<WorktreeInfo>`
   - Display numbered list of worktrees (format: "1. branch-name (/path/to/worktree)")
   - Use readline to prompt for selection
   - Validate input is valid number within range
   - Return selected worktree
   - Handle invalid input with re-prompt

4. `isBranchName(input: string): boolean`
   - Heuristic to detect if input is branch name vs path
   - Return true if: no slashes, no leading dot/slash, looks like branch name
   - Return false if: contains "/", starts with "." or "/", is absolute path
   - Use validation.ts `isValidBranchName()` if available

**Must NOT do**:
- Do not modify exports from delete.ts (keep deleteCommand as default export)
- Do not add these helpers to other files

**Recommended Agent Profile**:
- **Category**: quick
- **Skills**: TypeScript, Node.js, readline
- **Reason**: Adding helper functions within existing file

**Parallelization**:
- **Can Run In Parallel**: NO - Part of same file as Task 2
- **Blocked By**: Task 2 (logic structure)
- **Blocks**: None

**References**:
- Table display format: `/Users/sanphan/workspaces/git-worktree-tools/src/utils/format.ts:3-19`
- Readline pattern: `/Users/sanphan/workspaces/git-worktree-tools/src/commands/create.ts:26-40`
- Validation: `/Users/sanphan/workspaces/git-worktree-tools/src/utils/validation.ts:23-26` (isValidBranchName)

**Acceptance Criteria**:
- [ ] `findWorktreeByBranch()` correctly finds worktree by exact branch match
- [ ] `findWorktreeByPath()` correctly finds worktree by resolved path match
- [ ] `promptForWorktreeSelection()` displays numbered list and returns selected worktree
- [ ] `isBranchName()` correctly distinguishes branch names from paths
- [ ] All helpers are internal to delete.ts (not exported)

**Commit**: YES (grouped with Task 2)
- Message: `refactor(delete): support optional path and interactive selection`
- Files: `src/commands/delete.ts`
- Pre-commit: `npm run build` passes

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `refactor(cli): make delete path argument optional` | src/cli.ts | npm run build |
| 2+3 | `refactor(delete): support optional path and interactive selection` | src/commands/delete.ts | npm run build |

---

## Success Criteria

### Verification Commands

```bash
# Build the project
cd /Users/sanphan/workspaces/git-worktree-tools
npm run build

# Test scenario 1: Interactive selection
./bin/wt.js delete
# Should show numbered list of worktrees

# Test scenario 2: Branch name
./bin/wt.js delete feature-branch-name
# Should find and delete worktree with that branch

# Test scenario 3: Path
./bin/wt.js delete /path/to/worktree
# Should delete worktree at that path

# Test scenario 4: Force flag
./bin/wt.js delete /path/to/worktree --force
# Should delete without prompts

# Test scenario 5: Archive
./bin/wt.js delete /path/to/worktree --archive
# Should archive before deleting
```

### Final Checklist
- [ ] CLI argument changed from `<path>` to `[path]`
- [ ] Interactive selection works (shows numbered list)
- [ ] Branch name lookup works
- [ ] Path-based deletion still works
- [ ] Force flag skips all prompts
- [ ] Archive option still works
- [ ] Hooks execute correctly
- [ ] All validation and warnings preserved
- [ ] Build passes without errors

---

## Gap Analysis Summary

### Auto-Resolved (Minor Gaps)
- **Branch vs Path Heuristic**: Will use simple heuristic (slashes = path, no slashes = potential branch) with fallback to path check
- **Display Format**: Will follow list.ts pattern showing "index. branch (path)"
- **Error Handling**: Will use existing error patterns from delete.ts

### Defaults Applied
- **Case Sensitivity**: Branch matching will be case-sensitive (matching git behavior)
- **Interactive List Display**: Will show all worktrees with index starting at 1
- **Invalid Input Handling**: Will re-prompt on invalid selection (not exit)

### Assumptions Made
1. User wants simple numbered list (1, 2, 3) not complex TUI
2. Branch name heuristic: no slashes = potential branch
3. If input could be both branch and path, try branch first (more specific)
4. Interactive mode should show all worktrees (no filtering)

---

## Implementation Notes

### Key Code Changes

**src/cli.ts - Change argument**:
```typescript
// BEFORE:
.command('delete <path>')

// AFTER:
.command('delete [path]')
```

**src/commands/delete.ts - New signature and logic**:
```typescript
// BEFORE:
export async function deleteCommand(
  pathArg: string,
  options: DeleteOptions
): Promise<void>

// AFTER:
export async function deleteCommand(
  pathArg: string | undefined,
  options: DeleteOptions
): Promise<void {
  // ... logic to handle three scenarios ...
}
```

**New Helper Functions** (add to delete.ts):
```typescript
async function findWorktreeByBranch(
  worktrees: WorktreeInfo[],
  branchName: string
): Promise<WorktreeInfo | undefined>

async function findWorktreeByPath(
  worktrees: WorktreeInfo[],
  inputPath: string
): Promise<WorktreeInfo | undefined>

async function promptForWorktreeSelection(
  worktrees: WorktreeInfo[]
): Promise<WorktreeInfo>

function isBranchName(input: string): boolean
```
