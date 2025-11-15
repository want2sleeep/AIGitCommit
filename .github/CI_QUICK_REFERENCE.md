# CI/CD Quick Reference

## 🚀 Quick Commands

### Setup
```bash
pnpm install                    # Install dependencies
```

### Development
```bash
pnpm run compile                # Compile TypeScript
pnpm run watch                  # Watch mode compilation
pnpm run test                   # Run tests
pnpm run test:watch             # Watch mode tests
pnpm run test:coverage          # Tests with coverage
```

### Code Quality
```bash
pnpm run lint                   # Check linting
pnpm run lint:fix               # Fix linting issues
pnpm run format                 # Format code
pnpm run format:check           # Check formatting
```

### Pre-Commit Checklist
```bash
✓ pnpm run lint
✓ pnpm run format:check
✓ pnpm run compile
✓ pnpm run test
```

## 📊 CI Pipeline

### Triggers
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

### Jobs

#### 1. Code Quality & Tests
- ✓ Lint (ESLint)
- ✓ Format check (Prettier)
- ✓ Compile (TypeScript)
- ✓ Tests with coverage (Jest)
- ✓ Upload coverage reports

#### 2. Build Extension
- ✓ Build extension
- ✓ Package as VSIX
- ✓ Upload artifact

### Matrix Testing
- Node.js 18.x
- Node.js 20.x

## 📈 Coverage Requirements

| Metric     | Threshold |
|------------|-----------|
| Branches   | 70%       |
| Functions  | 70%       |
| Lines      | 70%       |
| Statements | 70%       |

## 🔧 Common Issues

### Lint Errors
```bash
pnpm run lint:fix
```

### Format Issues
```bash
pnpm run format
```

### Test Failures
```bash
pnpm exec jest --runInBand
```

### Compilation Errors
```bash
pnpm run compile
# Check error messages
```

## 📦 Artifacts

### Coverage Reports
- **Location:** GitHub Actions → Artifacts
- **Retention:** 30 days
- **Format:** HTML, LCOV, JSON

### VSIX Package
- **Location:** GitHub Actions → Artifacts
- **Retention:** 30 days
- **File:** `*.vsix`

## 🎯 Status Badges

### CI Status
```markdown
![CI Status](https://github.com/want2sleeep/AIGitCommit/workflows/CI/badge.svg)
```

### Codecov (Optional)
```markdown
[![codecov](https://codecov.io/gh/want2sleeep/AIGitCommit/branch/main/graph/badge.svg)](https://codecov.io/gh/want2sleeep/AIGitCommit)
```

## 🔑 Required Secrets

| Secret         | Required | Purpose              |
|----------------|----------|----------------------|
| CODECOV_TOKEN  | Optional | Upload to Codecov    |

## 📝 Workflow Files

| File                              | Purpose                    |
|-----------------------------------|----------------------------|
| `.github/workflows/ci.yml`        | Main CI/CD workflow        |
| `.github/workflows/README.md`     | Workflow documentation     |
| `.github/CI_CD_SETUP.md`          | Complete setup guide       |
| `.github/CI_QUICK_REFERENCE.md`   | This quick reference       |

## 🛠️ Tools & Versions

| Tool       | Version    | Purpose                |
|------------|------------|------------------------|
| pnpm       | 10.18.1    | Package manager        |
| Node.js    | 18.x, 20.x | Runtime                |
| TypeScript | 5.3.3      | Language               |
| Jest       | 30.2.0     | Testing framework      |
| ESLint     | 8.56.0     | Linting                |
| Prettier   | 3.6.2      | Code formatting        |

## 📚 Documentation

- [Complete CI/CD Setup Guide](.github/CI_CD_SETUP.md)
- [Workflow Details](.github/workflows/README.md)
- [Project README](../README.md)

## 💡 Tips

1. **Run checks locally** before pushing
2. **Use pre-commit hooks** (automatic with Husky)
3. **Check CI logs** if build fails
4. **Keep dependencies updated**
5. **Maintain test coverage** above 70%

---

For detailed information, see [CI_CD_SETUP.md](CI_CD_SETUP.md)
