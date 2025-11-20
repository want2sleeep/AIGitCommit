# AI Git Commit

[![VSCode Marketplace](https://img.shields.io/badge/VSCode-Marketplace-blue.svg)](https://marketplace.visualstudio.com/items?itemName=SleepSheep.aigitcommit)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.2.1-orange.svg)](package.json)
[![Publish Status](https://github.com/want2sleeep/AIGitCommit/actions/workflows/publish.yml/badge.svg)](https://github.com/want2sleeep/AIGitCommit/actions/workflows/publish.yml)

🚀 **使用AI自动生成高质量的Git提交信息**

AI Git Commit 是一个强大的VSCode扩展，它利用大型语言模型（LLM）自动分析您的代码变更，并生成符合规范的Git提交信息。支持多种AI服务提供商，包括 OpenAI、Google Gemini、Qwen、Ollama、vLLM 及 OpenAI Compatible 兼容服务。

## ✨ 主要特性

- 🤖 **智能分析**: 自动分析代码变更，生成准确的提交信息
- 🌐 **多提供商支持**: 支持 OpenAI、Google Gemini、Qwen、Ollama、vLLM、OpenAI Compatible 等
- 📝 **规范格式**: 支持约定式提交（Conventional Commits）和简单格式
- 🌍 **多语言**: 支持中文和英文提交信息
- 🔒 **安全存储**: API密钥安全存储在VSCode SecretStorage中
- ⚡ **快速便捷**: 多种触发方式，一键生成提交信息
- 🎨 **用户友好**: 直观的界面和丰富的配置选项

## 📦 安装

### 从VSCode市场安装（推荐）

1. 打开VSCode
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 "AI Git Commit"
4. 点击 "安装"

### 从文件安装

1. 下载 `.vsix` 文件
2. 在VSCode中按 `Ctrl+Shift+P`
3. 输入 "Extensions: Install from VSIX"
4. 选择下载的文件

## 🚀 快速开始

### 1. 配置API

首次使用时，需要配置AI服务：

```bash
# 打开命令面板
Ctrl+Shift+P

# 输入并执行
"配置 AI Git Commit"
```

按照提示输入：
- **API端点**: 例如 `https://api.openai.com/v1`
- **API密钥**: 你的API密钥
- **模型名称**: 例如 `gpt-3.5-turbo`

### 2. 生成提交信息

有三种方式可以使用：

#### 方式1: SCM视图按钮（最简单）
1. 打开源代码管理视图 (`Ctrl+Shift+G`)
2. 点击标题栏的 ✨ 图标按钮
3. 等待AI生成提交信息

#### 方式2: 命令面板
1. 按 `Ctrl+Shift+P`
2. 输入 "生成AI提交信息"
3. 按回车执行

#### 方式3: 快捷键
1. 按 `Ctrl+Shift+G, C`
2. 等待生成完成

## ⚙️ 配置选项

打开VSCode设置 (`Ctrl+,`)，搜索 "AI Git Commit"：

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| `aigitcommit.provider` | `openai` | API提供商 |
| `aigitcommit.apiEndpoint` | `https://api.openai.com/v1` | API端点URL |
| `aigitcommit.modelName` | `gpt-3.5-turbo` | 使用的模型名称 |
| `aigitcommit.language` | `zh-CN` | 提交信息语言 |
| `aigitcommit.commitFormat` | `conventional` | 提交信息格式 |
| `aigitcommit.maxTokens` | `500` | 最大token数 |
| `aigitcommit.temperature` | `0.7` | 温度参数（0-2） |

### 支持的提供商

- **OpenAI**: 官方API服务，支持GPT-3.5、GPT-4等模型
- **Google Gemini**: Google最新AI模型，支持Gemini 1.5 Flash等
- **Qwen**: 阿里云通义千问大模型服务
- **Ollama**: 本地运行，完全保护代码隐私
- **vLLM**: 高性能本地推理引擎
- **OpenAI Compatible**: 任何 OpenAI 兼容的 API 服务

## 📖 使用示例

### 示例1: 添加新功能

```typescript
// 新增函数
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**生成的提交信息**:
```
feat(utils): 添加计算总价的函数

实现 calculateTotal 函数用于计算商品列表的总价
```

### 示例2: 修复Bug

```typescript
// 修复边界条件
- if (user.age > 18) {
+ if (user.age >= 18) {
```

**生成的提交信息**:
```
fix(auth): 修正年龄验证的边界条件

将年龄判断从大于改为大于等于，确保18岁用户可以访问
```

### 示例3: 重构代码

```typescript
// 重构为箭头函数
- function getUserName(user) {
-   return user.firstName + ' ' + user.lastName;
- }
+ const getUserName = (user: User): string => 
+   `${user.firstName} ${user.lastName}`;
```

**生成的提交信息**:
```
refactor(user): 使用箭头函数和模板字符串重构 getUserName

提高代码可读性并添加类型注解
```

## 🔧 配置示例

### OpenAI配置

```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.apiEndpoint": "https://api.openai.com/v1",
  "aigitcommit.modelName": "gpt-3.5-turbo",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional"
}
```

### Google Gemini配置

```json
{
  "aigitcommit.provider": "gemini",
  "aigitcommit.apiEndpoint": "https://generativelanguage.googleapis.com/v1beta",
  "aigitcommit.modelName": "gemini-1.5-flash",
  "aigitcommit.language": "zh-CN"
}
```

### Qwen配置

```json
{
  "aigitcommit.provider": "qwen",
  "aigitcommit.apiEndpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "aigitcommit.modelName": "qwen-turbo",
  "aigitcommit.language": "zh-CN"
}
```

### Ollama配置

```json
{
  "aigitcommit.provider": "ollama",
  "aigitcommit.apiEndpoint": "http://localhost:11434/v1",
  "aigitcommit.modelName": "codellama",
  "aigitcommit.language": "zh-CN"
}
```

### vLLM配置

```json
{
  "aigitcommit.provider": "vllm",
  "aigitcommit.apiEndpoint": "http://localhost:8000/v1",
  "aigitcommit.modelName": "meta-llama/Llama-2-7b-chat-hf",
  "aigitcommit.language": "zh-CN"
}
```

## 🎯 使用场景

### 个人开发者
- **推荐**: Ollama + Code Llama 或 vLLM + Llama 2
- **优势**: 完全免费，代码不离开本地

### 小团队
- **推荐**: OpenAI GPT-3.5
- **优势**: 性价比高，响应速度快

### 企业团队
- **推荐**: Qwen
- **优势**: 国内访问快速，价格实惠，支持中文优化

### 开源项目
- **推荐**: OpenAI GPT-4 + 英文提交
- **优势**: 最佳质量，国际化支持

## 🛠️ 开发

### 环境要求

- Node.js >= 16.x
- pnpm >= 8.0.0
- VSCode >= 1.85.0
- TypeScript >= 5.3.3

### 安装 pnpm

如果您还没有安装 pnpm，请先安装：

```bash
# 使用 npm 安装
npm install -g pnpm

# 或使用 Homebrew (macOS)
brew install pnpm

# 或使用 Scoop (Windows)
scoop install pnpm
```

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/want2sleeep/AIGitCommit.git
cd AIGitCommit

# 安装依赖
pnpm install

# 类型检查（不生成文件）
pnpm run type-check

# 类型检查（监听模式）
pnpm run type-check:watch

# 运行测试
pnpm test

# 启动开发模式（监听文件变化）
pnpm run watch

# 代码检查
pnpm run lint

# 代码格式化
pnpm run format
```

### 构建系统

本项目使用 **esbuild** 作为生产构建工具，提供极快的构建速度和优化的包体积：

#### esbuild 优势

- ⚡ **极速构建**: 比 TypeScript 编译器快 10-100 倍
- 📦 **更小体积**: 生产包体积减少约 20-30%
- 🔄 **Watch 模式**: 开发时自动重新构建
- 🎯 **Tree Shaking**: 自动移除未使用的代码
- 🗜️ **代码压缩**: 生产模式自动压缩代码

#### 构建命令

```bash
# 类型检查（不生成文件）
pnpm run type-check

# 类型检查（监听模式）
pnpm run type-check:watch

# 生产构建（用于发布）
pnpm run package

# 完整构建（类型检查 + 打包）
pnpm run build

# 开发构建（带 watch 模式）
pnpm run compile-watch

# 准备发布（运行完整构建和检查）
pnpm run vscode:prepublish
```

#### 构建配置

esbuild 配置位于 `esbuild.js` 文件：

- **入口文件**: `src/extension.ts`
- **输出文件**: `dist/extension.js`
- **格式**: CommonJS (cjs)
- **平台**: Node.js
- **外部依赖**: vscode（由 VSCode 提供）
- **生产模式**: 启用代码压缩，禁用 sourcemap
- **开发模式**: 保留 sourcemap，便于调试

### 开发指南

#### 代码质量

本项目使用以下工具确保代码质量：

- **ESLint**: 代码规范检查
- **Prettier**: 代码格式化
- **Husky**: Git 钩子管理
- **lint-staged**: 提交前代码检查

在提交代码前，pre-commit 钩子会自动运行：
1. ESLint 检查并自动修复问题
2. Prettier 格式化代码
3. 运行测试套件

#### 开发流程

1. **创建分支**: 从 `main` 分支创建功能分支
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **开发功能**: 编写代码并确保通过所有检查
   ```bash
   pnpm run type-check  # 类型检查
   pnpm run lint        # 检查代码规范
   pnpm test            # 运行测试
   pnpm run build       # 完整构建
   ```

3. **提交代码**: 使用约定式提交格式
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **推送代码**: 推送到远程仓库
   ```bash
   git push origin feature/your-feature-name
   ```

5. **创建 PR**: 在 GitHub 上创建 Pull Request

#### 测试

```bash
# 运行所有测试
pnpm test

# 监听模式（开发时使用）
pnpm run test:watch

# 生成覆盖率报告
pnpm run test:coverage
```

测试文件位于 `src/__tests__/` 目录，使用 Jest 测试框架。

#### 调试

在 VSCode 中按 `F5` 启动调试模式：
1. 会打开一个新的 VSCode 窗口（Extension Development Host）
2. 在新窗口中测试扩展功能
3. 可以在原窗口中设置断点进行调试

#### 打包

```bash
# 编译并打包扩展
pnpm run vscode:prepublish

# 使用 vsce 打包（需要先安装 vsce）
pnpm install -g @vscode/vsce
vsce package
```

### 项目结构

```
src/
├── extension.ts           # 扩展入口
├── constants.ts           # 常量定义
├── services/              # 服务层
│   ├── ConfigurationManager.ts
│   ├── GitService.ts
│   ├── LLMService.ts
│   ├── CommandHandler.ts
│   └── ProviderManager.ts
├── utils/                 # 工具类
│   ├── ErrorHandler.ts
│   └── UIManager.ts
├── types/                 # 类型定义
│   └── index.ts
└── __tests__/             # 测试文件
```

## 📚 完整文档

📖 **[文档中心](docs/README.md)** - 查看所有完整文档

### 快速链接
- [🚀 快速开始](docs/guides/quick-start.md) - 5分钟上手
- [⚙️ 配置指南](docs/configuration/README.md) - 选择AI服务
- [🤝 贡献代码](CONTRIBUTING.md) - 参与项目开发
- [📋 更新日志](CHANGELOG.md) - 版本历史

## 🐛 故障排除

### 常见问题

**Q: 提示"无暂存变更"**
A: 需要先暂存文件变更，使用 `git add` 或在源代码管理视图中点击 `+`

**Q: API调用失败**
A: 检查API端点、密钥和网络连接，查看输出日志获取详细错误信息

**Q: 找不到命令**
A: 重启VSCode，确认插件已启用且在Git仓库中

**Q: 生成的提交信息不满意**
A: 点击"重新生成"，手动编辑内容，或调整温度参数

### CI/CD 工作流问题

如果您在贡献代码时遇到 GitHub Actions 工作流失败，请参考：
- [工作流故障排查指南](.github/TROUBLESHOOTING.md) - 详细的诊断和解决方案

### 获取帮助

1. 查看VSCode输出面板中的详细日志
2. 参考配置示例文档
3. 查看 [工作流故障排查指南](.github/TROUBLESHOOTING.md)（针对 CI/CD 问题）
4. 在GitHub上提交Issue

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！请查看 [贡献指南](CONTRIBUTING.md) 了解详细信息。

### 快速开始

1. Fork 项目
2. 克隆到本地: `git clone https://github.com/YOUR_USERNAME/AIGitCommit.git`
3. 安装依赖: `pnpm install`
4. 创建特性分支: `git checkout -b feature/AmazingFeature`
5. 提交更改: `git commit -m 'feat: add some amazing feature'`
6. 推送到分支: `git push origin feature/AmazingFeature`
7. 开启 Pull Request

### 开发规范

- 遵循 TypeScript 编码规范
- 使用约定式提交格式（Conventional Commits）
- 编写单元测试（目标覆盖率 70%+）
- 更新相关文档
- 确保所有测试和检查通过
- 代码提交前会自动运行 lint 和格式化

### 发布流程

维护者发布新版本时，请参考 [发布指南](.github/PUBLISHING.md)：

1. 更新 `package.json` 版本号
2. 更新 `CHANGELOG.md`
3. 创建 GitHub Release
4. 自动发布到 VS Code 插件市场

## 📄 许可

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Conventional Commits](https://www.conventionalcommits.org/) - 提交信息规范
- [OpenAI](https://openai.com/) - 强大的AI模型支持
- [VSCode API](https://code.visualstudio.com/api) - 扩展开发框架

## 📞 联系方式

- **作者**: SleepSheep
- **邮箱**: victorhuang.hy@gmail.com
- **GitHub**: [SleepSheep](https://github.com/want2sleeep)
- **问题反馈**: [GitHub Issues](https://github.com/want2sleeep/AIGitCommit/issues)

---

⭐ 如果这个项目对您有帮助，请给我们一个星标！

🚀 **让AI帮您写出更好的提交信息！**