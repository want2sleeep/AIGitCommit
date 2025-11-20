# CI/CD 工作流故障排查指南

本指南帮助您诊断和解决 GitHub Actions CI/CD 工作流中的常见问题。

## 目录

- [快速诊断清单](#快速诊断清单)
- [常见失败场景](#常见失败场景)
- [详细故障排查步骤](#详细故障排查步骤)
- [获取帮助](#获取帮助)

## 快速诊断清单

在推送代码前，在本地运行以下命令以避免 CI 失败：

```bash
# 1. 类型检查
pnpm run type-check

# 2. 代码检查
pnpm run lint

# 3. 格式检查
pnpm run format:check

# 4. 运行测试
pnpm test

# 5. 构建验证
pnpm run vscode:prepublish
```

如果所有命令都成功执行，您的代码应该能通过 CI 检查。

## 常见失败场景

### 1. 类型检查失败

**症状**: CI 工作流在 "Type Check" 步骤失败

**常见原因**:
- TypeScript 类型错误
- 缺少类型定义
- 配置文件问题

**解决方案**:

```bash
# 运行类型检查查看详细错误
pnpm run type-check

# 常见修复:
# - 添加缺失的类型注解
# - 修复类型不匹配
# - 更新 tsconfig.json 配置
```

**示例错误**:
```
src/services/GitService.ts:42:5 - error TS2322: Type 'string | undefined' is not assignable to type 'string'.
```

**修复**:
```typescript
// 错误
const value: string = config.get('key');

// 正确
const value: string = config.get('key') || 'default';
```

### 2. 代码检查失败

**症状**: CI 工作流在 "Run linter" 步骤失败

**常见原因**:
- ESLint 规则违反
- 代码质量问题
- 未使用的变量或导入

**解决方案**:

```bash
# 查看 lint 错误
pnpm run lint

# 自动修复可修复的问题
pnpm run lint:fix

# 手动修复剩余问题
```

**注意**: CI 中的 lint 步骤使用 `continue-on-error: true`，所以警告不会导致 CI 失败，但错误会。

### 3. 格式检查失败

**症状**: CI 工作流在 "Check code formatting" 步骤失败

**常见原因**:
- 代码格式不符合 Prettier 规范
- 缩进、引号、分号等格式问题

**解决方案**:

```bash
# 检查格式问题
pnpm run format:check

# 自动格式化所有文件
pnpm run format

# 重新检查
pnpm run format:check
```

**提示**: 配置编辑器在保存时自动格式化可以避免此问题。

### 4. 测试失败

**症状**: CI 工作流在 "Run tests with coverage" 步骤失败

**常见原因**:
- 测试用例失败
- 测试覆盖率不足
- Mock 配置问题
- 异步测试超时

**解决方案**:

```bash
# 运行测试查看详细错误
pnpm test

# 运行特定测试文件
pnpm test -- src/__tests__/specific.test.ts

# 监听模式（开发时使用）
pnpm run test:watch

# 检查覆盖率
pnpm run test:coverage
```

**常见测试错误**:

1. **断言失败**:
```
Expected: "expected-value"
Received: "actual-value"
```
修复: 检查测试逻辑或实现代码

2. **异步超时**:
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```
修复: 增加超时时间或修复异步逻辑

3. **Mock 问题**:
```
Cannot read property 'mockResolvedValue' of undefined
```
修复: 确保正确配置 mock

### 5. 构建失败

**症状**: CI 工作流在 "Build extension" 或 "Package extension" 步骤失败

**常见原因**:
- 编译错误
- 依赖问题
- 打包配置错误

**解决方案**:

```bash
# 运行构建
pnpm run vscode:prepublish

# 检查依赖
pnpm install --frozen-lockfile

# 清理并重新构建
rm -rf dist out node_modules
pnpm install
pnpm run vscode:prepublish
```

### 6. 依赖安装失败

**症状**: CI 工作流在 "Install dependencies" 步骤失败

**常见原因**:
- pnpm-lock.yaml 不同步
- 依赖版本冲突
- 网络问题

**解决方案**:

```bash
# 更新 lockfile
pnpm install

# 提交更新的 lockfile
git add pnpm-lock.yaml
git commit -m "chore: update pnpm-lock.yaml"
```

### 7. 覆盖率阈值未达标

**症状**: 测试通过但覆盖率警告

**常见原因**:
- 新代码缺少测试
- 覆盖率低于 70% 阈值

**解决方案**:

```bash
# 生成覆盖率报告
pnpm run test:coverage

# 查看详细报告
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

**注意**: CI 中的覆盖率检查使用 `continue-on-error: true`，所以不会导致 CI 失败，但应该努力提高覆盖率。

## 详细故障排查步骤

### 步骤 1: 查看 CI 日志

1. 访问 [Actions 标签页](https://github.com/want2sleeep/AIGitCommit/actions)
2. 点击失败的工作流运行
3. 展开失败的步骤查看详细日志
4. 记录错误消息和堆栈跟踪

### 步骤 2: 本地复现

```bash
# 确保使用相同的 Node.js 版本
node --version  # 应该是 18.x 或 20.x

# 确保使用正确的 pnpm 版本
pnpm --version  # 应该是 10.18.1

# 清理环境
rm -rf node_modules dist out coverage

# 重新安装依赖
pnpm install --frozen-lockfile

# 运行所有检查
pnpm run type-check
pnpm run lint
pnpm run format:check
pnpm test
pnpm run vscode:prepublish
```

### 步骤 3: 检查环境差异

CI 环境和本地环境可能存在差异：

- **Node.js 版本**: CI 使用 18.x 和 20.x 矩阵测试
- **操作系统**: CI 使用 Ubuntu Linux
- **环境变量**: CI 可能缺少某些环境变量
- **文件权限**: Linux 文件权限可能不同

### 步骤 4: 检查 Git 状态

```bash
# 确保所有更改都已提交
git status

# 确保 lockfile 是最新的
git diff pnpm-lock.yaml

# 确保没有未跟踪的文件影响构建
git clean -fdx -n  # 预览将被删除的文件
git clean -fdx     # 实际删除（谨慎使用）
```

### 步骤 5: 检查配置文件

确保以下配置文件正确：

- `tsconfig.json`: TypeScript 配置
- `jest.config.js`: Jest 测试配置
- `.eslintrc.json`: ESLint 配置
- `.prettierrc`: Prettier 配置
- `package.json`: 脚本和依赖配置

### 步骤 6: 检查 CI 工作流配置

查看 `.github/workflows/ci.yml` 确保：

- Node.js 版本矩阵正确
- pnpm 版本正确（10.18.1）
- 所有步骤按正确顺序执行
- 缓存配置正确

## 特定错误消息

### "Cannot find module"

**原因**: 缺少依赖或导入路径错误

**解决方案**:
```bash
# 重新安装依赖
pnpm install

# 检查导入路径
# 确保使用相对路径或正确的模块名
```

### "ELIFECYCLE Command failed"

**原因**: 某个 npm 脚本执行失败

**解决方案**:
```bash
# 查看具体失败的命令
# 单独运行该命令查看详细错误
```

### "Unexpected token"

**原因**: 语法错误或 TypeScript 编译问题

**解决方案**:
```bash
# 运行类型检查
pnpm run type-check

# 检查 TypeScript 配置
```

### "Test suite failed to run"

**原因**: Jest 配置问题或测试文件错误

**解决方案**:
```bash
# 检查 Jest 配置
cat jest.config.js

# 运行单个测试文件定位问题
pnpm test -- path/to/test.ts
```

## 预防措施

### 1. 使用 Pre-commit 钩子

项目已配置 Husky pre-commit 钩子，会在提交前自动运行检查：

```bash
# 确保 Husky 已安装
pnpm run prepare

# 钩子会自动运行:
# - ESLint 检查和修复
# - Prettier 格式化
```

### 2. 配置编辑器

**VSCode 设置** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### 3. 定期更新依赖

```bash
# 检查过时的依赖
pnpm outdated

# 更新依赖
pnpm update

# 运行测试确保更新没有破坏功能
pnpm test
```

### 4. 在推送前本地测试

创建一个本地测试脚本 `scripts/pre-push.sh`:

```bash
#!/bin/bash
set -e

echo "Running pre-push checks..."

echo "1. Type checking..."
pnpm run type-check

echo "2. Linting..."
pnpm run lint

echo "3. Format checking..."
pnpm run format:check

echo "4. Running tests..."
pnpm test

echo "5. Building..."
pnpm run vscode:prepublish

echo "✅ All checks passed!"
```

使用:
```bash
chmod +x scripts/pre-push.sh
./scripts/pre-push.sh
```

## 多版本测试

CI 在 Node.js 18.x 和 20.x 上运行测试。如果只在一个版本上失败：

### 使用 nvm 切换版本

```bash
# 安装 nvm (如果还没有)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装并使用 Node.js 18
nvm install 18
nvm use 18
pnpm test

# 安装并使用 Node.js 20
nvm install 20
nvm use 20
pnpm test
```

## 获取帮助

如果您尝试了上述所有步骤仍然无法解决问题：

1. **搜索现有 Issues**: 查看是否有人遇到类似问题
2. **创建新 Issue**: 提供以下信息：
   - 失败的工作流链接
   - 完整的错误日志
   - 本地环境信息（Node.js 版本、操作系统等）
   - 已尝试的解决方案
3. **联系维护者**: victorhuang.hy@gmail.com

## 相关资源

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [pnpm 文档](https://pnpm.io/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Jest 文档](https://jestjs.io/)
- [ESLint 文档](https://eslint.org/)
- [Prettier 文档](https://prettier.io/)

---

最后更新: 2024-11-20
