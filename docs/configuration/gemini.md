# Google Gemini 配置示例

本文档提供了使用 Google Gemini API 的配置示例。

## 什么是 Gemini？

Gemini 是 Google 推出的多模态大语言模型，具有强大的代码理解和生成能力，支持多种语言。

## 获取 API 密钥

1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 登录您的 Google 账号
3. 点击 "Get API key" 获取 API 密钥
4. 复制生成的 API 密钥

## 配置参数

### API 端点
```
https://generativelanguage.googleapis.com/v1beta
```

### API 密钥
- 从 Google AI Studio 获取
- 使用配置向导安全存储

### 模型名称
推荐的模型选项：

#### Gemini 1.5 系列（推荐）
```
gemini-1.5-flash
```
- 快速响应，性价比高
- 适合日常使用

```
gemini-1.5-pro
```
- 更强的理解能力
- 适合复杂项目

#### Gemini 1.0 系列
```
gemini-1.0-pro
```
- 稳定版本
- 通用场景

## 完整配置示例

在 VSCode 的 `settings.json` 中：

```json
{
  "aigitcommit.provider": "gemini",
  "aigitcommit.apiEndpoint": "https://generativelanguage.googleapis.com/v1beta",
  "aigitcommit.modelName": "gemini-1.5-flash",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

## 使用配置向导

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "配置 AI Git Commit"
3. 选择 "Google Gemini" 作为提供商
4. 按照提示输入 API 密钥和其他配置

## 模型对比

| 模型 | 速度 | 质量 | 成本 | 推荐场景 |
|------|------|------|------|----------|
| `gemini-1.5-flash` | ⚡ 快 | ⭐⭐⭐ | 💰 | 日常使用 |
| `gemini-1.5-pro` | 🐢 中等 | ⭐⭐⭐⭐ | 💰💰 | 复杂项目 |
| `gemini-1.0-pro` | ⚡ 快 | ⭐⭐⭐ | 💰 | 稳定需求 |

## 注意事项

1. **API 密钥安全**：不要将 API 密钥直接写入 `settings.json`，使用配置向导安全存储
2. **区域限制**：某些地区可能无法直接访问 Gemini API，需要使用代理
3. **免费额度**：Google AI Studio 提供免费使用额度，适合个人开发者
4. **速率限制**：注意 API 的速率限制，避免频繁调用

## 故障排除

### 401 Unauthorized
- 检查 API 密钥是否正确
- 确认 API 密钥是否有效且未过期
- 验证 API 密钥是否有正确的权限

### 403 Forbidden
- 检查您的 Google 账号是否有权限使用 Gemini API
- 确认您所在的地区是否支持 Gemini API
- 验证 API 密钥的使用限制

### 429 Too Many Requests
- 您已达到速率限制
- 等待一段时间后重试
- 考虑升级您的 API 配额

### 网络连接错误
- 检查网络连接
- 确认能够访问 `generativelanguage.googleapis.com`
- 如果在中国大陆，可能需要使用代理

### 模型不可用
- 检查模型名称是否正确
- 确认该模型在您的地区可用
- 尝试使用其他模型

## 高级配置

### 代理设置

如果需要通过代理访问 Gemini API：

```json
{
  "aigitcommit.proxy": "http://proxy.example.com:8080"
}
```

### 自定义提示词

针对 Gemini 优化的提示词：

```json
{
  "aigitcommit.customPrompt": "作为代码专家，分析以下Git差异并生成专业的提交信息。使用约定式提交格式，包含类型、范围和详细说明。"
}
```

## 最佳实践

### 1. 模型选择
- **日常开发**：使用 `gemini-1.5-flash`，响应快速
- **重要提交**：使用 `gemini-1.5-pro`，质量更高
- **稳定需求**：使用 `gemini-1.0-pro`，行为一致

### 2. 参数调优
```json
{
  "aigitcommit.temperature": 0.5,  // 降低随机性，提高一致性
  "aigitcommit.maxTokens": 300     // 控制输出长度
}
```

### 3. 成本控制
- 使用 `gemini-1.5-flash` 降低成本
- 监控 API 使用量
- 利用免费额度

---

**相关文档**: [返回配置指南](README.md) | [OpenAI配置](openai.md) | [Ollama配置](ollama.md) | [其他服务](other-services.md)
