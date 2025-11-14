# AI Git Commit Generator - 配置示例和模板

本目录包含了 AI Git Commit Generator 插件的配置示例、提示词模板和参考文档。

## 📁 文件说明

### 配置示例

- **[config-openai.md](./config-openai.md)** - OpenAI 官方 API 配置指南
  - GPT-3.5 和 GPT-4 模型配置
  - API 密钥获取和设置
  - 常见问题解决

- **[config-azure-openai.md](./config-azure-openai.md)** - Azure OpenAI Service 配置指南
  - Azure 资源配置
  - 端点和部署设置
  - 企业级使用建议

- **[config-ollama.md](./config-ollama.md)** - Ollama 本地 LLM 配置指南
  - 本地模型安装和配置
  - 隐私保护的本地方案
  - 性能优化建议

- **[config-other-services.md](./config-other-services.md)** - 其他 OpenAI 兼容服务配置
  - LocalAI、LM Studio、vLLM 等
  - 国内 AI 服务配置
  - 自定义 API 代理设置

### 模板和参考

- **[prompt-templates.md](./prompt-templates.md)** - 提示词模板集合
  - 默认提示词模板
  - 多种风格的自定义模板
  - 提示词优化技巧

- **[conventional-commits-guide.md](./conventional-commits-guide.md)** - 约定式提交格式完整指南
  - Conventional Commits 规范详解
  - 提交类型和格式说明
  - 最佳实践和示例

## 🚀 快速开始

### 1. 选择您的 LLM 服务

根据您的需求选择合适的服务：

| 服务类型 | 推荐场景 | 配置文档 |
|---------|---------|---------|
| **OpenAI** | 追求最佳质量，不介意成本 | [config-openai.md](./config-openai.md) |
| **Azure OpenAI** | 企业用户，需要数据隐私保护 | [config-azure-openai.md](./config-azure-openai.md) |
| **Ollama** | 完全本地运行，保护代码隐私 | [config-ollama.md](./config-ollama.md) |
| **其他服务** | 使用其他兼容服务或代理 | [config-other-services.md](./config-other-services.md) |

### 2. 配置插件

1. 打开 VSCode 设置（`Ctrl+,` 或 `Cmd+,`）
2. 搜索 "AI Git Commit"
3. 根据选择的服务配置相应参数
4. 使用命令 `Git: 配置AI Git Commit Generator` 安全存储 API 密钥

### 3. 开始使用

1. 在 Git 仓库中暂存您的变更
2. 使用以下任一方式生成提交信息：
   - 命令面板：`Git: 生成AI提交信息`
   - 快捷键：`Ctrl+Shift+G C`（Windows/Linux）或 `Cmd+Shift+G C`（macOS）
   - 源代码管理视图中的按钮

## 📖 详细文档

### 配置参数说明

所有配置参数的详细说明：

#### aiGitCommit.apiEndpoint
- **类型**：字符串
- **默认值**：`https://api.openai.com/v1`
- **说明**：OpenAI 兼容 API 的端点 URL
- **示例**：
  - OpenAI: `https://api.openai.com/v1`
  - Azure: `https://your-resource.openai.azure.com/openai/deployments/your-deployment`
  - Ollama: `http://localhost:11434/v1`

#### aiGitCommit.modelName
- **类型**：字符串
- **默认值**：`gpt-3.5-turbo`
- **说明**：使用的模型名称
- **示例**：
  - OpenAI: `gpt-3.5-turbo`, `gpt-4`
  - Azure: 您的部署名称
  - Ollama: `codellama`, `mistral`, `qwen`

#### aiGitCommit.language
- **类型**：字符串
- **默认值**：`zh-CN`
- **选项**：`zh-CN`（中文）、`en-US`（英文）
- **说明**：生成的提交信息使用的语言

#### aiGitCommit.commitFormat
- **类型**：字符串
- **默认值**：`conventional`
- **选项**：`conventional`（约定式提交）、`simple`（简单格式）
- **说明**：提交信息的格式风格

#### aiGitCommit.maxTokens
- **类型**：数字
- **默认值**：`500`
- **说明**：生成提交信息的最大 token 数
- **建议**：
  - 简短提交：200-300
  - 标准提交：400-600
  - 详细提交：600-1000

#### aiGitCommit.temperature
- **类型**：数字
- **默认值**：`0.7`
- **范围**：0-2
- **说明**：控制生成文本的随机性
- **建议**：
  - 更确定性：0.3-0.5
  - 平衡：0.6-0.8
  - 更创造性：0.9-1.2

## 🎯 使用场景

### 场景 1：个人开发者

**推荐配置**：Ollama + Code Llama

**优势**：
- 完全免费
- 代码不离开本地
- 无需网络连接

**配置**：参考 [config-ollama.md](./config-ollama.md)

### 场景 2：小团队

**推荐配置**：OpenAI GPT-3.5

**优势**：
- 性价比高
- 响应速度快
- 质量稳定

**配置**：参考 [config-openai.md](./config-openai.md)

### 场景 3：企业团队

**推荐配置**：Azure OpenAI

**优势**：
- 数据隐私保护
- 企业级 SLA
- 合规性支持

**配置**：参考 [config-azure-openai.md](./config-azure-openai.md)

### 场景 4：开源项目

**推荐配置**：OpenAI GPT-4 + 英文提交信息

**优势**：
- 最佳质量
- 国际化支持
- 社区友好

**配置**：
```json
{
  "aiGitCommit.apiEndpoint": "https://api.openai.com/v1",
  "aiGitCommit.modelName": "gpt-4-turbo-preview",
  "aiGitCommit.language": "en-US",
  "aiGitCommit.commitFormat": "conventional"
}
```

## 💡 提示和技巧

### 1. 优化提交信息质量

- 暂存相关的变更，避免一次暂存太多不相关的文件
- 对于大型变更，考虑拆分成多个小的提交
- 如果生成的提交信息不满意，可以点击"重新生成"

### 2. 提高生成速度

- 使用本地模型（Ollama）可以避免网络延迟
- 减少 `maxTokens` 设置可以加快生成速度
- 使用更快的模型（如 GPT-3.5 而不是 GPT-4）

### 3. 控制成本

- 使用 GPT-3.5 而不是 GPT-4 可以大幅降低成本
- 考虑使用本地模型（Ollama）完全免费
- 设置合理的 `maxTokens` 避免不必要的 token 消耗

### 4. 保护代码隐私

- 使用本地模型（Ollama、LocalAI）
- 使用企业内部部署的 LLM 服务
- 使用 Azure OpenAI 并配置私有端点

## 🔧 故障排除

### 常见问题

#### 1. 连接失败

**错误信息**：`Error: connect ECONNREFUSED`

**解决方案**：
- 检查 API 端点 URL 是否正确
- 确认服务正在运行（对于本地服务）
- 检查网络连接和防火墙设置

#### 2. 认证失败

**错误信息**：`401 Unauthorized`

**解决方案**：
- 验证 API 密钥是否正确
- 确认 API 密钥未过期
- 重新运行配置向导设置密钥

#### 3. 模型未找到

**错误信息**：`404 Model not found`

**解决方案**：
- 检查模型名称是否正确
- 确认模型已部署（Azure）或已下载（Ollama）
- 查看服务提供商的模型列表

#### 4. 响应超时

**错误信息**：`Request timeout`

**解决方案**：
- 减少 `maxTokens` 设置
- 使用更快的模型
- 检查网络连接质量
- 对于本地模型，考虑使用更小的模型

### 获取帮助

如果遇到问题：

1. 查看插件的输出日志（VSCode 输出面板）
2. 参考相应的配置文档
3. 在 GitHub 上提交 Issue

## 📚 相关资源

- [Conventional Commits 官方规范](https://www.conventionalcommits.org/)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [Azure OpenAI 文档](https://learn.microsoft.com/azure/ai-services/openai/)
- [Ollama 官网](https://ollama.ai/)

## 🤝 贡献

欢迎贡献新的配置示例和模板！

如果您：
- 成功配置了其他 LLM 服务
- 有更好的提示词模板
- 发现了配置技巧

请提交 Pull Request 或 Issue 分享您的经验！

## 📄 许可

本文档遵循与主项目相同的许可协议。
