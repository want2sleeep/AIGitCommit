# 打包说明

## 打包结果

✅ **插件已成功打包！**

- **文件名**: `ai-git-commit-0.0.1.vsix`
- **文件大小**: 78.83 KB
- **包含文件**: 31 个文件
- **打包时间**: 2024-11-14

## 包含的文件

```
ai-git-commit-0.0.1.vsix
├─ LICENSE.txt (1.06 KB)
├─ CHANGELOG.md (10.56 KB)
├─ package.json (4.01 KB)
├─ README.md (18.01 KB)
├─ examples/ (7 个文件, 46.69 KB)
│  ├─ README.md
│  ├─ config-azure-openai.md
│  ├─ config-ollama.md
│  ├─ config-openai.md
│  ├─ config-other-services.md
│  ├─ conventional-commits-guide.md
│  └─ prompt-templates.md
├─ out/ (编译后的 JavaScript 文件)
│  ├─ extension.js
│  ├─ services/ (8 个文件)
│  ├─ types/ (1 个文件)
│  └─ utils/ (4 个文件)
└─ resources/
   └─ icon.svg
```

## 验证清单

### ✅ 已完成

- [x] 编译 TypeScript 代码
- [x] 创建 LICENSE 文件
- [x] 更新 package.json 发布信息
- [x] 配置 .vscodeignore
- [x] 安装 vsce 工具
- [x] 成功打包插件
- [x] 验证文件大小 (< 5MB)

### ⚠️ 待完成（可选）

- [ ] 创建 PNG 图标 (128x128)
- [ ] 添加到 package.json: `"icon": "resources/icon.png"`
- [ ] 拍摄功能截图
- [ ] 录制演示 GIF
- [ ] 更新 repository URL（如果有真实仓库）

## 安装测试

### 方法 1: 从 VSIX 文件安装

1. 打开 VSCode
2. 按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
3. 输入 "Install from VSIX"
4. 选择 `ai-git-commit-0.0.1.vsix`
5. 重启 VSCode

### 方法 2: 使用命令行安装

```bash
code --install-extension ai-git-commit-0.0.1.vsix
```

### 测试步骤

1. **验证安装**
   - 打开扩展面板 (`Ctrl+Shift+X`)
   - 搜索 "AI Git Commit"
   - 确认插件已安装

2. **测试配置**
   - 运行命令 "配置 AI Git Commit Generator"
   - 输入测试 API 信息
   - 验证配置保存成功

3. **测试生成功能**
   - 打开一个 Git 项目
   - 修改并暂存文件
   - 运行命令 "生成AI提交信息"
   - 验证生成流程正常

4. **测试快捷键**
   - 按 `Ctrl+Shift+G C`
   - 验证命令触发

5. **测试 SCM 集成**
   - 打开源代码管理视图
   - 查看标题栏的 ✨ 按钮
   - 点击按钮测试

## 发布到市场

### 前置条件

1. **创建发布者账号**
   - 访问 https://marketplace.visualstudio.com/
   - 使用 Microsoft 账号登录
   - 创建发布者 ID

2. **获取 Personal Access Token (PAT)**
   - 访问 https://dev.azure.com/
   - 创建 PAT，权限选择 "Marketplace (Publish)"
   - 保存 token（只显示一次）

### 发布步骤

#### 方法 1: 使用 vsce 命令行

```bash
# 登录（首次）
vsce login <publisher-name>
# 输入 PAT

# 发布
vsce publish
```

#### 方法 2: 手动上传

1. 访问 https://marketplace.visualstudio.com/manage
2. 点击 "New Extension"
3. 选择 "Visual Studio Code"
4. 上传 `ai-git-commit-0.0.1.vsix`
5. 填写市场信息
6. 提交审核

### 发布前检查

- [ ] 在干净的 VSCode 环境中测试
- [ ] 验证所有功能正常工作
- [ ] 检查文件大小合理
- [ ] 确认无敏感信息
- [ ] 准备好图标和截图
- [ ] 更新 README 中的链接
- [ ] 准备市场描述文本

## 更新版本

### 版本号规则

遵循 [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (例如: 1.2.3)
- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向后兼容的功能新增
- **PATCH**: 向后兼容的问题修复

### 更新步骤

1. **更新版本号**
   ```bash
   # Patch 版本 (0.0.1 -> 0.0.2)
   npm version patch
   
   # Minor 版本 (0.0.1 -> 0.1.0)
   npm version minor
   
   # Major 版本 (0.0.1 -> 1.0.0)
   npm version major
   ```

2. **更新 CHANGELOG.md**
   - 添加新版本的变更记录
   - 列出新功能、修复和改进

3. **重新打包**
   ```bash
   vsce package
   ```

4. **发布新版本**
   ```bash
   vsce publish
   ```

## 故障排除

### 问题 1: 打包失败 - 缺少 LICENSE

**解决方案**: 创建 LICENSE 文件（已完成）

### 问题 2: 打包失败 - 图标未找到

**解决方案**: 
- 创建 PNG 图标，或
- 从 package.json 中移除 icon 字段（当前方案）

### 问题 3: 文件过大

**解决方案**:
- 检查 .vscodeignore 配置
- 排除不必要的文件
- 优化图片大小

### 问题 4: 安装后无法激活

**解决方案**:
- 检查 activationEvents 配置
- 验证 main 字段指向正确的文件
- 查看 VSCode 开发者工具的错误日志

## 相关命令

```bash
# 列出将要打包的文件
vsce ls

# 以树形结构列出文件
vsce ls --tree

# 打包但不发布
vsce package

# 打包并发布
vsce publish

# 发布指定版本
vsce publish 0.0.2

# 发布 patch 版本（自动递增）
vsce publish patch

# 发布 minor 版本
vsce publish minor

# 发布 major 版本
vsce publish major

# 取消发布
vsce unpublish <publisher>.<extension-name>
```

## 资源链接

- **VSCode 扩展市场**: https://marketplace.visualstudio.com/
- **发布者管理**: https://marketplace.visualstudio.com/manage
- **vsce 文档**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **扩展指南**: https://code.visualstudio.com/api/references/extension-guidelines
- **市场最佳实践**: https://code.visualstudio.com/api/references/extension-manifest

## 注意事项

1. **版本管理**
   - 每次发布前更新版本号
   - 更新 CHANGELOG.md
   - 创建 Git tag

2. **质量保证**
   - 在发布前充分测试
   - 在不同操作系统上测试
   - 验证所有功能正常

3. **文档维护**
   - 保持 README 更新
   - 更新配置示例
   - 添加新功能说明

4. **用户反馈**
   - 及时响应 Issue
   - 收集用户建议
   - 持续改进

---

**当前状态**: ✅ 插件已成功打包，可以进行本地测试和安装。

**下一步**: 完成任务 21.6 - 发布前验证
