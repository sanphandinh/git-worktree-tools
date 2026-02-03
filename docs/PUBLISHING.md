# Publishing Guide

This guide covers how to publish the `wtre` package both locally (for testing) and automatically via GitHub Actions.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Publishing (Testing)](#local-publishing-testing)
3. [CI/CD Auto-Publishing](#cicd-auto-publishing)
4. [Version Management](#version-management)
5. [Troubleshooting](#troubleshooting)

## Prerequisites

Before publishing, ensure you have:

- [ ] npm account (create at [npmjs.com](https://www.npmjs.com/signup))
- [ ] Package name `wtre` is available (or you'll need to rename)
- [ ] Node.js >= 18 installed locally
- [ ] Bun installed locally

## Local Publishing (Testing)

### 1. Login to npm

```bash
npm login
```

Enter your npm username, password, and 2FA code when prompted.

### 2. Test the Publish (Dry Run)

Before actually publishing, test with a dry run:

```bash
# Check what would be published without actually publishing
npm publish --dry-run
```

This will show you:
- What files will be included
- Package size
- Any warnings or errors

### 3. Build and Test

```bash
# The prepublishOnly script runs automatically before publish
bun run build && bun test
```

### 4. Publish

For the first publish (public package):

```bash
npm publish --access public
```

For subsequent publishes:

```bash
npm publish
```

### 5. Verify Installation

After publishing, verify it works:

```bash
# In a new directory
npm install -g wtre
wt --version
```

## CI/CD Auto-Publishing

The repository includes a GitHub Actions workflow that automatically publishes to npm when changes are merged into the `main` branch.

### Setup Steps

#### 1. Get Your npm Access Token

1. Go to [npmjs.com](https://www.npmjs.com) and log in
2. Click your profile picture → Access Tokens
3. Click "Generate New Token" → "Granular Access Token"
4. Configure permissions:
   - **Packages and Scopes**: Select your package `wtre`
   - **Permissions**: Read and write
5. Copy the generated token

#### 2. Add Token to GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste your npm access token
6. Click **Add secret**

#### 3. Enable GitHub Actions

Ensure GitHub Actions are enabled:

1. Go to **Settings** → **Actions** → **General**
2. Under "Actions permissions", select:
   - **Allow all actions and reusable workflows**
3. Click **Save**

#### 4. Workflow Features

The publish workflow (`.github/workflows/publish.yml`) includes:

- ✅ Runs on every push to `main`
- ✅ Runs tests before publishing
- ✅ Builds the package
- ✅ Publishes with npm provenance (supply chain security)
- ✅ Ignores markdown and Renovate config changes
- ✅ Can be triggered manually via `workflow_dispatch`

### How It Works

1. When you merge a PR into `main`, the workflow triggers
2. It installs dependencies with Bun
3. Runs the test suite
4. Builds the TypeScript code
5. Publishes to npm using the `NPM_TOKEN` secret

### Monitoring Publishes

You can monitor publish status:

1. Go to **Actions** tab in your repository
2. Click on the "Publish to npm" workflow
3. View the logs for each run

## Version Management

### Automatic Version Bumping

The workflow uses the version from `package.json`. To publish a new version:

1. Update the version in `package.json`:
   ```bash
   # For patch (0.1.0 → 0.1.1)
   npm version patch
   
   # For minor (0.1.0 → 0.2.0)
   npm version minor
   
   # For major (0.1.0 → 1.0.0)
   npm version major
   ```

2. Commit and push:
   ```bash
   git push origin main
   ```

3. The CI will automatically publish the new version

### Version Strategy

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes (API changes that aren't backward compatible)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Troubleshooting

### "You do not have permission to publish"

**Solution**: 
- Check you're logged in: `npm whoami`
- Verify you own the package or are a collaborator
- For new packages, ensure you're using `--access public`

### "Cannot publish over previously published version"

**Solution**: 
- You can't republish the same version
- Bump the version in `package.json` first
- Or unpublish within 24 hours: `npm unpublish wtre@<version>`

### "ENOAUDIT" or "npm audit" errors

**Solution**: 
- Run `npm audit fix` to resolve vulnerabilities
- The `prepublishOnly` script runs tests - fix any failing tests

### GitHub Actions "npm ERR! 403 Forbidden"

**Solution**: 
- Verify `NPM_TOKEN` secret is set correctly
- Check the token has "Read and write" permissions
- Ensure the token hasn't expired

### "E402 Payment Required" for private packages

**Solution**: 
- This package is set to public (`--access public`)
- If you want private, you need npm Pro ($7/month)

### Tests failing in CI but passing locally

**Solution**: 
- Check for environment-specific issues
- Ensure all dependencies are in `dependencies` or `devDependencies`
- Check Node.js version compatibility (CI uses Node 20)

## Additional Resources

- [npm publish documentation](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [npm provenance documentation](https://docs.npmjs.com/generating-provenance-statements)
- [Semantic Versioning](https://semver.org/)

## Quick Reference

```bash
# Local testing
npm login                           # Login to npm
npm publish --dry-run               # Test what would be published
npm publish --access public         # First publish
npm publish                         # Subsequent publishes

# Version management
npm version patch                   # Bump patch version
npm version minor                   # Bump minor version
npm version major                   # Bump major version

# Verify
npm view wtre versions              # See published versions
npm install -g wtre                 # Test global install
```
