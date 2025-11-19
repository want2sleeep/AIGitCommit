# Ollama 配置示例

本文档提供了使用 Ollama 本地 LLM 服务的配置示例。

## 什么是 Ollama？

Ollama 是一个本地运行大语言模型的工具，可以让您在本地运行各种开源模型，完全保护代码隐私。

## 安装 Ollama

### Windows
1. 访问 [Ollama 官网](https://ollama.ai/)
2. 下载 Windows 安装包
3. 运行安装程序
4. 在命令行中验证安装：`ollama --version`

### macOS
```bash
# 使用 Homebrew
brew install ollama

# 或下载 DMG 文件
# 访问 https://ollama.ai/ 下载
```

### Linux
```bash
# 使用安装脚本
curl -fsSL https://ollama.ai/install.sh | sh

# 或使用包管理器
# Ubuntu/Debian
sudo apt update && sudo apt install ollama

# Fedora
sudo dnf install ollama
```

## 下载模型

### 推荐模型

#### Code Llama（推荐用于代码）
```bash
ollama pull codellama
```

#### Llama 2（通用模型）
```bash
ollama pull llama2
```

#### Mistral（轻量高效）
```bash
ollama pull mistral
```

#### Qwen（中文优化）
```bash
ollama pull qwen
```

### 查看可用模型
```bash
ollama list
```

## 配置参数

### API 端点
```
http://localhost:11434/v1
```

### API 密钥
- 对于本地 Ollama，可以使用任意值或留空
- 建议使用 `sk-local` 作为占位符

### 模型名称
使用 `ollama list` 查看已下载的模型，常见的有：
- `codellama` - 代码专用模型
- `llama2` - 通用模型
- `mistral` - 轻量模型
- `qwen` - 中文优化模型

## 完整配置示例

在 VSCode 的 `settings.json` 中：

```json
{
  "aigitcommit.provider": "ollama",
  "aigitcommit.apiEndpoint": "http://localhost:11434/v1",
  "aigitcommit.modelName": "codellama",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

## 使用配置向导

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "配置 AI Git Commit"
3. 按照提示输入：
   - **API 端点**: `http://localhost:11434/v1`
   - **API 密钥**: `sk-local`（或任意值）
   - **模型名称**: `codellama`

## 启动 Ollama 服务

### 方法 1: 自动启动
安装后，Ollama 通常会自动启动服务。

### 方法 2: 手动启动
```bash
# Windows
ollama serve

# macOS/Linux
ollama serve &
```

### 验证服务运行
```bash
# 检查服务状态
curl http://localhost:11434/api/tags

# 应该看到已安装的模型列表
```

## 性能优化

### 硬件要求

#### 最低配置
- **内存**: 8GB RAM
- **存储**: 10GB 可用空间
- **CPU**: 4核心

#### 推荐配置
- **内存**: 16GB+ RAM
- **存储**: 20GB+ 可用空间（SSD）
- **GPU**: 支持 CUDA 的显卡（可选）

### 模型选择

| 模型 | 内存需求 | 速度 | 代码能力 | 中文支持 |
|------|---------|------|----------|----------|
| `codellama:7b` | 8GB | 中等 | 优秀 | 中等 |
| `llama2:7b` | 8GB | 快 | 良好 | 中等 |
| `mistral:7b` | 6GB | 快 | 良好 | 良好 |
| `qwen:7b` | 8GB | 快 | 良好 | 优秀 |

### 优化建议

1. **使用合适的模型大小**
   - 7B 模型：平衡性能和质量
   - 13B 模型：更好质量，需要更多内存
   - 34B 模型：最佳质量，需要强大硬件

2. **调整参数**
   ```json
   {
     "aigitcommit.maxTokens": 300,  // 减少token数量
     "aigitcommit.temperature": 0.5  // 降低随机性
   }
   ```

3. **关闭其他应用**
   - 运行大模型时关闭内存密集型应用
   - 确保有足够的可用内存

## 故障排除

### 连接失败

**错误信息**：`Error: connect ECONNREFUSED`

**解决方案**：
1. 确认 Ollama 服务正在运行
2. 检查端口 11434 是否被占用
3. 验证防火墙设置

```bash
# 检查服务状态
ps aux | grep ollama

# 检查端口占用
netstat -an | grep 11434
```

### 模型未找到

**错误信息**：`Model not found`

**解决方案**：
1. 检查模型名称是否正确
2. 确认模型已下载：`ollama list`
3. 下载所需模型：`ollama pull <model-name>`

### 响应慢

**可能原因**：
1. 硬件配置不足
2. 模型太大
3. 系统资源不足

**解决方案**：
1. 使用更小的模型
2. 关闭其他应用
3. 考虑升级硬件

### 内存不足

**错误信息**：`Out of memory`

**解决方案**：
1. 使用更小的模型
2. 增加虚拟内存
3. 升级物理内存

## 高级配置

### 自定义模型参数

Ollama 支持在模型名称中指定参数：

```json
{
  "aigitcommit.modelName": "codellama:7b-instruct-q4_0"
}
```

### 多模型切换

可以配置多个模型并切换：

```json
// 开发时使用
{
  "aigitcommit.modelName": "codellama"
}

// 日常使用
{
  "aigitcommit.modelName": "mistral"
}
```

### 环境变量

可以通过环境变量配置 Ollama：

```bash
# 设置模型存储路径
export OLLAMA_MODELS=/path/to/models

# 设置主机地址
export OLLAMA_HOST=0.0.0.0

# 设置端口
export OLLAMA_PORT=11434
```

## 最佳实践

### 1. 模型管理
- 定期更新模型：`ollama pull <model>:latest`
- 删除不用的模型：`ollama rm <model>`
- 监控磁盘使用情况

### 2. 性能监控
```bash
# 监控资源使用
htop  # CPU和内存
nvidia-smi  # GPU使用（如果有）
```

### 3. 安全考虑
- 本地运行，代码不离开您的机器
- 定期更新 Ollama 版本
- 注意模型来源的安全性

---

**相关文档**: [返回配置指南](README.md) | [OpenAI配置](openai.md) | [其他服务](other-services.md) | [快速开始](../guides/quick-start.md)