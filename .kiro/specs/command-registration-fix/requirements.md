# 需求文档

## 简介

本文档定义了AI Git Commit插件命令注册和执行问题的修复需求。该功能将解决两个关键问题：1) 配置命令在某些情况下未正确注册导致"command not found"错误；2) 命令行执行时应使用正确的命令标识符。

## 术语表

- **Command Registration（命令注册）**: VSCode扩展在激活时向VSCode注册可执行命令的过程
- **Command Identifier（命令标识符）**: 用于唯一标识VSCode命令的字符串，格式为"extensionId.commandName"
- **Activation Event（激活事件）**: 触发VSCode扩展激活的事件条件
- **Command Palette（命令面板）**: VSCode中通过Ctrl+Shift+P打开的命令搜索和执行界面
- **SCM View（源代码管理视图）**: VSCode中显示Git变更和提交操作的侧边栏视图
- **Hover Tooltip（悬停提示）**: 鼠标悬停在UI元素上时显示的信息提示框，可包含可点击的命令链接

## 需求

### 需求 1: 确保配置命令在扩展激活时正确注册

**用户故事:** 作为开发者，我希望配置命令在扩展激活后立即可用，以便能够通过任何方式（命令面板、悬停提示链接等）打开配置面板。

#### 验收标准

1. THE VSCode Extension SHALL 在activate()函数中注册aiGitCommit.configureSettings命令
2. THE Command Registration SHALL 在任何异步操作之前完成
3. WHEN 扩展激活完成时，THE aiGitCommit.configureSettings命令 SHALL 在VSCode命令注册表中可用
4. THE VSCode Extension SHALL 将命令注册的disposable对象添加到context.subscriptions数组
5. WHEN 用户通过命令面板搜索"配置AI Git Commit"时，THE VSCode Extension SHALL 显示该命令
6. WHEN 用户执行aiGitCommit.configureSettings命令时，THE VSCode Extension SHALL 打开配置面板
7. THE VSCode Extension SHALL 在控制台记录命令注册成功的日志

### 需求 2: 修复悬停提示中的命令链接

**用户故事:** 作为开发者，我希望点击状态栏悬停提示中的"编辑配置"链接时能够成功打开配置面板，而不是看到"command not found"错误。

#### 验收标准

1. THE Hover Tooltip SHALL 包含格式为"[编辑配置](command:aiGitCommit.configureSettings)"的Markdown命令链接
2. THE MarkdownString对象 SHALL 设置isTrusted属性为true以启用命令链接
3. WHEN 用户点击悬停提示中的"编辑配置"链接时，THE VSCode Extension SHALL 执行aiGitCommit.configureSettings命令
4. IF 命令执行失败时，THEN THE VSCode Extension SHALL 在控制台记录详细错误信息
5. THE VSCode Extension SHALL 在命令链接点击前验证命令已注册

### 需求 3: 验证扩展激活事件配置

**用户故事:** 作为开发者，我希望扩展在打开Git仓库时自动激活，以便命令在需要时已经注册可用。

#### 验收标准

1. THE package.json SHALL 在activationEvents中包含"workspaceContains:.git"
2. WHEN 用户打开包含.git目录的工作区时，THE VSCode Extension SHALL 自动激活
3. THE VSCode Extension SHALL 在激活开始时记录日志
4. THE VSCode Extension SHALL 在激活完成时记录日志
5. WHEN 扩展激活失败时，THE VSCode Extension SHALL 在控制台记录详细错误堆栈

### 需求 4: 增强命令注册错误处理

**用户故事:** 作为开发者，我希望在命令注册失败时能够看到清晰的错误信息，以便快速定位和解决问题。

#### 验收标准

1. THE VSCode Extension SHALL 在activate()函数中使用try-catch包裹命令注册代码
2. WHEN 命令注册失败时，THE VSCode Extension SHALL 在控制台记录错误详情
3. WHEN 命令注册失败时，THE VSCode Extension SHALL 向用户显示错误通知
4. THE Error Message SHALL 包含失败的命令标识符
5. THE Error Message SHALL 包含失败的原因描述
6. THE VSCode Extension SHALL 在命令注册失败后继续激活其他功能

### 需求 5: 命令执行日志记录

**用户故事:** 作为开发者，我希望在命令执行时能够看到详细的日志记录，以便调试和监控命令执行情况。

#### 验收标准

1. WHEN aiGitCommit.configureSettings命令执行时，THE VSCode Extension SHALL 记录"Opening configuration panel"日志
2. WHEN 配置面板成功打开时，THE VSCode Extension SHALL 记录成功日志
3. WHEN 配置面板打开失败时，THE VSCode Extension SHALL 记录错误日志和堆栈信息
4. THE Log Messages SHALL 包含时间戳
5. THE Log Messages SHALL 包含命令标识符
6. THE VSCode Extension SHALL 使用ErrorHandler服务统一记录日志

### 需求 6: 命令可用性验证

**用户故事:** 作为开发者，我希望能够验证命令是否已正确注册，以便在开发和测试阶段快速发现问题。

#### 验收标准

1. THE VSCode Extension SHALL 在activate()函数末尾验证所有命令已注册
2. THE VSCode Extension SHALL 使用vscode.commands.getCommands()获取已注册命令列表
3. THE VSCode Extension SHALL 验证aiGitCommit.generateMessage命令存在
4. THE VSCode Extension SHALL 验证aiGitCommit.configureSettings命令存在
5. IF 任何命令未注册时，THEN THE VSCode Extension SHALL 记录警告日志
6. THE Verification SHALL 在开发模式下执行，生产环境可选

### 需求 7: 命令标识符一致性

**用户故事:** 作为开发者，我希望在所有代码位置使用一致的命令标识符，以避免拼写错误导致的命令未找到问题。

#### 验收标准

1. THE VSCode Extension SHALL 定义命令标识符常量
2. THE Command Identifiers SHALL 存储在单独的constants文件中
3. THE VSCode Extension SHALL 在所有引用命令的位置使用常量而非硬编码字符串
4. THE package.json中的命令定义 SHALL 与代码中的常量保持一致
5. THE Markdown命令链接 SHALL 使用常量构建
6. THE Command Registration SHALL 使用常量作为命令标识符
