# 发布指南 (Publishing Guide)

本文档详细说明如何将 AI Git Commit 扩展发布到 Visual Studio Code 插件市场。

## 目录

- [概述](#概述)
- [前置要求](#前置要求)
- [发布流程](#发布流程)
- [版本号约定](#版本号约定)
- [CHANGELOG 更新要求](#changelog-更新要求)
- [预发布版本](#预发布版本)
- [PAT 设置指南](#pat-设置指南)
- [干运行测试](#干运行测试)
- [故障排除](#故障排除)

## 概述

AI Git Commit 使用 GitHub Actions 自动化发布流程。当您创建 GitHub Release 时，工作流会自动：

1. ✅ 验证版本号格式和一致性
2. ✅ 运行代码质量检查（lint、format、compile、test）
3. ✅ 构建并打包扩展为 VSIX 文件
4. ✅ 发布到 VS Code 插件市场
5. ✅ 在 Release 上发布成功通知

## 前置要求

在发布新版本之前，请确保：

- [ ] 所有代码更改已合并到 `main` 分支
- [ ] 所有测试通过：`pnpm test`
- [ ] 代码质量检查通过：`pnpm run lint` 和 `pnpm run format:check`
- [ ] `package.json` 中的版本号已更新
- [ ] `CHANGELOG.md` 已更新，包含新版本的条目
- [ ] 已配置 `VSCE_PAT` GitHub Secret（首次发布时）

## 发布流程

### 步骤 1: 更新版本号

在 `package.json` 中更新版本号：

```json
{
  "version": "1.1.1"
}
```

**版本号规则：**
- 遵循语义化版本规范（Semantic Versioning）
- 格式：`MAJOR.MINOR.PATCH`
- 示例：`1.1.1`、`2.0.0`、`1.2.3-beta.1`


### 步骤 2: 更新 CHANGELOG

在 `CHANGELOG.md` 中添加新版本的条目：

```markdown
## [1.1.1] - 2024-01-15

### Added
- 新增功能描述

### Changed
- 修改内容描述

### Fixed
- 修复的问题描述
```

**格式要求：**
- 必须包含版本号标题：`## [1.1.1]` 或 `## 1.1.1`
- 建议包含发布日期
- 使用标准的变更类型：Added、Changed、Deprecated、Removed、Fixed、Security

### 步骤 3: 提交更改

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.1"
git push origin main
```

### 步骤 4: 创建 GitHub Release

1. 访问 GitHub 仓库的 [Releases 页面](https://github.com/want2sleeep/AIGitCommit/releases)
2. 点击 **"Draft a new release"**
3. 填写 Release 信息：
   - **Tag version**: `v1.1.1`（必须以 `v` 开头）
   - **Release title**: `v1.1.1` 或描述性标题
   - **Description**: 从 CHANGELOG 复制更新内容
4. 如果是预发布版本，勾选 **"Set as a pre-release"**
5. 点击 **"Publish release"**

### 步骤 5: 监控发布流程

1. 发布 Release 后，GitHub Actions 工作流会自动触发
2. 访问 [Actions 标签页](https://github.com/want2sleeep/AIGitCommit/actions) 查看进度
3. 工作流通常在 6-10 分钟内完成
4. 成功后，会在 Release 页面看到成功通知评论


## 版本号约定

本项目遵循 [语义化版本规范 (Semantic Versioning)](https://semver.org/lang/zh-CN/)。

### 版本格式

```
MAJOR.MINOR.PATCH[-PRERELEASE]
```

### 版本递增规则

- **MAJOR（主版本号）**: 不兼容的 API 修改
  - 示例：`1.0.0` → `2.0.0`
  - 场景：重大重构、破坏性变更

- **MINOR（次版本号）**: 向下兼容的功能性新增
  - 示例：`1.0.0` → `1.1.0`
  - 场景：新增功能、新增配置选项

- **PATCH（修订号）**: 向下兼容的问题修正
  - 示例：`1.0.0` → `1.0.1`
  - 场景：Bug 修复、文档更新、性能优化

- **PRERELEASE（预发布标识）**: 可选的预发布版本标识
  - 示例：`1.1.1-beta.1`、`2.0.0-rc.1`
  - 场景：测试版本、候选版本

### 标签格式要求

GitHub Release 标签必须遵循以下格式：

```
v[MAJOR].[MINOR].[PATCH][-PRERELEASE]
```

**有效示例：**
- ✅ `v1.0.0`
- ✅ `v1.1.1`
- ✅ `v2.0.0-beta.1`
- ✅ `v1.1.1-rc.2`
- ✅ `v1.0.1-alpha.3`

**无效示例：**
- ❌ `1.0.0`（缺少 `v` 前缀）
- ❌ `v1.0`（缺少 PATCH 版本号）
- ❌ `version-1.0.0`（格式错误）
- ❌ `v1.0.0.1`（版本号过多）


## CHANGELOG 更新要求

每次发布前必须更新 `CHANGELOG.md` 文件。

### 格式规范

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2024-01-15

### Added
- 新增 Ollama 本地模型支持
- 添加自定义提示词模板功能

### Changed
- 优化 API 调用性能
- 改进错误提示信息

### Fixed
- 修复在大型仓库中的性能问题
- 修复 Azure OpenAI 认证错误

## [1.1.0] - 2024-01-01

### Added
- 初始版本发布
```

### 变更类型说明

- **Added**: 新增功能
- **Changed**: 功能变更
- **Deprecated**: 即将废弃的功能
- **Removed**: 已移除的功能
- **Fixed**: Bug 修复
- **Security**: 安全性修复

### 验证规则

发布工作流会验证 CHANGELOG.md 是否包含当前版本的条目：

```bash
# 工作流会检查以下格式
## [1.2.0]    # 推荐格式
## 1.2.0      # 也支持
```

**如果验证失败：**
- 工作流会立即停止
- 错误消息：`CHANGELOG.md 不包含版本 X.Y.Z 的条目`
- 需要更新 CHANGELOG.md 后重新发布


## 预发布版本

预发布版本用于在正式发布前进行测试和验证。

### 创建预发布版本

#### 方法 1: 使用预发布标签格式

1. 更新 `package.json` 版本号为预发布格式：
   ```json
   {
     "version": "1.2.0-beta.1"
   }
   ```

2. 更新 CHANGELOG.md：
   ```markdown
   ## [1.2.0-beta.1] - 2024-01-15
   
   ### Added
   - 测试新功能
   ```

3. 创建 GitHub Release：
   - Tag: `v1.2.0-beta.1`
   - 勾选 **"Set as a pre-release"**

#### 方法 2: 仅标记为预发布

1. 使用正常版本号（如 `1.2.0`）
2. 创建 Release 时勾选 **"Set as a pre-release"**
3. 工作流会自动检测并使用 `--pre-release` 标志发布

### 预发布版本特点

- 在插件市场标记为 "Pre-release"
- 用户需要手动选择安装预发布版本
- 不会自动推送给所有用户
- 适合 Beta 测试和功能验证

### 预发布版本命名约定

- **Alpha**: `1.2.0-alpha.1` - 内部测试版本
- **Beta**: `1.2.0-beta.1` - 公开测试版本
- **RC**: `1.2.0-rc.1` - 候选发布版本

### 从预发布到正式版本

1. 完成测试和修复
2. 更新版本号为正式版本：`1.2.0`
3. 更新 CHANGELOG.md
4. 创建正式 Release（不勾选 pre-release）


## PAT 设置指南

Personal Access Token (PAT) 用于向 VS Code 插件市场进行身份验证。首次发布时需要配置。

### 步骤 1: 获取 VS Code Marketplace PAT

1. **访问 Visual Studio Marketplace 管理页面**
   - 打开 https://marketplace.visualstudio.com/manage
   - 使用您的 Microsoft 账户登录

2. **创建 Personal Access Token**
   - 点击右上角的用户名
   - 选择 **"Security"** 或 **"Personal Access Tokens"**
   - 点击 **"+ New Token"** 或 **"Create"**

3. **配置 Token 信息**
   - **Name**: 输入描述性名称（如 `AIGitCommit-GitHub-Actions`）
   - **Organization**: 选择 **"All accessible organizations"**
   - **Expiration**: 选择过期时间（建议 90 天或自定义）
   - **Scopes**: 选择 **"Marketplace"**
     - 勾选 **"Manage"** 权限（必需）
     - 这允许发布和更新扩展

4. **生成并保存 Token**
   - 点击 **"Create"**
   - **重要**: 立即复制生成的 Token
   - Token 只显示一次，请妥善保存

### 步骤 2: 添加 PAT 到 GitHub Secrets

1. **访问 GitHub 仓库设置**
   - 打开 https://github.com/want2sleeep/AIGitCommit/settings/secrets/actions
   - 或导航到：仓库 → Settings → Secrets and variables → Actions

2. **创建新 Secret**
   - 点击 **"New repository secret"**
   - **Name**: 输入 `VSCE_PAT`（必须完全匹配）
   - **Value**: 粘贴从 Marketplace 复制的 Token
   - 点击 **"Add secret"**

3. **验证 Secret 已添加**
   - 在 Secrets 列表中应该看到 `VSCE_PAT`
   - 值会被隐藏显示为 `***`


### PAT 权限范围说明

发布扩展需要以下权限：

| 权限 | 范围 | 说明 |
|------|------|------|
| **Marketplace** | Manage | 允许发布、更新和管理扩展 |

**不需要的权限：**
- Code (Read/Write) - 不需要
- Packaging (Read) - 不需要
- 其他权限 - 不需要

**安全建议：**
- 仅授予必需的 Marketplace Manage 权限
- 定期轮换 Token（建议每 90 天）
- 不要在代码或日志中暴露 Token
- 如果 Token 泄露，立即撤销并创建新的

### 首次设置验证步骤

配置完成后，建议进行验证：

#### 方法 1: 使用干运行模式测试

```bash
# 1. 手动触发工作流
# 访问: https://github.com/want2sleeep/AIGitCommit/actions/workflows/publish.yml
# 点击 "Run workflow"
# 勾选 "干运行（仅打包，不发布）"
# 点击 "Run workflow"

# 2. 观察工作流执行
# - 验证步骤应该通过
# - 质量检查应该通过
# - 打包步骤应该成功
# - 不会实际发布到市场
```

#### 方法 2: 创建测试 Release

1. 创建一个测试版本（如 `v0.0.1-test.1`）
2. 标记为预发布
3. 观察工作流是否成功完成
4. 如果成功，可以在市场上删除测试版本

### PAT 轮换流程

当 Token 即将过期或需要更新时：

1. **创建新 Token**
   - 访问 Marketplace 管理页面
   - 创建新的 PAT（按照上述步骤）

2. **更新 GitHub Secret**
   - 访问仓库 Secrets 设置
   - 点击 `VSCE_PAT` 旁的 **"Update"**
   - 粘贴新的 Token 值
   - 点击 **"Update secret"**

3. **验证新 Token**
   - 使用干运行模式测试
   - 或等待下次正常发布

4. **撤销旧 Token**
   - 返回 Marketplace 管理页面
   - 找到旧的 Token
   - 点击 **"Revoke"** 撤销


## 干运行测试

在正式发布前，可以使用干运行模式测试发布流程。

### 什么是干运行模式？

干运行模式会执行所有发布步骤，但不会实际发布到插件市场：

- ✅ 运行版本验证
- ✅ 运行质量检查
- ✅ 构建和打包扩展
- ✅ 上传 VSIX 制品
- ❌ 不发布到插件市场
- ❌ 不创建 Release 评论

### 如何使用干运行模式

1. **访问 Actions 页面**
   - 打开 https://github.com/want2sleeep/AIGitCommit/actions/workflows/publish.yml

2. **手动触发工作流**
   - 点击右上角的 **"Run workflow"** 按钮
   - 选择分支（通常是 `main`）
   - 勾选 **"干运行（仅打包，不发布）"** 选项
   - 点击 **"Run workflow"**

3. **查看执行结果**
   - 工作流会在几分钟内完成
   - 所有步骤应该显示为绿色（成功）
   - 在 Artifacts 部分可以下载 VSIX 文件

4. **下载并测试 VSIX**
   - 点击工作流运行详情
   - 在 Artifacts 部分下载 `vsix-package`
   - 在本地 VS Code 中安装测试：
     ```bash
     code --install-extension aigitcommit-X.Y.Z.vsix
     ```

### 使用场景

- **首次配置验证**: 验证 PAT 和工作流配置正确
- **重大更新测试**: 在发布重大版本前测试
- **CI/CD 调试**: 调试工作流问题
- **本地测试**: 生成 VSIX 文件进行本地测试


## 故障排除

### 如何查看工作流日志

1. **访问 Actions 标签页**
   - 打开 https://github.com/want2sleeep/AIGitCommit/actions

2. **选择失败的工作流运行**
   - 点击失败的工作流运行（显示红色 ❌）

3. **查看详细日志**
   - 点击失败的作业（Validate、Quality、Publish）
   - 展开失败的步骤查看详细错误信息
   - 日志包含完整的错误消息和堆栈跟踪

### 常见错误及解决方案

#### 1. 版本验证失败

**错误消息：**
```
错误: 版本不匹配
标签版本是 v1.2.0 但 package.json 中是 1.1.0
```

**原因：**
- GitHub Release 标签与 `package.json` 版本不一致

**解决方法：**
1. 检查 `package.json` 中的版本号
2. 确保版本号与 Release 标签匹配（不含 `v` 前缀）
3. 更新版本号后重新提交：
   ```bash
   # 更新 package.json 版本为 1.2.0
   git add package.json
   git commit -m "chore: update version to 1.2.0"
   git push origin main
   ```
4. 删除错误的 Release 并重新创建

---

**错误消息：**
```
错误: 无效的版本标签格式: v1.0
期望格式: vX.Y.Z 或 vX.Y.Z-prerelease
```

**原因：**
- Release 标签格式不符合语义化版本规范

**解决方法：**
1. 删除错误的 Release
2. 使用正确格式创建新 Release：
   - ✅ `v1.0.0`（不是 `v1.0`）
   - ✅ `v1.2.3`
   - ✅ `v2.0.0-beta.1`

---

**错误消息：**
```
错误: CHANGELOG.md 不包含版本 1.2.0 的条目
```

**原因：**
- CHANGELOG.md 未更新或格式不正确

**解决方法：**
1. 在 `CHANGELOG.md` 中添加版本条目：
   ```markdown
   ## [1.2.0] - 2024-01-15
   
   ### Added
   - 新功能描述
   ```
2. 提交并推送更改：
   ```bash
   git add CHANGELOG.md
   git commit -m "docs: update changelog for v1.2.0"
   git push origin main
   ```
3. 重新触发工作流或创建新 Release


#### 2. 质量检查失败

**错误消息：**
```
代码质量检查失败。请修复 linting 错误。
```

**原因：**
- 代码不符合 ESLint 规则
- 代码格式不符合 Prettier 规则
- TypeScript 编译错误
- 测试失败

**解决方法：**
1. 在本地运行质量检查：
   ```bash
   pnpm run lint          # 检查 linting 错误
   pnpm run lint:fix      # 自动修复 linting 错误
   pnpm run format        # 格式化代码
   pnpm run format:check  # 检查格式
   pnpm run compile       # 编译 TypeScript
   pnpm test              # 运行测试
   ```

2. 修复所有错误和警告

3. 提交修复：
   ```bash
   git add .
   git commit -m "fix: resolve quality check issues"
   git push origin main
   ```

4. 重新触发工作流

**提示：**
- 使用 Husky pre-commit 钩子可以在提交前自动检查
- 项目已配置自动格式化和 linting

---

#### 3. PAT 认证失败

**错误消息：**
```
VSCE_PAT secret 未设置或为空
```

**原因：**
- GitHub Secret `VSCE_PAT` 未配置
- Secret 名称拼写错误

**解决方法：**
1. 按照 [PAT 设置指南](#pat-设置指南) 配置 Token
2. 确保 Secret 名称完全匹配：`VSCE_PAT`
3. 验证 Secret 已正确添加到仓库
4. 重新触发工作流

---

**错误消息：**
```
发布到插件市场失败: Authentication failed
```

**原因：**
- PAT 已过期
- PAT 权限不足
- PAT 已被撤销

**解决方法：**
1. 访问 https://marketplace.visualstudio.com/manage
2. 检查 Token 状态
3. 如果过期或无效，创建新 Token
4. 更新 GitHub Secret `VSCE_PAT`
5. 确保 Token 具有 **Marketplace (Manage)** 权限
6. 重新触发工作流


#### 4. 发布失败

**错误消息：**
```
发布到插件市场失败: Extension with version X.Y.Z already exists
```

**原因：**
- 该版本已经发布到插件市场
- 尝试重复发布相同版本

**解决方法：**
1. 递增版本号（不能重新发布相同版本）
2. 更新 `package.json` 和 `CHANGELOG.md`
3. 创建新的 Release

**注意：**
- 插件市场不允许覆盖已发布的版本
- 即使删除 Release，已发布的版本仍然存在
- 必须使用新的版本号

---

**错误消息：**
```
发布到插件市场失败: Publisher 'SleepSheep' not found
```

**原因：**
- 发布者 ID 不存在或拼写错误
- PAT 关联的账户没有该发布者的权限

**解决方法：**
1. 验证 `package.json` 中的 `publisher` 字段正确
2. 确认您的 Microsoft 账户有该发布者的管理权限
3. 访问 https://marketplace.visualstudio.com/manage 验证发布者

---

**错误消息：**
```
VSIX 文件不存在: aigitcommit-X.Y.Z.vsix
```

**原因：**
- 打包步骤失败
- VSIX 文件名不匹配

**解决方法：**
1. 检查打包步骤的日志
2. 确保 `vsce package` 命令成功执行
3. 验证 `package.json` 中的 `name` 和 `version` 字段正确
4. 重新运行工作流


#### 5. 工作流权限错误

**错误消息：**
```
Resource not accessible by integration
```

**原因：**
- GitHub Actions 权限不足
- 无法创建 Release 评论

**解决方法：**
1. 访问仓库 Settings → Actions → General
2. 在 "Workflow permissions" 部分
3. 选择 **"Read and write permissions"**
4. 勾选 **"Allow GitHub Actions to create and approve pull requests"**
5. 点击 **"Save"**
6. 重新触发工作流

---

### 调试技巧

#### 1. 启用详细日志

在工作流中添加调试步骤：

```yaml
- name: Debug information
  run: |
    echo "Event: ${{ github.event_name }}"
    echo "Tag: ${{ github.event.release.tag_name }}"
    echo "Version: ${{ needs.validate.outputs.version }}"
    cat package.json
    cat CHANGELOG.md
```

#### 2. 本地测试打包

在本地测试打包流程：

```bash
# 安装依赖
pnpm install

# 运行质量检查
pnpm run lint
pnpm run format:check
pnpm test

# 编译
pnpm run vscode:prepublish

# 打包
pnpm install -g @vscode/vsce
vsce package --no-dependencies

# 测试安装
code --install-extension aigitcommit-X.Y.Z.vsix
```

**关于 `--no-dependencies` 标志：**

项目使用 pnpm 作为包管理器，但 vsce 工具内部使用 `npm list` 来验证依赖树。这会导致依赖验证失败，即使依赖实际上是正确的。

使用 `--no-dependencies` 标志可以跳过 vsce 的依赖验证步骤，因为：
- pnpm 已经在安装阶段验证了依赖完整性
- 这是 vsce 官方支持的标志，专门用于处理非 npm 包管理器的场景
- 不会影响最终 VSIX 包的内容或功能

CI/CD 工作流已经配置使用此标志，本地打包时也应该使用以保持一致性。

#### 3. 检查工作流语法

使用 GitHub CLI 验证工作流语法：

```bash
gh workflow view publish.yml
```


### 获取帮助

如果问题仍未解决：

1. **查看完整日志**
   - 访问 Actions 标签页查看详细日志
   - 日志包含完整的错误堆栈和上下文

2. **查看工作流文件**
   - 检查 `.github/workflows/publish.yml`
   - 确认配置正确

3. **参考文档**
   - [VS Code 扩展发布文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
   - [vsce CLI 文档](https://github.com/microsoft/vscode-vsce)
   - [GitHub Actions 文档](https://docs.github.com/en/actions)

4. **提交 Issue**
   - 访问 https://github.com/want2sleeep/AIGitCommit/issues
   - 提供详细的错误信息和日志
   - 包含复现步骤

---

## 快速参考

### 发布检查清单

发布前确认：

- [ ] 代码已合并到 `main` 分支
- [ ] `package.json` 版本号已更新
- [ ] `CHANGELOG.md` 已更新
- [ ] 本地测试通过：`pnpm test`
- [ ] 代码质量检查通过：`pnpm run lint && pnpm run format:check`
- [ ] `VSCE_PAT` Secret 已配置（首次发布）
- [ ] Release 标签格式正确（`vX.Y.Z`）

### 常用命令

```bash
# 质量检查
pnpm run lint
pnpm run format:check
pnpm test

# 本地打包
pnpm run vscode:prepublish
vsce package --no-dependencies

# 本地安装测试
code --install-extension aigitcommit-X.Y.Z.vsix
```

### 重要链接

- **GitHub Actions**: https://github.com/want2sleeep/AIGitCommit/actions
- **Releases**: https://github.com/want2sleeep/AIGitCommit/releases
- **Marketplace**: https://marketplace.visualstudio.com/items?itemName=SleepSheep.aigitcommit
- **Marketplace 管理**: https://marketplace.visualstudio.com/manage
- **仓库 Secrets**: https://github.com/want2sleeep/AIGitCommit/settings/secrets/actions

---

**最后更新**: 2024-01-15  
**维护者**: SleepSheep

