# 实现计划

## 核心实现任务

- [x] 1. 创建命令常量模块
  - 在src目录下创建constants.ts文件
  - 定义COMMANDS对象，包含GENERATE_MESSAGE和CONFIGURE_SETTINGS常量
  - 导出CommandId类型定义
  - _需求: 7.1, 7.2, 7.3_

- [x] 2. 创建命令注册函数
  - 在extension.ts中创建registerCommands()函数
  - 接收commandHandler、configurationPanelManager和errorHandler参数
  - 使用try-catch包裹命令注册逻辑
  - 为每个命令添加注册前后的日志记录
  - 返回disposable数组
  - _需求: 1.1, 1.2, 1.4, 1.7, 4.1, 4.2_

- [x] 3. 增强生成提交信息命令注册
  - 使用COMMANDS.GENERATE_MESSAGE常量作为命令标识符
  - 在命令处理器中添加try-catch错误处理
  - 记录命令执行开始、完成和失败日志
  - 在错误时向用户显示友好的错误消息
  - _需求: 1.3, 1.6, 5.1, 5.2, 5.3, 5.6, 7.6_

- [x] 4. 增强配置设置命令注册
  - 使用COMMANDS.CONFIGURE_SETTINGS常量作为命令标识符
  - 在命令处理器中添加try-catch错误处理
  - 记录配置面板打开成功和失败日志
  - 在错误时向用户显示错误消息
  - _需求: 1.3, 1.6, 2.3, 2.4, 5.1, 5.2, 5.3, 5.6, 7.6_

- [x] 5. 创建命令验证函数
  - 在extension.ts中创建verifyCommandRegistration()函数
  - 使用process.env.NODE_ENV检查是否为开发模式
  - 调用vscode.commands.getCommands()获取已注册命令列表
  - 遍历COMMANDS对象验证每个命令是否存在
  - 记录验证成功和失败的日志
  - 在命令未注册时显示警告通知
  - _需求: 3.3, 3.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 6. 重构activate函数
  - 将errorHandler初始化移到函数开始
  - 在服务初始化后立即调用registerCommands()
  - 将命令disposables添加到context.subscriptions
  - 在命令注册后调用verifyCommandRegistration()
  - 将配置迁移移到命令注册之后
  - 使用COMMANDS常量设置statusBarItem.command
  - 添加整体的try-catch错误处理
  - _需求: 1.1, 1.2, 3.1, 3.2, 3.3, 3.5, 4.3, 4.6_

- [x] 7. 更新tooltip创建函数
  - 在createUnconfiguredTooltip()中使用COMMANDS.CONFIGURE_SETTINGS常量
  - 在createConfiguredTooltip()中使用COMMANDS.CONFIGURE_SETTINGS常量
  - 确保MarkdownString的isTrusted属性设置为true
  - _需求: 2.1, 2.2, 2.5, 7.5_

- [x] 8. 更新extension.ts导入语句
  - 在文件顶部添加import { COMMANDS } from './constants'
  - 移除所有硬编码的命令标识符字符串
  - _需求: 7.3, 7.4_

- [x] 9. 验证package.json命令定义
  - 确认commands数组中的命令标识符与COMMANDS常量一致
  - 确认activationEvents包含"workspaceContains:.git"
  - _需求: 3.1, 7.4_

## 测试任务

- [x]* 10. 添加命令常量单元测试
  - 创建src/__tests__/constants.test.ts文件
  - 测试COMMANDS对象包含所有预期的命令标识符
  - 测试命令标识符格式正确（包含aiGitCommit.前缀）
  - 测试命令标识符唯一性
  - _需求: 7.1, 7.2_

- [x]* 11. 添加命令注册集成测试
  - 在src/__tests__/extension.test.ts中添加测试用例
  - 测试扩展激活后命令已注册
  - 测试命令可以通过vscode.commands.executeCommand执行
  - 测试命令执行错误被正确捕获
  - _需求: 1.3, 1.6, 4.1, 4.2_

## 待完成任务

- [x] 12. 增强命令执行日志以包含命令标识符


  - 更新registerCommands()函数中的命令执行日志
  - 在"Executing generate message command"日志中添加命令标识符
  - 在"Executing configure settings command"日志中添加命令标识符
  - 在命令完成和失败日志中也包含命令标识符
  - _需求: 5.5_

- [x] 13. 添加命令链接点击前的验证



  - 在tooltip创建函数中添加命令验证逻辑
  - 在生成命令链接前检查命令是否已注册
  - 如果命令未注册，记录警告并使用备用方案
  - 确保命令链接只在命令可用时才显示
  - _需求: 2.5_
