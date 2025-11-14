# 需求文档

## 简介

本文档定义了一个VSCode插件的需求，该插件能够集成OpenAI兼容的LLM服务，自动分析Git仓库的变更内容，并生成高质量的git提交信息。插件旨在提高开发者的工作效率，确保提交信息的一致性和专业性。

## 术语表

- **VSCode Extension（VSCode插件）**: 运行在Visual Studio Code编辑器中的扩展程序
- **LLM Service（LLM服务）**: 支持OpenAI API格式的大语言模型服务
- **Git Diff（Git差异）**: Git仓库中暂存区与工作区之间的文件变更内容
- **Commit Message（提交信息）**: 描述代码变更内容的文本信息
- **API Configuration（API配置）**: 包含API端点、密钥和模型名称的配置信息
- **Extension Command（插件命令）**: 用户可以在VSCode命令面板中调用的插件功能

## 需求

### 需求 1: OpenAI兼容服务配置

**用户故事:** 作为开发者，我希望能够配置OpenAI兼容的LLM服务连接信息，以便插件可以调用我选择的LLM服务。

#### 验收标准

1. THE VSCode Extension SHALL 提供配置界面用于设置API端点URL
2. THE VSCode Extension SHALL 提供配置界面用于设置API密钥
3. THE VSCode Extension SHALL 提供配置界面用于设置模型名称
4. THE VSCode Extension SHALL 将配置信息安全存储在VSCode的配置系统中
5. WHEN 用户修改配置信息时，THE VSCode Extension SHALL 验证配置的有效性

### 需求 2: Git变更分析

**用户故事:** 作为开发者，我希望插件能够自动检测并分析当前Git仓库的变更内容，以便为LLM提供准确的上下文信息。

#### 验收标准

1. THE VSCode Extension SHALL 检测当前工作区是否为Git仓库
2. WHEN 用户触发生成提交信息命令时，THE VSCode Extension SHALL 获取暂存区的文件变更列表
3. THE VSCode Extension SHALL 获取每个变更文件的详细差异内容
4. THE VSCode Extension SHALL 过滤掉二进制文件和大文件的差异内容
5. IF 暂存区没有变更时，THEN THE VSCode Extension SHALL 提示用户先暂存变更

### 需求 3: LLM调用与提交信息生成

**用户故事:** 作为开发者，我希望插件能够调用LLM服务根据Git变更生成专业的提交信息，以便我可以快速完成代码提交。

#### 验收标准

1. THE VSCode Extension SHALL 将Git差异内容格式化为LLM可理解的提示词
2. THE VSCode Extension SHALL 使用配置的API信息调用OpenAI兼容的LLM服务
3. THE VSCode Extension SHALL 在调用LLM时显示加载状态指示器
4. WHEN LLM返回响应时，THE VSCode Extension SHALL 解析并提取生成的提交信息
5. IF API调用失败时，THEN THE VSCode Extension SHALL 显示错误信息并提供重试选项

### 需求 4: 提交信息展示与编辑

**用户故事:** 作为开发者，我希望能够预览和编辑LLM生成的提交信息，以便在提交前进行必要的调整。

#### 验收标准

1. THE VSCode Extension SHALL 在输入框中显示生成的提交信息
2. THE VSCode Extension SHALL 允许用户编辑生成的提交信息
3. THE VSCode Extension SHALL 提供接受按钮用于将提交信息应用到Git
4. THE VSCode Extension SHALL 提供重新生成按钮用于获取新的提交信息
5. THE VSCode Extension SHALL 提供取消按钮用于放弃当前操作

### 需求 5: 用户交互与命令

**用户故事:** 作为开发者，我希望能够通过简单的命令触发提交信息生成功能，以便快速集成到我的工作流程中。

#### 验收标准

1. THE VSCode Extension SHALL 注册命令到VSCode命令面板
2. THE VSCode Extension SHALL 在源代码管理视图中提供快捷按钮
3. THE VSCode Extension SHALL 支持键盘快捷键触发命令
4. WHEN 用户触发命令时，THE VSCode Extension SHALL 执行完整的生成流程
5. THE VSCode Extension SHALL 在状态栏显示操作进度

### 需求 6: 错误处理与用户反馈

**用户故事:** 作为开发者，我希望插件能够妥善处理各种错误情况并提供清晰的反馈，以便我了解问题所在并采取相应措施。

#### 验收标准

1. IF API配置缺失时，THEN THE VSCode Extension SHALL 提示用户完成配置
2. IF 网络连接失败时，THEN THE VSCode Extension SHALL 显示网络错误信息
3. IF API返回错误响应时，THEN THE VSCode Extension SHALL 显示具体的错误原因
4. IF Git命令执行失败时，THEN THE VSCode Extension SHALL 显示Git相关错误信息
5. THE VSCode Extension SHALL 记录详细的错误日志用于调试

### 需求 7: 提交信息质量

**用户故事:** 作为开发者，我希望生成的提交信息遵循最佳实践，以便保持代码库提交历史的专业性和可读性。

#### 验收标准

1. THE VSCode Extension SHALL 在提示词中要求LLM生成简洁明了的提交标题
2. THE VSCode Extension SHALL 在提示词中要求LLM在必要时提供详细的提交描述
3. THE VSCode Extension SHALL 在提示词中要求LLM使用约定式提交格式（如Conventional Commits）
4. THE VSCode Extension SHALL 确保生成的提交信息使用用户配置的语言
5. THE VSCode Extension SHALL 限制提交标题长度在合理范围内（50-72字符）
