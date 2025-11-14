# 需求文档

## 简介

本文档定义了AI Git Commit插件配置面板增强功能的需求。该功能将改进用户配置LLM服务的体验，通过专用配置面板、下拉选择和源代码管理视图集成，使配置过程更加直观和便捷。

## 术语表

- **Configuration Panel（配置面板）**: 用于设置LLM服务参数的专用用户界面
- **API Provider（API提供商）**: LLM服务提供商，如OpenAI、Azure OpenAI、Ollama等
- **Source Control View（源代码管理视图）**: VSCode中显示Git状态和操作的侧边栏视图
- **Hover Tooltip（悬停提示）**: 鼠标悬停在UI元素上时显示的信息提示框
- **Dropdown Selector（下拉选择器）**: 允许用户从预定义选项中选择的UI组件
- **Quick Edit Entry（快速编辑入口）**: 从悬停提示直接跳转到配置编辑的快捷方式

## 需求

### 需求 1: 项目名称规范

**用户故事:** 作为用户，我希望在所有界面和文档中看到正确的项目名称"AI Git Commit"，以便清晰识别该插件。

#### 验收标准

1. THE VSCode Extension SHALL 在所有用户界面中显示名称为"AI Git Commit"
2. THE VSCode Extension SHALL 在package.json中使用"AI Git Commit"作为显示名称
3. THE VSCode Extension SHALL 在README和文档中使用"AI Git Commit"作为项目名称
4. THE VSCode Extension SHALL 在命令面板中使用"AI Git Commit"作为命令前缀
5. THE VSCode Extension SHALL 在市场页面中显示"AI Git Commit"作为扩展名称

### 需求 2: 配置面板界面

**用户故事:** 作为开发者，我希望通过专用的配置面板设置LLM服务参数，以便集中管理所有配置选项。

#### 验收标准

1. THE VSCode Extension SHALL 提供专用的配置面板用于LLM服务设置
2. THE Configuration Panel SHALL 包含API提供商选择字段
3. THE Configuration Panel SHALL 包含API密钥输入字段
4. THE Configuration Panel SHALL 包含Base URL输入字段
5. THE Configuration Panel SHALL 包含模型名称输入字段
6. WHEN 用户打开配置面板时，THE VSCode Extension SHALL 显示当前保存的配置值
7. THE Configuration Panel SHALL 提供保存按钮用于应用配置更改
8. THE Configuration Panel SHALL 提供取消按钮用于放弃更改

### 需求 3: API提供商下拉选择

**用户故事:** 作为开发者，我希望从下拉列表中选择API提供商，以便快速配置常见的LLM服务。

#### 验收标准

1. THE Configuration Panel SHALL 使用下拉选择器显示API提供商选项
2. THE Dropdown Selector SHALL 包含"OpenAI"选项
3. THE Dropdown Selector SHALL 包含"Azure OpenAI"选项
4. THE Dropdown Selector SHALL 包含"Ollama"选项
5. THE Dropdown Selector SHALL 包含"其他"选项用于自定义服务
6. WHEN 用户选择预定义提供商时，THE VSCode Extension SHALL 自动填充对应的默认Base URL
7. WHEN 用户选择"其他"选项时，THE VSCode Extension SHALL 允许用户输入自定义Base URL

### 需求 4: 源代码管理视图集成

**用户故事:** 作为开发者，我希望在源代码管理视图中直接访问提交信息生成功能，以便这是我的首选使用方法。

#### 验收标准

1. THE VSCode Extension SHALL 在源代码管理视图中添加生成提交信息按钮
2. THE Source Control View SHALL 将生成按钮放置在显著位置作为首选操作
3. WHEN 用户点击生成按钮时，THE VSCode Extension SHALL 执行提交信息生成流程
4. THE VSCode Extension SHALL 在源代码管理视图的提交消息输入框中显示生成的内容
5. THE Source Control View SHALL 保持与现有Git工作流的无缝集成

### 需求 5: 按钮悬停信息显示

**用户故事:** 作为开发者，我希望在悬停生成按钮时查看当前配置信息，以便快速确认使用的LLM服务设置。

#### 验收标准

1. WHEN 用户悬停在源代码管理视图的生成按钮上时，THE VSCode Extension SHALL 显示悬停提示
2. THE Hover Tooltip SHALL 显示当前使用的API提供商
3. THE Hover Tooltip SHALL 显示当前使用的API密钥（部分遮蔽显示）
4. THE Hover Tooltip SHALL 显示当前使用的Base URL
5. THE Hover Tooltip SHALL 显示当前使用的模型名称
6. IF 配置未完成时，THEN THE Hover Tooltip SHALL 显示"未配置"提示信息

### 需求 6: 快速编辑入口

**用户故事:** 作为开发者，我希望从悬停提示中直接跳转到配置编辑，以便快速修改LLM服务设置。

#### 验收标准

1. THE Hover Tooltip SHALL 包含"编辑配置"链接或按钮
2. WHEN 用户点击编辑入口时，THE VSCode Extension SHALL 打开配置面板
3. THE Configuration Panel SHALL 显示当前配置值供用户修改
4. WHEN 用户保存配置后，THE VSCode Extension SHALL 更新悬停提示中显示的信息
5. THE Quick Edit Entry SHALL 提供流畅的导航体验无需额外步骤

### 需求 7: 配置验证与反馈

**用户故事:** 作为开发者，我希望在保存配置时得到即时验证反馈，以便确保配置的正确性。

#### 验收标准

1. WHEN 用户保存配置时，THE VSCode Extension SHALL 验证所有必填字段已填写
2. IF API密钥为空时，THEN THE VSCode Extension SHALL 显示错误提示
3. IF Base URL格式无效时，THEN THE VSCode Extension SHALL 显示格式错误提示
4. IF 模型名称为空时，THEN THE VSCode Extension SHALL 显示错误提示
5. WHEN 配置验证通过时，THE VSCode Extension SHALL 显示成功保存消息
6. THE VSCode Extension SHALL 在配置面板中实时显示验证错误

### 需求 8: 配置持久化

**用户故事:** 作为开发者，我希望配置信息能够安全持久化存储，以便在重启VSCode后仍然可用。

#### 验收标准

1. THE VSCode Extension SHALL 将API提供商选择保存到VSCode配置系统
2. THE VSCode Extension SHALL 将API密钥安全存储到VSCode SecretStorage
3. THE VSCode Extension SHALL 将Base URL保存到VSCode配置系统
4. THE VSCode Extension SHALL 将模型名称保存到VSCode配置系统
5. WHEN VSCode重启后，THE VSCode Extension SHALL 自动加载保存的配置
6. THE VSCode Extension SHALL 支持工作区级别和用户级别的配置
