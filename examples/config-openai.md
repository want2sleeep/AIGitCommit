# OpenAI 配置示例

本文档提供了使用 OpenAI 官方 API 的配置示例。

## 配置步骤

1. 打开 VSCode 设置（`Ctrl+,` 或 `Cmd+,`）
2. 搜索 "AI Git Commit"
3. 按照以下示例配置各项参数

## 配置参数

### API 端点
```
https://api.openai.com/v1
```

### API 密钥
- 访问 [OpenAI API Keys](https://platform.openai.com/api-keys) 获取您的 API 密钥
- 使用命令 `Git: 配置AI Git Commit Generator` 安全存储密钥
- 或在首次使用时通过配置向导输入

### 模型名称
推荐的模型选项：

#### GPT-4 系列（推荐）
```
gpt-4-turbo-preview
```
- 最强大的模型，理解能力最好
- 成本较高
- 适合复杂项目

```
gpt-4
```
- 稳定的 GPT-4 版本
- 成本较高

#### GPT-3.5 系列（经济实惠）
```
gpt-3.5-turbo
```
- 性价比高
- 响应速度快
- 适合大多数场景

```
gpt-3.5-turbo-16k
```
- 支持更长的上下文
- 适合大型变更

## 完整配置示例

在 VSCode 的 `settings.json` 中：

```json
{
  "aiGitCommit.apiEndpoint": "https://api.openai.com/v1",
  "aiGitCommit.modelName": "gpt-3.5-turbo",
  "aiGitCommit.language": "zh-CN",
  "aiGitCommit.commitFormat": "conventional",
  "aiGitCommit.maxTokens": 500,
  "aiGitCommit.temperature": 0.7
}
```

## 注意事项

1. **API 密钥安全**：不要将 API 密钥直接写入 `settings.json`，使用配置向导安全存储
2. **成本控制**：OpenAI API 按使用量计费，建议从 GPT-3.5 开始使用
3. **速率限制**：注意 OpenAI 的 API 速率限制，避免频繁调用
4. **网络要求**：需要能够访问 OpenAI 的 API 服务器

## 故障排除

### 401 Unauthorized
- 检查 API 密钥是否正确
- 确认 API 密钥是否有效且未过期

### 429 Too Many Requests
- 您已达到速率限制
- 等待一段时间后重试
- 考虑升级您的 OpenAI 账户

### 网络连接错误
- 检查网络连接
- 确认能够访问 `api.openai.com`
- 如果在中国大陆，可能需要使用代理
