# 其他 OpenAI 兼容服务配置示例

本文档提供了其他 OpenAI 兼容 LLM 服务的配置示例。

## 支持的服务

只要服务提供 OpenAI 兼容的 API 接口，都可以使用本插件。以下是一些常见的服务：

---

## 1. LocalAI

LocalAI 是一个本地运行的 OpenAI 兼容 API 服务器。

### 安装和启动

使用 Docker：
```bash
docker run -p 8080:8080 --name local-ai -ti localai/localai:latest
```

### 配置示例

```json
{
  "aigitcommit.apiEndpoint": "http://localhost:8080/v1",
  "aigitcommit.modelName": "gpt-3.5-turbo",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

**注意**：
- API 密钥可以留空或使用任意值
- 模型名称取决于您在 LocalAI 中配置的模型

---

## 2. LM Studio

LM Studio 是一个桌面应用，可以在本地运行各种开源模型。

### 启动 API 服务

1. 打开 LM Studio
2. 加载一个模型
3. 点击 "Start Server"
4. 默认端口：1234

### 配置示例

```json
{
  "aigitcommit.apiEndpoint": "http://localhost:1234/v1",
  "aigitcommit.modelName": "local-model",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

**注意**：
- 不需要 API 密钥
- 模型名称通常是 "local-model" 或您在 LM Studio 中看到的名称

---

## 3. Text Generation WebUI (oobabooga)

一个流行的本地 LLM Web 界面。

### 启动 API 服务

启动时添加 `--api` 参数：
```bash
python server.py --api
```

默认端口：5000

### 配置示例

```json
{
  "aigitcommit.apiEndpoint": "http://localhost:5000/v1",
  "aigitcommit.modelName": "your-model-name",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

---

## 4. vLLM

高性能的 LLM 推理服务器。

### 启动服务

```bash
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-2-7b-chat-hf \
  --port 8000
```

### 配置示例

```json
{
  "aigitcommit.apiEndpoint": "http://localhost:8000/v1",
  "aigitcommit.modelName": "meta-llama/Llama-2-7b-chat-hf",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

---

## 5. FastChat

支持多种模型的聊天服务。

### 启动 OpenAI 兼容 API

```bash
python -m fastchat.serve.openai_api_server \
  --host localhost \
  --port 8000
```

### 配置示例

```json
{
  "aigitcommit.apiEndpoint": "http://localhost:8000/v1",
  "aigitcommit.modelName": "vicuna-7b-v1.5",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

---

## 6. 国内 AI 服务

### 6.1 通义千问（Qwen）

如果服务提供 OpenAI 兼容接口：

```json
{
  "aigitcommit.apiEndpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "aigitcommit.modelName": "qwen-turbo",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

### 6.2 智谱 AI (ChatGLM)

```json
{
  "aigitcommit.apiEndpoint": "https://open.bigmodel.cn/api/paas/v4",
  "aigitcommit.modelName": "glm-4",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

### 6.3 百度文心一言

```json
{
  "aigitcommit.apiEndpoint": "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop",
  "aigitcommit.modelName": "ernie-bot-turbo",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

**注意**：国内服务的 API 格式可能与 OpenAI 有差异，需要确认是否完全兼容。

---

## 7. 自定义 API 代理

如果您使用 API 代理服务（如 OpenAI 代理、API 转发等）：

### 配置示例

```json
{
  "aigitcommit.apiEndpoint": "https://your-proxy-domain.com/v1",
  "aigitcommit.modelName": "gpt-3.5-turbo",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

---

## 通用配置指南

### 1. 确认 API 兼容性

确保服务支持以下 OpenAI API 端点：
- `POST /v1/chat/completions`

### 2. 测试连接

使用 curl 测试 API：

```bash
curl -X POST "http://your-endpoint/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "your-model",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 3. 常见问题

#### 端点路径
- 大多数服务使用 `/v1` 作为基础路径
- 确保端点 URL 不包含 `/chat/completions`（插件会自动添加）

#### 模型名称
- 使用服务提供的确切模型名称
- 某些服务可能使用别名

#### API 密钥
- 本地服务通常不需要密钥
- 云服务需要有效的 API 密钥

#### 超时设置
- 本地服务可能响应较慢
- 如果遇到超时，可以考虑使用更小的模型或减少 maxTokens

---

## 环境变量配置

对于需要保密的配置，可以使用环境变量：

### Windows
```cmd
set OPENAI_API_KEY=your-api-key
set OPENAI_API_BASE=https://your-endpoint/v1
```

### macOS / Linux
```bash
export OPENAI_API_KEY=your-api-key
export OPENAI_API_BASE=https://your-endpoint/v1
```

**注意**：插件优先使用 VSCode 配置，环境变量作为备选方案。

---

## 选择建议

### 隐私优先
- **推荐**：Ollama、LocalAI、LM Studio
- **优点**：完全本地，数据不离开设备
- **缺点**：需要本地硬件资源

### 性能优先
- **推荐**：OpenAI、Azure OpenAI
- **优点**：响应快，质量高
- **缺点**：需要付费，数据上传到云端

### 成本优先
- **推荐**：Ollama、开源模型
- **优点**：完全免费
- **缺点**：需要自己维护

### 中文优化
- **推荐**：Qwen（通义千问）、ChatGLM
- **优点**：对中文理解更好
- **缺点**：可能需要特定配置

---

## 故障排除

### 通用错误处理

1. **连接错误**
   - 检查端点 URL 是否正确
   - 确认服务正在运行
   - 检查防火墙设置

2. **认证错误**
   - 验证 API 密钥是否正确
   - 确认密钥权限

3. **模型错误**
   - 确认模型名称正确
   - 检查模型是否已加载

4. **超时错误**
   - 减少 maxTokens
   - 使用更快的模型
   - 检查网络连接

---

## 贡献

如果您成功配置了其他 OpenAI 兼容服务，欢迎提交配置示例！
