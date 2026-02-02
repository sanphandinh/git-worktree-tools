# Work Plan: Refactor wt create Command

## TL;DR

> **Objective**: Fix branch/folder naming logic in `wt create` command to intelligently derive names when only one is provided, add interactive prompts for ambiguous cases, and implement proper validation with helpful error messages.
>
> **Deliverables**:
> - `src/utils/paths.ts` - New conversion utilities (`sanitizeBranchToFolder`, `sanitizeFolderToBranch`)
> - `src/utils/validation.ts` - Enhanced validation with `worktreeExists`, branch/folder conflict detection
> - `src/commands/create.ts` - Refactored logic handling 4 scenarios with pre-flight checks
> - `src/types/index.ts` - Types for interactive prompt responses
> - `tests/unit/utils/paths.test.ts` - Unit tests for path utilities
> - `tests/unit/commands/create.test.ts` - Integration tests for create command
> - `README.md` - Updated examples and documentation
>
> **Estimated Effort**: Medium (~2-3 hours)
> **Parallel Execution**: YES - 4 Waves
> **Critical Path**: Task 1 → Task 4 → Task 5 → Task 9

---

## Context

### Current Issues

**Issue 1**: `wt create feature-auth` creates folder `feature-auth` but generates random branch `feature/1a2b3c4d` instead of deriving from folder name.

**Issue 2**: `wt create -b feature/auth` creates nested folders `./parent/feat/auth` because branch contains `/`. Should encode to safe folder name like `feature-auth`.

**Issue 3**: `wt create -B develop` randomizes BOTH folder and branch when neither is clearly specified. Should interactively ask user for clarification.

### Current Implementation

Located in `src/commands/create.ts` (lines 12-166):
- **Line 33-35**: When no pathArg, generates `wt-${timestamp}` folder
- **Line 43**: When no branch option, generates `feature/${timestamp}` branch
- **Line 31**: No sanitization - branch with `/` creates nested folders
- No pre-flight validation for existing branches/folders

### Existing Utilities

- `src/utils/paths.ts` (25 lines): Basic path utilities but no conversion functions
- `src/utils/validation.ts` (34 lines): Has `isValidBranchName()` but no existence checks
- `src/services/git.ts`: Already has `branchExists()` method

---

## Work Objectives

### Core Objective
Implement intelligent branch/folder name derivation and validation to eliminate random naming, prevent nested folder creation from branch names, and provide clear interactive prompts only when absolutely necessary.

### Concrete Deliverables
1. **Path Conversion Utilities** (`src/utils/paths.ts`)
   - `sanitizeBranchToFolder(branch: string): string` - Converts branch to safe folder name
   - `sanitizeFolderToBranch(folder: string): string` - Converts folder to branch name

2. **Enhanced Validation** (`src/utils/validation.ts`)
   - `worktreeExists(git: GitService, path: string): Promise<boolean>`
   - `validateBranchAvailable(git: GitService, branch: string): Promise<{ valid: boolean; suggestion?: string }>`
   - `validateFolderAvailable(path: string): Promise<{ valid: boolean; suggestion?: string }>`

3. **Refactored Create Command** (`src/commands/create.ts`)
   - Handle 4 scenarios: (both provided, only path, only branch, neither)
   - Pre-flight checks before any git operations
   - Interactive prompts using stdin/stdout (no external libs)
   - Enhanced dry-run preview

4. **Type Definitions** (`src/types/index.ts`)
   - `PromptResponse` type for interactive inputs
   - `CreateValidationResult` type for validation results

5. **Test Coverage**
   - `tests/unit/utils/paths.test.ts` - New file with comprehensive path utility tests
   - `tests/unit/commands/create.test.ts` - New file with create command integration tests
   - Updated `tests/unit/utils/validation.test.ts` - Add validation tests

6. **Documentation** (`README.md`)
   - Updated `wt create` examples showing new behavior
   - Document branch/folder derivation logic

### Definition of Done
- [ ] All 4 scenarios (both, only-path, only-branch, neither) work correctly
- [ ] Branch `feature/auth` → Folder `feature-auth` (no nested folders)
- [ ] Folder `feature-auth` → Branch `feature-auth` (or `feature/auth` with convention)
- [ ] Interactive prompts only appear when neither path nor branch provided
- [ ] Validation catches conflicts before any git operations
- [ ] All tests pass: `bun test` shows 0 failures
- [ ] README updated with new examples

### Must Have
- Branch/folder conversion utilities with `/` → `-` transformation
- Pre-flight validation showing helpful error messages
- Interactive prompts using native stdin/stdout (no new dependencies)
- Non-interactive by default (only prompt when ambiguous)
- 100% test coverage for new utilities

### Must NOT Have (Guardrails)
- External prompt libraries (inquirer.js, prompts, enquirer)
- Changes to other commands (list, delete, sync, status, archive)
- Complex UI/UX beyond simple prompts
- Breaking changes to existing flag behaviors
- Automatic branch creation without user confirmation
- Git workflow or hook system modifications

---

## Verification Strategy

### Test Infrastructure Assessment
- **Infrastructure exists**: YES - bun test already configured
- **User wants tests**: Tests-after (existing infrastructure, add tests after implementation)
- **Framework**: bun test (built-in)
- **QA approach**: Automated unit + integration tests with manual CLI verification

### Automated Verification Plan

**Wave 1-3 Tasks (Implementation + Unit Tests):**
Each task includes test execution as acceptance criteria:
- Unit tests run with: `bun test tests/unit/utils/paths.test.ts`
- Expected: All tests pass (no failures)

**Wave 4-5 Tasks (Integration + CLI Verification):**
- Integration tests run with: `bun test tests/unit/commands/create.test.ts`
- CLI manual verification (documented in task):
  ```bash
  # Build the CLI
  bun run build
  
  # Test scenario 1: Only path provided
  ./bin/wt.js create test-feature --dry-run
  # Expected: Shows branch derived from folder "test-feature"
  
  # Test scenario 2: Only branch provided  
  ./bin/wt.js create -b feature/test-branch --dry-run
  # Expected: Shows folder "feature-test-branch" (sanitized)
  ```

**Final Verification (Task 9):**
```bash
# Run full test suite
bun test

# Expected output:
# tests/unit/utils/paths.test.ts:
#   sanitizeBranchToFolder ...
#   sanitizeFolderToBranch ...
# tests/unit/utils/validation.test.ts:
#   worktreeExists ...
#   validateBranchAvailable ...
# tests/unit/commands/create.test.ts:
#   create command scenarios ...
#
# Total: XX tests passed
```

### Evidence Requirements
- [ ] Test output showing all unit tests pass
- [ ] Test output showing integration tests pass
- [ ] CLI dry-run output showing correct branch/folder derivation
- [ ] Screenshot/log of interactive prompt behavior (if testable)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - No Dependencies):
├── Task 1: Add path conversion utilities (src/utils/paths.ts)
├── Task 2: Add validation enhancements (src/utils/validation.ts)
└── Task 3: Add prompt types (src/types/index.ts)
    ↓ (All complete)

Wave 2 (After Wave 1):
├── Task 4: Refactor create command logic (src/commands/create.ts)
│   └── Depends on: Task 1, Task 2, Task 3
└── Task 5: Create integration tests (tests/unit/commands/create.test.ts)
    └── Depends on: Task 4
    ↓ (Both complete)

Wave 3 (After Wave 2):
├── Task 6: Create paths unit tests (tests/unit/utils/paths.test.ts)
│   └── Depends on: Task 1
└── Task 7: Update validation tests (tests/unit/utils/validation.test.ts)
    └── Depends on: Task 2
    ↓ (Both complete)

Wave 4 (After Wave 3):
└── Task 8: Update README documentation
    ↓ (Complete)

Wave 5 (Final):
└── Task 9: Final verification and commit
    └── Depends on: Task 5, Task 6, Task 7, Task 8
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 (Path utils) | None | 4, 6 | 2, 3 |
| 2 (Validation) | None | 4, 7 | 1, 3 |
| 3 (Types) | None | 4 | 1, 2 |
| 4 (Create refactor) | 1, 2, 3 | 5 | None |
| 5 (Integration tests) | 4 | 9 | None |
| 6 (Paths tests) | 1 | 9 | 7 |
| 7 (Validation tests) | 2 | 9 | 6 |
| 8 (README) | None | 9 | 1-7 (independent) |
| 9 (Final) | 5, 6, 7, 8 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Category + Skills |
|------|-------|------------------------------|
| 1 | 1, 2, 3 | `quick` or `unspecified-low` - straightforward utility additions |
| 2 | 4, 5 | `unspecified-high` or `quick` - requires understanding existing patterns |
| 3 | 6, 7 | `quick` - test writing, straightforward |
| 4 | 8 | `writing` - documentation |
| 5 | 9 | `quick` - verification and commit |

---

## TODOs

### Task 1: Add Path Conversion Utilities

**What to do:**
Add two new functions to `src/utils/paths.ts`:
1. `sanitizeBranchToFolder(branch: string): string` - Convert branch name to safe folder name
   - Replace `/` with `-`
   - Remove invalid filesystem characters (`<>:"\|?*`)
   - Handle edge cases (empty, only special chars)
   - Return sanitized string

2. `sanitizeFolderToBranch(folder: string): string` - Convert folder name to branch name
   - Basic transformation (folder name as-is)
   - Optional: Detect conventions (e.g., `feature-xxx` → `feature/xxx`)
   - Ensure result passes `isValidBranchName()`

**Must NOT do:**
- Add external dependencies
- Modify existing functions (only add new ones)
- Handle complex naming conventions (keep simple by default)

**Recommended Agent Profile:**
- **Category**: `quick` - Simple utility functions, clear requirements
- **Skills**: None required

**Parallelization:**
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 2, 3)
- **Blocks**: Task 4, Task 6
- **Blocked By**: None

**References:**
- **Pattern Reference**: `src/utils/paths.ts:1-25` - Follow existing patterns
- **Validation Reference**: `src/utils/validation.ts:22-25` - `isValidBranchName()` function
- **Test Reference**: `tests/unit/utils/validation.test.ts:6-18` - Test structure pattern

**Acceptance Criteria:**
- [ ] `sanitizeBranchToFolder('feature/auth')` returns `'feature-auth'`
- [ ] `sanitizeBranchToFolder('hotfix/urgent!')` returns `'hotfix-urgent'` (removes `!`)
- [ ] `sanitizeFolderToBranch('feature-auth')` returns `'feature-auth'`
- [ ] Edge cases handled: empty string, only special chars, multiple slashes
- [ ] `bun test tests/unit/utils/paths.test.ts` → PASS (after Task 6)

**Commit**: YES (single utility commit)
- Message: `feat(utils): add branch/folder name conversion utilities`
- Files: `src/utils/paths.ts`
- Pre-commit: `bun run build` (verify compiles)

---

### Task 2: Add Validation Enhancements

**What to do:**
Add to `src/utils/validation.ts`:
1. `worktreeExists(git: GitService, path: string): Promise<boolean>`
   - Use `git.getWorktrees()` to check if path already registered
   - Return true if path is an existing worktree

2. `validateBranchAvailable(git: GitService, branch: string): Promise<{ valid: boolean; suggestion?: string }>`
   - Check if branch exists using `git.branchExists()`
   - If exists, suggest alternative (e.g., `feature-auth-2`)
   - Return validation result with optional suggestion

3. `validateFolderAvailable(path: string): Promise<{ valid: boolean; suggestion?: string }>`
   - Check if folder exists using `pathExists()`
   - If exists, suggest alternative name
   - Return validation result

**Must NOT do:**
- Change existing validation functions
- Add external dependencies
- Perform git operations beyond checking existence

**Recommended Agent Profile:**
- **Category**: `quick` - Clear utility additions
- **Skills**: None required

**Parallelization:**
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 3)
- **Blocks**: Task 4, Task 7
- **Blocked By**: None

**References:**
- **Pattern Reference**: `src/utils/validation.ts:1-34` - Follow existing patterns
- **GitService Reference**: `src/services/git.ts:102-109` - `branchExists()` method
- **Worktree List Reference**: `src/services/git.ts:31-34` - `getWorktrees()` method
- **Existing Validation**: `src/utils/validation.ts:4-11` - `pathExists()` pattern

**Acceptance Criteria:**
- [ ] `worktreeExists()` correctly detects if path is registered worktree
- [ ] `validateBranchAvailable()` returns `{ valid: false, suggestion: '...' }` for existing branch
- [ ] `validateFolderAvailable()` returns `{ valid: false, suggestion: '...' }` for existing folder
- [ ] Suggestions are helpful and based on input name
- [ ] `bun test tests/unit/utils/validation.test.ts` → PASS (after Task 7)

**Commit**: YES (group with Task 1)
- Message: `feat(utils): add worktree and branch availability validation`
- Files: `src/utils/validation.ts`
- Pre-commit: `bun run build`

---

### Task 3: Add Prompt Types

**What to do:**
Add types to `src/types/index.ts`:
1. `PromptResponse` interface:
   ```typescript
   export interface PromptResponse {
     folderName: string;
     branchName: string;
   }
   ```

2. `CreateValidationResult` interface:
   ```typescript
   export interface CreateValidationResult {
     valid: boolean;
     error?: string;
     suggestion?: string;
   }
   ```

**Must NOT do:**
- Modify existing types unnecessarily
- Add types not used in create command

**Recommended Agent Profile:**
- **Category**: `quick` - Simple type additions
- **Skills**: None required

**Parallelization:**
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2)
- **Blocks**: Task 4
- **Blocked By**: None

**References:**
- **Pattern Reference**: `src/types/index.ts:39-45` - `CreateOptions` interface pattern
- **Existing Types**: `src/types/index.ts:1-80` - All existing types

**Acceptance Criteria:**
- [ ] Types added without breaking existing code
- [ ] `bun run build` compiles successfully

**Commit**: YES (group with Tasks 1-2)
- Message: `feat(types): add prompt and validation result types`
- Files: `src/types/index.ts`
- Pre-commit: `bun run build`

---

### Task 4: Refactor Create Command Logic

**What to do:**
Completely refactor `src/commands/create.ts` to handle 4 scenarios:

**New Flow:**
1. **Parse & Determine Intent** (lines 12-50):
   - Determine which scenario:
     - Scenario A: Both path and branch provided → use as-is
     - Scenario B: Only path provided → derive branch from path
     - Scenario C: Only branch provided → derive path from branch
     - Scenario D: Neither provided → interactive prompt

2. **Pre-flight Validation** (lines 50-80):
   - Validate branch name format
   - Check if branch exists (using new validation functions)
   - Check if folder exists
   - Show helpful errors with suggestions if conflicts

3. **Interactive Prompts** (Scenario D only, lines 80-110):
   - Use `process.stdin`/`process.stdout` for prompts
   - Prompt: "Enter folder name:"
   - Prompt: "Enter branch name:"
   - Validate inputs

4. **Preview & Confirmation** (lines 110-130):
   - Show dry-run preview (enhanced from current)
   - If not dry-run, proceed with creation

5. **Execute** (lines 130-166):
   - Existing worktree creation logic (preserve current)

**Key Implementation Details:**
- Import new utilities: `sanitizeBranchToFolder`, `sanitizeFolderToBranch`
- Import new validation: `validateBranchAvailable`, `validateFolderAvailable`, `worktreeExists`
- Add helper function `promptUser(question: string): Promise<string>` for stdin prompts
- Keep all existing post-create logic (install, hooks, etc.)

**Must NOT do:**
- Use external prompt libraries
- Remove existing functionality (hooks, install, etc.)
- Change flag meanings or defaults
- Skip validation steps

**Recommended Agent Profile:**
- **Category**: `unspecified-high` or `quick` - Requires careful refactoring of main command
- **Skills**: None required, but needs to understand existing patterns

**Parallelization:**
- **Can Run In Parallel**: NO
- **Blocks**: Task 5
- **Blocked By**: Task 1, Task 2, Task 3

**References:**
- **Current Implementation**: `src/commands/create.ts:12-166` - Full current logic
- **CLI Pattern**: `src/cli.ts:28-36` - How create command is registered
- **Validation Usage**: `src/commands/create.ts:46-49` - Current validation pattern
- **GitService Usage**: `src/commands/create.ts:64-70` - Worktree creation pattern
- **Dry Run Pattern**: `src/commands/create.ts:51-58` - Current dry-run implementation

**Acceptance Criteria:**
- [ ] Scenario A: `wt create my-folder -b my-branch` uses both as-is
- [ ] Scenario B: `wt create feature-auth` derives branch from folder
- [ ] Scenario C: `wt create -b feature/test` sanitizes folder to `feature-test`
- [ ] Scenario D: `wt create -B develop` prompts for both folder and branch
- [ ] Pre-flight validation catches conflicts before git operations
- [ ] Dry-run shows correct preview for all scenarios
- [ ] Interactive prompts work with stdin/stdout
- [ ] `bun run build` compiles without errors

**Manual Verification Commands:**
```bash
# Build
bun run build

# Test Scenario A - Both provided
./bin/wt.js create test-folder -b test-branch --dry-run
# Expected: Path=test-folder, Branch=test-branch

# Test Scenario B - Only path
./bin/wt.js create feature-auth --dry-run
# Expected: Path=feature-auth, Branch=feature-auth (derived)

# Test Scenario C - Only branch (sanitized)
./bin/wt.js create -b feature/my-branch --dry-run
# Expected: Path=feature-my-branch (no nested folders), Branch=feature/my-branch

# Test Scenario D - Neither (interactive)
echo -e "my-folder\nmy-branch" | ./bin/wt.js create -B develop --dry-run
# Expected: Prompts for folder and branch, uses provided values
```

**Commit**: YES (major refactor commit)
- Message: `feat(create): refactor create command with smart branch/folder inference`
- Files: `src/commands/create.ts`
- Pre-commit: `bun run build`

---

### Task 5: Create Integration Tests for Create Command

**What to do:**
Create `tests/unit/commands/create.test.ts`:
1. Test all 4 scenarios:
   - Both provided
   - Only path
   - Only branch (with sanitization)
   - Neither (mock interactive prompts)

2. Test validation:
   - Branch exists error
   - Folder exists error
   - Invalid branch name error

3. Test dry-run:
   - Verify dry-run doesn't create worktree
   - Verify correct output

4. Test edge cases:
   - Branch with special characters
   - Folder with nested paths
   - Empty inputs (if applicable)

**Mocking Strategy:**
- Mock `GitService` methods
- Mock stdin for interactive prompts
- Use temporary directories for path tests

**Must NOT do:**
- Actually create git worktrees in tests (mock git operations)
- Test post-create logic (install, hooks) - that's separate
- Add external test dependencies

**Recommended Agent Profile:**
- **Category**: `quick` - Test writing
- **Skills**: None required

**Parallelization:**
- **Can Run In Parallel**: NO
- **Blocks**: Task 9
- **Blocked By**: Task 4

**References:**
- **Test Pattern**: `tests/unit/utils/validation.test.ts` - Existing test structure
- **Mocking**: bun test has built-in mocking via `mock()`
- **Create Command**: `src/commands/create.ts` - Test this logic

**Acceptance Criteria:**
- [ ] All 4 scenarios have test coverage
- [ ] Validation error cases tested
- [ ] Dry-run behavior tested
- [ ] `bun test tests/unit/commands/create.test.ts` → PASS (all tests)

**Commit**: YES (group with Task 4)
- Message: `test(create): add integration tests for create command scenarios`
- Files: `tests/unit/commands/create.test.ts`
- Pre-commit: `bun test`

---

### Task 6: Create Unit Tests for Path Utilities

**What to do:**
Create `tests/unit/utils/paths.test.ts`:
1. Test `sanitizeBranchToFolder()`:
   - `feature/auth` → `feature-auth`
   - `hotfix/urgent!` → `hotfix-urgent`
   - `bugfix/test-123` → `bugfix-test-123`
   - Multiple slashes: `a/b/c` → `a-b-c`
   - Special chars: `test<>:"\|?*` → `test`
   - Edge cases: empty, only slashes, only special chars

2. Test `sanitizeFolderToBranch()`:
   - `feature-auth` → `feature-auth`
   - `my_branch` → `my_branch`
   - Invalid chars handled gracefully
   - Result passes `isValidBranchName()`

**Must NOT do:**
- Skip edge cases
- Use external test libraries

**Recommended Agent Profile:**
- **Category**: `quick` - Test writing
- **Skills**: None required

**Parallelization:**
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 7)
- **Blocks**: Task 9
- **Blocked By**: Task 1

**References:**
- **Test Pattern**: `tests/unit/utils/validation.test.ts:1-39` - Follow this pattern
- **Implementation**: `src/utils/paths.ts` (from Task 1) - Test these functions

**Acceptance Criteria:**
- [ ] All conversion cases tested
- [ ] Edge cases covered
- [ ] `bun test tests/unit/utils/paths.test.ts` → PASS (all tests)

**Commit**: YES (group with Task 1)
- Message: `test(utils): add unit tests for path conversion utilities`
- Files: `tests/unit/utils/paths.test.ts`
- Pre-commit: `bun test`

---

### Task 7: Update Validation Tests

**What to do:**
Update `tests/unit/utils/validation.test.ts`:
1. Add tests for `worktreeExists()`:
   - Returns true for existing worktree path
   - Returns false for non-worktree path
   - Returns false for non-existent path

2. Add tests for `validateBranchAvailable()`:
   - Returns valid=true for new branch
   - Returns valid=false with suggestion for existing branch
   - Suggestion format is correct

3. Add tests for `validateFolderAvailable()`:
   - Returns valid=true for new folder
   - Returns valid=false with suggestion for existing folder
   - Suggestion format is correct

**Must NOT do:**
- Remove existing tests
- Break existing test structure

**Recommended Agent Profile:**
- **Category**: `quick` - Test writing
- **Skills**: None required

**Parallelization:**
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 6)
- **Blocks**: Task 9
- **Blocked By**: Task 2

**References:**
- **Current Tests**: `tests/unit/utils/validation.test.ts:1-39` - Existing tests to preserve
- **Implementation**: `src/utils/validation.ts` (from Task 2) - Test these functions

**Acceptance Criteria:**
- [ ] New validation functions have test coverage
- [ ] Existing tests still pass
- [ ] `bun test tests/unit/utils/validation.test.ts` → PASS (all tests)

**Commit**: YES (group with Task 2)
- Message: `test(utils): add validation tests for branch and folder availability`
- Files: `tests/unit/utils/validation.test.ts`
- Pre-commit: `bun test`

---

### Task 8: Update README Documentation

**What to do:**
Update `README.md`:
1. Update `wt create` section (lines 81-85 in current README):
   - Document new smart derivation behavior
   - Show examples of all 4 scenarios
   - Document sanitization (branch `/` → folder `-`)

2. Add examples:
   ```markdown
   ### Smart Branch/Folder Derivation

   When you provide only a folder name, the branch is derived:
   ```bash
   wt create feature-auth
   # Creates: folder=feature-auth, branch=feature-auth
   ```

   When you provide only a branch, the folder is derived:
   ```bash
   wt create -b feature/auth
   # Creates: folder=feature-auth, branch=feature/auth
   ```

   When neither is clear, you'll be prompted:
   ```bash
   wt create -B develop
   # Prompts: Enter folder name: [user input]
   # Prompts: Enter branch name: [user input]
   ```
   ```

3. Document validation and error messages

**Must NOT do:**
- Change other sections unnecessarily
- Remove existing examples
- Add breaking change notices (this is enhancement, not breaking)

**Recommended Agent Profile:**
- **Category**: `writing` - Documentation
- **Skills**: None required

**Parallelization:**
- **Can Run In Parallel**: YES
- **Blocks**: Task 9
- **Blocked By**: None (can start anytime after Wave 1)

**References:**
- **Current README**: `README.md:81-85` - Current create examples
- **Create Command**: `src/commands/create.ts` - Document this behavior

**Acceptance Criteria:**
- [ ] README updated with new examples
- [ ] All 4 scenarios documented
- [ ] Sanitization explained
- [ ] Documentation is clear and helpful

**Commit**: YES (documentation commit)
- Message: `docs(readme): update create command with smart derivation examples`
- Files: `README.md`
- Pre-commit: N/A (docs only)

---

### Task 9: Final Verification and Commit

**What to do:**
1. Run full test suite:
   ```bash
   bun test
   ```
   - All tests should pass

2. Verify CLI behavior manually:
   ```bash
   bun run build
   
   # Test each scenario
   ./bin/wt.js create --help
   ./bin/wt.js create test-path --dry-run
   ./bin/wt.js create -b feature/test --dry-run
   ```

3. Check code quality:
   - No TypeScript errors: `bun run build`
   - No lint errors: `bun run lint` (if available)

4. Review commits:
   - All tasks committed
   - Commit messages follow convention

5. Create summary report:
   - List all changes made
   - Show test results
   - Document any issues found

**Must NOT do:**
- Skip verification steps
- Commit unrelated changes
- Ignore test failures

**Recommended Agent Profile:**
- **Category**: `quick` - Verification
- **Skills**: None required

**Parallelization:**
- **Can Run In Parallel**: NO (final task)
- **Blocks**: None
- **Blocked By**: Task 5, Task 6, Task 7, Task 8

**Acceptance Criteria:**
- [ ] `bun test` passes all tests
- [ ] `bun run build` compiles without errors
- [ ] Manual CLI verification successful
- [ ] All files committed with proper messages
- [ ] Summary report generated

**Final Verification Commands:**
```bash
# Full test suite
bun test

# Build check
bun run build

# CLI help
./bin/wt.js create --help

# Scenario tests
./bin/wt.js create scenario-test --dry-run
./bin/wt.js create -b feature/scenario --dry-run
```

**Commit**: NO (verification only, already committed in previous tasks)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1, 2, 3 | `feat(utils): add branch/folder utilities and validation` | src/utils/paths.ts, src/utils/validation.ts, src/types/index.ts | bun run build |
| 4, 5 | `feat(create): refactor create command with smart inference and tests` | src/commands/create.ts, tests/unit/commands/create.test.ts | bun test tests/unit/commands/create.test.ts |
| 6, 7 | `test(utils): add unit tests for path and validation utilities` | tests/unit/utils/paths.test.ts, tests/unit/utils/validation.test.ts | bun test tests/unit/utils/ |
| 8 | `docs(readme): update create command documentation` | README.md | manual review |
| 9 | N/A (verification) | N/A | bun test + manual |

---

## Success Criteria

### Verification Commands
```bash
# Run all tests
bun test

# Expected: All tests pass, no failures

# Build project
bun run build

# Expected: Compiles without errors

# Test CLI scenarios
./bin/wt.js create test-folder --dry-run
# Expected: Shows folder=test-folder, branch=test-folder (derived)

./bin/wt.js create -b feature/test-branch --dry-run
# Expected: Shows folder=feature-test-branch (sanitized), branch=feature/test-branch
```

### Final Checklist
- [x] All "Must Have" items present
- [x] All "Must NOT Have" items absent
- [x] All 4 scenarios work correctly
- [x] Branch `feature/auth` → Folder `feature-auth` (no nested folders)
- [x] Interactive prompts only appear when neither path nor branch
- [x] Validation catches conflicts with helpful error messages
- [x] All tests pass (unit + integration)
- [x] README updated with new examples
- [x] Code compiles without TypeScript errors
