# 发布检查清单

本文档提供了发布新版本前的完整检查清单，确保发布质量和流程规范。

## 📋 发布前检查

### 1. 版本信息
- [ ] package.json 版本号已更新
- [ ] CHANGELOG.md 包含当前版本条目
- [ ] CHANGELOG.md 日期正确（YYYY-MM-DD 格式）
- [ ] 版本号遵循语义化版本规范

### 2. 代码质量
- [ ] 所有代码已提交到 main 分支
- [ ] 工作区干净，无未提交变更
- [ ] ESLint 检查通过，无错误和警告
- [ ] TypeScript 编译成功，无类型错误
- [ ] 代码格式符合 Prettier 规范

### 3. 测试验证
- [ ] 所有单元测试通过
- [ ] 集成测试通过
- [ ] 测试覆盖率达到目标（70%+）
- [ ] 手动测试核心功能
- [ ] 边界条件测试完成

### 4. 文档更新
- [ ] README.md 已更新（如需要）
- [ ] CHANGELOG.md 已完善
- [ ] API 文档已更新（如有 API 变更）
- [ ] 配置示例已更新（如有配置变更）
- [ ] 版本特定文档已创建

### 5. 功能验证
- [ ] 新功能正常工作
- [ ] 修复的问题确实已解决
- [ ] 破坏性变更已文档化
- [ ] 向后兼容性已验证
- [ ] 性能影响已评估

## 🔧 技术检查

### 构建系统
- [ ] 构建脚本正常工作
- [ ] 生产构建成功
- [ ] 打包文件大小合理
- [ ] 依赖版本兼容性确认

### 配置文件
- [ ] package.json 版本号正确
- [ ] package.json 依赖版本正确
- [ ] tsconfig.json 配置正确
- [ ] 构建配置文件正确

### 版本管理
- [ ] Git 标签格式正确（vX.Y.Z）
- [ ] 版本号与标签一致
- [ ] CHANGELOG 与版本匹配
- [ ] 发布说明已准备

## 📚 文档检查

### README.md
- [ ] 安装说明正确
- [ ] 使用示例有效
- [ ] 配置说明准确
- [ ] 版本信息更新
- [ ] 链接有效

### CHANGELOG.md
- [ ] 包含所有重要变更
- [ ] 变更分类正确
- [ ] 格式符合规范
- [ ] 日期格式正确
- [ ] 链接有效

### 配置文档
- [ ] 新配置项已文档化
- [ ] 配置示例正确
- [ ] 故障排除更新
- [ ] 兼容性说明

## 🚀 发布流程

### 1. 准备工作
```bash
# 确认在 main 分支
git checkout main

# 拉取最新代码
git pull origin main

# 确认工作区干净
git status
```

### 2. 版本更新
```bash
# 根据变更类型选择命令
pnpm run version:patch    # Bug 修复
pnpm run version:minor    # 新功能
pnpm run version:major    # 破坏性变更
```

### 3. 验证更新
```bash
# 确认版本号正确
cat package.json | grep version

# 确认标签已创建
git tag -l

# 确认 CHANGELOG 已更新
grep "## \[.*\]" CHANGELOG.md
```

### 4. 推送到远程
```bash
# 推送提交
git push origin main

# 推送标签
git push origin vX.Y.Z
```

### 5. 创建 GitHub Release
1. 访问 GitHub Releases 页面
2. 点击 "Create a new release"
3. 选择刚推送的标签
4. 填写 Release 标题
5. 从 CHANGELOG.md 复制版本说明
6. 点击 "Publish release"

## 🔍 发布后验证

### 自动化验证
- [ ] GitHub Actions 工作流成功
- [ ] VSCode 插件市场发布成功
- [ ] 自动测试通过
- [ ] 构建和打包成功

### 手动验证
- [ ] 在 VSCode 中搜索到新版本
- [ ] 下载和安装正常
- [ ] 新功能正常工作
- [ ] 旧版本升级正常

### 用户反馈
- [ ] 监控 Issues 和 PR
- [ ] 检查用户反馈
- [ ] 准备快速响应
- [ ] 文档链接有效

## 📊 版本类型决策

### Patch 版本 (X.Y.Z+1)
**适用情况**：
- Bug 修复
- 文档错误修正
- 小的改进
- 性能优化

**检查项**：
- [ ] 修复的问题已确认
- [ ] 无新功能添加
- [ ] 无破坏性变更
- [ ] 向后兼容

### Minor 版本 (X.Y+1.0)
**适用情况**：
- 新功能添加
- 重要改进
- API 扩展
- 用户体验提升

**检查项**：
- [ ] 新功能已完整实现
- [ ] 向后兼容
- [ ] 文档已更新
- [ ] 测试充分

### Major 版本 (X+1.0.0)
**适用情况**：
- 破坏性变更
- 架构重构
- 重大功能变更
- 依赖重大更新

**检查项**：
- [ ] 破坏性变更已文档化
- [ ] 迁移指南已提供
- [ ] 影响评估完成
- [ ] 用户通知已准备

## 🚨 紧急发布流程

### Hotfix 发布
当需要紧急修复严重问题时：

1. **创建 hotfix 分支**
   ```bash
   git checkout -b hotfix/fix-description
   ```

2. **修复问题**
   - 最小化变更范围
   - 专注修复核心问题
   - 避免引入新功能

3. **快速测试**
   - 验证修复有效
   - 确认无副作用
   - 基本功能测试

4. **发布 patch 版本**
   ```bash
   pnpm run version:patch
   git push origin main
   git push origin vX.Y.Z
   ```

5. **创建 Release**
   - 标记为紧急修复
   - 说明问题影响
   - 提供解决方案

## 📝 发布模板

### Release 标题
```
Release X.Y.Z: [简短描述]
```

### Release 内容
```markdown
## 🚀 新增功能
- 功能描述 1
- 功能描述 2

## 🐛 Bug 修复
- 修复问题 1
- 修复问题 2

## 🔧 改进
- 改进描述 1
- 改进描述 2

## ⚠️ 破坏性变更
- 变更描述 1
- 变更描述 2

## 📦 安装
```bash
code --install-extension SleepSheep.aigitcommit
```

## 🔗 链接
- [完整更新日志](../../CHANGELOG.md)
- [问题反馈](https://github.com/want2sleeep/AIGitCommit/issues)
```

## 🔄 回滚计划

### 回滚触发条件
- [ ] 严重 Bug 影响核心功能
- [ ] 性能严重下降
- [ ] 安全漏洞发现
- [ ] 用户大量投诉

### 回滚步骤
1. **立即评估**
   - 确认问题严重性
   - 评估影响范围
   - 决定回滚必要性

2. **执行回滚**
   ```bash
   # 回滚到上一个稳定版本
   git checkout vX.Y.Z-1
   
   # 创建回滚标签
   git tag -a vX.Y.Z-rollback -m "Rollback release X.Y.Z"
   
   # 推送回滚
   git push origin vX.Y.Z-rollback
   ```

3. **发布回滚版本**
   - 创建新的 GitHub Release
   - 说明回滚原因
   - 提供解决方案

4. **后续处理**
   - 分析问题原因
   - 修复根本问题
   - 准备重新发布

## 📋 检查清单总结

### 发布前 ✅
- [ ] 代码质量检查通过
- [ ] 测试验证完成
- [ ] 文档更新完整
- [ ] 版本信息正确
- [ ] 功能验证通过

### 发布中 🔄
- [ ] 版本更新成功
- [ ] Git 标签创建
- [ ] 推送到远程
- [ ] GitHub Release 创建

### 发布后 🎉
- [ ] 自动化流程成功
- [ ] 手动验证通过
- [ ] 用户反馈正常
- [ ] 监控系统正常

---

**相关文档**: [版本管理](version-management.md) | [贡献指南](../../CONTRIBUTING.md) | [CHANGELOG](../../CHANGELOG.md)