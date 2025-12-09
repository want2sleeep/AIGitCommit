# 智能文件过滤配置指南

## 概述

智能文件过滤是 AI Git Commit 的一个强大功能，它使用 AI 自动识别并过滤掉"杂音文件"（如 lockfiles、构建产物、自动生成代码等），只保留核心逻辑变更文件。这样可以显著提高提交信息的质量，同时节省 token 和成本。

## 快速开始

### 启用智能过滤

智能过滤默认已启用。如果您想手动控制，可以在 VSCode 设置中配置：

```json
{
  "aigitcommit.enableSmartFilter": true
}
```

### 基本工作流程

1. **暂存文件**: 使用 `git add` 暂存您的代码变更
2. **生成提交信息**: 点击 SCM 视图中的 ✨ 按钮
3. **自动过滤**: 扩展会自动调用 AI 过滤文件列表
4. **查看统计**: 在状态栏和输出面板查看过滤统计信息
5. **生成提交**: 基于过滤后的核心文件生成提交信息

## 配置选项详解

### 基础配置

#### enableSmartFilter

**类型**: `boolean`  
**默认值**: `true`  
**说明**: 启用或禁用智能文件过滤功能

```json
{
  "aigitcommit.enableSmartFilter": true
}
```

**使用场景**:
- 启用（默认）: 适用于大多数场景，自动过滤杂音文件
- 禁用: 当您需要查看所有文件的变更时，或者在调试时

#### minFilesThreshold

**类型**: `number`  
**默认值**: `3`  
**说明**: 最小文件数阈值。当文件数量少于此值时，跳过过滤

```json
{
  "aigitcommit.minFilesThreshold": 3
}
```

**原理**: 当文件数量很少时（如只有 1-2 个文件），过滤的意义不大，反而会增加 API 调用开销。

**调整建议**:
- 设置为 `2`: 更激进的过滤策略
- 设置为 `5`: 更保守的过滤策略
- 设置为 `1`: 总是尝试过滤（不推荐）

#### maxFileListSize

**类型**: `number`  
**默认值**: `500`  
**说明**: 最大文件列表大小。当文件数量超过此值时，跳过过滤

```json
{
  "aigitcommit.maxFileListSize": 500
}
```

**原理**: 超大型文件列表（如删除 node_modules 或大规模重构）可能导致 Context Window 溢出，因此自动跳过过滤。

**调整建议**:
- 设置为 `300`: 更保守的限制
- 设置为 `1000`: 更宽松的限制（需要确保模型支持）
- 不建议设置过大，可能导致 API 调用失败

#### filterTimeout

**类型**: `number`  
**默认值**: `10000` (10 秒)  
**说明**: 过滤请求的超时时间（毫秒）

```json
{
  "aigitcommit.filterTimeout": 10000
}
```

**调整建议**:
- 网络较慢: 增加到 `15000` (15 秒)
- 本地模型: 可以减少到 `5000` (5 秒)
- 云端模型: 保持默认值

#### showFilterStats

**类型**: `boolean`  
**默认值**: `true`  
**说明**: 在状态栏和输出面板显示过滤统计信息

```json
{
  "aigitcommit.showFilterStats": true
}
```

**统计信息示例**:
```
Smart Filter: Analyzed 25 files, focused on 3 core files (ignored 22 noise files)
```

### 高级配置

#### filterModel

**类型**: `string`  
**默认值**: `""` (空字符串，自动选择)  
**说明**: 指定用于过滤任务的专用模型

```json
{
  "aigitcommit.filterModel": "gpt-4o-mini"
}
```

**自动选择策略**:
- **本地模型**（Ollama、LM Studio）: 使用主模型
- **OpenAI**: 自动选择 `gpt-4o-mini`
- **Google Gemini**: 自动选择 `gemini-1.5-flash`
- **Anthropic**: 自动选择 `claude-3-haiku`
- **Qwen**: 自动选择 `qwen-turbo`

**何时需要自定义**:
- 您有特定的轻量级模型偏好
- 您想使用与主模型不同的模型进行过滤
- 您想测试不同模型的过滤效果

**示例配置**:
```json
{
  // 主模型使用 GPT-4，过滤使用 GPT-3.5
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.filterModel": "gpt-3.5-turbo"
}
```

## 配置场景示例

### 场景 1: 个人开发者（本地模型）

**需求**: 使用 Ollama 本地运行，完全免费

```json
{
  "aigitcommit.provider": "ollama",
  "aigitcommit.apiEndpoint": "http://localhost:11434/v1",
  "aigitcommit.modelName": "codellama",
  "aigitcommit.enableSmartFilter": true,
  "aigitcommit.filterModel": "",  // 使用主模型
  "aigitcommit.filterTimeout": 5000  // 本地模型响应快
}
```

**优势**:
- 完全免费
- 代码不离开本地
- 响应速度快

### 场景 2: 小团队（云端模型 + 成本优化）

**需求**: 使用 OpenAI，但希望降低成本

```json
{
  "aigitcommit.provider": "openai",
  "aigitcommit.apiEndpoint": "https://api.openai.com/v1",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.enableSmartFilter": true,
  "aigitcommit.filterModel": "gpt-4o-mini",  // 过滤使用轻量级模型
  "aigitcommit.showFilterStats": true
}
```

**成本分析**:
- 主模型（GPT-4）: 用于生成高质量提交信息
- 过滤模型（GPT-4o-mini）: 成本降低 90%
- 总体成本节省: 约 40-50%

### 场景 3: 企业团队（国内服务 + 代理）

**需求**: 使用通义千问，配置企业代理

```json
{
  "aigitcommit.provider": "qwen",
  "aigitcommit.apiEndpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "aigitcommit.modelName": "qwen-turbo",
  "aigitcommit.enableSmartFilter": true,
  "aigitcommit.filterModel": "",  // 自动选择 qwen-turbo
  "aigitcommit.proxyEnabled": true,
  "aigitcommit.proxyHost": "proxy.company.com",
  "aigitcommit.proxyPort": 8080
}
```

**优势**:
- 国内访问速度快
- 符合数据安全要求
- 支持企业网络环境

### 场景 4: 大型项目（频繁大规模变更）

**需求**: 经常处理大量文件变更

```json
{
  "aigitcommit.enableSmartFilter": true,
  "aigitcommit.minFilesThreshold": 5,  // 提高阈值
  "aigitcommit.maxFileListSize": 300,  // 降低上限
  "aigitcommit.filterTimeout": 15000,  // 增加超时
  "aigitcommit.showFilterStats": true
}
```

**原理**:
- 提高最小阈值: 避免小变更的不必要过滤
- 降低最大上限: 更早跳过超大变更
- 增加超时: 给 AI 更多时间处理

### 场景 5: 调试和测试

**需求**: 调试智能过滤功能

```json
{
  "aigitcommit.enableSmartFilter": true,
  "aigitcommit.showFilterStats": true,
  "aigitcommit.logLevel": "debug",  // 启用详细日志
  "aigitcommit.minFilesThreshold": 1,  // 总是尝试过滤
  "aigitcommit.filterTimeout": 30000  // 增加超时避免误判
}
```

**调试技巧**:
1. 查看输出面板的详细日志
2. 观察过滤统计信息
3. 对比过滤前后的文件列表
4. 测试不同的文件组合

## 最佳实践

### 1. 根据项目类型调整配置

#### 前端项目
```json
{
  "aigitcommit.enableSmartFilter": true,
  "aigitcommit.minFilesThreshold": 3
}
```

**常见杂音文件**:
- `package-lock.json`, `yarn.lock`
- `dist/`, `build/`
- `node_modules/` (通常不会提交)

#### 后端项目
```json
{
  "aigitcommit.enableSmartFilter": true,
  "aigitcommit.minFilesThreshold": 3
}
```

**常见杂音文件**:
- `Gemfile.lock`, `Cargo.lock`
- `target/`, `bin/`, `obj/`
- 自动生成的 API 文档

#### 全栈项目
```json
{
  "aigitcommit.enableSmartFilter": true,
  "aigitcommit.minFilesThreshold": 5,  // 文件更多，提高阈值
  "aigitcommit.maxFileListSize": 400
}
```

### 2. 监控过滤效果

定期查看过滤统计信息，了解：
- 过滤率: 被过滤的文件占比
- Token 节省: 估算节省的 token 数量
- 质量提升: 提交信息是否更准确

### 3. 处理特殊情况

#### 情况 1: 需要提交 lockfile 变更

**场景**: 升级依赖版本，lockfile 变更是核心内容

**解决方案**:
```bash
# 方案 1: 临时禁用过滤
# 在 VSCode 设置中临时设置
"aigitcommit.enableSmartFilter": false

# 方案 2: 只暂存 lockfile
git add package-lock.json
# 生成提交信息时，由于只有 1 个文件，会自动跳过过滤
```

#### 情况 2: 大规模重构

**场景**: 重构涉及 100+ 个文件

**解决方案**:
```json
{
  // 临时提高上限
  "aigitcommit.maxFileListSize": 200,
  "aigitcommit.filterTimeout": 20000
}
```

#### 情况 3: 过滤过于激进

**场景**: AI 错误过滤了重要文件

**解决方案**:
1. 查看输出面板，了解哪些文件被过滤
2. 临时禁用过滤
3. 提交 Issue 反馈问题，帮助改进

### 4. 性能优化

#### 使用本地模型
```json
{
  "aigitcommit.provider": "ollama",
  "aigitcommit.filterTimeout": 5000  // 本地模型响应快
}
```

#### 合理设置阈值
```json
{
  // 避免小变更的不必要过滤
  "aigitcommit.minFilesThreshold": 5,
  
  // 避免超大变更的 Context Window 溢出
  "aigitcommit.maxFileListSize": 300
}
```

#### 启用缓存
```json
{
  "aigitcommit.enableCache": true,
  "aigitcommit.cacheTimeout": 300000
}
```

## 故障排除

### 问题 1: 智能过滤没有生效

**症状**: 所有文件都被处理，没有过滤

**可能原因**:
1. 功能未启用
2. 文件数量不在阈值范围内
3. AI 调用失败

**解决方案**:
```bash
# 1. 检查配置
"aigitcommit.enableSmartFilter": true

# 2. 检查文件数量
# 确保文件数量在 3-500 之间

# 3. 查看输出面板
# 查看是否有错误信息
```

### 问题 2: 过滤速度慢

**症状**: 过滤耗时超过 10 秒

**可能原因**:
1. 网络延迟
2. 模型响应慢
3. 文件数量过多

**解决方案**:
```json
{
  // 增加超时
  "aigitcommit.filterTimeout": 20000,
  
  // 或使用本地模型
  "aigitcommit.provider": "ollama"
}
```

### 问题 3: 过滤结果不准确

**症状**: 重要文件被过滤，或杂音文件未被过滤

**可能原因**:
1. AI 模型判断错误
2. 文件类型不在常见列表中

**解决方案**:
1. 查看输出面板的详细日志
2. 临时禁用过滤
3. 提交 Issue 反馈，帮助改进 AI 提示词

### 问题 4: 超时错误

**症状**: 提示"过滤超时"

**可能原因**:
1. 网络不稳定
2. 超时设置过短
3. 文件数量过多

**解决方案**:
```json
{
  // 增加超时时间
  "aigitcommit.filterTimeout": 20000,
  
  // 或降低最大文件数
  "aigitcommit.maxFileListSize": 300
}
```

## 高级主题

### 自定义过滤策略

虽然智能过滤使用 AI 自动判断，但您可以通过以下方式影响过滤行为：

#### 1. 选择合适的模型

不同模型对"杂音文件"的理解可能不同：

```json
{
  // GPT-4: 更准确，但成本更高
  "aigitcommit.filterModel": "gpt-4",
  
  // GPT-3.5: 平衡性能和成本
  "aigitcommit.filterModel": "gpt-3.5-turbo",
  
  // Gemini Flash: 速度快，成本低
  "aigitcommit.filterModel": "gemini-1.5-flash"
}
```

#### 2. 调整阈值

根据项目特点调整阈值：

```json
{
  // 小型项目: 更激进的过滤
  "aigitcommit.minFilesThreshold": 2,
  "aigitcommit.maxFileListSize": 200,
  
  // 大型项目: 更保守的过滤
  "aigitcommit.minFilesThreshold": 5,
  "aigitcommit.maxFileListSize": 500
}
```

### 与其他功能集成

#### 与模板系统集成

```json
{
  "aigitcommit.enableSmartFilter": true,
  "aigitcommit.enableTemplates": true
}
```

智能过滤会先过滤文件，然后基于核心文件生成符合模板的提交信息。

#### 与历史记录集成

```json
{
  "aigitcommit.enableSmartFilter": true,
  "aigitcommit.enableHistory": true
}
```

过滤统计信息会被记录到历史中，方便后续分析。

## 参考资料

- [设计文档](../../.kiro/specs/smart-diff-filter/design.md) - 详细的技术设计
- [需求文档](../../.kiro/specs/smart-diff-filter/requirements.md) - 功能需求说明
- [故障排除指南](../troubleshooting.md) - 通用故障排除

## 反馈和改进

如果您在使用智能过滤功能时遇到问题或有改进建议，欢迎：

1. 提交 [GitHub Issue](https://github.com/want2sleeep/AIGitCommit/issues)
2. 发送邮件至 victorhuang.hy@gmail.com
3. 在输出面板导出日志，附在 Issue 中

您的反馈将帮助我们持续改进智能过滤功能！
