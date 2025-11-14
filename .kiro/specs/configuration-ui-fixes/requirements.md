# 需求文档

## 简介

本文档定义了AI Git Commit插件配置界面修复的需求。该功能将修复两个关键问题：1) SCM按钮悬停提示未显示配置信息；2) 配置面板中API密钥输入框在所有提供商选择下都应可见。

## 术语表

- **SCM Button（源代码管理按钮）**: 在VSCode源代码管理视图标题栏中显示的"生成AI提交信息"按钮
- **Hover Tooltip（悬停提示）**: 鼠标悬停在UI元素上时显示的信息提示框
- **Status Bar Item（状态栏项）**: VSCode底部状态栏中显示的可交互项目
- **Configuration Panel（配置面板）**: 用于设置LLM服务参数的Webview界面
- **API Key Input（API密钥输入框）**: 配置面板中用于输入API密钥的表单字段

## 需求

### 需求 1: 状态栏悬停提示显示配置信息

**用户故事:** 作为开发者，我希望在悬停状态栏AI Commit按钮时查看当前配置信息，以便快速确认使用的LLM服务设置。

#### 验收标准

1. THE VSCode Extension SHALL 在状态栏显示AI Commit按钮
2. WHEN 用户悬停在状态栏按钮上时，THE VSCode Extension SHALL 显示悬停提示
3. THE Hover Tooltip SHALL 显示当前使用的API提供商
4. THE Hover Tooltip SHALL 显示当前使用的API密钥（部分遮蔽显示）
5. THE Hover Tooltip SHALL 显示当前使用的Base URL
6. THE Hover Tooltip SHALL 显示当前使用的模型名称
7. IF 配置未完成时，THEN THE Hover Tooltip SHALL 显示"未配置"提示信息
8. THE Hover Tooltip SHALL 包含"编辑配置"可点击链接
9. WHEN 用户点击编辑配置链接时，THE VSCode Extension SHALL 打开配置面板
10. WHEN 配置变更后，THE VSCode Extension SHALL 自动更新悬停提示内容

### 需求 2: 配置面板API密钥输入框始终可见

**用户故事:** 作为开发者，我希望在配置面板中始终看到API密钥输入框，无论选择哪个API提供商，以便能够输入或修改API密钥。

#### 验收标准

1. THE Configuration Panel SHALL 始终显示API密钥输入框
2. WHEN 用户选择OpenAI提供商时，THE Configuration Panel SHALL 显示API密钥输入框
3. WHEN 用户选择Azure OpenAI提供商时，THE Configuration Panel SHALL 显示API密钥输入框
4. WHEN 用户选择Ollama提供商时，THE Configuration Panel SHALL 显示API密钥输入框
5. WHEN 用户选择自定义提供商时，THE Configuration Panel SHALL 显示API密钥输入框
6. THE API Key Input SHALL 使用password类型以遮蔽显示输入内容
7. THE API Key Input SHALL 在所有提供商选择下保持相同的样式和位置
8. WHEN 加载现有配置时，THE Configuration Panel SHALL 在API密钥输入框中显示当前保存的密钥值

### 需求 3: 配置面板表单字段验证

**用户故事:** 作为开发者，我希望配置面板能够正确验证所有必填字段，以便确保配置的完整性。

#### 验收标准

1. WHEN 用户提交配置时，THE Configuration Panel SHALL 验证API密钥字段不为空
2. WHEN 用户提交配置时，THE Configuration Panel SHALL 验证Base URL字段不为空
3. WHEN 用户提交配置时，THE Configuration Panel SHALL 验证模型名称字段不为空
4. IF API密钥为空时，THEN THE Configuration Panel SHALL 显示"API密钥不能为空"错误提示
5. IF Base URL为空时，THEN THE Configuration Panel SHALL 显示"Base URL不能为空"错误提示
6. IF 模型名称为空时，THEN THE Configuration Panel SHALL 显示"模型名称不能为空"错误提示
7. THE Configuration Panel SHALL 在对应字段下方显示错误提示文本
8. THE Configuration Panel SHALL 使用红色边框标记包含错误的输入字段
9. WHEN 用户修正错误后，THE Configuration Panel SHALL 自动清除错误提示

### 需求 4: 状态栏按钮点击行为

**用户故事:** 作为开发者，我希望点击状态栏AI Commit按钮时能够生成提交信息，以便快速使用AI功能。

#### 验收标准

1. THE Status Bar Item SHALL 显示"$(sparkle) AI Commit"文本
2. WHEN 用户点击状态栏按钮时，THE VSCode Extension SHALL 执行生成提交信息命令
3. THE Status Bar Item SHALL 仅在Git仓库工作区中显示
4. WHEN 工作区不是Git仓库时，THE Status Bar Item SHALL 隐藏
5. THE Status Bar Item SHALL 放置在状态栏左侧区域
