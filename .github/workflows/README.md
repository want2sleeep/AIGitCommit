# GitHub Actions Workflows

This directory contains CI/CD workflows for the AI Git Commit extension.

## Workflows

### CI Workflow (`ci.yml`)

The main continuous integration workflow that runs on every push and pull request.

**Jobs:**

1. **Code Quality & Tests**
   - Runs on Node.js 18.x and 20.x
   - Installs dependencies using pnpm
   - Runs ESLint for code linting
   - Checks code formatting with Prettier
   - Compiles TypeScript
   - Runs tests with coverage reporting
   - Uploads coverage to Codecov
   - Archives coverage reports as artifacts

2. **Build Extension**
   - Builds the VSCode extension
   - Packages the extension as VSIX
   - Uploads VSIX as artifact

## Status Badges

Add these badges to your README.md:

```markdown
![CI Status](https://github.com/want2sleeep/AIGitCommit/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/want2sleeep/AIGitCommit/branch/main/graph/badge.svg)](https://codecov.io/gh/want2sleeep/AIGitCommit)
```

## Coverage Reports

Coverage reports are:
- Uploaded to Codecov (requires `CODECOV_TOKEN` secret)
- Archived as GitHub Actions artifacts (available for 30 days)
- Generated in the `coverage/` directory locally

## Local Testing

To run the same checks locally:

```bash
# Install dependencies
pnpm install

# Run linter
pnpm run lint

# Check formatting
pnpm run format:check

# Compile TypeScript
pnpm run compile

# Run tests with coverage
pnpm run test:coverage
```

## Required Secrets

To enable all features, configure these secrets in your repository settings:

- `CODECOV_TOKEN` (optional): Token for uploading coverage to Codecov

## Coverage Thresholds

The project enforces minimum coverage thresholds:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

Tests will fail if coverage falls below these thresholds.
