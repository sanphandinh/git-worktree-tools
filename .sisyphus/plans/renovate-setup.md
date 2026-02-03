# Renovate Setup for GitHub Actions

## TL;DR

> **Quick Summary**: Set up automated dependency updates using Renovate bot via GitHub Actions workflow with intelligent grouping, automerging for safe updates, and proper testing integration.
>
> **Deliverables**:
> - `.github/workflows/renovate.yml` - GitHub Actions workflow
> - `.github/renovate.json` - Renovate configuration
> - Dependency dashboard enabled for visibility
> - Grouped minor/patch updates with automerge for devDependencies
>
> **Estimated Effort**: Quick (~30 minutes setup + 2 hours for first run)
> **Parallel Execution**: YES - 2 independent tasks can run in parallel
> **Critical Path**: Task 1 (Create workflow) → Task 2 (Create config) → Verification

---

## Context

### Original Request
Set up Renovate for automated dependency updates via GitHub Actions for the wtre (Git worktree manager CLI) Node.js/TypeScript project. Requirements include:
1. GitHub Actions workflow for Renovate
2. Renovate configuration file
3. Handle dependencies and devDependencies
4. Group minor/patch updates
5. Automerge patch updates if tests pass
6. Schedule-based execution (daily or weekly)
7. GitHub token authentication

### Project Context
- **Project**: wtre - Git worktree manager CLI tool
- **Type**: Node.js ES module with TypeScript
- **Package Manager**: npm (uses bun for testing)
- **Dependencies**: chalk, commander, cosmiconfig, execa, ora, tar-stream, zod
- **DevDependencies**: TypeScript, types, @commander-js/extra-typings
- **Testing**: bun test (3 test files exist in tests/unit/)
- **No existing GitHub Actions** - this is a greenfield setup

### Research Findings
- **Best practice**: Use `config:best-practices` preset as foundation
- **Grouping**: `group:allNonMajor` effectively groups minor/patch updates
- **Security**: GITHUB_TOKEN is recommended over Personal Access Tokens
- **Scheduling**: Weekly updates reduce noise while staying current
- **Automerge**: Branch-based automerge is faster but requires no branch protection conflicts
- **Lock files**: Must enable lockFileMaintenance for transitive dependency updates
- **Bun support**: Renovate has experimental bun support via regex manager

---

## Work Objectives

### Core Objective
Create a production-ready Renovate setup that automatically manages dependency updates with minimal manual intervention while maintaining code quality through automated testing.

### Concrete Deliverables
1. `.github/workflows/renovate.yml` - Workflow running hourly with proper permissions
2. `.github/renovate.json` - Configuration with grouping, automerge, and scheduling
3. Updated project with Renovate enabled and first run completed

### Definition of Done
- [ ] Workflow file created and validated (YAML syntax check passes)
- [ ] Renovate config created and validated (JSON schema valid)
- [ ] Renovate runs successfully in GitHub Actions (workflow completes without errors)
- [ ] Dependency dashboard issue created (visible in GitHub Issues)
- [ ] At least one test PR created (verifies the setup works)

### Must Have
- Grouped minor/patch updates (reduce PR noise)
- Automerge for devDependencies (patch/minor only)
- Manual review required for major updates
- Weekly scheduling (weekends)
- Lock file maintenance enabled
- GITHUB_TOKEN authentication (secure, no PATs)

### Must NOT Have (Guardrails)
- **NO** Personal Access Tokens (security risk)
- **NO** automerge for major updates (breaking changes need review)
- **NO** daily scheduling (too noisy for this project size)
- **NO** separate grouping for each dependency (defeats the purpose)
- **NO** automerge without test requirements (must pass CI first)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (bun test available)
- **User wants tests**: Manual verification (Renovate setup doesn't require TDD)
- **Framework**: bun test (already configured in package.json)
- **QA approach**: Manual verification with automated checks

### Automated Verification (Agent-Executable)

**Verification Procedures:**

1. **YAML Validation** (using Bash):
```bash
# Validate workflow file syntax
cat .github/workflows/renovate.yml | head -20
# Assert: File exists and contains 'name: Renovate'
```

2. **JSON Validation** (using Bash):
```bash
# Validate renovate.json is valid JSON
node -e "JSON.parse(require('fs').readFileSync('.github/renovate.json'))" && echo "Valid JSON"
# Assert: Output is "Valid JSON"
```

3. **Schema Validation** (using web check):
```bash
# Verify config against Renovate schema (basic check)
curl -s "https://docs.renovatebot.com/renovate-schema.json" | head -5
# Assert: Schema is accessible
```

4. **Workflow Dispatch** (requires GitHub CLI):
```bash
# Trigger workflow manually to test
gh workflow run renovate.yml
# Assert: Workflow starts without errors
```

5. **Check Repository Settings** (manual verification):
- Verify GitHub Actions is enabled for the repository
- Verify Issues are enabled (for dependency dashboard)
- Check if branch protection rules exist (may block automerge)

**Evidence to Capture:**
- [ ] Screenshot of workflow run in GitHub Actions tab
- [ ] Screenshot of dependency dashboard issue (once created)
- [ ] Log output from first Renovate run

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - NO dependencies):
├── Task 1: Create GitHub Actions workflow file
└── Task 2: Create Renovate configuration file

Wave 2 (After Wave 1 - Parallel tasks complete):
└── Task 3: Enable and verify Renovate setup

Critical Path: Task 1 & 2 (parallel) → Task 3
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | None | None (final verification) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | `delegate_task(category='quick', load_skills=['git-master'])` - both files can be created in parallel |
| 2 | 3 | `delegate_task(category='quick')` - verification and enablement |

---

## TODOs

- [ ] 1. Create GitHub Actions Workflow File

  **What to do**:
  - Create `.github/workflows/renovate.yml` with proper structure
  - Configure hourly schedule with workflow_dispatch for manual triggers
  - Set correct permissions (contents: write, pull-requests: write, issues: write)
  - Use renovatebot/github-action@v44.2.6 (latest stable)
  - Configure GITHUB_TOKEN authentication
  - Set appropriate environment variables

  **Must NOT do**:
  - Do NOT use Personal Access Token (PAT) - security risk
  - Do NOT set overly restrictive permissions
  - Do NOT hardcode repository name (use ${{ github.repository }})
  - Do NOT use deprecated action versions
  - Do NOT forget to create .github directory if it doesn't exist

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file creation task with minimal complexity
  - **Skills**: `git-master`
    - `git-master`: Needed to understand GitHub Actions structure and workflow patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References**:
  - **Pattern References**:
    - Renovate GitHub Action docs: https://github.com/renovatebot/github-action
    - GitHub Actions workflow syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
  - **Configuration Templates**:
    - Example workflow from kubernetes-sigs/external-dns: https://github.com/kubernetes-sigs/external-dns/blob/master/.github/workflows/dependency-update.yaml
    - Security best practices: https://www.chainguard.dev/unchained/running-renovate-as-a-github-action

  **Acceptance Criteria**:
  - [ ] File created at `.github/workflows/renovate.yml`
  - [ ] YAML syntax valid (no indentation errors)
  - [ ] Contains schedule trigger (cron format)
  - [ ] Contains workflow_dispatch trigger (for manual runs)
  - [ ] Permissions set: contents: write, pull-requests: write, issues: write
  - [ ] Uses renovatebot/github-action@v44.2.6 or later
  - [ ] Uses secrets.GITHUB_TOKEN (not PAT)
  - [ ] Configuration file path specified correctly
  - [ ] Environment variable RENOVATE_REPOSITORIES set to ${{ github.repository }}

  **Verification Command**:
  ```bash
  # Check file exists and has required content
  test -f .github/workflows/renovate.yml && grep -q "renovatebot/github-action" .github/workflows/renovate.yml && echo "Workflow valid"
  # Expected: "Workflow valid"
  ```

  **Commit**: YES
  - Message: `ci: add Renovate GitHub Actions workflow`
  - Files: `.github/workflows/renovate.yml`

---

- [ ] 2. Create Renovate Configuration File

  **What to do**:
  - Create `.github/renovate.json` with production-ready configuration
  - Extend config:best-practices preset as foundation
  - Add group:allNonMajor for effective grouping
  - Configure automerge for minor/patch devDependencies
  - Set weekly scheduling (weekends)
  - Enable lockFileMaintenance
  - Set appropriate timezone (default to UTC or ask user)
  - Configure packageRules for different update types
  - Enable dependency dashboard

  **Must NOT do**:
  - Do NOT enable automerge for major updates
  - Do NOT store config in package.json (deprecated)
  - Do NOT use overly aggressive scheduling (daily is too noisy)
  - Do NOT forget to exclude certain files if needed
  - Do NOT enable automerge without proper test requirements

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Configuration file creation with standard patterns
  - **Skills**: `git-master`
    - `git-master`: Understanding of JSON configuration and dependency management patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References**:
  - **Configuration Documentation**:
    - Renovate configuration options: https://docs.renovatebot.com/configuration-options/
    - Best practices preset: https://docs.renovatebot.com/presets-config/#configbest-practices
    - Grouping presets: https://docs.renovatebot.com/presets-group/
    - Automerge docs: https://docs.renovatebot.com/key-concepts/automerge/
    - Scheduling docs: https://docs.renovatebot.com/key-concepts/scheduling/
  - **Example Configurations**:
    - GoogleCloudPlatform/generative-ai: https://github.com/GoogleCloudPlatform/generative-ai/blob/main/renovate.json
    - mainmatter/sheepdog: https://github.com/mainmatter/sheepdog/blob/main/renovate.json
    - Production-ready example: https://docs.renovatebot.com/presets-config/#configbest-practices
  - **Schema Reference**:
    - JSON Schema: https://docs.renovatebot.com/renovate-schema.json

  **Acceptance Criteria**:
  - [ ] File created at `.github/renovate.json`
  - [ ] Valid JSON format (no syntax errors)
  - [ ] Extends config:best-practices
  - [ ] Extends group:allNonMajor or similar grouping
  - [ ] automerge: true for appropriate package rules
  - [ ] automerge: false for major updates
  - [ ] Schedule configured (weekly or as specified)
  - [ ] timezone specified (UTC or user preference)
  - [ ] lockFileMaintenance enabled
  - [ ] dependencyDashboard enabled
  - [ ] packageRules distinguish between dependencies and devDependencies
  - [ ] prConcurrentLimit set (recommend 10)
  - [ ] prHourlyLimit set (recommend 2)

  **Verification Command**:
  ```bash
  # Validate JSON and check key fields
  node -e "const cfg = JSON.parse(require('fs').readFileSync('.github/renovate.json')); console.log(cfg.extends && cfg.extends.includes('config:best-practices') ? 'Config valid' : 'Missing best-practices')"
  # Expected: "Config valid"
  ```

  **Commit**: YES
  - Message: `chore: add Renovate configuration with grouping and automerge`
  - Files: `.github/renovate.json`

---

- [ ] 3. Enable and Verify Renovate Setup

  **What to do**:
  - Ensure GitHub Actions is enabled for the repository
  - Trigger initial Renovate run manually via workflow_dispatch
  - Monitor first run for any errors
  - Verify dependency dashboard issue is created
  - Check that Renovate can read package.json and lock files
  - Review first PR(s) created by Renovate
  - Verify automerge settings work correctly
  - Document any manual steps needed in README

  **Must NOT do**:
  - Do NOT merge PRs without reviewing them first
  - Do NOT ignore failed workflow runs
  - Do NOT skip checking branch protection rules
  - Do NOT assume automerge works without testing

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification and monitoring tasks
  - **Skills**: `git-master`
    - `git-master`: Understanding of GitHub Actions execution and PR workflows

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential, must wait for Wave 1)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 1, Task 2

  **References**:
  - **GitHub Actions Documentation**:
    - Running workflows manually: https://docs.github.com/en/actions/managing-workflow-runs/manually-running-a-workflow
    - Monitoring workflow runs: https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/monitoring-workflows
  - **Renovate Documentation**:
    - Dependency dashboard: https://docs.renovatebot.com/key-concepts/dashboard/
    - Troubleshooting: https://docs.renovatebot.com/troubleshooting/
    - Automerge timing: https://docs.renovatebot.com/key-concepts/automerge/#renovate-automerges-take-time

  **Acceptance Criteria**:
  - [ ] GitHub Actions enabled for repository
  - [ ] Workflow triggered manually (workflow_dispatch)
  - [ ] Workflow completes successfully (green checkmark)
  - [ ] Dependency dashboard issue created in GitHub Issues
  - [ ] Renovate can parse package.json without errors
  - [ ] Renovate detects current dependencies correctly
  - [ ] At least one PR created (or none if all dependencies current)
  - [ ] If PR created: tests pass on the PR
  - [ ] Branch protection rules checked (document if they block automerge)
  - [ ] README updated with Renovate badge or documentation (optional but recommended)

  **Verification Commands**:
  ```bash
  # List recent workflow runs
  gh run list --workflow=renovate.yml --limit 5
  
  # Check for dependency dashboard issue
  gh issue list --label="dependency-dashboard" 2>/dev/null || echo "No dashboard yet (normal on first run)"
  
  # Verify Renovate can parse config
  npx --package renovate -c 'renovate-config-validator' .github/renovate.json 2>/dev/null || echo "Install renovate locally to validate"
  ```

  **Manual Verification Steps**:
  1. Go to GitHub repository → Actions tab
  2. Find "Renovate" workflow
  3. Click "Run workflow" button
  4. Wait for workflow to complete (2-5 minutes)
  5. Check GitHub Issues for "Dependency Dashboard"
  6. Review any PRs created by Renovate
  7. Verify PRs have proper labels and descriptions

  **Commit**: NO (verification only, no code changes)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `ci: add Renovate GitHub Actions workflow` | `.github/workflows/renovate.yml` | YAML syntax check passes |
| 2 | `chore: add Renovate configuration with grouping and automerge` | `.github/renovate.json` | JSON validation passes |
| 3 | N/A (verification) | N/A | Workflow runs successfully |

---

## Success Criteria

### Verification Commands

```bash
# 1. Verify workflow file exists and is valid
ls -la .github/workflows/renovate.yml
cat .github/workflows/renovate.yml | grep -E "(name:|on:|jobs:)"

# 2. Verify renovate config exists and is valid JSON
ls -la .github/renovate.json
node -e "JSON.parse(require('fs').readFileSync('.github/renovate.json')); console.log('✓ Valid JSON')"

# 3. Check GitHub Actions status (requires gh CLI)
gh workflow view renovate

# 4. List any open Renovate PRs
gh pr list --author="app/renovate" 2>/dev/null || echo "No Renovate PRs yet"
```

### Final Checklist
- [ ] `.github/workflows/renovate.yml` created and valid
- [ ] `.github/renovate.json` created and valid
- [ ] Workflow permissions correctly set (contents, PRs, issues)
- [ ] Configuration extends config:best-practices
- [ ] Grouping configured for minor/patch updates
- [ ] Automerge enabled for devDependencies (minor/patch)
- [ ] Major updates require manual review
- [ ] Scheduling configured (weekly)
- [ ] Lock file maintenance enabled
- [ ] GitHub Actions workflow runs successfully
- [ ] Dependency dashboard visible in GitHub Issues
- [ ] README mentions Renovate setup (optional)

---

## Notes for Executor

### Assumptions Made
1. **Timezone**: UTC (user confirmed)
2. **Schedule**: Weekly on weekends - `"every weekend"` (user confirmed)
3. **Automerge strategy**: Using "pr" with `platformAutomerge: true` to work with branch protection (user confirmed branch protection exists)
4. **Automerge scope**: DevDependencies only (minor/patch) - production dependencies require manual review (user confirmed)
5. **Test requirements**: Tests must pass (bun test) before automerge. GitHub's branch protection rules should enforce this.
6. **Bun support**: Using npm for dependency management (as per package.json). Bun is only for testing.

### Potential Issues to Watch For
1. **Branch protection**: If main branch requires reviews, automerge will fail. Solution: Either disable branch protection for Renovate branches or use platformAutomerge.
2. **First run delay**: Renovate may take 1-2 hours to create PRs after first run. This is normal.
3. **Test failures**: If automerge is enabled but tests fail, PRs won't merge. This is expected behavior.
4. **Lock file**: If bun.lock needs updates, Renovate will handle it if lockFileMaintenance is enabled.

### Configuration Customization Points
User may want to adjust these in renovate.json:
- `timezone`: Change from UTC to their timezone (e.g., "America/New_York")
- `schedule`: Change from weekends to different schedule
- `automerge`: Disable entirely if they want manual review for everything
- `prConcurrentLimit`: Increase/decrease based on team capacity
- `packageRules`: Add specific rules for certain packages if needed
