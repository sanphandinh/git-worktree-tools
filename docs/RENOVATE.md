# Renovate Configuration

This project uses [Renovate](https://docs.renovatebot.com/) for automated dependency updates via GitHub Actions.

## Overview

Renovate automatically monitors your dependencies and creates pull requests when updates are available. This keeps your project secure and up-to-date without manual effort.

## How It Works

1. **Scheduled Runs**: Renovate runs automatically every weekend (Saturday & Sunday at midnight UTC)
2. **Manual Trigger**: You can also run it manually from the GitHub Actions tab
3. **PR Creation**: Renovate creates pull requests for outdated dependencies
4. **Auto-merge**: Safe updates (devDependencies, minor/patch) are auto-merged after tests pass
5. **Dashboard**: A Dependency Dashboard issue tracks all pending updates

## Configuration Files

### `.github/workflows/renovate.yml`

The GitHub Actions workflow that runs Renovate:

- **Schedule**: Runs at 00:00 UTC on Saturdays and Sundays (`0 0 * * 0,6`)
- **Manual Trigger**: Available via `workflow_dispatch` (Actions tab → Renovate → Run workflow)
- **Action**: Uses `renovatebot/github-action@v40.3.4`
- **Authentication**: Uses `GITHUB_TOKEN` (no additional secrets required)
- **Concurrency**: Prevents overlapping runs

### `.github/renovate.json`

The Renovate configuration:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:best-practices",
    "config:js-app",
    "group:allNonMajor",
    ":dependencyDashboard"
  ],
  "timezone": "UTC",
  "schedule": ["before 4am on saturday"],
  "platformAutomerge": true,
  "packageRules": [
    {
      "matchDepTypes": ["devDependencies"],
      "automerge": true,
      "automergeType": "pr",
      "matchUpdateTypes": ["minor", "patch"]
    },
    {
      "matchUpdateTypes": ["major"],
      "automerge": false
    }
  ],
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["before 4am on sunday"]
  },
  "prConcurrentLimit": 3,
  "prHourlyLimit": 1,
  "rangeStrategy": "bump"
}
```

## Configuration Explained

### Presets Used

| Preset | Description |
|--------|-------------|
| `config:best-practices` | Renovate's recommended best practices |
| `config:js-app` | JavaScript/Node.js specific settings |
| `group:allNonMajor` | Groups all minor and patch updates into a single PR |
| `:dependencyDashboard` | Creates a dashboard issue to track updates |

### Schedule

- **Timezone**: UTC
- **Update Checks**: Before 4am on Saturdays
- **Lock File Maintenance**: Before 4am on Sundays
- **Why weekends?** Reduces noise during workdays, allows review on Monday

### Auto-merge Rules

| Update Type | Auto-merge? | Notes |
|-------------|-------------|-------|
| DevDependencies (minor/patch) | ✅ Yes | Safe, only used in development |
| DevDependencies (major) | ❌ No | Requires manual review |
| Dependencies (minor/patch) | ❌ No | Grouped PR, manual review |
| Dependencies (major) | ❌ No | Always requires manual review |
| Lock file updates | ❌ No | Weekly maintenance PR |

### Grouping Strategy

All **minor** and **patch** updates are grouped into a single PR:
- Reduces PR noise (1 PR instead of many)
- Easier to test all updates together
- Faster to merge

**Major** updates are always separate PRs:
- Each major update gets its own PR
- Requires individual review and testing
- Never auto-merged

### Rate Limiting

- **Concurrent PRs**: Maximum 3 open PRs at once
- **Hourly PRs**: Maximum 1 new PR per hour
- Prevents overwhelming the repository with too many updates at once

### Lock File Maintenance

- **Enabled**: Yes
- **Schedule**: Sundays at 4am UTC
- Updates transitive dependencies in `package-lock.json`
- Keeps indirect dependencies secure and up-to-date

## Using Renovate

### Viewing the Dependency Dashboard

1. Go to the **Issues** tab in your repository
2. Look for an issue titled **"Dependency Dashboard"**
3. This dashboard shows:
   - Pending updates
   - Approved updates waiting for schedule
   - Stalled updates (failing tests)
   - Ignored dependencies

### Manual Run

To run Renovate immediately (outside the schedule):

1. Go to **Actions** tab
2. Select **Renovate** workflow
3. Click **Run workflow** → **Run workflow**
4. Wait for the run to complete
5. Check Pull Requests for new updates

### Approving Pending Updates

If you see updates in the Dependency Dashboard but no PRs:

1. Open the Dependency Dashboard issue
2. Check the "Rate Limited" or "Scheduled" sections
3. You can:
   - Wait for the next scheduled run (Saturday/Sunday)
   - Run manually via Actions tab
   - Edit the issue to check boxes for immediate PR creation (if shown)

### Handling Major Updates

When Renovate creates a PR for a major version update:

1. **Review the changelog** linked in the PR description
2. **Check breaking changes** in the release notes
3. **Test locally** before merging:
   ```bash
   git checkout renovate/major-package-name
   npm install
   npm test
   npm run build
   ```
4. **Update your code** if breaking changes affect you
5. **Merge** when confident

### Disabling Auto-merge for Specific Dependencies

If you want to prevent auto-merge for a specific devDependency:

1. Add to `renovate.json`:
   ```json
   {
     "packageRules": [
       {
         "matchPackageNames": ["package-name"],
         "automerge": false
       }
     ]
   }
   ```

2. Commit and push the change

### Ignoring Dependencies

To ignore a dependency (e.g., if it's causing issues):

1. Add to `renovate.json`:
   ```json
   {
     "ignoreDeps": ["package-name"]
   }
   ```

2. Or add a comment in `package.json`:
   ```json
   {
     "dependencies": {
       "package-name": "1.0.0 // renovate: ignore"
     }
   }
   ```

## Troubleshooting

### Renovate Isn't Creating PRs

1. Check if workflow has run: Actions → Renovate
2. Check the Dependency Dashboard issue for pending updates
3. Verify `renovate.json` is valid JSON
4. Check workflow logs for errors

### Tests Fail on Renovate PRs

1. Check which dependency update caused the failure
2. Review the dependency's changelog for breaking changes
3. Fix your code to work with the new version
4. Push fixes to the Renovate branch
5. Tests will re-run automatically

### Too Many PRs

If you're getting overwhelmed:

1. Reduce schedule frequency (e.g., monthly instead of weekly)
2. Lower `prConcurrentLimit` (e.g., from 3 to 2)
3. Enable more aggressive grouping
4. Add `prCreation": "not-pending"` to batch updates

### Want to Disable Auto-merge

To disable all auto-merging:

```json
{
  "automerge": false
}
```

To disable only for specific types:

```json
{
  "packageRules": [
    {
      "matchDepTypes": ["devDependencies"],
      "automerge": false
    }
  ]
}
```

## Customization

### Change Schedule

Edit `renovate.json`:

```json
{
  "schedule": ["before 4am on the first day of the month"]
}
```

Common schedules:
- `"before 4am on monday"` - Weekly on Mondays
- `"before 4am on the first day of the month"` - Monthly
- `"at any time"` - As soon as updates are available

### Change Timezone

Edit `renovate.json`:

```json
{
  "timezone": "America/New_York"
}
```

### Add Custom Package Rules

Example: Require approval for all TypeScript updates:

```json
{
  "packageRules": [
    {
      "matchPackageNames": ["typescript"],
      "dependencyDashboardApproval": true
    }
  ]
}
```

## Security

- Renovate uses `GITHUB_TOKEN` with standard permissions
- No additional secrets or tokens required
- Auto-merge only for devDependencies (safe by default)
- Major updates always require manual review
- Transitive dependencies updated via lock file maintenance

## Resources

- [Renovate Documentation](https://docs.renovatebot.com/)
- [Renovate Configuration Options](https://docs.renovatebot.com/configuration-options/)
- [Renovate Presets](https://docs.renovatebot.com/config-presets/)
- [GitHub Actions - Renovate](https://github.com/renovatebot/github-action)

## Questions?

- Check the [Dependency Dashboard](../../issues) in your repository
- Review [Renovate Logs](../../actions/workflows/renovate.yml) in GitHub Actions
- See [Troubleshooting](#troubleshooting) section above
