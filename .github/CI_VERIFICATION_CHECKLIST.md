# CI/CD Verification Checklist

Use this checklist to verify the CI/CD setup is working correctly.

## ✅ Pre-Push Verification

### Local Environment Setup
- [ ] pnpm is installed (`pnpm --version`)
- [ ] Node.js 18.x or 20.x is installed (`node --version`)
- [ ] Dependencies are installed (`pnpm install`)

### Code Quality Checks
- [ ] Linter runs without critical errors (`pnpm run lint`)
- [ ] Code is properly formatted (`pnpm run format:check`)
- [ ] TypeScript compiles successfully (`pnpm run compile`)
- [ ] Tests pass locally (`pnpm run test`)
- [ ] Coverage reports generate (`pnpm run test:coverage`)

### Pre-commit Hooks
- [ ] Husky is installed (`.husky/` directory exists)
- [ ] Pre-commit hook exists (`.husky/pre-commit`)
- [ ] Hooks run on commit attempt

## ✅ GitHub Actions Verification

### Workflow Files
- [ ] Workflow file exists (`.github/workflows/ci.yml`)
- [ ] YAML syntax is valid (no syntax errors)
- [ ] Workflow name is set ("CI")
- [ ] Triggers are configured (push, pull_request)
- [ ] Branches are specified (main, develop)

### Job Configuration
- [ ] Quality job is defined
- [ ] Build job is defined
- [ ] Build job depends on quality job
- [ ] Matrix strategy includes Node 18.x and 20.x

### Steps Verification
- [ ] Checkout action is used (@v4)
- [ ] pnpm action is configured (@v4)
- [ ] Node.js setup includes caching
- [ ] Dependencies install with frozen lockfile
- [ ] All required scripts are referenced

## ✅ First CI Run

### Before Pushing
- [ ] All local checks pass
- [ ] Changes are committed
- [ ] Branch is up to date

### Push to GitHub
- [ ] Code pushed to GitHub
- [ ] Workflow triggered automatically
- [ ] Actions tab shows running workflow

### Monitor Workflow
- [ ] Quality job starts
- [ ] Both Node versions (18.x, 20.x) run in parallel
- [ ] Checkout step succeeds
- [ ] pnpm installation succeeds
- [ ] Node.js setup succeeds
- [ ] Dependencies install succeeds
- [ ] Linter runs (may show warnings)
- [ ] Format check runs (may show warnings)
- [ ] Compilation succeeds
- [ ] Tests run (may have failures)
- [ ] Coverage reports generate
- [ ] Artifacts upload (coverage reports)

### Build Job
- [ ] Build job starts after quality job
- [ ] Extension builds successfully
- [ ] VSIX package is created
- [ ] VSIX artifact uploads

## ✅ Artifacts Verification

### Coverage Reports
- [ ] Artifacts section shows coverage reports
- [ ] One artifact per Node version
- [ ] Artifacts can be downloaded
- [ ] HTML report opens in browser
- [ ] Coverage metrics are visible

### VSIX Package
- [ ] VSIX artifact is available
- [ ] Package can be downloaded
- [ ] File size is reasonable
- [ ] Package name includes version

## ✅ Documentation Verification

### Files Exist
- [ ] `.github/workflows/ci.yml`
- [ ] `.github/workflows/README.md`
- [ ] `.github/CI_CD_SETUP.md`
- [ ] `.github/CI_QUICK_REFERENCE.md`
- [ ] `.github/TESTING_CI.md`
- [ ] `.github/IMPLEMENTATION_SUMMARY.md`
- [ ] `.github/CI_VERIFICATION_CHECKLIST.md`

### Documentation Quality
- [ ] README files are clear and complete
- [ ] Code examples are correct
- [ ] Links work properly
- [ ] Instructions are easy to follow

## ✅ Configuration Files

### jest.config.js
- [ ] Coverage directory is set
- [ ] Coverage reporters include lcov
- [ ] Coverage thresholds are defined (70%)
- [ ] Test patterns are correct
- [ ] Mock mappings work

### package.json
- [ ] packageManager field specifies pnpm
- [ ] All scripts referenced in CI exist
- [ ] Scripts run successfully locally

### .prettierrc
- [ ] Configuration is valid
- [ ] Format rules are applied

### .eslintrc.json
- [ ] Configuration is valid
- [ ] Rules are appropriate
- [ ] TypeScript parser is configured

## ✅ Optional Features

### Codecov Integration
- [ ] Codecov account created (if using)
- [ ] Repository added to Codecov
- [ ] CODECOV_TOKEN secret added
- [ ] Coverage uploads successfully
- [ ] Codecov dashboard shows data

### Status Badges
- [ ] CI badge added to README (optional)
- [ ] Codecov badge added to README (optional)
- [ ] Badges display correctly

## ✅ Edge Cases

### Pull Request Testing
- [ ] Create test PR
- [ ] CI runs on PR
- [ ] Status checks appear on PR
- [ ] Artifacts are available

### Branch Protection
- [ ] Consider enabling branch protection
- [ ] Require status checks to pass
- [ ] Require reviews before merge

### Failed Builds
- [ ] Intentionally break build
- [ ] Verify CI fails appropriately
- [ ] Check error messages are clear
- [ ] Fix and verify recovery

## ✅ Performance

### Build Times
- [ ] Quality job completes in reasonable time
- [ ] Build job completes in reasonable time
- [ ] Total pipeline time is acceptable

### Caching
- [ ] pnpm cache is working
- [ ] Subsequent runs are faster
- [ ] Cache hit rate is good

## ✅ Maintenance

### Regular Checks
- [ ] Review CI logs weekly
- [ ] Monitor artifact storage usage
- [ ] Check for outdated actions
- [ ] Update dependencies regularly

### Documentation Updates
- [ ] Keep docs in sync with changes
- [ ] Update version numbers
- [ ] Add new troubleshooting tips
- [ ] Document any customizations

## 🎯 Success Criteria

All items should be checked before considering the CI/CD setup complete:

### Critical (Must Have)
- ✅ Workflow runs successfully
- ✅ Tests execute
- ✅ Coverage reports generate
- ✅ Extension builds
- ✅ Artifacts upload

### Important (Should Have)
- ✅ Documentation is complete
- ✅ Local testing works
- ✅ Multiple Node versions tested
- ✅ Pre-commit hooks work

### Nice to Have (Could Have)
- ⭕ Codecov integration
- ⭕ Status badges
- ⭕ Branch protection
- ⭕ Automated releases

## 📝 Notes

### Issues Found
Document any issues discovered during verification:

1. Issue: _______________
   - Status: _______________
   - Resolution: _______________

2. Issue: _______________
   - Status: _______________
   - Resolution: _______________

### Improvements Needed
List any improvements to implement:

1. _______________
2. _______________
3. _______________

### Questions
Note any questions or uncertainties:

1. _______________
2. _______________
3. _______________

## 🔄 Re-verification

After making changes, re-verify:

- [ ] Date: _______________
- [ ] Changes made: _______________
- [ ] Verification result: _______________

## 📞 Support

If issues are found:

1. Check [CI_CD_SETUP.md](CI_CD_SETUP.md) troubleshooting section
2. Review [TESTING_CI.md](TESTING_CI.md) for local testing
3. Check GitHub Actions logs
4. Review workflow YAML syntax
5. Consult project maintainers

---

**Last Updated:** 2024
**Checklist Version:** 1.0
