) 贡献指南

感谢您对 AI Git Commit 项目的关注！我们欢迎任何形式的贡献，包括但不限于：

- 报告 Bug
- 提出新功能建议
- 提交代码改进
- 完善文档
- 分享使用经验

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试要求](#测试要求)
- [Pull Request 流程](#pull-request-流程)

## 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们承诺：

- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 人身攻击或侮辱性评论
- 公开或私下骚扰
- 未经许可发布他人的私人信息
- 其他不道德或不专业的行为

## 如何贡献

### 报告 Bug

如果您发现了 Bug，请在 GitHub Issues 中创建一个新的 Issue，并包含以下信息：

- **清晰的标题**: 简洁描述问题
- **详细描述**: 说明问题的具体表现
- **复现步骤**: 提供详细的复现步骤
- **预期行为**: 说明您期望的正确行为
- **实际行为**: 说明实际发生的情况
- **环境信息**: 
  - VSCode 版本
  - 扩展版本
  - 操作系统
  - Node.js 版本
- **截图或日志**: 如果可能，提供相关截图或错误日志

### 提出功能建议

如果您有新功能的想法，请创建一个 Feature Request Issue，并包含：

- **功能描述**: 清晰描述您想要的功能
- **使用场景**: 说明这个功能的使用场景
- **预期效果**: 描述功能实现后的预期效果
- **替代方案**: 如果有，说明您考虑过的替代方案

### 提交代码

我们欢迎代码贡献！请遵循以下流程：

1. Fork 项目到您的 GitHub 账号
2. 克隆您 Fork 的仓库到本地
3. 创建一个新的功能分支
4. 进行开发并提交代码
5. 推送到您的 Fork 仓库
6. 创建 Pull Request

## 开发环境设置

### 前置要求

- **Node.js**: >= 16.x（推荐使用 LTS 版本）
- **pnpm**: 10.18.1（项目指定版本）
- **VSCode**: >= 1.85.0
- **Git**: 最新版本
- **TypeScript**: 5.3.3（通过 pnpm 自动安装）

### 系统要求

- **操作系统**: Windows 10+, macOS 10.15+, 或 Linux
- **内存**: 至少 4GB RAM
- **磁盘空间**: 至少 500MB 可用空间

### 安装 pnpm

```bash
# 使用 npm 安装（推荐）
npm install -g pnpm@10.18.1

# 或使用 Homebrew (macOS)
brew install pnpm

# 或使用 Scoop (Windows)
scoop install pnpm

# 验证安装
pnpm --version
# 应显示: 10.18.1
```

### 克隆和设置

```bash
# 1. Fork 项目（在 GitHub 网页上操作）
# 访问 https://github.com/want2sleeep/AIGitCommit
# 点击右上角的 "Fork" 按钮

# 2. 克隆您的 Fork
git clone https://github.com/YOUR_USERNAME/AIGitCommit.git
cd AIGitCommit

# 3. 添加上游仓库
git remote add upstream https://github.com/want2sleeep/AIGitCommit.git

# 4. 安装依赖
pnpm install

# 5. 编译项目
pnpm run compile

# 6. 运行测试
pnpm test
```

### 验证环境

运行以下命令确保开发环境正确配置：

```bash
# 1. 检查编译是否成功
pnpm run compile
# 应该在 out/ 目录生成编译后的文件

# 2. 检查代码规范
pnpm run lint
# 应该显示: ✓ No ESLint warnings or errors

# 3. 检查代码格式
pnpm run format:check
# 应该显示: All files are formatted correctly

# 4. 运行测试
pnpm test
# 应该显示: Tests passed

# 5. 生成测试覆盖率报告
pnpm run test:coverage
# 应该生成 coverage/ 目录并显示覆盖率统计
```

### VSCode 扩展开发设置

1. **安装推荐的 VSCode 扩展**:
   - ESLint
   - Prettier - Code formatter
   - TypeScript and JavaScript Language Features

2. **配置 VSCode 设置**:
   项目已包含 `.vscode/settings.json`，会自动配置：
   - 保存时自动格式化
   - ESLint 自动修复
   - TypeScript 类型检查

3. **调试扩展**:
   - 按 `F5` 启动扩展开发主机
   - 在新窗口中测试扩展功能
   - 使用断点调试代码

### 常见环境问题

#### pnpm 安装失败

```bash
# 清除 pnpm 缓存
pnpm store prune

# 重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### TypeScript 编译错误

```bash
# 清除编译输出
rm -rf out/

# 重新编译
pnpm run compile
```

#### 测试失败

```bash
# 清除 Jest 缓存
pnpm test -- --clearCache

# 重新运行测试
pnpm test
```

## 开发流程

### 1. 同步上游代码

在开始开发前，确保您的代码是最新的：

```bash
# 获取上游更新
git fetch upstream

# 切换到主分支
git checkout main

# 合并上游更新
git merge upstream/main

# 推送到您的 Fork
git push origin main
```

### 2. 创建功能分支

```bash
# 创建并切换到新分支
git checkout -b feature/your-feature-name

# 或修复 Bug
git checkout -b fix/bug-description
```

分支命名规范：
- `feature/xxx`: 新功能
- `fix/xxx`: Bug 修复
- `docs/xxx`: 文档更新
- `refactor/xxx`: 代码重构
- `test/xxx`: 测试相关
- `chore/xxx`: 构建或工具相关

### 3. 开发和测试

```bash
# 启动监听模式（自动编译）
pnpm run watch

# 在另一个终端运行测试
pnpm run test:watch

# 按 F5 在 VSCode 中启动调试
```

### 4. 提交代码

```bash
# 暂存更改
git add .

# 提交（会自动运行 pre-commit 钩子）
git commit -m "feat: add new feature"

# 如果 pre-commit 检查失败，修复问题后重新提交
```

### 5. 推送代码

```bash
# 推送到您的 Fork
git push origin feature/your-feature-name
```

### 6. 创建 Pull Request

1. 访问您的 Fork 仓库页面
2. 点击 "Compare & pull request" 按钮
3. 填写 PR 描述（参考模板）
4. 提交 Pull Request

## 代码规范

### TypeScript 规范

项目使用 TypeScript 5.3.3 并启用严格模式。请遵循以下规范：

#### 类型系统

- **严格类型检查**: 启用所有严格标志
  - `strict: true`
  - `noImplicitAny: true`
  - `strictNullChecks: true`
  - `strictFunctionTypes: true`
  
- **避免 `any` 类型**: 使用具体类型或 `unknown`
  ```typescript
  // ❌ 错误
  function process(data: any) { }
  
  // ✅ 正确
  function process(data: unknown) {
    if (typeof data === 'string') {
      // 类型守卫
    }
  }
  ```

- **明确的类型注解**: 为所有公共函数提供类型
  ```typescript
  // ✅ 正确
  async function generateCommitMessage(
    diff: string,
    config: LLMConfig
  ): Promise<string> {
    // 实现...
  }
  ```

- **使用接口定义复杂类型**
  ```typescript
  interface ILLMService {
    generateMessage(diff: string): Promise<string>;
    validateConfig(config: LLMConfig): boolean;
  }
  ```

- **优先使用 `const` 和 `let`**: 避免使用 `var`
  ```typescript
  // ✅ 正确
  const MAX_RETRIES = 3;
  let currentAttempt = 0;
  
  // ❌ 错误
  var retryCount = 0;
  ```

#### 异步编程

- 使用 `async/await` 而不是 Promise 链
  ```typescript
  // ✅ 正确
  async function fetchData(): Promise<Data> {
    const response = await api.get('/data');
    return response.data;
  }
  
  // ❌ 避免
  function fetchData(): Promise<Data> {
    return api.get('/data').then(response => response.data);
  }
  ```

- 正确处理错误
  ```typescript
  async function safeOperation(): Promise<Result> {
    try {
      return await riskyOperation();
    } catch (error) {
      logger.error('Operation failed:', error);
      throw new CustomError('Operation failed', error);
    }
  }
  ```

### 代码风格

项目使用 ESLint 8.56.0 和 Prettier 3.6.2 自动检查和格式化代码：

```bash
# 检查代码规范
pnpm run lint

# 自动修复问题
pnpm run lint:fix

# 格式化代码
pnpm run format

# 检查格式
pnpm run format:check
```

#### ESLint 配置

项目配置了以下 ESLint 规则：
- TypeScript 推荐规则
- 禁止未使用的变量和参数
- 要求一致的代码风格
- 强制使用分号

#### Prettier 配置

- 单引号
- 无分号（由 ESLint 控制）
- 2 空格缩进
- 行宽 100 字符
- 尾随逗号（ES5）

### 命名规范

#### 文件和目录

- **服务文件**: PascalCase（如 `GitService.ts`, `LLMService.ts`）
- **工具文件**: PascalCase（如 `ErrorHandler.ts`, `UIManager.ts`）
- **测试文件**: `*.test.ts` 后缀（如 `GitService.test.ts`）
- **类型文件**: `interfaces.ts`, `index.ts`
- **目录**: camelCase 或 kebab-case（如 `services/`, `__tests__/`）

#### 代码标识符

- **类名**: PascalCase
  ```typescript
  class ConfigurationManager { }
  class LLMService { }
  ```

- **接口名**: PascalCase，以 `I` 开头
  ```typescript
  interface IGitService { }
  interface ILLMProvider { }
  ```

- **类型别名**: PascalCase
  ```typescript
  type LLMConfig = { /* ... */ };
  type GitChange = { /* ... */ };
  ```

- **函数名**: camelCase
  ```typescript
  function getStagedChanges() { }
  async function generateCommitMessage() { }
  ```

- **变量名**: camelCase
  ```typescript
  const apiEndpoint = 'https://api.example.com';
  let retryCount = 0;
  ```

- **常量名**: UPPER_SNAKE_CASE
  ```typescript
  const MAX_RETRIES = 3;
  const DEFAULT_TIMEOUT = 30000;
  const API_BASE_URL = 'https://api.example.com';
  ```

- **枚举**: PascalCase（枚举名）和 PascalCase（成员）
  ```typescript
  enum LogLevel {
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error'
  }
  ```

### 代码组织

#### 文件结构

```typescript
// 1. 导入语句（按类型分组）
import * as vscode from 'vscode';
import { GitService } from './services/GitService';
import { LLMService } from './services/LLMService';
import type { LLMConfig } from './types';

// 2. 类型定义
interface LocalConfig {
  // ...
}

// 3. 常量
const DEFAULT_CONFIG: LocalConfig = {
  // ...
};

// 4. 主要导出（类或函数）
export class MyService {
  // ...
}

// 5. 辅助函数（如果需要导出）
export function helperFunction() {
  // ...
}
```

#### 模块组织

- **单一职责**: 每个文件只导出一个主要的类或函数
- **相关性**: 相关功能放在同一个目录下
- **索引文件**: 使用 `index.ts` 统一导出模块
  ```typescript
  // src/services/index.ts
  export { GitService } from './GitService';
  export { LLMService } from './LLMService';
  export { ConfigurationManager } from './ConfigurationManager';
  ```

- **避免循环依赖**: 使用依赖注入或接口解耦

#### 服务容器模式

项目使用服务容器模式进行依赖注入：

```typescript
// 注册服务
container.register(ServiceKeys.GitService, GitService);
container.register(ServiceKeys.LLMService, LLMService);

// 解析服务
const gitService = container.resolve<IGitService>(ServiceKeys.GitService);
```

### 注释规范

#### JSDoc 注释

为所有公共接口提供 JSDoc 注释：

```typescript
/**
 * 获取暂存区的文件变更
 * 
 * 此方法会执行 `git diff --cached` 命令来获取暂存区的变更。
 * 如果不在 Git 仓库中，会抛出 GitOperationError。
 * 
 * @returns Promise<GitChange[]> 变更列表，每个变更包含文件路径和状态
 * @throws {GitOperationError} 当 Git 操作失败时抛出
 * 
 * @example
 * ```typescript
 * const changes = await gitService.getStagedChanges();
 * console.log(`Found ${changes.length} staged files`);
 * ```
 */
async function getStagedChanges(): Promise<GitChange[]> {
  // 实现...
}
```

#### 行内注释

- 使用简体中文编写注释
- 解释"为什么"而不是"是什么"
- 复杂逻辑需要详细注释

```typescript
// ✅ 好的注释
// 使用指数退避策略避免 API 限流
const delay = Math.min(1000 * Math.pow(2, attempt), 30000);

// ❌ 不好的注释
// 计算延迟
const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
```

#### TODO 注释

```typescript
// TODO: 添加缓存机制以提升性能
// FIXME: 处理大文件时可能导致内存溢出
// HACK: 临时解决方案，需要重构
```

### 错误处理

#### 自定义错误类

```typescript
export class GitOperationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'GitOperationError';
  }
}
```

#### 错误处理模式

```typescript
// ✅ 正确的错误处理
async function performOperation(): Promise<Result> {
  try {
    const result = await riskyOperation();
    return result;
  } catch (error) {
    // 记录详细错误信息
    logger.error('Operation failed:', {
      error,
      context: 'performOperation'
    });
    
    // 抛出自定义错误
    throw new OperationError(
      '操作失败，请检查配置',
      error as Error
    );
  }
}
```

### 性能最佳实践

- **避免不必要的计算**: 使用缓存和记忆化
- **异步操作**: 使用 Promise.all 并行执行
- **资源清理**: 使用 try-finally 或 dispose 模式
- **大数据处理**: 使用流式处理而不是一次性加载

```typescript
// ✅ 并行执行
const [config, changes] = await Promise.all([
  getConfiguration(),
  getStagedChanges()
]);

// ✅ 资源清理
const resource = await acquireResource();
try {
  await useResource(resource);
} finally {
  await resource.dispose();
}
```

## 提交规范

### 约定式提交

项目严格遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。这有助于：
- 自动生成 CHANGELOG
- 自动确定版本号（语义化版本）
- 提供清晰的提交历史

#### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**组成部分**:
- **type**: 提交类型（必需）
- **scope**: 影响范围（可选）
- **subject**: 简短描述（必需）
- **body**: 详细描述（可选）
- **footer**: 关联 Issue 或 Breaking Changes（可选）

### 提交类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(llm): add Claude API support` |
| `fix` | Bug 修复 | `fix(git): handle binary files correctly` |
| `docs` | 文档更新 | `docs(readme): update installation guide` |
| `style` | 代码格式（不影响功能） | `style: format code with prettier` |
| `refactor` | 重构（不改变功能） | `refactor(config): extract validation logic` |
| `perf` | 性能优化 | `perf(diff): optimize large file processing` |
| `test` | 测试相关 | `test(llm): add unit tests for LLMService` |
| `chore` | 构建或工具变动 | `chore: update dependencies` |
| `ci` | CI 配置变动 | `ci: add automated release workflow` |
| `revert` | 回滚提交 | `revert: revert "feat: add feature X"` |

### 提交范围（Scope）

常用的 scope 包括：

- `llm`: LLM 服务相关
- `git`: Git 操作相关
- `config`: 配置管理
- `ui`: 用户界面
- `i18n`: 国际化
- `cache`: 缓存管理
- `perf`: 性能监控
- `security`: 安全相关
- `test`: 测试相关
- `docs`: 文档

### 提交消息规范

#### 标题（Subject）

- **长度**: 不超过 72 个字符
- **语言**: 使用简体中文
- **时态**: 使用现在时（"添加"而不是"已添加"）
- **首字母**: 小写
- **标点**: 不要在末尾加句号

```bash
# ✅ 正确
feat(llm): 添加 Azure OpenAI 支持

# ❌ 错误
Feat(LLM): 已添加了 Azure OpenAI 的支持。
```

#### 正文（Body）

- 详细说明改动的原因和内容
- 使用列表说明多个变更
- 解释"为什么"而不仅仅是"是什么"
- 每行不超过 100 个字符

```
feat(api): 添加 API 请求重试机制

- 实现指数退避策略，避免频繁重试
- 添加可配置的最大重试次数（默认 3 次）
- 处理 429 限流错误，自动延迟重试
- 添加重试日志记录，便于调试

这个功能可以提高 API 调用的可靠性，特别是在网络不稳定
或 API 服务临时不可用的情况下。
```

#### 脚注（Footer）

- **关联 Issue**: 使用 `Closes #123` 或 `Fixes #123`
- **Breaking Changes**: 使用 `BREAKING CHANGE:` 前缀
- **多个 Issue**: 使用逗号分隔

```
feat(config): 重构配置系统

BREAKING CHANGE: 配置文件格式已更改

旧格式:
{
  "apiKey": "sk-xxx",
  "model": "gpt-4"
}

新格式:
{
  "provider": {
    "type": "openai",
    "config": {
      "apiKey": "sk-xxx",
      "model": "gpt-4"
    }
  }
}

Closes #45, #67
```

### 提交示例

#### 新功能

```bash
git commit -m "feat(llm): 添加 Gemini API 支持

- 实现 GeminiProvider 类
- 添加 Gemini 特定的配置选项
- 更新配置向导以支持 Gemini
- 添加相关文档和示例

Closes #123"
```

#### Bug 修复

```bash
git commit -m "fix(git): 正确处理二进制文件

修复了在 diff 中包含二进制文件时导致的解析错误。
现在会自动跳过二进制文件，只处理文本文件。

Fixes #89"
```

#### 文档更新

```bash
git commit -m "docs(readme): 更新安装说明

- 添加 pnpm 安装步骤
- 更新系统要求
- 添加常见问题解答
- 修正拼写错误"
```

#### 重构

```bash
git commit -m "refactor(config): 提取配置验证逻辑

将配置验证逻辑从 ConfigurationManager 提取到
独立的 ConfigurationValidator 类，提高代码可测试性
和可维护性。"
```

#### 性能优化

```bash
git commit -m "perf(cache): 实现配置缓存机制

- 添加 CacheManager 服务
- 实现 TTL 过期机制
- 缓存频繁访问的配置项
- 减少磁盘 I/O 操作

性能测试显示配置读取速度提升 60%。"
```

#### 测试

```bash
git commit -m "test(llm): 添加 LLMService 属性测试

使用 fast-check 库添加属性测试，验证：
- API 调用重试机制
- 错误处理逻辑
- 配置验证

测试覆盖率从 75% 提升到 90%。"
```

### Pre-commit 钩子

项目配置了 Husky pre-commit 钩子，会在提交前自动运行：

1. **ESLint 检查**: 自动修复代码规范问题
2. **Prettier 格式化**: 自动格式化代码
3. **类型检查**: 验证 TypeScript 类型

如果检查失败，提交会被阻止。修复问题后重新提交：

```bash
# 提交被阻止
git commit -m "feat: add new feature"
# ❌ ESLint found 3 errors

# 修复问题
pnpm run lint:fix

# 重新提交
git commit -m "feat: add new feature"
# ✅ Commit successful
```

### 提交最佳实践

1. **原子提交**: 每个提交只做一件事
2. **频繁提交**: 小步快跑，便于回滚
3. **清晰描述**: 让其他人能理解你的改动
4. **关联 Issue**: 使用 `Closes #123` 关联相关 Issue
5. **测试通过**: 确保所有测试通过后再提交
6. **代码审查**: 提交前自己先审查一遍代码

### 提交流程

```bash
# 1. 查看变更
git status
git diff

# 2. 暂存变更
git add <files>

# 3. 提交（会触发 pre-commit 钩子）
git commit -m "type(scope): subject"

# 4. 如果需要修改最后一次提交
git commit --amend

# 5. 推送到远程
git push origin <branch-name>
```

### 提交消息模板

可以配置 Git 提交消息模板：

```bash
# 创建模板文件
cat > ~/.gitmessage << EOF
# <type>(<scope>): <subject>
# 
# <body>
# 
# <footer>
# 
# 类型: feat, fix, docs, style, refactor, perf, test, chore, ci, revert
# 范围: llm, git, config, ui, i18n, cache, perf, security, test, docs
# 
# 示例:
# feat(llm): 添加 Claude API 支持
# 
# - 实现 ClaudeProvider 类
# - 添加配置选项
# - 更新文档
# 
# Closes #123
EOF

# 配置 Git 使用模板
git config --global commit.template ~/.gitmessage
```

## 测试要求

### 测试覆盖率

- **新功能**: 必须包含单元测试和属性测试
- **目标覆盖率**: 整体 85%+
- **关键功能**: 需要达到 90%+ 覆盖率
- **分支覆盖率**: 80%+

### 测试类型

项目使用双重测试策略：

1. **单元测试**: 验证具体示例和边界条件
2. **属性测试**: 验证通用属性和不变量

两种测试互补，共同提供全面的测试覆盖。

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式（开发时使用）
pnpm run test:watch

# 生成覆盖率报告
pnpm run test:coverage

# 运行特定测试文件
pnpm test GitService.test.ts

# 运行特定测试套件
pnpm test -- --testNamePattern="CacheManager"
```

### 编写单元测试

单元测试文件放在 `src/__tests__/` 或 `src/services/__tests__/` 目录下：

```typescript
// src/services/__tests__/GitService.test.ts
import { GitService } from '../GitService';

describe('GitService', () => {
  let gitService: GitService;

  beforeEach(() => {
    gitService = new GitService();
  });

  describe('isGitRepository', () => {
    it('应当在 Git 仓库中返回 true', () => {
      const isRepo = gitService.isGitRepository();
      expect(isRepo).toBe(true);
    });

    it('应当在非 Git 仓库中返回 false', () => {
      // Mock 非 Git 环境
      jest.spyOn(gitService, 'isGitRepository').mockReturnValue(false);
      const isRepo = gitService.isGitRepository();
      expect(isRepo).toBe(false);
    });
  });

  describe('getStagedChanges', () => {
    it('应当返回暂存区的文件列表', async () => {
      const changes = await gitService.getStagedChanges();
      expect(Array.isArray(changes)).toBe(true);
    });

    it('应当在没有暂存文件时返回空数组', async () => {
      // Mock 空暂存区
      jest.spyOn(gitService, 'getStagedChanges').mockResolvedValue([]);
      const changes = await gitService.getStagedChanges();
      expect(changes).toEqual([]);
    });

    it('应当在 Git 操作失败时抛出错误', async () => {
      // Mock Git 错误
      jest.spyOn(gitService, 'getStagedChanges').mockRejectedValue(
        new Error('Git operation failed')
      );
      await expect(gitService.getStagedChanges()).rejects.toThrow();
    });
  });
});
```

### 编写属性测试

属性测试使用 `fast-check` 库，验证通用属性：

```typescript
// src/services/__tests__/CacheManager.property.test.ts
import * as fc from 'fast-check';
import { CacheManager } from '../CacheManager';

/**
 * Feature: project-optimization-recommendations, Property 2: 缓存命中提升性能
 * 验证需求: 2.3
 */
describe('CacheManager - Property Tests', () => {
  it('属性 2: 缓存命中应当显著提升性能', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.anything(),
        async (key, value) => {
          const cache = new CacheManager();
          
          // 首次设置（无缓存）
          const start1 = Date.now();
          cache.set(key, value);
          const duration1 = Date.now() - start1;
          
          // 第二次获取（有缓存）
          const start2 = Date.now();
          const cached = cache.get(key);
          const duration2 = Date.now() - start2;
          
          // 验证缓存命中
          expect(cached).toEqual(value);
          
          // 验证性能提升（缓存应该更快）
          expect(duration2).toBeLessThan(duration1 * 0.5);
        }
      ),
      { numRuns: 100 } // 运行 100 次迭代
    );
  });

  it('属性: 缓存过期后应当返回 undefined', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.anything(),
        fc.integer({ min: 1, max: 100 }),
        async (key, value, ttl) => {
          const cache = new CacheManager();
          
          // 设置缓存并等待过期
          cache.set(key, value, ttl);
          await new Promise(resolve => setTimeout(resolve, ttl + 10));
          
          // 验证缓存已过期
          const cached = cache.get(key);
          expect(cached).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });
});
```

### 属性测试标注规范

每个属性测试必须包含以下标注：

```typescript
/**
 * Feature: <feature-name>, Property <number>: <property-description>
 * 验证需求: <requirement-id>
 */
```

这有助于追踪测试与设计文档中正确性属性的对应关系。

### 测试最佳实践

#### 单元测试

1. **独立性**: 测试应该独立且可重复
2. **描述性**: 使用清晰的测试名称（中文）
3. **AAA 模式**: Arrange（准备）、Act（执行）、Assert（断言）
4. **Mock 外部依赖**: 隔离被测试单元
5. **边界条件**: 测试边界值和错误场景

```typescript
describe('ConfigurationValidator', () => {
  describe('validateApiKey', () => {
    // Arrange
    let validator: ConfigurationValidator;
    
    beforeEach(() => {
      validator = new ConfigurationValidator();
    });

    it('应当在密钥有效时返回 true', () => {
      // Arrange
      const validKey = 'sk-1234567890abcdefghij';
      
      // Act
      const result = validator.validateApiKey(validKey);
      
      // Assert
      expect(result).toBe(true);
    });

    it('应当在密钥过短时抛出错误', () => {
      // Arrange
      const shortKey = 'sk-123';
      
      // Act & Assert
      expect(() => validator.validateApiKey(shortKey))
        .toThrow('API 密钥长度不足');
    });
  });
});
```

#### 属性测试

1. **通用性**: 测试应该对所有有效输入成立
2. **生成器**: 使用合适的 fast-check 生成器
3. **迭代次数**: 至少 100 次迭代
4. **不变量**: 验证系统不变量
5. **往返属性**: 测试序列化/反序列化等往返操作

```typescript
// 往返属性示例
it('属性: 序列化往返一致性', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        apiKey: fc.string(),
        model: fc.string(),
        temperature: fc.float({ min: 0, max: 2 })
      }),
      async (config) => {
        // 序列化
        const serialized = JSON.stringify(config);
        
        // 反序列化
        const deserialized = JSON.parse(serialized);
        
        // 验证往返一致性
        expect(deserialized).toEqual(config);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Mock 和 Stub

#### Mock VSCode API

```typescript
// src/__mocks__/vscode.ts 已提供 VSCode API Mock
import * as vscode from 'vscode';

// 在测试中使用
jest.mock('vscode');

it('应当显示信息消息', () => {
  const showInformationMessage = jest.spyOn(
    vscode.window,
    'showInformationMessage'
  );
  
  // 执行操作
  myService.showSuccess();
  
  // 验证调用
  expect(showInformationMessage).toHaveBeenCalledWith('操作成功');
});
```

#### Mock 服务依赖

```typescript
// Mock LLMService
const mockLLMService = {
  generateMessage: jest.fn().mockResolvedValue('feat: add new feature'),
  validateConfig: jest.fn().mockReturnValue(true)
};

// 注入 Mock
const commandHandler = new CommandHandler(mockLLMService);
```

### 测试覆盖率报告

运行测试覆盖率后，可以查看详细报告：

```bash
# 生成覆盖率报告
pnpm run test:coverage

# 在浏览器中查看
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

覆盖率报告包括：
- 语句覆盖率
- 分支覆盖率
- 函数覆盖率
- 行覆盖率

### 测试调试

#### 使用 VSCode 调试器

1. 在测试文件中设置断点
2. 打开 VSCode 调试面板
3. 选择 "Jest Current File" 配置
4. 按 F5 开始调试

#### 使用 console.log

```typescript
it('调试测试', () => {
  const result = myFunction();
  console.log('Result:', result); // 调试输出
  expect(result).toBe(expected);
});
```

#### 运行单个测试

```typescript
// 使用 .only 只运行这个测试
it.only('应当通过这个测试', () => {
  expect(true).toBe(true);
});

// 使用 .skip 跳过这个测试
it.skip('暂时跳过这个测试', () => {
  expect(false).toBe(true);
});
```

## Pull Request 流程

### PR 检查清单

在提交 PR 前，请确保：

- [ ] 代码通过所有 lint 检查
- [ ] 代码格式符合 Prettier 规范
- [ ] 所有测试通过
- [ ] 测试覆盖率达标
- [ ] 更新了相关文档
- [ ] 提交消息符合约定式提交规范
- [ ] PR 描述清晰完整

### PR 描述模板

```markdown
## 变更类型

- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 其他

## 变更描述

简要描述这个 PR 的主要变更内容。

## 相关 Issue

Closes #123

## 测试

描述如何测试这些变更：

1. 步骤 1
2. 步骤 2
3. 步骤 3

## 截图（如果适用）

添加相关截图。

## 检查清单

- [ ] 代码通过 lint 检查
- [ ] 所有测试通过
- [ ] 更新了文档
- [ ] 添加了测试
```

### PR 审查流程

1. **自动检查**: CI 会自动运行测试和检查
2. **代码审查**: 维护者会审查您的代码
3. **反馈和修改**: 根据反馈进行必要的修改
4. **合并**: 审查通过后，维护者会合并您的 PR

### 响应反馈

- 及时响应审查意见
- 对每个评论进行回复或修改
- 如有不同意见，礼貌地讨论
- 修改后推送新的提交

## 项目结构

```
AIGitCommit/
├── .github/              # GitHub 配置
│   └── workflows/        # CI/CD 工作流
│       ├── ci.yml        # 持续集成
│       └── publish.yml   # 自动发布
├── .husky/               # Git 钩子
│   └── pre-commit        # 提交前检查
├── .kiro/                # Kiro 配置
│   ├── specs/            # 功能规格文档
│   └── steering/         # 开发指导规则
├── coverage/             # 测试覆盖率报告
├── docs/                 # 项目文档
│   ├── configuration/    # 配置指南
│   ├── development/      # 开发文档
│   ├── guides/           # 使用指南
│   └── resources/        # 资源文档
├── out/                  # 编译输出
├── resources/            # 资源文件
│   └── icon.png          # 扩展图标
├── scripts/              # 构建脚本
│   └── version/          # 版本管理脚本
├── src/                  # 源代码
│   ├── services/         # 服务层
│   │   ├── CacheManager.ts              # 缓存管理
│   │   ├── CommandHandler.ts            # 命令处理
│   │   ├── CommitMessagePreviewManager.ts # 提交信息预览
│   │   ├── ConfigPresetManager.ts       # 配置预设
│   │   ├── ConfigurationManager.ts      # 配置管理
│   │   ├── ConfigurationMigrator.ts     # 配置迁移
│   │   ├── ConfigurationPanelManager.ts # 配置面板
│   │   ├── ConfigurationProvider.ts     # 配置提供者
│   │   ├── ConfigurationStatusChecker.ts # 配置状态检查
│   │   ├── ConfigurationValidator.ts    # 配置验证
│   │   ├── ConfigurationWizard.ts       # 配置向导
│   │   ├── CustomCandidatesManager.ts   # 自定义候选项
│   │   ├── FirstTimeUserGuide.ts        # 首次用户指南
│   │   ├── GitService.ts                # Git 操作
│   │   ├── HealthCheckService.ts        # 健康检查
│   │   ├── HistoryManager.ts            # 历史记录
│   │   ├── i18nService.ts               # 国际化
│   │   ├── LLMService.ts                # LLM API 集成
│   │   ├── LogManager.ts                # 日志管理
│   │   ├── PerformanceMonitor.ts        # 性能监控
│   │   ├── ProviderManager.ts           # 提供商管理
│   │   ├── ProxyConfigManager.ts        # 代理配置
│   │   ├── RequestQueueManager.ts       # 请求队列
│   │   ├── ResourceCleanupManager.ts    # 资源清理
│   │   ├── SensitiveDataSanitizer.ts    # 敏感数据脱敏
│   │   ├── ServiceContainer.ts          # 服务容器
│   │   ├── SSLValidator.ts              # SSL 验证
│   │   ├── TemplateManager.ts           # 模板管理
│   │   ├── WelcomePageManager.ts        # 欢迎页面
│   │   ├── __tests__/                   # 服务测试
│   │   └── index.ts                     # 服务导出
│   ├── utils/            # 工具类
│   │   ├── ErrorHandler.ts              # 错误处理
│   │   ├── UIManager.ts                 # UI 管理
│   │   ├── cache.ts                     # 缓存工具
│   │   ├── common.ts                    # 通用工具
│   │   ├── configUtils.ts               # 配置工具
│   │   ├── retry.ts                     # 重试逻辑
│   │   ├── typeGuards.ts                # 类型守卫
│   │   ├── validation.ts                # 验证工具
│   │   ├── validationUtils.ts           # 验证辅助
│   │   ├── __tests__/                   # 工具测试
│   │   └── index.ts                     # 工具导出
│   ├── types/            # 类型定义
│   │   ├── interfaces.ts                # 接口定义
│   │   └── index.ts                     # 类型导出
│   ├── locales/          # 国际化资源
│   │   ├── zh-CN.json                   # 简体中文
│   │   └── en-US.json                   # 英文
│   ├── errors/           # 错误类
│   │   └── index.ts
│   ├── __tests__/        # 测试文件
│   │   ├── *.test.ts                    # 单元测试
│   │   ├── *.property.test.ts           # 属性测试
│   │   └── integration.test.ts          # 集成测试
│   ├── __mocks__/        # Mock 文件
│   │   └── vscode.ts                    # VSCode API Mock
│   ├── extension.ts      # 扩展入口
│   └── constants.ts      # 常量定义
├── .eslintrc.json        # ESLint 配置
├── .prettierrc           # Prettier 配置
├── .npmrc                # pnpm 配置
├── jest.config.js        # Jest 配置
├── tsconfig.json         # TypeScript 配置
├── package.json          # 项目配置
├── CHANGELOG.md          # 变更日志
├── CONTRIBUTING.md       # 贡献指南
└── README.md             # 项目文档
```

### 核心服务说明

#### 性能优化服务

- **CacheManager**: 缓存管理，支持 TTL 过期机制
- **RequestQueueManager**: 请求队列，防止 API 限流
- **ResourceCleanupManager**: 资源清理，防止内存泄漏
- **PerformanceMonitor**: 性能监控，记录关键操作指标

#### 国际化服务

- **i18nService**: 国际化服务，支持多语言切换
- **locales/**: 语言资源文件（中文、英文）

#### 可观测性服务

- **LogManager**: 日志管理，结构化日志记录
- **HealthCheckService**: 健康检查，系统状态监控

#### 安全服务

- **SensitiveDataSanitizer**: 敏感数据脱敏
- **SSLValidator**: SSL 证书验证
- **ProxyConfigManager**: 代理配置管理

#### 功能增强服务

- **TemplateManager**: 模板管理，自定义提交信息模板
- **HistoryManager**: 历史记录管理
- **ConfigPresetManager**: 配置预设管理
- **CommitMessagePreviewManager**: 提交信息预览和编辑
- **WelcomePageManager**: 首次用户欢迎页面

## CI/CD 工作流

### GitHub Actions 工作流

本项目使用 GitHub Actions 进行持续集成和自动发布：

- **CI 工作流** (`.github/workflows/ci.yml`): 在每次 push 和 PR 时运行
  - 代码质量检查（lint、format、type-check）
  - 运行测试套件
  - 验证构建成功

- **发布工作流** (`.github/workflows/publish.yml`): 在创建 GitHub Release 时触发
  - 验证版本号和 CHANGELOG
  - 运行完整的质量检查
  - 构建并打包扩展
  - 将 VSIX 文件上传为 Release 资产
  - 自动发布到 VS Code 插件市场
  - 在 Release 中添加发布状态反馈

### 工作流故障排查

如果您的 PR 或提交导致工作流失败：

1. **查看失败日志**
   - 访问 [Actions 标签页](https://github.com/want2sleeep/AIGitCommit/actions)
   - 点击失败的工作流运行
   - 查看详细的错误信息

2. **本地复现问题**
   ```bash
   # 运行相同的检查
   pnpm run lint
   pnpm run format:check
   pnpm run type-check
   pnpm test
   pnpm run build
   ```

3. **常见问题**
   - **Lint 错误**: 运行 `pnpm run lint:fix` 自动修复
   - **格式问题**: 运行 `pnpm run format` 格式化代码
   - **类型错误**: 检查 TypeScript 编译错误并修复
   - **测试失败**: 确保所有测试通过

4. **详细故障排查**
   - 参考 [工作流故障排查指南](.github/TROUBLESHOOTING.md)
   - 包含常见失败场景和解决方案
   - 提供快速诊断清单

### Pre-commit 钩子

项目配置了 Husky pre-commit 钩子，会在提交前自动运行：
- ESLint 检查并自动修复
- Prettier 格式化
- 这有助于在本地捕获问题，避免 CI 失败

## 获取帮助

如果您在贡献过程中遇到问题：

1. 查看 [README.md](README.md) 和相关文档
2. 查看 [工作流故障排查指南](.github/TROUBLESHOOTING.md)（针对 CI/CD 问题）
3. 搜索现有的 Issues
4. 在 GitHub Issues 中提问
5. 联系维护者: victorhuang.hy@gmail.com

## 许可证

通过贡献代码，您同意您的贡献将在 MIT 许可证下发布。

## 致谢

感谢所有为这个项目做出贡献的开发者！

---

再次感谢您的贡献！🎉
