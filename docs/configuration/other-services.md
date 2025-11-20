# 其他服务配置示例

本文档提供了除 OpenAI 和 Ollama 之外的其他 AI 服务配置示例。



### 配置参数

#### API 端点
```
https://your-resource-name.openai.azure.com/openai/deployments/your-deployment-name
```

#### API 密钥
- 访问 [Azure Portal](https://portal.azure.com/)
- 在您的 OpenAI 资源中获取 API 密钥
- 或使用 Azure AD 认证

#### 模型名称
使用您的部署名称，例如：
- `gpt-35-turbo`
- `gpt-4`
- `gpt-4-32k`

### 完整配置示例


### 注意事项


---

## Qwen（通义千问）

Qwen 是阿里云提供的大语言模型服务，对中文支持优秀，国内访问速度快。

### 配置参数

#### API 端点
```
https://dashscope.aliyuncs.com/compatible-mode/v1
```

#### API 密钥
- 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
- 获取 API-KEY

#### 模型名称
推荐的模型：
- `qwen-turbo` - 快速响应，性价比高
- `qwen-plus` - 更强的理解能力
- `qwen-max` - 最强性能

### 完整配置示例

```json
{
  "aigitcommit.provider": "openai-compatible",
  "aigitcommit.apiEndpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "aigitcommit.modelName": "qwen-turbo",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

### 注意事项

1. **国内优势**：国内服务器，访问速度快
2. **中文优化**：对中文理解能力强
3. **计费方式**：按 token 计费，价格合理

---

## vLLM

vLLM 是一个高性能的 LLM 推理服务，支持多种开源模型。

### 安装 vLLM

```bash
# 使用 pip
pip install vllm

# 或从源码安装
git clone https://github.com/vllm-project/vllm.git
cd vllm
pip install -e .
```

### 启动服务

```bash
# 基本启动
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-2-7b-chat-hf \
    --port 8000

# 带参数启动
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-2-7b-chat-hf \
    --port 8000 \
    --host 0.0.0.0 \
    --tensor-parallel-size 1
```

### 配置参数

#### API 端点
```
http://localhost:8000/v1
```

#### 模型名称
使用您启动的模型名称：
- `meta-llama/Llama-2-7b-chat-hf`
- `codellama/CodeLlama-7b-Instruct-hf`
- `mistralai/Mistral-7B-Instruct-v0.1`

### 完整配置示例

```json
{
  "aigitcommit.provider": "vllm",
  "aigitcommit.apiEndpoint": "http://localhost:8000/v1",
  "aigitcommit.modelName": "meta-llama/Llama-2-7b-chat-hf",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

---

## LocalAI

LocalAI 是一个本地 AI 推理框架，支持多种模型格式。

### 安装和配置

```bash
# 使用 Docker
docker run -p 8080:8080 --name local-ai -v $PWD/models:/models -d localai/localai

# 或使用 Kubernetes
kubectl apply -f https://raw.githubusercontent.com/mudler/LocalAI/master/examples/kubernetes/docker-compose.yaml
```

### 配置参数

#### API 端点
```
http://localhost:8080/v1
```

#### 模型名称
根据下载的模型而定：
- `gpt-3.5-turbo`
- `gpt-4`
- `llama-2-7b-chat`

### 完整配置示例

```json
{
  "aigitcommit.provider": "openai-compatible",
  "aigitcommit.apiEndpoint": "http://localhost:8080/v1",
  "aigitcommit.modelName": "gpt-3.5-turbo",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

---

## LM Studio

LM Studio 是一个桌面应用程序，可以轻松运行本地 LLM。

### 配置步骤

1. **下载和安装 LM Studio**
   - 访问 [LM Studio 官网](https://lmstudio.ai/)
   - 下载适合您操作系统的版本

2. **下载模型**
   - 在 LM Studio 中搜索并下载模型
   - 推荐代码模型：Code Llama、DeepSeek Coder

3. **启动本地服务器**
   - 在 LM Studio 中切换到 "Local Server" 标签
   - 选择加载的模型
   - 点击 "Start Server"

### 配置参数

#### API 端点
```
http://localhost:1234/v1
```

#### 模型名称
通常使用：
- `local-model`
- `default`
- 或者在 LM Studio 中显示的模型名称

### 完整配置示例

```json
{
  "aigitcommit.provider": "openai-compatible",
  "aigitcommit.apiEndpoint": "http://localhost:1234/v1",
  "aigitcommit.modelName": "local-model",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

---

## 自定义 OpenAI 兼容服务

任何提供 OpenAI 兼容 API 的服务都可以使用。

### 通用配置模板

```json
{
  "aigitcommit.provider": "openai-compatible",
  "aigitcommit.apiEndpoint": "YOUR_API_ENDPOINT",
  "aigitcommit.modelName": "YOUR_MODEL_NAME",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

### 常见兼容服务

#### Groq
```json
{
  "aigitcommit.apiEndpoint": "https://api.groq.com/openai/v1",
  "aigitcommit.modelName": "mixtral-8x7b-32768"
}
```

#### Together AI
```json
{
  "aigitcommit.apiEndpoint": "https://api.together.xyz/v1",
  "aigitcommit.modelName": "meta-llama/Llama-2-7b-chat-hf"
}
```

#### Perplexity
```json
{
  "aigitcommit.apiEndpoint": "https://api.perplexity.ai",
  "aigitcommit.modelName": "llama-3-sonar-small-32k"
}
```

---

## 提示词模板

### 自定义系统提示词

您可以为特定服务自定义提示词：

```json
{
  "aigitcommit.customPrompt": "你是一个专业的代码审查员，请分析以下代码变更并生成符合约定式提交规范的提交信息。要求：1. 使用中文 2. 包含详细说明 3. 格式规范"
}
```

### 针对不同模型的优化

#### 代码模型优化
```json
{
  "aigitcommit.customPrompt": "作为代码专家，分析以下Git差异并生成专业的提交信息。重点关注：1. 代码逻辑变更 2. 架构影响 3. 性能影响"
}
```

#### 中文模型优化
```json
{
  "aigitcommit.customPrompt": "请分析以下代码变更，生成简洁明了的中文提交信息。要求使用约定式提交格式，包含类型、范围和详细说明。"
}
```

---

## 代理配置

如果您的网络环境需要代理，可以配置：

```json
{
  "aigitcommit.proxy": "http://proxy.example.com:8080",
  "aigitcommit.proxyAuth": {
    "username": "your-username",
    "password": "your-password"
  }
}
```

### 环境变量配置

也可以通过环境变量设置代理：

```bash
# HTTP 代理
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# 带认证的代理
export HTTP_PROXY=http://username:password@proxy.example.com:8080
export HTTPS_PROXY=http://username:password@proxy.example.com:8080
```

---

## 故障排除

### 通用问题

#### 1. 连接超时
- 检查网络连接
- 验证 API 端点是否正确
- 考虑使用代理

#### 2. 认证失败
- 验证 API 密钥是否正确
- 检查密钥是否过期
- 确认权限设置

#### 3. 模型不支持
- 检查模型名称拼写
- 确认服务支持该模型
- 查看服务文档

### 本地服务问题

#### 1. 服务无法启动
- 检查端口是否被占用
- 验证硬件配置
- 查看错误日志

#### 2. 内存不足
- 使用更小的模型
- 增加虚拟内存
- 关闭其他应用

#### 3. 响应慢
- 优化模型参数
- 使用 GPU 加速
- 升级硬件配置

---

## 性能对比

| **Qwen** | 快 | 中 | 一般 | 简单 |
| **vLLM** | 中等 | 免费 | 完全 | 复杂 |
| **LocalAI** | 中等 | 免费 | 完全 | 中等 |
| **LM Studio** | 慢 | 免费 | 完全 | 简单 |

---

## 选择建议


### 个人开发者
- **推荐**：Qwen 或 LM Studio
- **原因**：成本效益、易用性

### 隐私敏感
- **推荐**：vLLM 或 LocalAI
- **原因**：完全本地运行

### 国内用户
- **推荐**：Qwen
- **原因**：访问速度快、中文优化

---

**相关文档**: [返回配置指南](README.md) | [OpenAI配置](openai.md) | [Ollama配置](ollama.md) | [快速开始](../guides/quick-start.md)