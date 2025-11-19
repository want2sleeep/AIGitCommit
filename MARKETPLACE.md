# AI Git Commit - 市场描述

## 简短描述（用于市场标题下方）

使用 AI 自动分析代码变更并生成高质量的 Git 提交信息。支持所有 OpenAI 兼容的 LLM 服务。

---

## 详细描述（用于市场页面）

### 🤖 让 AI 帮你写出专业的 Git 提交信息

厌倦了写提交信息？让 AI 来帮你！AI Git Commit 是一个智能的 VSCode 插件，它能够：

- ✨ **自动分析**你的代码变更
- 📝 **生成专业**的约定式提交信息
- ⚡ **一键完成**，节省时间
- 🔌 **广泛兼容**所有 OpenAI 兼容的 API

### 🎯 核心功能

#### 智能分析
AI 会深入分析你的代码变更，理解你做了什么修改，然后生成准确、专业的提交信息。

#### 约定式提交
自动生成符合 [Conventional Commits](https://www.conventionalcommits.org/) 规范的提交信息，包括：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `refactor`: 代码重构
- `test`: 测试相关
- 还有更多...

#### 多服务支持
支持所有 OpenAI 兼容的 LLM 服务：
- **OpenAI** - 官方 GPT 模型
- **Qwen** - 阿里云大模型
- **Ollama** - 本地开源模型
- **vLLM** - 高性能推理引擎
- **LocalAI** - 私有部署
- **LM Studio** - 桌面应用
- 以及任何 OpenAI 兼容的服务

#### 安全可靠
- 🔒 API 密钥安全存储在 VSCode SecretStorage
- 🌍 支持中文和英文
- ✏️ 生成后可编辑
- 🔄 不满意？一键重新生成

### 🚀 快速开始

1. **安装插件**
2. **配置 API**（首次使用会自动引导）
3. **暂存代码变更**
4. **点击 ✨ 按钮或按快捷键** `Ctrl+Shift+G C`
5. **完成！**

### 💡 使用场景

#### 场景 1：功能开发
```diff
+ export function calculateTotal(items: Item[]): number {
+   return items.reduce((sum, item) => sum + item.price, 0);
+ }
```
**生成的提交信息：**
```
feat(utils): 添加计算总价的函数

实现 calculateTotal 函数用于计算商品列表的总价
```

#### 场景 2：Bug 修复
```diff
- if (user.age > 18) {
+ if (user.age >= 18) {
    allowAccess();
  }
```
**生成的提交信息：**
```
fix(auth): 修正年龄验证的边界条件

将年龄判断从大于改为大于等于，确保18岁用户可以访问
```

### ⚙️ 配置示例

#### OpenAI
```json
{
  "aigitcommit.apiEndpoint": "https://api.openai.com/v1",
  "aigitcommit.modelName": "gpt-3.5-turbo"
}
```

#### 本地模型（Ollama/vLLM）

**Ollama:**
```json
{
  "aigitcommit.provider": "ollama",
  "aigitcommit.apiEndpoint": "http://localhost:11434/v1",
  "aigitcommit.modelName": "llama2"
}
```

**vLLM:**
```json
{
  "aigitcommit.provider": "vllm",
  "aigitcommit.apiEndpoint": "http://localhost:8000/v1",
  "aigitcommit.modelName": "meta-llama/Llama-2-7b-chat-hf"
}
```

### 🎨 三种使用方式

1. **命令面板**：`Ctrl+Shift+P` → "生成AI提交信息"
2. **键盘快捷键**：`Ctrl+Shift+G C` (Mac: `Cmd+Shift+G C`)
3. **源代码管理视图**：点击标题栏的 ✨ 图标

### 🔧 高级功能

- **智能过滤**：自动过滤不相关的文件变更
- **长度控制**：自动控制提交信息长度
- **错误处理**：完善的错误提示和恢复机制
- **重试机制**：失败自动重试，使用指数退避
- **取消支持**：随时取消正在进行的请求

### 📊 为什么选择我们？

- ✅ **节省时间**：不再为写提交信息而烦恼
- ✅ **提高质量**：专业、规范的提交信息
- ✅ **团队协作**：统一的提交信息风格
- ✅ **易于使用**：一键生成，简单直观
- ✅ **隐私保护**：支持本地模型，代码不出本地

### 🌟 用户评价

> "这个插件太棒了！再也不用为写提交信息而头疼了。" - 开发者 A

> "支持本地模型是个亮点，不用担心代码泄露。" - 开发者 B

> "生成的提交信息非常专业，符合团队规范。" - 开发者 C

### 📚 完整文档

查看 [README](https://github.com/your-repo/ai-git-commit) 获取：
- 详细的配置指南
- 更多使用示例
- 常见问题解答
- 提示词模板
- 约定式提交指南

### 🤝 开源项目

本项目是开源的，欢迎贡献！
- GitHub: [your-repo/ai-git-commit]
- 许可证: MIT

### 💬 支持

遇到问题？
- 查看 [FAQ](https://github.com/your-repo/ai-git-commit#faq)
- 提交 [Issue](https://github.com/your-repo/ai-git-commit/issues)
- 查看 [文档](https://github.com/your-repo/ai-git-commit)

---

## 标签（Tags）

git, commit, ai, llm, openai, conventional-commits, code-quality, productivity, automation, azure-openai, ollama, vllm, local-llm

---

## 类别（Categories）

- SCM Providers
- Other

---

## 关键词（Keywords）

- git commit
- ai commit message
- conventional commits
- openai
- llm
- code analysis
- commit generator
- git automation
- qwen
- ollama
- vllm

---

## 截图说明

### 截图 1: 主界面
展示在源代码管理视图中点击 ✨ 按钮生成提交信息的过程

### 截图 2: 配置向导
展示首次使用时的配置向导界面

### 截图 3: 生成结果
展示生成的提交信息预览和编辑界面

### 截图 4: 多种触发方式
展示命令面板、快捷键和 SCM 视图三种触发方式

### 截图 5: 错误处理
展示友好的错误提示和解决建议

---

## GIF 演示说明

### 演示 1: 完整流程（15秒）
1. 修改代码
2. 暂存变更
3. 点击 ✨ 按钮
4. AI 生成提交信息
5. 预览并提交

### 演示 2: 配置过程（10秒）
1. 首次使用触发配置向导
2. 输入 API 信息
3. 验证配置
4. 开始使用

### 演示 3: 重新生成（8秒）
1. 生成提交信息
2. 不满意
3. 点击重新生成
4. 获得新的提交信息

---

## 发布说明（Release Notes）

### 1.2.1 - 内部优化版本

内部基础设施优化，对用户功能无影响：
- ⚡ **esbuild 构建系统**: 构建速度提升 10-100 倍，包体积减少 20-30%
- 🔧 **自动化发布工作流**: 完善的自动发布流程，提升发布质量和效率
- 📚 **文档更新**: 更新所有文档至 v1.2.1

### 1.2.0 - 多提供商支持增强

新增 Google Gemini 支持，完善代码质量：
- ✨ **Google Gemini API 支持**: 新增 Google Gemini 作为 LLM 提供商
- 🔧 **代码质量改进**: 解决所有 ESLint 警告，优化代码结构
- 📦 **6 种 LLM 提供商**: OpenAI、Gemini、Qwen、Ollama、vLLM、OpenAI Compatible

### 1.1.1 - 自动化发布工作流

基础设施改进：
- 🔧 **自动化发布**: GitHub Actions 自动发布到 VSCode 插件市场
- 📚 **发布文档**: 详细的发布流程文档和故障排查指南

### 1.1.0 - 代码质量优化

全面的代码质量提升：
- 🎯 **类型安全**: 消除 any 类型，启用 TypeScript 严格模式
- 🔧 **错误处理**: 实现结构化错误类型系统
- 🧪 **测试覆盖率**: 达到 75%+ 测试覆盖率
- 📦 **pnpm 迁移**: 更快的依赖安装和更好的依赖管理

### 1.0.0 - MVP 初步可用版本

稳定提供核心功能：
- AI 驱动的提交信息生成（支持约定式与简单格式）
- VSCode 集成（命令面板、SCM 按钮、快捷键）
- 配置面板与安全密钥存储（SecretStorage）
- 支持 OpenAI、Qwen、Ollama、vLLM 及 OpenAI Compatible 兼容服务

### 0.0.1 - 初始版本

首个版本发布！包含以下功能：

✨ **核心功能**
- AI 驱动的提交信息生成
- 支持所有 OpenAI 兼容的 API
- 约定式提交格式
- 中英文双语支持

🔧 **配置管理**
- 完整的配置界面
- 安全的密钥存储
- 配置验证和向导

🎯 **用户体验**
- 三种触发方式
- 可编辑的生成结果
- 完善的错误处理
- 进度反馈

📚 **文档**
- 详细的使用指南
- 多种服务配置示例
- 常见问题解答

查看完整的 [CHANGELOG](https://github.com/your-repo/ai-git-commit/blob/main/CHANGELOG.md)

---

## 市场页面 Q&A

### Q: 这个插件免费吗？
A: 是的，插件本身完全免费。但使用 OpenAI 等服务可能需要 API 费用。你也可以使用免费的本地模型（如 Ollama、vLLM）。

### Q: 我的代码会被发送到哪里？
A: 代码变更（diff）会被发送到你配置的 API 端点。如果担心隐私，可以使用本地模型（Ollama、vLLM、LocalAI 等）。

### Q: 支持哪些语言？
A: 插件界面支持中文和英文。生成的提交信息语言可以在设置中配置。

### Q: 需要什么前置条件？
A: 需要一个 Git 仓库和一个 OpenAI 兼容的 API（或本地模型）。

### Q: 如何获取 API 密钥？
A: 
- OpenAI: https://platform.openai.com/api-keys
- Qwen: https://dashscope.console.aliyun.com/apiKey
- 本地模型: 不需要真实的 API 密钥

---

**立即安装，让 AI 帮你写出更好的提交信息！** 🚀
