# 配置指南

AI Git Commit 支持多种AI服务提供商，选择最适合您需求的服务。

## 🎯 快速选择

| 服务类型 | 推荐场景 | 隐私保护 | 成本 | 配置难度 |
|---------|---------|---------|------|----------|
| **OpenAI** | 追求最佳质量 | ❌ | 💰💰 | ⭐ |
| **Google Gemini** | 免费额度、多模态 | ❌ | 💰 | ⭐ |
| **Azure OpenAI** | 企业用户 | ✅ | 💰💰 | ⭐⭐ |
| **Ollama** | 完全本地 | ✅ | 免费 | ⭐⭐ |
| **Qwen** | 国内用户 | ❌ | 💰 | ⭐ |
| **vLLM** | 高性能本地 | ✅ | 免费 | ⭐⭐⭐ |

## 📋 配置文档

### 主流服务
- [🤖 OpenAI](openai.md) - 官方GPT模型，质量最佳
- [💎 Google Gemini](gemini.md) - Google多模态模型，免费额度
- [🌟 Qwen](other-services.md#qwen) - 阿里云通义千问，国内访问快

### 本地服务
- [🦙 Ollama](ollama.md) - 本地运行，完全隐私保护
- [⚡ vLLM](other-services.md#vllm) - 高性能本地推理
- [🔧 其他兼容服务](other-services.md) - LocalAI、LM Studio等

## ⚙️ 通用配置

### 基本参数
所有服务都支持以下通用配置：

| 参数 | 说明 | 默认值 | 建议值 |
|------|------|--------|--------|
| `language` | 提交信息语言 | `zh-CN` | `zh-CN`/`en-US` |
| `commitFormat` | 提交格式 | `conventional` | `conventional` |
| `maxTokens` | 最大token数 | `500` | `300-800` |
| `temperature` | 创造性参数 | `0.7` | `0.5-0.8` |

### 配置方法
1. **命令面板**：`Ctrl+Shift+P` → "配置 AI Git Commit"
2. **设置界面**：`Ctrl+,` → 搜索 "AI Git Commit"
3. **直接编辑**：修改 `settings.json` 文件

## 🔧 高级配置

### 自定义提示词
```json
{
  "aigitcommit.customPrompt": "你的自定义提示词"
}
```

### 代理设置
```json
{
  "aigitcommit.proxy": "http://proxy.example.com:8080"
}
```

## 🚀 快速开始

1. 选择合适的服务（参考上表）
2. 查看对应的配置文档
3. 完成配置并测试
4. 开始使用AI生成提交信息！

## ❓ 常见问题

**Q: 如何选择合适的服务？**
A: 参考[快速选择表格](#快速选择)，根据隐私、成本和性能需求选择。

**Q: 配置后不生效怎么办？**
A: 重启VSCode，检查配置是否正确，查看输出日志。

**Q: 可以同时配置多个服务吗？**
A: 目前只支持一个活跃配置，但可以快速切换。

---

**相关文档**: [快速开始](../guides/quick-start.md) | [约定式提交](../guides/conventional-commits.md)