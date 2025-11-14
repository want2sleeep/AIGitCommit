# Ollama 配置示例

本文档提供了使用 Ollama 本地 LLM 服务的配置示例。

## 什么是 Ollama？

Ollama 是一个在本地运行大型语言模型的工具，支持多种开源模型。使用 Ollama 的优势：
- **完全本地运行**：代码不会发送到外部服务器
- **免费使用**：无需 API 密钥和付费
- **隐私保护**：所有数据保留在本地
- **离线工作**：不需要网络连接

## 前置要求

### 1. 安装 Ollama

访问 [Ollama 官网](https://ollama.ai/) 下载并安装：

**macOS / Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
下载并运行安装程序

### 2. 下载模型

安装 Ollama 后，下载推荐的模型：

#### Llama 2（推荐用于代码）
```bash
ollama pull llama2
```

#### Code Llama（专为代码优化）
```bash
ollama pull codellama
```

#### Mistral（性能优秀）
```bash
ollama pull mistral
```

#### Qwen（支持中文）
```bash
ollama pull qwen
```

### 3. 启动 Ollama 服务

Ollama 通常会自动启动服务。如果需要手动启动：

```bash
ollama serve
```

默认服务地址：`http://localhost:11434`

## 配置参数

### API 端点
```
http://localhost:11434/v1
```

**注意**：Ollama 提供 OpenAI 兼容的 API，端点需要添加 `/v1` 后缀

### API 密钥
Ollama 本地服务不需要 API 密钥，可以留空或使用任意值：
```
ollama
```

### 模型名称
使用您已下载的模型名称：

#### 推荐模型

**codellama**（最适合代码）
```
codellama
```
- 专为代码任务优化
- 理解代码变更能力强
- 推荐用于生成提交信息

**mistral**（性能均衡）
```
mistral
```
- 性能优秀
- 响应速度快
- 适合大多数场景

**qwen**（中文支持好）
```
qwen
```
- 对中文理解更好
- 适合生成中文提交信息

**llama2**（通用模型）
```
llama2
```
- 通用性强
- 稳定可靠

## 完整配置示例

### 示例 1：使用 Code Llama（推荐）

```json
{
  "aiGitCommit.apiEndpoint": "http://localhost:11434/v1",
  "aiGitCommit.modelName": "codellama",
  "aiGitCommit.language": "zh-CN",
  "aiGitCommit.commitFormat": "conventional",
  "aiGitCommit.maxTokens": 500,
  "aiGitCommit.temperature": 0.7
}
```

### 示例 2：使用 Mistral

```json
{
  "aiGitCommit.apiEndpoint": "http://localhost:11434/v1",
  "aiGitCommit.modelName": "mistral",
  "aiGitCommit.language": "zh-CN",
  "aiGitCommit.commitFormat": "conventional",
  "aiGitCommit.maxTokens": 500,
  "aiGitCommit.temperature": 0.7
}
```

### 示例 3：使用 Qwen（中文优化）

```json
{
  "aiGitCommit.apiEndpoint": "http://localhost:11434/v1",
  "aiGitCommit.modelName": "qwen",
  "aiGitCommit.language": "zh-CN",
  "aiGitCommit.commitFormat": "conventional",
  "aiGitCommit.maxTokens": 500,
  "aiGitCommit.temperature": 0.7
}
```

## 性能优化

### 1. 选择合适的模型大小

Ollama 支持不同大小的模型变体：

```bash
# 7B 参数（推荐，平衡性能和质量）
ollama pull codellama:7b

# 13B 参数（更好的质量，需要更多资源）
ollama pull codellama:13b

# 34B 参数（最佳质量，需要强大硬件）
ollama pull codellama:34b
```

### 2. 调整温度参数

对于代码提交信息生成，建议使用较低的温度：

```json
{
  "aiGitCommit.temperature": 0.5
}
```

### 3. 限制 Token 数量

本地模型生成速度较慢，可以适当减少 maxTokens：

```json
{
  "aiGitCommit.maxTokens": 300
}
```

## 验证配置

### 1. 检查 Ollama 服务状态

```bash
curl http://localhost:11434/api/tags
```

应该返回已安装的模型列表。

### 2. 测试模型

```bash
ollama run codellama "Hello, how are you?"
```

### 3. 测试 OpenAI 兼容 API

```bash
curl http://localhost:11434/v1/models
```

## 注意事项

1. **硬件要求**：
   - 最低：8GB RAM
   - 推荐：16GB RAM
   - 7B 模型需要约 4-8GB 内存
   - 13B 模型需要约 8-16GB 内存

2. **首次运行**：首次生成可能较慢，因为需要加载模型到内存

3. **响应时间**：本地模型的响应时间取决于硬件性能，通常比云端 API 慢

4. **模型更新**：定期更新模型以获得更好的性能
   ```bash
   ollama pull codellama
   ```

5. **端口冲突**：如果 11434 端口被占用，可以修改 Ollama 的配置

## 故障排除

### 连接失败
```
Error: connect ECONNREFUSED 127.0.0.1:11434
```
**解决方案**：
- 确认 Ollama 服务正在运行：`ollama serve`
- 检查防火墙设置

### 模型未找到
```
Error: model 'codellama' not found
```
**解决方案**：
- 下载模型：`ollama pull codellama`
- 检查模型名称是否正确

### 内存不足
```
Error: failed to load model
```
**解决方案**：
- 使用更小的模型（如 7B 版本）
- 关闭其他占用内存的应用
- 增加系统内存

### 响应超时
**解决方案**：
- 使用更小的模型
- 减少 maxTokens 设置
- 升级硬件

## 推荐配置组合

### 轻量级配置（8GB RAM）
```json
{
  "aiGitCommit.apiEndpoint": "http://localhost:11434/v1",
  "aiGitCommit.modelName": "codellama:7b",
  "aiGitCommit.maxTokens": 300,
  "aiGitCommit.temperature": 0.5
}
```

### 标准配置（16GB RAM）
```json
{
  "aiGitCommit.apiEndpoint": "http://localhost:11434/v1",
  "aiGitCommit.modelName": "codellama:13b",
  "aiGitCommit.maxTokens": 500,
  "aiGitCommit.temperature": 0.7
}
```

### 高性能配置（32GB+ RAM）
```json
{
  "aiGitCommit.apiEndpoint": "http://localhost:11434/v1",
  "aiGitCommit.modelName": "codellama:34b",
  "aiGitCommit.maxTokens": 800,
  "aiGitCommit.temperature": 0.7
}
```
