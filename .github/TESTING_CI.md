# Testing the CI/CD Pipeline

This guide explains how to test the CI/CD pipeline locally before pushing to GitHub.

## Prerequisites

- pnpm installed (`npm install -g pnpm`)
- Node.js 18.x or 20.x
- Git repository initialized

## Local Testing Steps

### 1. Install Dependencies

```bash
pnpm install --frozen-lockfile
```

This mimics the CI environment by using the exact versions from `pnpm-lock.yaml`.

### 2. Run Linter

```bash
pnpm run lint
```

**Expected:** May show warnings/errors. CI continues on error for now.

**Fix issues:**
```bash
pnpm run lint:fix
```

### 3. Check Code Formatting

```bash
pnpm run format:check
```

**Expected:** Should pass or show formatting issues.

**Fix issues:**
```bash
pnpm run format
```

### 4. Compile TypeScript

```bash
pnpm run compile
```

**Expected:** Should compile without errors.

**Output:** Compiled files in `out/` directory.

### 5. Run Tests with Coverage

```bash
pnpm exec jest --coverage --runInBand
```

**Expected:** Tests run with coverage report generated.

**Output:** 
- Console summary
- `coverage/` directory with reports

### 6. Build Extension

```bash
pnpm run vscode:prepublish
```

**Expected:** Extension builds successfully.

### 7. Package Extension (Optional)

```bash
pnpm install -g @vscode/vsce
vsce package
```

**Expected:** Creates `*.vsix` file.

## Simulating CI Environment

### Run All Checks in Sequence

```bash
# Create a test script
cat > test-ci.sh << 'EOF'
#!/bin/bash
set -e

echo "=== Installing dependencies ==="
pnpm install --frozen-lockfile

echo "=== Running linter ==="
pnpm run lint || echo "Linter warnings (continuing...)"

echo "=== Checking formatting ==="
pnpm run format:check || echo "Format issues (continuing...)"

echo "=== Compiling TypeScript ==="
pnpm run compile

echo "=== Running tests with coverage ==="
pnpm exec jest --coverage --runInBand || echo "Test failures (continuing...)"

echo "=== Building extension ==="
pnpm run vscode:prepublish

echo "=== All CI checks completed ==="
EOF

chmod +x test-ci.sh
./test-ci.sh
```

### Windows PowerShell Version

```powershell
# test-ci.ps1
Write-Host "=== Installing dependencies ===" -ForegroundColor Green
pnpm install --frozen-lockfile

Write-Host "=== Running linter ===" -ForegroundColor Green
pnpm run lint
if ($LASTEXITCODE -ne 0) { Write-Host "Linter warnings (continuing...)" -ForegroundColor Yellow }

Write-Host "=== Checking formatting ===" -ForegroundColor Green
pnpm run format:check
if ($LASTEXITCODE -ne 0) { Write-Host "Format issues (continuing...)" -ForegroundColor Yellow }

Write-Host "=== Compiling TypeScript ===" -ForegroundColor Green
pnpm run compile

Write-Host "=== Running tests with coverage ===" -ForegroundColor Green
pnpm exec jest --coverage --runInBand
if ($LASTEXITCODE -ne 0) { Write-Host "Test failures (continuing...)" -ForegroundColor Yellow }

Write-Host "=== Building extension ===" -ForegroundColor Green
pnpm run vscode:prepublish

Write-Host "=== All CI checks completed ===" -ForegroundColor Green
```

## Viewing Coverage Reports

### Console Output

Coverage summary is displayed in the terminal after tests run.

### HTML Report

```bash
# Open in browser (macOS)
open coverage/lcov-report/index.html

# Open in browser (Linux)
xdg-open coverage/lcov-report/index.html

# Open in browser (Windows)
start coverage/lcov-report/index.html
```

### LCOV File

The `coverage/lcov.info` file is used by Codecov and other tools.

## Testing Specific Scenarios

### Test on Different Node Versions

```bash
# Using nvm (Node Version Manager)
nvm use 18
pnpm run test

nvm use 20
pnpm run test
```

### Test Clean Install

```bash
# Remove node_modules and reinstall
rm -rf node_modules
pnpm install --frozen-lockfile
pnpm run test
```

### Test Pre-commit Hooks

```bash
# Stage some files
git add .

# Try to commit (hooks will run)
git commit -m "test: verify pre-commit hooks"

# If hooks fail, fix issues and try again
```

## Troubleshooting

### pnpm Not Found

```bash
npm install -g pnpm
```

### Frozen Lockfile Errors

```bash
# Update lockfile
pnpm install

# Commit the updated pnpm-lock.yaml
git add pnpm-lock.yaml
git commit -m "chore: update pnpm lockfile"
```

### Test Failures

```bash
# Run specific test file
pnpm exec jest src/services/__tests__/GitService.test.ts

# Run with verbose output
pnpm exec jest --verbose

# Run in watch mode for debugging
pnpm run test:watch
```

### Coverage Below Threshold

```bash
# View coverage report
open coverage/lcov-report/index.html

# Identify uncovered code
# Write tests for uncovered areas
# Re-run tests
pnpm run test:coverage
```

## CI Workflow Validation

### Validate YAML Syntax

```bash
# Using yamllint (if installed)
yamllint .github/workflows/ci.yml

# Or use online validator
# https://www.yamllint.com/
```

### Test GitHub Actions Locally

Using [act](https://github.com/nektos/act):

```bash
# Install act
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows
choco install act-cli

# Run workflow locally
act push

# Run specific job
act -j quality

# Run with specific event
act pull_request
```

## Continuous Monitoring

### Watch for Changes

```bash
# Terminal 1: Watch compilation
pnpm run watch

# Terminal 2: Watch tests
pnpm run test:watch

# Make changes and see results automatically
```

### Pre-Push Checklist

Before pushing to GitHub:

- [ ] All tests pass locally
- [ ] Linter shows no errors
- [ ] Code is formatted
- [ ] TypeScript compiles
- [ ] Coverage is above 70%
- [ ] Pre-commit hooks pass
- [ ] Extension builds successfully

## Next Steps

After local testing passes:

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "your message"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin your-branch
   ```

3. **Monitor CI:**
   - Go to GitHub repository
   - Click "Actions" tab
   - Watch workflow run
   - Check for any failures

4. **Review artifacts:**
   - Coverage reports
   - VSIX package
   - Build logs

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [pnpm Documentation](https://pnpm.io/)
- [Jest Documentation](https://jestjs.io/)
- [act - Run GitHub Actions Locally](https://github.com/nektos/act)

---

For more information, see [CI_CD_SETUP.md](CI_CD_SETUP.md)
