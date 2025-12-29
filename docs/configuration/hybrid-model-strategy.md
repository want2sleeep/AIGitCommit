[中文](#中文) | [English](#english)

---

## 中文

# 混合模型策略

## 概述

混合模型策略是一项性能优化功能，通过在处理大型代码变更时使用不同性能特征的模型，显著降低成本和处理时间，同时保持输出质量。

**核心理念**：**"快模型读(Map)，慢模型写(Reduce)"**

- **Map 阶段**：使用轻量级、快速的模型并行处理大量 diff chunks
- **Reduce 阶段**：使用高质量模型生成最终的提交信息

## 为什么需要混合模型策略？

### 问题场景

当处理大型提交（如重构、功能开发）时，传统的 Map-Reduce 实现在所有阶段都使用同一个主模型（如 GPT-4），这会导致：

- **成本高昂**：处理 20 个 chunks 可能消耗 21 次 GPT-4 调用
- **速度缓慢**：每个 chunk 都需要等待 GPT-4 响应
- **资源浪费**：Map 阶段的简单摘要任务不需要最强大的模型

### 解决方案

混合模型策略通过智能模型选择，在保证质量的前提下优化性能：

| 阶段 | 任务复杂度 | 使用模型 | 理由 |
|------|-----------|---------|------|
| Map | 低（生成 chunk 摘要） | 轻量级模型 | 快速、经济 |
| Reduce | 高（生成最终提交信息） | 高质量模型 | 保证输出质量 |


## 性能和成本对比

### 实际案例：处理 20 个 chunks 的大型提交

#### 传统方式（全部使用 GPT-4）
```
Map 阶段:  20 chunks × GPT-4 = 20x 成本, ~8 秒
Reduce 阶段: 1 次 × GPT-4 = 1x 成本, ~2 秒
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总成本: 21x
总时间: 10 秒
```

#### 混合模型策略（Map 使用 gpt-4o-mini）
```
Map 阶段:  20 chunks × gpt-4o-mini = 2x 成本, ~4 秒
Reduce 阶段: 1 次 × GPT-4 = 1x 成本, ~2 秒
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总成本: 3x
总时间: 6 秒

💰 成本节省: 85.7%
⚡ 时间节省: 40%
```

## 推荐的轻量级模型

### OpenAI 系列

#### gpt-4o-mini
- **相对成本**：GPT-4 的 10%
- **相对速度**：2 倍快
- **适用场景**：Map 阶段、Chunk 摘要、快速处理
- **推荐指数**：⭐⭐⭐⭐⭐

#### gpt-3.5-turbo
- **相对成本**：GPT-4 的 5%
- **相对速度**：2.5 倍快
- **适用场景**：预算优先、简单项目
- **推荐指数**：⭐⭐⭐⭐


### Google Gemini 系列

#### gemini-1.5-flash
- **相对成本**：Gemini Pro 的 5%
- **相对速度**：3 倍快
- **适用场景**：Map 阶段、超快速处理、免费额度
- **推荐指数**：⭐⭐⭐⭐⭐

### 模型选择建议

| 主模型 | 推荐 Chunk 模型 | 成本节省 | 速度提升 |
|--------|----------------|---------|---------|
| GPT-4 | gpt-4o-mini | ~85% | ~40% |
| GPT-4 Turbo | gpt-4o-mini | ~85% | ~40% |
| GPT-4o | gpt-4o-mini | ~80% | ~35% |
| Gemini Pro | gemini-1.5-flash | ~90% | ~50% |
| Gemini 1.5 Pro | gemini-1.5-flash | ~90% | ~50% |

## 配置方法

### 方法 1：使用配置向导（推荐）

1. 打开命令面板：`Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（Mac）
2. 输入并选择：`AI Git Commit: 配置设置`
3. 按照向导完成配置
4. 在 "Chunk 模型" 选项中选择轻量级模型

### 方法 2：直接编辑配置文件

打开 VSCode 设置（`Ctrl+,`），搜索 "AI Git Commit"，找到 "Chunk Model" 配置项：

```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.chunkModel": "gpt-4o-mini",
  "aigitcommit.enableMapReduce": true
}
```


### 配置示例

#### 示例 1：OpenAI 混合策略
```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.chunkModel": "gpt-4o-mini",
  "aigitcommit.enableMapReduce": true,
  "aigitcommit.maxTokens": 500
}
```

#### 示例 2：Gemini 混合策略
```json
{
  "aigitcommit.provider": "gemini",
  "aigitcommit.modelName": "gemini-1.5-pro",
  "aigitcommit.chunkModel": "gemini-1.5-flash",
  "aigitcommit.enableMapReduce": true
}
```

#### 示例 3：使用智能降级（留空 chunkModel）
```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.chunkModel": "",
  "aigitcommit.enableMapReduce": true
}
```
当 `chunkModel` 留空时，系统会自动选择合适的轻量级模型。

## 智能降级机制

### 什么是智能降级？

当您未配置 `chunkModel` 时，系统会根据您的主模型自动选择合适的轻量级模型。这是一个零配置的优化方案。


### 降级规则

| 主模型 | 自动降级为 | 触发条件 |
|--------|-----------|---------|
| gpt-4 | gpt-4o-mini | 模型名包含 "gpt-4" 且不是 "gpt-4o-mini" |
| gpt-4-turbo | gpt-4o-mini | 同上 |
| gpt-4o | gpt-4o-mini | 同上 |
| gpt-4-32k | gpt-4o-mini | 同上 |
| gemini-pro | gemini-1.5-flash | 模型名为 "gemini-pro" |
| gemini-1.5-pro | gemini-1.5-flash | 模型名为 "gemini-1.5-pro" |
| 其他模型 | 保持原模型 | 不在降级映射表中 |

### 工作流程

```
开始 Map-Reduce 处理
    ↓
检查 chunkModel 配置
    ↓
┌─────────────────┐
│ 已配置？        │
└─────────────────┘
    ↓ 是              ↓ 否
使用配置的模型    应用智能降级
    ↓                  ↓
验证模型可用性    验证模型可用性
    ↓                  ↓
┌─────────────────┐
│ 可用？          │
└─────────────────┘
    ↓ 是              ↓ 否
使用选定模型      回退到主模型
    ↓                  ↓
Map 阶段处理      Map 阶段处理
    ↓                  ↓
Reduce 阶段（使用主模型）
```


### 特殊情况处理

#### 本地模型（Ollama、LM Studio 等）

本地模型**不会触发智能降级**，原因：
- 本地模型通常不收费
- 用户可能只配置了一个模型
- 降级可能导致模型不可用

```json
{
  "aigitcommit.provider": "ollama",
  "aigitcommit.modelName": "llama2",
  "aigitcommit.chunkModel": "",  // 不会降级，继续使用 llama2
  "aigitcommit.enableMapReduce": true
}
```

#### 已经是轻量级模型

如果主模型已经是轻量级模型（如 gpt-4o-mini），系统会保持使用该模型：

```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4o-mini",
  "aigitcommit.chunkModel": "",  // 保持使用 gpt-4o-mini
  "aigitcommit.enableMapReduce": true
}
```

## 最佳实践

### 1. 根据项目规模选择策略

#### 小型项目（< 5 个文件变更）
- **建议**：不启用 Map-Reduce，直接使用主模型
- **原因**：小型变更不需要分块处理，混合策略的优势不明显

```json
{
  "aigitcommit.enableMapReduce": false
}
```


#### 中型项目（5-20 个文件变更）
- **建议**：启用混合策略，使用智能降级
- **配置**：留空 `chunkModel`，让系统自动选择

```json
{
  "aigitcommit.enableMapReduce": true,
  "aigitcommit.chunkModel": ""
}
```

#### 大型项目（> 20 个文件变更）
- **建议**：启用混合策略，明确配置轻量级模型
- **配置**：根据主模型选择最优的 chunk 模型

```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.chunkModel": "gpt-4o-mini",
  "aigitcommit.enableMapReduce": true
}
```

### 2. 平衡成本和质量

#### 追求极致成本优化
```json
{
  "aigitcommit.provider": "gemini",
  "aigitcommit.modelName": "gemini-1.5-pro",
  "aigitcommit.chunkModel": "gemini-1.5-flash"
}
```
- 成本节省：~90%
- 适合：预算有限的个人开发者

#### 平衡成本和质量
```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.chunkModel": "gpt-4o-mini"
}
```
- 成本节省：~85%
- 适合：大多数团队和项目


#### 追求极致质量
```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.chunkModel": "gpt-4"
}
```
- 成本节省：0%（但仍有速度优势）
- 适合：对质量要求极高的关键项目

### 3. 监控和调整

#### 查看使用情况

扩展会在输出频道记录混合模型的使用情况：

```
[混合模型策略] Map 阶段使用模型: gpt-4o-mini
[混合模型策略] Reduce 阶段使用模型: gpt-4
[混合模型策略] 处理了 20 个 chunks
[混合模型策略] 估算节省约 85% 的 token 成本
```

#### 调整策略

根据实际使用情况调整配置：
- 如果质量不满意：使用更强大的 chunk 模型
- 如果成本仍然较高：尝试更轻量的模型
- 如果速度不够快：检查网络或尝试本地模型

## 故障排除

### 问题 1：Chunk 模型不可用

**症状**：日志显示 "Chunk model unavailable, falling back to primary model"

**原因**：
- 配置的 chunk 模型不存在
- API 密钥没有该模型的访问权限
- 模型名称拼写错误


**解决方案**：
1. 检查模型名称是否正确
2. 验证 API 密钥权限
3. 尝试使用智能降级（留空 `chunkModel`）

```json
{
  "aigitcommit.chunkModel": ""  // 使用智能降级
}
```

### 问题 2：没有看到成本节省

**症状**：使用混合策略后成本没有明显降低

**可能原因**：
- Map-Reduce 未启用
- 变更太小，没有触发分块处理
- Chunk 模型配置与主模型相同

**解决方案**：
1. 确认 Map-Reduce 已启用：
```json
{
  "aigitcommit.enableMapReduce": true
}
```

2. 确认 chunk 模型是轻量级模型：
```json
{
  "aigitcommit.chunkModel": "gpt-4o-mini"  // 不要设置为 "gpt-4"
}
```

3. 查看输出日志确认模型使用情况

### 问题 3：质量下降

**症状**：使用混合策略后提交信息质量不如之前

**分析**：
- Map 阶段的摘要质量影响最终结果
- 某些轻量级模型可能不适合您的项目


**解决方案**：
1. 尝试更强大的 chunk 模型：
```json
{
  "aigitcommit.chunkModel": "gpt-4o-mini"  // 从 gpt-3.5-turbo 升级
}
```

2. 或者在 Map 和 Reduce 都使用主模型：
```json
{
  "aigitcommit.chunkModel": "gpt-4"  // 与主模型相同
}
```

3. 调整温度参数以获得更一致的输出：
```json
{
  "aigitcommit.temperature": 0.5  // 降低创造性，提高一致性
}
```

## 常见问题

### Q1: 混合模型策略会影响提交信息的质量吗？

**A**: 不会。Reduce 阶段（生成最终提交信息）始终使用您配置的主模型（如 GPT-4），确保输出质量。Map 阶段只是生成简单的 chunk 摘要，轻量级模型完全胜任。

### Q2: 我必须手动配置 chunkModel 吗？

**A**: 不必须。如果留空 `chunkModel`，系统会根据您的主模型自动选择合适的轻量级模型（智能降级）。这是推荐的零配置方案。

### Q3: 本地模型（Ollama）可以使用混合策略吗？

**A**: 可以，但不推荐。本地模型通常不收费，使用混合策略的成本优势不明显。而且本地模型可能只配置了一个，降级可能导致不可用。系统会自动跳过本地模型的智能降级。


### Q4: 混合策略对小型提交有用吗？

**A**: 用处不大。小型提交（< 5 个文件）通常不会触发 Map-Reduce 分块处理，混合策略的优势无法体现。建议在处理大型提交时启用。

### Q5: 可以在 Map 阶段使用更强大的模型吗？

**A**: 可以。您可以将 `chunkModel` 设置为与主模型相同，甚至更强大的模型。但这会失去成本和速度优势。

### Q6: 智能降级会自动更新吗？

**A**: 会。当您更改主模型时，智能降级会自动根据新的主模型选择合适的轻量级模型。无需手动调整。

### Q7: 如何验证混合策略是否生效？

**A**: 查看 VSCode 的输出面板（"AI Git Commit" 频道），会显示：
```
[混合模型策略] Map 阶段使用模型: gpt-4o-mini
[混合模型策略] Reduce 阶段使用模型: gpt-4
```

## 进阶技巧

### 1. 针对不同项目使用不同策略

使用 VSCode 的工作区设置为不同项目配置不同的策略：

**.vscode/settings.json**（项目 A - 大型项目）
```json
{
  "aigitcommit.chunkModel": "gpt-4o-mini",
  "aigitcommit.enableMapReduce": true
}
```

**.vscode/settings.json**（项目 B - 小型项目）
```json
{
  "aigitcommit.enableMapReduce": false
}
```


### 2. 结合智能文件过滤

混合模型策略与智能文件过滤配合使用效果更佳：

```json
{
  "aigitcommit.enableMapReduce": true,
  "aigitcommit.chunkModel": "gpt-4o-mini",
  "aigitcommit.enableSmartFilter": true
}
```

智能文件过滤会排除不重要的文件，减少需要处理的 chunks，进一步提升性能和降低成本。

### 3. 自定义降级映射

虽然系统提供了智能降级，但您可以根据实际使用情况手动配置最优组合：

```json
{
  // 主模型：GPT-4 Turbo
  "aigitcommit.modelName": "gpt-4-turbo-preview",
  // Chunk 模型：根据测试选择最优
  "aigitcommit.chunkModel": "gpt-4o-mini"
}
```

## 相关资源

- [配置指南](README.md) - 查看所有配置选项
- [OpenAI 配置](openai.md) - OpenAI 模型详细配置
- [Gemini 配置](gemini.md) - Google Gemini 模型配置
- [智能文件过滤](smart-filter.md) - 进一步优化性能
- [故障排除](../troubleshooting.md) - 解决常见问题

---

## English

# Hybrid Model Strategy

## Overview

The Hybrid Model Strategy is a performance optimization feature that significantly reduces costs and processing time while maintaining output quality by using models with different performance characteristics when processing large code changes.


**Core Concept**: **"Fast Model for Reading (Map), Slow Model for Writing (Reduce)"**

- **Map Phase**: Use lightweight, fast models to process large numbers of diff chunks in parallel
- **Reduce Phase**: Use high-quality models to generate the final commit message

## Why Hybrid Model Strategy?

### Problem Scenario

When processing large commits (e.g., refactoring, feature development), traditional Map-Reduce implementations use the same primary model (e.g., GPT-4) in all phases, leading to:

- **High Costs**: Processing 20 chunks may consume 21 GPT-4 calls
- **Slow Speed**: Each chunk needs to wait for GPT-4 response
- **Resource Waste**: Simple summary tasks in Map phase don't need the most powerful model

### Solution

The Hybrid Model Strategy optimizes performance while ensuring quality through intelligent model selection:

| Phase | Task Complexity | Model Used | Reason |
|-------|----------------|------------|--------|
| Map | Low (generate chunk summaries) | Lightweight model | Fast, economical |
| Reduce | High (generate final commit message) | High-quality model | Ensure output quality |

## Performance and Cost Comparison

### Real Case: Processing 20 Chunks in Large Commit

#### Traditional Approach (All GPT-4)
```
Map Phase:    20 chunks × GPT-4 = 20x cost, ~8 seconds
Reduce Phase: 1 time × GPT-4 = 1x cost, ~2 seconds
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Cost: 21x
Total Time: 10 seconds
```


#### Hybrid Model Strategy (Map uses gpt-4o-mini)
```
Map Phase:    20 chunks × gpt-4o-mini = 2x cost, ~4 seconds
Reduce Phase: 1 time × GPT-4 = 1x cost, ~2 seconds
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Cost: 3x
Total Time: 6 seconds

💰 Cost Savings: 85.7%
⚡ Time Savings: 40%
```

## Recommended Lightweight Models

### OpenAI Series

#### gpt-4o-mini
- **Relative Cost**: 10% of GPT-4
- **Relative Speed**: 2x faster
- **Use Cases**: Map phase, chunk summaries, fast processing
- **Recommendation**: ⭐⭐⭐⭐⭐

#### gpt-3.5-turbo
- **Relative Cost**: 5% of GPT-4
- **Relative Speed**: 2.5x faster
- **Use Cases**: Budget priority, simple projects
- **Recommendation**: ⭐⭐⭐⭐

### Google Gemini Series

#### gemini-1.5-flash
- **Relative Cost**: 5% of Gemini Pro
- **Relative Speed**: 3x faster
- **Use Cases**: Map phase, ultra-fast processing, free tier
- **Recommendation**: ⭐⭐⭐⭐⭐

### Model Selection Guide

| Primary Model | Recommended Chunk Model | Cost Savings | Speed Improvement |
|--------------|------------------------|--------------|-------------------|
| GPT-4 | gpt-4o-mini | ~85% | ~40% |
| GPT-4 Turbo | gpt-4o-mini | ~85% | ~40% |
| GPT-4o | gpt-4o-mini | ~80% | ~35% |
| Gemini Pro | gemini-1.5-flash | ~90% | ~50% |
| Gemini 1.5 Pro | gemini-1.5-flash | ~90% | ~50% |


## Configuration Methods

### Method 1: Using Configuration Wizard (Recommended)

1. Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type and select: `AI Git Commit: Configure Settings`
3. Follow the wizard to complete configuration
4. Select lightweight model in "Chunk Model" option

### Method 2: Direct Configuration File Editing

Open VSCode settings (`Ctrl+,`), search for "AI Git Commit", find "Chunk Model" configuration:

```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.chunkModel": "gpt-4o-mini",
  "aigitcommit.enableMapReduce": true
}
```

### Configuration Examples

#### Example 1: OpenAI Hybrid Strategy
```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.chunkModel": "gpt-4o-mini",
  "aigitcommit.enableMapReduce": true,
  "aigitcommit.maxTokens": 500
}
```

#### Example 2: Gemini Hybrid Strategy
```json
{
  "aigitcommit.provider": "gemini",
  "aigitcommit.modelName": "gemini-1.5-pro",
  "aigitcommit.chunkModel": "gemini-1.5-flash",
  "aigitcommit.enableMapReduce": true
}
```


#### Example 3: Using Smart Downgrade (Leave chunkModel Empty)
```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.chunkModel": "",
  "aigitcommit.enableMapReduce": true
}
```
When `chunkModel` is left empty, the system automatically selects an appropriate lightweight model.

## Smart Downgrade Mechanism

### What is Smart Downgrade?

When you don't configure `chunkModel`, the system automatically selects an appropriate lightweight model based on your primary model. This is a zero-configuration optimization solution.

### Downgrade Rules

| Primary Model | Auto Downgrade To | Trigger Condition |
|--------------|-------------------|-------------------|
| gpt-4 | gpt-4o-mini | Model name contains "gpt-4" and is not "gpt-4o-mini" |
| gpt-4-turbo | gpt-4o-mini | Same as above |
| gpt-4o | gpt-4o-mini | Same as above |
| gpt-4-32k | gpt-4o-mini | Same as above |
| gemini-pro | gemini-1.5-flash | Model name is "gemini-pro" |
| gemini-1.5-pro | gemini-1.5-flash | Model name is "gemini-1.5-pro" |
| Other models | Keep original | Not in downgrade mapping |

### Workflow

```
Start Map-Reduce Processing
    ↓
Check chunkModel Configuration
    ↓
┌─────────────────┐
│ Configured?     │
└─────────────────┘
    ↓ Yes            ↓ No
Use Configured    Apply Smart Downgrade
    ↓                  ↓
Validate Model    Validate Model
    ↓                  ↓
┌─────────────────┐
│ Available?      │
└─────────────────┘
    ↓ Yes            ↓ No
Use Selected      Fallback to Primary
    ↓                  ↓
Map Phase         Map Phase
    ↓                  ↓
Reduce Phase (Use Primary Model)
```


### Special Cases

#### Local Models (Ollama, LM Studio, etc.)

Local models **do not trigger smart downgrade** because:
- Local models are usually free
- Users may only have one model configured
- Downgrade may cause model unavailability

```json
{
  "aigitcommit.provider": "ollama",
  "aigitcommit.modelName": "llama2",
  "aigitcommit.chunkModel": "",  // Won't downgrade, continues using llama2
  "aigitcommit.enableMapReduce": true
}
```

#### Already Lightweight Model

If the primary model is already lightweight (e.g., gpt-4o-mini), the system keeps using it:

```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4o-mini",
  "aigitcommit.chunkModel": "",  // Keeps using gpt-4o-mini
  "aigitcommit.enableMapReduce": true
}
```

## Best Practices

### 1. Choose Strategy Based on Project Size

#### Small Projects (< 5 file changes)
- **Recommendation**: Don't enable Map-Reduce, use primary model directly
- **Reason**: Small changes don't need chunking, hybrid strategy advantages not significant

```json
{
  "aigitcommit.enableMapReduce": false
}
```

#### Medium Projects (5-20 file changes)
- **Recommendation**: Enable hybrid strategy, use smart downgrade
- **Configuration**: Leave `chunkModel` empty, let system auto-select

```json
{
  "aigitcommit.enableMapReduce": true,
  "aigitcommit.chunkModel": ""
}
```


#### Large Projects (> 20 file changes)
- **Recommendation**: Enable hybrid strategy, explicitly configure lightweight model
- **Configuration**: Choose optimal chunk model based on primary model

```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.chunkModel": "gpt-4o-mini",
  "aigitcommit.enableMapReduce": true
}
```

### 2. Balance Cost and Quality

#### Pursue Ultimate Cost Optimization
```json
{
  "aigitcommit.provider": "gemini",
  "aigitcommit.modelName": "gemini-1.5-pro",
  "aigitcommit.chunkModel": "gemini-1.5-flash"
}
```
- Cost savings: ~90%
- Suitable for: Individual developers with limited budget

#### Balance Cost and Quality
```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.chunkModel": "gpt-4o-mini"
}
```
- Cost savings: ~85%
- Suitable for: Most teams and projects

#### Pursue Ultimate Quality
```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.chunkModel": "gpt-4"
}
```
- Cost savings: 0% (but still has speed advantage)
- Suitable for: Critical projects with extremely high quality requirements


## Troubleshooting

### Issue 1: Chunk Model Unavailable

**Symptom**: Log shows "Chunk model unavailable, falling back to primary model"

**Causes**:
- Configured chunk model doesn't exist
- API key doesn't have access to the model
- Model name spelling error

**Solutions**:
1. Check if model name is correct
2. Verify API key permissions
3. Try using smart downgrade (leave `chunkModel` empty)

```json
{
  "aigitcommit.chunkModel": ""  // Use smart downgrade
}
```

### Issue 2: No Cost Savings Observed

**Symptom**: No significant cost reduction after using hybrid strategy

**Possible Causes**:
- Map-Reduce not enabled
- Changes too small, didn't trigger chunking
- Chunk model configured same as primary model

**Solutions**:
1. Confirm Map-Reduce is enabled:
```json
{
  "aigitcommit.enableMapReduce": true
}
```

2. Confirm chunk model is lightweight:
```json
{
  "aigitcommit.chunkModel": "gpt-4o-mini"  // Don't set to "gpt-4"
}
```

3. Check output logs to confirm model usage


### Issue 3: Quality Degradation

**Symptom**: Commit message quality worse than before after using hybrid strategy

**Analysis**:
- Map phase summary quality affects final result
- Some lightweight models may not suit your project

**Solutions**:
1. Try more powerful chunk model:
```json
{
  "aigitcommit.chunkModel": "gpt-4o-mini"  // Upgrade from gpt-3.5-turbo
}
```

2. Or use primary model for both Map and Reduce:
```json
{
  "aigitcommit.chunkModel": "gpt-4"  // Same as primary model
}
```

3. Adjust temperature parameter for more consistent output:
```json
{
  "aigitcommit.temperature": 0.5  // Lower creativity, higher consistency
}
```

## FAQ

### Q1: Will hybrid model strategy affect commit message quality?

**A**: No. The Reduce phase (generating final commit message) always uses your configured primary model (e.g., GPT-4), ensuring output quality. The Map phase only generates simple chunk summaries, which lightweight models can handle well.

### Q2: Must I manually configure chunkModel?

**A**: Not required. If you leave `chunkModel` empty, the system automatically selects an appropriate lightweight model based on your primary model (smart downgrade). This is the recommended zero-configuration approach.


### Q3: Can local models (Ollama) use hybrid strategy?

**A**: Yes, but not recommended. Local models are usually free, so the cost advantage of hybrid strategy is not significant. Also, you may only have one local model configured, and downgrade may cause unavailability. The system automatically skips smart downgrade for local models.

### Q4: Is hybrid strategy useful for small commits?

**A**: Not very useful. Small commits (< 5 files) usually don't trigger Map-Reduce chunking, so hybrid strategy advantages can't be realized. Recommended to enable for large commits.

### Q5: Can I use a more powerful model in Map phase?

**A**: Yes. You can set `chunkModel` to the same as or even more powerful than the primary model. But this loses cost and speed advantages.

### Q6: Will smart downgrade update automatically?

**A**: Yes. When you change the primary model, smart downgrade automatically selects an appropriate lightweight model based on the new primary model. No manual adjustment needed.

### Q7: How to verify hybrid strategy is working?

**A**: Check VSCode's Output panel ("AI Git Commit" channel), which will show:
```
[Hybrid Model Strategy] Map phase using model: gpt-4o-mini
[Hybrid Model Strategy] Reduce phase using model: gpt-4
```

## Related Resources

- [Configuration Guide](README.md) - View all configuration options
- [OpenAI Configuration](openai.md) - Detailed OpenAI model configuration
- [Gemini Configuration](gemini.md) - Google Gemini model configuration
- [Smart File Filter](smart-filter.md) - Further optimize performance
- [Troubleshooting](../troubleshooting.md) - Solve common issues
