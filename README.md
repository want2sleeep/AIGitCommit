# AI Git Commit Generator

一个智能的 VSCode 插件，使用 AI 自动分析代码变更并生成高质量的 Git 提交信息。支持所有 OpenAI 兼容的 LLM 服务。

[English](#english-version) | [中文](#中文版本)

---

## 中文版本

### ✨ 功能特性

- 🤖 **AI 驱动**: 使用大语言模型智能分析代码变更
- 📝 **专业格式**: 自动生成符合约定式提交（Conventional Commits）规范的提交信息
- 🔌 **广泛兼容**: 支持所有 OpenAI 兼容的 API（OpenAI、Azure OpenAI、本地模型等）
- ⚡ **快速便捷**: 一键生成，支持键盘快捷键和源代码管理视图集成
- ✏️ **可编辑**: 生成后可预览和编辑提交信息
- 🔒 **安全存储**: API 密钥安全存储在 VSCode SecretStorage 中
- 🌍 **多语言**: 支持中文和英文提交信息

### 📦 安装

#### 从 VSCode 市场安装

1. 打开 VSCode
2. 按 `Ctrl+Shift+X`（)ac: `Cmd+Shift+X`）打开扩展面板
3. 搜索 "AI Git Commit Generator"
4. 点击"安装"

#### 从 VSIX 文件安装

1. 下载 `.vsix` 文件
2. 打开 VSCode
3. 按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`）打开命令面板
4. 输入 "Install from VSIX"
5. 选择下载的 `.vsix` 文件

### 🚀 快速开始

#### 1. 配置 API

首次使用时，插件会自动引导您完成配置：

1. 触发生成提交信息命令
2. 按照提示输入 API 端点、API 密钥和模型名称
3. 配置将自动保存

或者手动配置：

1. 按 `Ctrl+,`（Mac: `Cmd+,`）打开设置
2. 搜索 "AI Git Commit"
3. 配置以下选项：
   - **API Endpoint**: API 端点 URL
   - **Model Name**: 模型名称
   - **Language**: 提交信息语言（中文/英文）
   - **Commit Format**: 提交格式（conventional/simple）

4. 运行命令 "配置 AI Git Commit Generator" 来设置 API 密钥（安全存储）

#### 2. 生成提交信息

有三种方式触发生成：

**方式 1: 命令面板**
1. 暂存您的代码变更（`git add`）
2. 按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`）
3. 输入 "生成AI提交信息"
4. 等待 AI 生成提交信息
5. 预览、编辑并确认

**方式 2: 键盘快捷键**
- Windows/Linux: `Ctrl+Shift+G C`
- Mac: `Cmd+Shift+G C`

**方式 3: 源代码管理视图**
1. 打开源代码管理视图（`Ctrl+Shift+G`）
2. 点击标题栏的 ✨ 图标

### ⚙️ 配置指南

> 💡 **详细配置示例**: 查看 [examples](./examples/) 目录获取完整的配置指南和模板

#### OpenAI

```json
{
  "aiGitCommit.apiEndpoint": "https://api.openai.com/v1",
  "aiGitCommit.modelName": "gpt-3.5-turbo"
}
```

然后运行 "配置 AI Git Commit Generator" 命令设置您的 OpenAI API 密钥。

📖 [查看完整 OpenAI 配置指南](./examples/config-openai.md)

#### Azure OpenAI

```json
{
  "aiGitCommit.apiEndpoint": "https://your-resource.openai.azure.com/openai/deployments/your-deployment",
  "aiGitCommit.modelName": "gpt-35-turbo"
}
```

API 密钥通过配置向导设置。

📖 [查看完整 Azure OpenAI 配置指南](./examples/config-azure-openai.md)

#### 本地模型（Ollama）

```json
{
  "aiGitCommit.apiEndpoint": "http://localhost:11434/v1",
  "aiGitCommit.modelName": "llama2"
}
```

使用 Ollama 时，API 密钥可以留空或设置为任意值。

📖 [查看完整 Ollama 配置指南](./examples/config-ollama.md)

#### 其他 OpenAI 兼容服务

任何支持 OpenAI API 格式的服务都可以使用：

- **LocalAI**: `http://localhost:8080/v1`
- **LM Studio**: `http://localhost:1234/v1`
- **Text Generation WebUI**: `http://localhost:5000/v1`
- **vLLM**: 您的 vLLM 服务端点

📖 [查看更多服务配置示例](./examples/config-other-services.md)

#### 📚 更多资源

- [提示词模板](./examples/prompt-templates.md) - 自定义提示词和优化技巧
- [约定式提交指南](./examples/conventional-commits-guide.md) - 完整的 Conventional Commits 规范

### 📖 使用示例

#### 示例 1: 功能开发

**代码变更:**
```diff
+ export function calculateTotal(items: Item[]): number {
+   return items.reduce((sum, item) => sum + item.price, 0);
+ }
```

**生成的提交信息:**
```
feat(utils): 添加计算总价的函数

实现 calculateTotal 函数用于计算商品列表的总价
```

#### 示例 2: Bug 修复

**代码变更:**
```diff
- if (user.age > 18) {
+ if (user.age >= 18) {
    allowAccess();
  }
```

**生成的提交信息:**
```
fix(auth): 修正年龄验证的边界条件

将年龄判断从大于改为大于等于，确保18岁用户可以访问
```

#### 示例 3: 重构

**代码变更:**
```diff
- function getUserName(user) {
-   return user.firstName + ' ' + user.lastName;
- }
+ const getUserName = (user: User): string => 
+   `${user.firstName} ${user.lastName}`;
```

**生成的提交信息:**
```
refactor(user): 使用箭头函数和模板字符串重构 getUserName

提高代码可读性并添加类型注解
```

### 🎯 支持的服务

| 服务 | API 端点 | 说明 |
|------|---------|------|
| **OpenAI** | `https://api.openai.com/v1` | 官方 OpenAI API |
| **Azure OpenAI** | `https://{resource}.openai.azure.com/openai/deployments/{deployment}` | Azure 托管的 OpenAI 服务 |
| **Ollama** | `http://localhost:11434/v1` | 本地运行的开源模型 |
| **LocalAI** | `http://localhost:8080/v1` | 本地 OpenAI 兼容服务 |
| **LM Studio** | `http://localhost:1234/v1` | 桌面 LLM 应用 |
| **Text Generation WebUI** | `http://localhost:5000/v1` | Oobabooga 的 WebUI |
| **vLLM** | 自定义端点 | 高性能 LLM 推理引擎 |
| **其他** | 任意 OpenAI 兼容端点 | 任何实现 OpenAI API 格式的服务 |

### ❓ 常见问题

#### Q: 如何更改 API 密钥？

A: 运行命令 "配置 AI Git Commit Generator"，按照提示重新输入新的 API 密钥。密钥将安全存储在 VSCode SecretStorage 中。

#### Q: 生成的提交信息不满意怎么办？

A: 您可以：
1. 在输入框中直接编辑生成的提交信息
2. 点击"重新生成"按钮获取新的提交信息
3. 点击"取消"放弃本次操作

#### Q: 支持哪些提交信息格式？

A: 插件支持两种格式：
- **Conventional Commits**（推荐）: `type(scope): subject`
- **Simple**: 简单的描述性提交信息

可以在设置中的 `aiGitCommit.commitFormat` 配置。

#### Q: 为什么提示"无暂存变更"？

A: 插件只分析已暂存（staged）的变更。请先使用 `git add` 命令或在源代码管理视图中暂存您的变更。

#### Q: API 调用失败怎么办？

A: 请检查：
1. API 端点 URL 是否正确
2. API 密钥是否有效
3. 网络连接是否正常
4. 模型名称是否正确
5. 查看输出面板（"AI Git Commit"）的详细错误日志

#### Q: 如何使用本地模型？

A: 推荐使用 Ollama：
1. 安装 Ollama: https://ollama.ai
2. 运行模型: `ollama run llama2`
3. 配置插件:
   ```json
   {
     "aiGitCommit.apiEndpoint": "http://localhost:11434/v1",
     "aiGitCommit.modelName": "llama2"
   }
   ```

#### Q: 生成的提交信息语言不对？

A: 在设置中修改 `aiGitCommit.language`:
- `zh-CN`: 中文
- `en-US`: 英文

#### Q: 如何自定义提交信息的详细程度？

A: 可以调整以下参数：
- `aiGitCommit.maxTokens`: 控制生成长度（默认 500）
- `aiGitCommit.temperature`: 控制创造性（0-2，默认 0.7）

#### Q: 插件会发送我的代码到哪里？

A: 插件会将您暂存的代码变更（diff）发送到您配置的 API 端点。如果您关心代码隐私：
1. 使用本地模型（如 Ollama）
2. 使用私有部署的 LLM 服务
3. 使用 Azure OpenAI 等企业级服务

#### Q: 如何查看详细的错误日志？

A: 
1. 打开输出面板：`View` > `Output`
2. 在下拉菜单中选择 "AI Git Commit"
3. 查看详细的操作日志和错误信息

### 🔧 高级配置

#### 完整配置示例

```json
{
  // API 配置
  "aiGitCommit.apiEndpoint": "https://api.openai.com/v1",
  "aiGitCommit.modelName": "gpt-3.5-turbo",
  
  // 提交信息配置
  "aiGitCommit.language": "zh-CN",
  "aiGitCommit.commitFormat": "conventional",
  
  // LLM 参数
  "aiGitCommit.maxTokens": 500,
  "aiGitCommit.temperature": 0.7
}
```

#### 团队共享配置

在项目根目录创建 `.vscode/settings.json`:

```json
{
  "aiGitCommit.apiEndpoint": "https://your-company-llm.com/v1",
  "aiGitCommit.modelName": "company-model",
  "aiGitCommit.language": "zh-CN",
  "aiGitCommit.commitFormat": "conventional"
}
```

团队成员只需配置自己的 API 密钥即可。

### 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 📄 许可证

MIT

---

## English Version

### ✨ Features

- 🤖 **AI-Powered**: Intelligently analyzes code changes using Large Language Models
- 📝 **Professional Format**: Automatically generates commit messages following Conventional Commits specification
- 🔌 **Wide Compatibility**: Supports all OpenAI-compatible APIs (OpenAI, Azure OpenAI, local models, etc.)
- ⚡ **Fast & Convenient**: One-click generation with keyboard shortcuts and SCM view integration
- ✏️ **Editable**: Preview and edit generated commit messages
- 🔒 **Secure Storage**: API keys securely stored in VSCode SecretStorage
- 🌍 **Multilingual**: Supports Chinese and English commit messages

### 📦 Installation

#### From VSCode Marketplace

1. Open VSCode
2. Press `Ctrl+Shift+X` (Mac: `Cmd+Shift+X`) to open Extensions panel
3. Search for "AI Git Commit Generator"
4. Click "Install"

#### From VSIX File

1. Download the `.vsix` file
2. Open VSCode
3. Press `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) to open Command Palette
4. Type "Install from VSIX"
5. Select the downloaded `.vsix` file

### 🚀 Quick Start

#### 1. Configure API

On first use, the extension will guide you through configuration:

1. Trigger the generate commit message command
2. Follow prompts to enter API endpoint, API key, and model name
3. Configuration will be saved automatically

Or configure manually:

1. Press `Ctrl+,` (Mac: `Cmd+,`) to open Settings
2. Search for "AI Git Commit"
3. Configure the following options:
   - **API Endpoint**: API endpoint URL
   - **Model Name**: Model name
   - **Language**: Commit message language (Chinese/English)
   - **Commit Format**: Commit format (conventional/simple)

4. Run command "Configure AI Git Commit Generator" to set API key (secure storage)

#### 2. Generate Commit Message

Three ways to trigger generation:

**Method 1: Command Palette**
1. Stage your code changes (`git add`)
2. Press `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
3. Type "Generate AI Commit Message"
4. Wait for AI to generate commit message
5. Preview, edit, and confirm

**Method 2: Keyboard Shortcut**
- Windows/Linux: `Ctrl+Shift+G C`
- Mac: `Cmd+Shift+G C`

**Method 3: Source Control View**
1. Open Source Control view (`Ctrl+Shift+G`)
2. Click the ✨ icon in the title bar

### ⚙️ Configuration Guide

> 💡 **Detailed Configuration Examples**: Check the [examples](./examples/) directory for complete configuration guides and templates

#### OpenAI

```json
{
  "aiGitCommit.apiEndpoint": "https://api.openai.com/v1",
  "aiGitCommit.modelName": "gpt-3.5-turbo"
}
```

Then run "Configure AI Git Commit Generator" command to set your OpenAI API key.

📖 [View complete OpenAI configuration guide](./examples/config-openai.md)

#### Azure OpenAI

```json
{
  "aiGitCommit.apiEndpoint": "https://your-resource.openai.azure.com/openai/deployments/your-deployment",
  "aiGitCommit.modelName": "gpt-35-turbo"
}
```

API key is set through the configuration wizard.

📖 [View complete Azure OpenAI configuration guide](./examples/config-azure-openai.md)

#### Local Models (Ollama)

```json
{
  "aiGitCommit.apiEndpoint": "http://localhost:11434/v1",
  "aiGitCommit.modelName": "llama2"
}
```

When using Ollama, API key can be left empty or set to any value.

📖 [View complete Ollama configuration guide](./examples/config-ollama.md)

#### Other OpenAI-Compatible Services

Any service supporting OpenAI API format can be used:

- **LocalAI**: `http://localhost:8080/v1`
- **LM Studio**: `http://localhost:1234/v1`
- **Text Generation WebUI**: `http://localhost:5000/v1`
- **vLLM**: Your vLLM service endpoint

📖 [View more service configuration examples](./examples/config-other-services.md)

#### 📚 Additional Resources

- [Prompt Templates](./examples/prompt-templates.md) - Custom prompts and optimization tips
- [Conventional Commits Guide](./examples/conventional-commits-guide.md) - Complete Conventional Commits specification

### 📖 Usage Examples

#### Example 1: Feature Development

**Code Changes:**
```diff
+ export function calculateTotal(items: Item[]): number {
+   return items.reduce((sum, item) => sum + item.price, 0);
+ }
```

**Generated Commit Message:**
```
feat(utils): add function to calculate total price

Implement calculateTotal function to compute total price of item list
```

#### Example 2: Bug Fix

**Code Changes:**
```diff
- if (user.age > 18) {
+ if (user.age >= 18) {
    allowAccess();
  }
```

**Generated Commit Message:**
```
fix(auth): correct age validation boundary condition

Change age check from greater than to greater than or equal to, ensuring 18-year-old users can access
```

#### Example 3: Refactoring

**Code Changes:**
```diff
- function getUserName(user) {
-   return user.firstName + ' ' + user.lastName;
- }
+ const getUserName = (user: User): string => 
+   `${user.firstName} ${user.lastName}`;
```

**Generated Commit Message:**
```
refactor(user): refactor getUserName using arrow function and template literals

Improve code readability and add type annotations
```

### 🎯 Supported Services

| Service | API Endpoint | Description |
|---------|-------------|-------------|
| **OpenAI** | `https://api.openai.com/v1` | Official OpenAI API |
| **Azure OpenAI** | `https://{resource}.openai.azure.com/openai/deployments/{deployment}` | Azure-hosted OpenAI service |
| **Ollama** | `http://localhost:11434/v1` | Locally running open-source models |
| **LocalAI** | `http://localhost:8080/v1` | Local OpenAI-compatible service |
| **LM Studio** | `http://localhost:1234/v1` | Desktop LLM application |
| **Text Generation WebUI** | `http://localhost:5000/v1` | Oobabooga's WebUI |
| **vLLM** | Custom endpoint | High-performance LLM inference engine |
| **Others** | Any OpenAI-compatible endpoint | Any service implementing OpenAI API format |

### ❓ FAQ

#### Q: How to change API key?

A: Run command "Configure AI Git Commit Generator" and follow prompts to enter new API key. The key will be securely stored in VSCode SecretStorage.

#### Q: What if I'm not satisfied with the generated commit message?

A: You can:
1. Edit the generated commit message directly in the input box
2. Click "Regenerate" button to get a new commit message
3. Click "Cancel" to abort the operation

#### Q: What commit message formats are supported?

A: The extension supports two formats:
- **Conventional Commits** (recommended): `type(scope): subject`
- **Simple**: Simple descriptive commit messages

Configure via `aiGitCommit.commitFormat` in settings.

#### Q: Why does it say "No staged changes"?

A: The extension only analyzes staged changes. Please use `git add` command or stage your changes in the Source Control view first.

#### Q: What to do if API call fails?

A: Please check:
1. Is the API endpoint URL correct?
2. Is the API key valid?
3. Is the network connection working?
4. Is the model name correct?
5. Check detailed error logs in Output panel ("AI Git Commit")

#### Q: How to use local models?

A: Ollama is recommended:
1. Install Ollama: https://ollama.ai
2. Run model: `ollama run llama2`
3. Configure extension:
   ```json
   {
     "aiGitCommit.apiEndpoint": "http://localhost:11434/v1",
     "aiGitCommit.modelName": "llama2"
   }
   ```

#### Q: Generated commit message is in wrong language?

A: Modify `aiGitCommit.language` in settings:
- `zh-CN`: Chinese
- `en-US`: English

#### Q: How to customize commit message verbosity?

A: Adjust the following parameters:
- `aiGitCommit.maxTokens`: Control generation length (default 500)
- `aiGitCommit.temperature`: Control creativity (0-2, default 0.7)

#### Q: Where does the extension send my code?

A: The extension sends your staged code changes (diff) to the API endpoint you configured. If you're concerned about code privacy:
1. Use local models (like Ollama)
2. Use privately deployed LLM services
3. Use enterprise services like Azure OpenAI

#### Q: How to view detailed error logs?

A: 
1. Open Output panel: `View` > `Output`
2. Select "AI Git Commit" from dropdown menu
3. View detailed operation logs and error messages

### 🔧 Advanced Configuration

#### Complete Configuration Example

```json
{
  // API Configuration
  "aiGitCommit.apiEndpoint": "https://api.openai.com/v1",
  "aiGitCommit.modelName": "gpt-3.5-turbo",
  
  // Commit Message Configuration
  "aiGitCommit.language": "en-US",
  "aiGitCommit.commitFormat": "conventional",
  
  // LLM Parameters
  "aiGitCommit.maxTokens": 500,
  "aiGitCommit.temperature": 0.7
}
```

#### Team Shared Configuration

Create `.vscode/settings.json` in project root:

```json
{
  "aiGitCommit.apiEndpoint": "https://your-company-llm.com/v1",
  "aiGitCommit.modelName": "company-model",
  "aiGitCommit.language": "en-US",
  "aiGitCommit.commitFormat": "conventional"
}
```

Team members only need to configure their own API keys.

### 🤝 Contributing

Issues and Pull Requests are welcome!

### 📄 License

MIT

---

## 🌟 Star History

If you find this extension helpful, please consider giving it a star on GitHub!

## 📞 Support

- GitHub Issues: [Report a bug or request a feature](https://github.com/your-repo/issues)
- Email: your-email@example.com

---

Made with ❤️ by developers, for developers
