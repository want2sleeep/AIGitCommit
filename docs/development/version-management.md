# 版本管理指南

本文档介绍如何使用项目的版本管理工具来更新版本号、维护 CHANGELOG 和创建发布标签。

## 快速开始

### 更新版本号

使用以下命令更新版本号：

```bash
# 更新修订号 (1.2.0 → 1.2.1)
pnpm run version:patch

# 更新次版本号 (1.2.0 → 1.3.0)
pnpm run version:minor

# 更新主版本号 (1.2.0 → 2.0.0)
pnpm run version:major
```

### 查看当前版本

```bash
pnpm run version:current
```

### 查看帮助信息

```bash
pnpm run version:help
```

## 版本更新流程

版本更新工具会自动执行以下步骤：

1. **检查 Git 仓库状态**
   - 确认当前目录是 Git 仓库
   - 确认工作区干净（无未提交的变更）

2. **计算新版本号**
   - 根据指定的版本类型（major/minor/patch）计算新版本号
   - 遵循语义化版本规范

3. **提取 CHANGELOG 变更**
   - 从 CHANGELOG.md 的 `[Unreleased]` 部分提取变更内容
   - 如果 Unreleased 部分为空，会报错并终止

4. **更新文件**
   - 更新 `package.json` 中的版本号
   - 在 CHANGELOG.md 中创建新版本条目
   - 将 Unreleased 的内容移动到新版本下

5. **提交变更**
   - 使用格式化的提交消息提交变更
   - 提交消息格式：`chore(release): bump version to X.Y.Z`

6. **创建 Git 标签**
   - 创建格式为 `vX.Y.Z` 的标签
   - 标签消息：`Release X.Y.Z`

7. **推送到远程仓库**
   - 推送提交到远程仓库
   - 推送标签到远程仓库

## 语义化版本规范

本项目遵循[语义化版本规范 2.0.0](https://semver.org/lang/zh-CN/)：

- **主版本号 (MAJOR)**：当你做了不兼容的 API 修改
- **次版本号 (MINOR)**：当你做了向下兼容的功能性新增
- **修订号 (PATCH)**：当你做了向下兼容的问题修正

### 示例

- `1.2.3` → `2.0.0`：破坏性变更（major）
- `1.2.3` → `1.3.0`：新功能（minor）
- `1.2.3` → `1.2.4`：Bug 修复（patch）

## CHANGELOG 维护

### 格式要求

CHANGELOG.md 必须包含 `## [Unreleased]` 部分，用于记录未发布的变更：

```markdown
## [Unreleased]

### ✨ 新增功能
- 添加了新功能 A
- 添加了新功能 B

### 🐛 Bug 修复
- 修复了问题 X
- 修复了问题 Y

---

## [1.2.0] - 2023-11-15
...
```

### 变更类型

推荐使用以下变更类型：

- ✨ 新增功能
- 🐛 Bug 修复
- 🔧 代码质量改进
- 📚 文档
- 🔄 Breaking Changes
- 📦 依赖更新
- ⚡ 性能优化

## 发布流程

### 1. 准备发布

在发布前，确保：

- [ ] 所有变更已提交
- [ ] 工作区干净
- [ ] CHANGELOG.md 的 Unreleased 部分已更新
- [ ] 所有测试通过
- [ ] 代码通过 lint 检查

### 2. 更新版本

根据变更类型选择合适的版本更新命令：

```bash
# Bug 修复
pnpm run version:patch

# 新功能
pnpm run version:minor

# 破坏性变更
pnpm run version:major
```

### 3. 创建 GitHub Release

版本更新完成后，访问 GitHub 创建 Release：

1. 访问：`https://github.com/your-repo/releases/new?tag=vX.Y.Z`
2. 填写 Release 标题和说明
3. 从 CHANGELOG.md 复制对应版本的变更内容
4. 点击 "Publish release"

### 4. 自动发布

创建 Release 后，GitHub Actions 会自动：

- 运行质量检查（lint、format、test、compile）
- 构建扩展
- 打包 VSIX 文件
- 发布到 VSCode 插件市场

## 常见问题

### Q: 工作区不干净怎么办？

A: 提交或暂存所有变更后再运行版本更新命令：

```bash
git add .
git commit -m "your commit message"
pnpm run version:patch
```

### Q: CHANGELOG 为空怎么办？

A: 在 CHANGELOG.md 的 `[Unreleased]` 部分添加变更内容：

```markdown
## [Unreleased]

### ✨ 新增功能
- 添加了新功能

---
```

### Q: 版本标签已存在怎么办？

A: 删除本地和远程标签后重试：

```bash
# 删除本地标签
git tag -d vX.Y.Z

# 删除远程标签
git push origin :refs/tags/vX.Y.Z

# 重新运行版本更新
pnpm run version:patch
```

### Q: 如何回滚版本更新？

A: 如果版本更新出错，可以手动回滚：

```bash
# 回滚最后一次提交
git reset --hard HEAD~1

# 删除本地标签
git tag -d vX.Y.Z

# 如果已推送，删除远程标签和提交
git push origin :refs/tags/vX.Y.Z
git push origin +HEAD^:main  # 强制推送回滚
```

### Q: 如何跳过某些检查？

A: 目前版本更新工具会执行所有必要的检查。如果需要跳过某些检查，可以：

1. 临时修改 `scripts/version/Validator.ts`
2. 或手动执行版本更新步骤

## 配置

### 自定义配置

可以在项目根目录创建 `.versionrc.json` 文件来自定义配置：

```json
{
  "files": {
    "version": ["package.json"],
    "changelog": "CHANGELOG.md",
    "docs": ["README.md", "MARKETPLACE.md"]
  },
  "git": {
    "tagPrefix": "v",
    "commitMessage": "chore(release): bump version to {{version}}",
    "requireCleanWorkingTree": true
  },
  "changelog": {
    "unreleasedSection": "## [Unreleased]",
    "dateFormat": "YYYY-MM-DD"
  }
}
```

## 故障排查

### 问题：Git 命令失败

**症状**：版本更新过程中 Git 命令执行失败

**解决方案**：
1. 确认 Git 已正确安装：`git --version`
2. 确认当前目录是 Git 仓库：`git status`
3. 确认有远程仓库配置：`git remote -v`
4. 确认有推送权限

### 问题：文件更新失败

**症状**：package.json 或 CHANGELOG.md 更新失败

**解决方案**：
1. 确认文件存在且可写
2. 确认文件格式正确（JSON 格式、Markdown 格式）
3. 检查文件权限
4. 查看备份文件（.backup 后缀）

### 问题：推送失败

**症状**：无法推送到远程仓库

**解决方案**：
1. 确认网络连接正常
2. 确认有推送权限
3. 确认远程分支存在
4. 尝试手动推送：`git push origin main`

## 最佳实践

1. **频繁更新 CHANGELOG**
   - 每次提交重要变更时更新 Unreleased 部分
   - 使用清晰的变更描述

2. **选择合适的版本类型**
   - Bug 修复 → patch
   - 新功能 → minor
   - 破坏性变更 → major

3. **保持工作区干净**
   - 发布前提交所有变更
   - 不要在发布过程中修改文件

4. **测试后再发布**
   - 确保所有测试通过
   - 确保代码质量检查通过

5. **及时创建 Release**
   - 版本更新后立即创建 GitHub Release
   - 触发自动发布流程

## 相关文档

- [语义化版本规范](https://semver.org/lang/zh-CN/)
- [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)
- [约定式提交](https://www.conventionalcommits.org/zh-hans/)
- [发布文档](../../.github/PUBLISHING.md)
- [发布检查清单](release-checklist.md)