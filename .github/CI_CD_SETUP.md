# CI/CD Setup Guide

This document describes the CI/CD configuration for the AI Git Commit VSCode extension.

## Overview

The project uses GitHub Actions for continuous integration and deployment. The CI pipeline runs on every push and pull request to the `main` and `develop` branches.

## Workflow Configuration

### File Location
`.github/workflows/ci.yml`

### Workflow Jobs

#### 1. Code Quality & Tests Job

Runs on multiple Node.js versions (18.x and 20.x) to ensure compatibility.

**Steps:**
1. **Checkout code** - Retrieves the repository code
2. **Install pnpm** - Sets up pnpm package manager (v10.18.1)
3. **Setup Node.js** - Configures Node.js with caching
4. **Install dependencies** - Runs `pnpm install --frozen-lockfile`
5. **Run linter** - Executes ESLint checks (continues on error)
6. **Check code formatting** - Verifies Prettier formatting (continues on error)
7. **Compile TypeScript** - Compiles the project
8. **Run tests with coverage** - Executes Jest tests with coverage reporting
9. **Upload coverage to Codecov** - Sends coverage data to Codecov (optional)
10. **Archive coverage report** - Stores coverage reports as artifacts
11. **Check coverage thresholds** - Validates 70% coverage target

#### 2. Build Extension Job

Builds and packages the VSCode extension (runs after quality checks pass).

**Steps:**
1. **Checkout code**
2. **Install pnpm**
3. **Setup Node.js**
4. **Install dependencies**
5. **Build extension** - Runs `pnpm run vscode:prepublish`
6. **Package extension** - Creates VSIX package using vsce
7. **Upload VSIX artifact** - Stores the packaged extension

## Package Manager: pnpm

The project uses **pnpm** instead of npm for several benefits:

- **Faster installations** - Uses hard links and symlinks
- **Disk space efficiency** - Shared dependency storage
- **Strict dependency management** - Better isolation
- **Monorepo support** - Better for complex projects

### Installation

```bash
# Install pnpm globally
npm install -g pnpm

# Or using other methods
# Windows (PowerShell)
iwr https://get.pnpm.io/install.ps1 -useb | iex

# macOS/Linux
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### Usage

```bash
# Install dependencies
pnpm install

# Run scripts
pnpm run compile
pnpm run test
pnpm run lint
```

## Code Quality Tools

### ESLint

Configuration: `.eslintrc.json`

Enforces code quality rules including:
- TypeScript-specific rules
- No floating promises
- Explicit function return types
- Complexity limits
- Max lines per function

**Run locally:**
```bash
pnpm run lint          # Check for issues
pnpm run lint:fix      # Auto-fix issues
```

### Prettier

Configuration: `.prettierrc`

Enforces consistent code formatting:
- 2 spaces indentation
- Single quotes
- Semicolons
- 100 character line width
- LF line endings

**Run locally:**
```bash
pnpm run format        # Format all files
pnpm run format:check  # Check formatting
```

### Husky + lint-staged

Pre-commit hooks automatically run linting and formatting on staged files.

Configuration:
- `.husky/pre-commit` - Pre-commit hook script
- `package.json` - lint-staged configuration

## Test Coverage

### Configuration

Jest configuration: `jest.config.js`

**Coverage Thresholds:**
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

**Coverage Reports:**
- Text summary (console)
- LCOV format (for Codecov)
- HTML report (in `coverage/` directory)
- JSON format

### Running Tests Locally

```bash
# Run all tests
pnpm run test

# Run tests with coverage
pnpm run test:coverage

# Run tests in watch mode
pnpm run test:watch

# Run specific test file
pnpm exec jest src/services/__tests__/GitService.test.ts
```

### Viewing Coverage Reports

After running `pnpm run test:coverage`:

1. **Console** - Summary displayed in terminal
2. **HTML Report** - Open `coverage/lcov-report/index.html` in browser
3. **LCOV File** - `coverage/lcov.info` for CI tools

## GitHub Actions Artifacts

### Coverage Reports

- **Retention:** 30 days
- **Location:** Actions run → Artifacts section
- **Files:** Complete coverage report (HTML, JSON, LCOV)

### VSIX Package

- **Retention:** 30 days
- **Location:** Actions run → Artifacts section
- **Files:** `*.vsix` extension package

## Codecov Integration (Optional)

To enable Codecov integration:

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Get the upload token
4. Add `CODECOV_TOKEN` to repository secrets:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `CODECOV_TOKEN`
   - Value: Your Codecov token

### Codecov Badge

Add to README.md:

```markdown
[![codecov](https://codecov.io/gh/want2sleeep/AIGitCommit/branch/main/graph/badge.svg)](https://codecov.io/gh/want2sleeep/AIGitCommit)
```

## CI Status Badge

Add to README.md:

```markdown
![CI Status](https://github.com/want2sleeep/AIGitCommit/workflows/CI/badge.svg)
```

## Troubleshooting

### CI Fails on Lint

**Issue:** ESLint errors cause CI to fail

**Solution:** 
```bash
# Fix automatically
pnpm run lint:fix

# Or fix manually based on error messages
pnpm run lint
```

### CI Fails on Format Check

**Issue:** Code formatting doesn't match Prettier rules

**Solution:**
```bash
# Format all files
pnpm run format

# Check what needs formatting
pnpm run format:check
```

### CI Fails on Tests

**Issue:** Tests fail in CI but pass locally

**Possible causes:**
1. Environment differences
2. Missing dependencies
3. Timing issues in tests
4. Mock configuration

**Solution:**
```bash
# Run tests exactly as CI does
pnpm exec jest --runInBand --coverage

# Check for environment-specific issues
# Review test logs in GitHub Actions
```

### CI Fails on Compilation

**Issue:** TypeScript compilation errors

**Solution:**
```bash
# Compile locally to see errors
pnpm run compile

# Check TypeScript version matches CI
node -v
pnpm list typescript
```

### pnpm Installation Issues

**Issue:** CI can't install pnpm

**Solution:** The workflow uses `pnpm/action-setup@v4` which handles installation automatically. If issues persist:

1. Check pnpm version in `package.json` packageManager field
2. Verify GitHub Actions has access to pnpm registry
3. Check workflow logs for specific errors

## Local Development Workflow

### Initial Setup

```bash
# Clone repository
git clone https://github.com/want2sleeep/AIGitCommit.git
cd AIGitCommit

# Install pnpm if not already installed
npm install -g pnpm

# Install dependencies
pnpm install

# Compile project
pnpm run compile
```

### Before Committing

```bash
# Run all quality checks
pnpm run lint
pnpm run format:check
pnpm run compile
pnpm run test

# Or let pre-commit hooks handle it
git add .
git commit -m "your message"  # Hooks run automatically
```

### Development Cycle

```bash
# Watch mode for compilation
pnpm run watch

# Watch mode for tests
pnpm run test:watch

# Run specific test
pnpm exec jest <test-file-path>
```

## Continuous Improvement

### Adding New Checks

To add new CI checks, edit `.github/workflows/ci.yml`:

```yaml
- name: Your New Check
  run: pnpm run your-command
```

### Updating Dependencies

```bash
# Update all dependencies
pnpm update

# Update specific package
pnpm update <package-name>

# Check for outdated packages
pnpm outdated
```

### Modifying Coverage Thresholds

Edit `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 70,    // Adjust as needed
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

## Best Practices

1. **Always run tests locally** before pushing
2. **Keep coverage above 70%** for all new code
3. **Fix linting errors** immediately
4. **Use meaningful commit messages** (conventional commits)
5. **Review CI logs** when builds fail
6. **Keep dependencies updated** regularly
7. **Document breaking changes** in CHANGELOG.md

## Resources

- [pnpm Documentation](https://pnpm.io/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Documentation](https://jestjs.io/)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [Codecov Documentation](https://docs.codecov.com/)

## Support

For CI/CD issues:
1. Check GitHub Actions logs
2. Review this documentation
3. Check project issues on GitHub
4. Contact maintainers

---

Last Updated: 2024
