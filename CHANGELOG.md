# Changelog

All notable changes to the "AI Git Commit" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [1.1.0] - 2025-11-16

### 🎯 代码质量优化 (Phase 2-7)

本次更新完成了全面的代码质量优化，涵盖类型安全、错误处理、测试覆盖率、代码结构等多个方面。

#### Phase 2: 类型安全增强

- ✅ **消除 any 类型**: 移除所有显式 `any` 类型使用，提升类型安全 (需求 2.1)
  - 为所有函数参数和返回值提供明确的类型注解
  - 使用具体的接口和类型定义替代 any
  - 完善泛型类型约束

- ✅ **启用 TypeScript 严格模式**: 启用所有严格编译选项 (需求 2.4)
  - `strict: true` - 启用所有严格类型检查
  - `noImplicitAny: true` - 禁止隐式 any 类型
  - `strictNullChecks: true` - 严格的 null 检查
  - `strictFunctionTypes: true` - 严格的函数类型检查
  - `strictBindCallApply: true` - 严格的 bind/call/apply 检查
  - `strictPropertyInitialization: true` - 严格的属性初始化检查

- ✅ **类型守卫实现**: 创建运行时类型验证函数 (需求 2.3)
  - 实现 `isValidConfig` 类型守卫
  - 实现 `isGitChange` 类型守卫
  - 实现 `isAPIError` 和 `isNetworkError` 类型守卫
  - 在代码中使用类型守卫替换不安全的类型断言

#### Phase 3: 错误处理改进

- ✅ **自定义错误类**: 实现结构化的错误类型系统 (需求 3.4)
  - `BaseError` - 基础错误类，包含错误码和可恢复标志
  - `ConfigurationError` - 配置相关错误
  - `GitOperationError` - Git 操作错误
  - `APIError` - API 调用错误，包含状态码和响应数据
  - `NetworkError` - 网络连接错误

- ✅ **统一错误处理**: 重构所有服务的错误处理逻辑 (需求 3.1, 3.2, 3.5)
  - LLMService: 使用自定义错误类，提供详细的错误上下文
  - GitService: 改进错误消息，添加操作上下文
  - ConfigurationManager: 增强配置验证错误信息
  - 实现错误恢复策略和重试机制

- ✅ **错误分类和恢复**: 区分可恢复和不可恢复错误 (需求 3.4)
  - 429/503 等临时错误标记为可恢复
  - 401/404 等永久错误标记为不可恢复
  - 根据错误类型自动决定是否重试

#### Phase 4: 测试覆盖率提升

- ✅ **达到 75%+ 测试覆盖率**: 超过 70% 目标 (需求 4.3, 4.5)
  - **Statements**: 75.24% ✅ (目标: 70%)
  - **Branches**: 68.42% (接近目标)
  - **Functions**: 78.57% ✅ (目标: 70%)
  - **Lines**: 75.69% ✅ (目标: 70%)

- ✅ **核心服务测试**: 为所有核心服务编写单元测试 (需求 4.1)
  - GitService: 测试核心功能和边界条件
  - ConfigurationManager: 测试配置管理和迁移
  - LLMService: 测试 API 调用和错误处理
  - CommandHandler: 测试命令处理流程
  - ErrorHandler: 测试错误分类和处理
  - UIManager: 测试用户界面交互

- ✅ **集成测试**: 实现端到端集成测试 (需求 4.2)
  - 测试完整的提交信息生成流程
  - 测试配置向导流程
  - 测试错误恢复流程
  - 验证服务间的正确交互

- ✅ **性能基准测试**: 建立性能基准和验证机制 (需求 8.1-8.4)
  - 大型 diff 处理性能测试（15000 行）
  - API 调用响应时间测试（30 秒超时）
  - 内存使用监控（10 次请求）
  - 缓存机制验证（5 秒 TTL）
  - 重试机制的指数退避策略验证

#### Phase 5: 代码结构优化

- ✅ **常量管理**: 集中管理所有魔法数字和常量 (需求 7.1-7.4)
  - `API_CONSTANTS` - API 相关常量（超时、重试等）
  - `GIT_CONSTANTS` - Git 相关常量（diff 长度限制等）
  - `CONFIG_CONSTANTS` - 配置相关常量
  - `Provider` 枚举 - 提供商类型
  - `Language` 枚举 - 语言类型
  - `CommitFormat` 枚举 - 提交格式类型

- ✅ **工具函数库**: 提取公共逻辑到工具函数 (需求 5.2)
  - `validation.ts` - 验证函数（URL、字符串等）
  - `retry.ts` - 重试和退避策略
  - `cache.ts` - 缓存管理类
  - `typeGuards.ts` - 类型守卫函数

- ✅ **JSDoc 注释**: 为所有公共 API 添加完整文档 (需求 5.3, 9.1, 9.3)
  - 所有服务类方法都有详细的 JSDoc 注释
  - 包含参数说明、返回值说明和异常说明
  - 为复杂算法添加实现说明
  - 为关键决策添加注释

- ✅ **代码复杂度优化**: 降低函数复杂度 (需求 5.4)
  - 拆分复杂函数为小函数
  - 提取嵌套逻辑
  - 使用早期返回减少嵌套

#### Phase 6: 高级优化

- ✅ **服务接口定义**: 为核心服务定义接口 (需求 6.2)
  - `IGitService` - Git 服务接口
  - `ILLMService` - LLM 服务接口
  - `IConfigurationManager` - 配置管理器接口
  - `IErrorHandler` - 错误处理器接口

- ✅ **依赖注入容器**: 实现轻量级 DI 容器 (需求 6.1, 6.4)
  - `ServiceContainer` 类管理服务实例
  - 支持服务注册和解析
  - 在 extension.ts 中使用 DI 容器
  - 提升代码可测试性

- ✅ **配置管理重构**: 拆分 ConfigurationManager 为多个类 (需求 5.1)
  - `ConfigurationProvider` - 配置读写
  - `ConfigurationValidator` - 配置验证
  - `ConfigurationWizard` - 配置向导
  - `ConfigurationMigrator` - 配置迁移
  - 遵循单一职责原则

- ✅ **缓存机制**: 实现配置缓存 (需求 8.2)
  - 通用 `Cache` 类，支持 TTL
  - ConfigurationManager 中使用缓存
  - 5 秒 TTL，避免频繁读取配置

#### Phase 7: 最终验证与清理

- ✅ **调试日志清理**: 移除所有调试用的 console.log/warn/error
  - src/extension.ts: 移除 activate/deactivate 中的 console.log (2 处)
  - src/extension.ts: 移除 createCommandLink 中的 console.warn (1 处)
  - src/extension.ts: 移除 updateStatusBarTooltip 中的 console.warn 和 console.error (2 处)
  - src/services/LLMService.ts: 移除重试相关的 console.log (2 处)
  - src/services/LLMService.ts: 移除 think 标签相关的 console.warn/debug (3 处)
  - src/services/GitService.ts: 移除文件状态检查的 console.warn (1 处)
  - src/services/ConfigurationWizard.ts: 移除连接测试的 console.error (1 处)

- ✅ **代码格式化**: 确保所有代码符合 Prettier 规范
  - 运行 `pnpm format:check` 验证格式
  - 修复格式问题

- ✅ **编译验证**: 确保 TypeScript 编译无错误
  - 运行 `pnpm run compile` 验证编译
  - 所有严格模式检查通过

- ✅ **Lint 验证**: 确保代码符合 ESLint 规则
  - 运行 `pnpm lint` 验证代码质量
  - 仅有可接受的复杂度警告，无错误

- ✅ **文档更新**: 更新 CHANGELOG 记录所有变更 (需求 9.4)
  - 记录 Phase 2-7 的所有改进
  - 保持清晰的版本历史

### 🔧 Infrastructure

#### 包管理器迁移

- ✅ **迁移到 pnpm**: 从 npm 迁移到 pnpm 包管理器 (需求 1.1-1.5)
  - 使用 pnpm 提升依赖安装速度和磁盘空间利用率
  - 配置 `.npmrc` 实现严格的依赖管理
  - 更新所有脚本使用 pnpm 命令
  - 更新 CI/CD 配置使用 pnpm
  - 在 `package.json` 中指定 `packageManager` 字段

#### 代码质量工具

- ✅ **ESLint 配置增强**: 配置更严格的 ESLint 规则 (需求 10.1)
  - 启用 TypeScript 推荐规则
  - 禁止使用 `any` 类型
  - 要求显式函数返回类型
  - 限制函数复杂度和长度
  
- ✅ **Prettier 集成**: 配置 Prettier 自动格式化代码 (需求 10.2)
  - 统一代码风格（单引号、分号、缩进等）
  - 与 ESLint 集成避免冲突
  - 创建 `.prettierrc` 和 `.prettierignore` 配置文件

- ✅ **Git 钩子**: 使用 Husky 和 lint-staged 配置 pre-commit 钩子 (需求 10.3)
  - 提交前自动运行 ESLint 检查和修复
  - 提交前自动格式化代码
  - 提交前运行测试套件
  - 确保提交的代码符合质量标准

- ✅ **CI/CD 增强**: 更新 GitHub Actions 工作流 (需求 10.4)
  - 使用 pnpm 进行依赖安装
  - 添加代码质量检查步骤
  - 配置测试覆盖率报告
  - 验证构建和打包流程

### 📚 文档

- ✅ **README 更新**: 更新项目文档以反映 pnpm 迁移 (需求 1.4, 9.2)
  - 更新安装说明使用 pnpm
  - 添加 pnpm 安装指南

### ✅ 测试覆盖率

- ✅ **测试覆盖率验证**: 验证并达到 70% 测试覆盖率目标 (需求 4.3, 4.5)
  - **Statements**: 85.47% ✅ (目标: 70%)
  - **Branches**: 75.15% ✅ (目标: 70%)
  - **Functions**: 90.22% ✅ (目标: 70%)
  - **Lines**: 86.12% ✅ (目标: 70%)
  - 生成详细的覆盖率报告和分析文档
  - 识别关键未覆盖代码区域
  - 所有核心模块达到高覆盖率（>90%）
  - 更新开发指南章节
  - 添加代码质量工具说明
  - 完善开发流程和调试说明

- ✅ **贡献指南**: 创建详细的贡献指南文档 (需求 9.1, 9.2)
  - 添加 `CONTRIBUTING.md` 文件
  - 说明开发环境设置
  - 定义代码规范和提交规范
  - 提供 PR 流程和检查清单
  - 包含测试要求和最佳实践

- ✅ **CHANGELOG 更新**: 记录所有基础设施改进 (需求 9.4)
  - 记录 pnpm 迁移相关变更
  - 记录代码质量工具配置
  - 记录文档更新
  - 保持清晰的版本历史

### 🔄 Breaking Changes

无破坏性变更。所有变更向后兼容。

### 📦 依赖更新

- 新增 `prettier` 用于代码格式化
- 新增 `eslint-config-prettier` 和 `eslint-plugin-prettier` 用于 ESLint 集成
- 新增 `husky` 用于 Git 钩子管理
- 新增 `lint-staged` 用于暂存文件检查
- 指定 `packageManager: pnpm@10.18.1`

### ⚡ 性能优化

- **更快的依赖安装**: pnpm 使用硬链接和符号链接，显著提升安装速度
- **节省磁盘空间**: pnpm 的全局存储机制避免重复下载相同的包
- **严格的依赖管理**: 避免幽灵依赖，提升项目稳定性

### 🎯 开发体验改进

- **自动代码检查**: 提交前自动检查和修复代码问题
- **统一代码风格**: Prettier 确保团队代码风格一致
- **更好的错误提示**: ESLint 提供更详细的错误信息和修复建议
- **完善的文档**: 新贡献者可以快速上手开发

---

## [1.0.0] - 2025-11-14

### 🚀 MVP 发布

- 初步可用（MVP）版本，稳定提供核心能力：
  - 基于 LLM 的提交信息自动生成（支持约定式提交与简单格式）
  - VSCode 集成（命令面板、SCM 按钮、快捷键）
  - 配置面板与安全密钥存储（SecretStorage）
  - OpenAI/Azure OpenAI/Ollama 及其他兼容服务支持

### 📚 文档与配置

- 同步更新 README、示例与市场文案以匹配 1.0.0 状态
- 完善忽略规则，避免将构建产物与内部文档纳入版本库

### 🔧 维护项

- 版本号提升至 1.0.0，标记稳定的 MVP 可用状态
- 保持与既有 0.1.x 系列的向后兼容

---

## [0.1.5] - 2024-11-15

### 🐛 Bug 修复

#### Think 标签过滤

- ✅ **移除 Think 标签**: 修复某些 LLM（如 Claude）在响应中包含 `<think>` 标签导致提交信息不纯净的问题
  - 自动检测并移除所有 `<think>...</think>` 标签块及其内容
  - 支持多行、多个标签块和不规范格式的处理
  - 清理移除标签后产生的多余空白行
  - 快速检测优化：不包含 think 标签时跳过处理

#### 响应验证增强

- ✅ **内容验证**: 增强响应内容验证机制
  - 验证移除 think 标签后内容不为空
  - 提供友好的错误提示，引导用户重新生成
  - 确保提交信息格式符合基本要求

#### 提示词优化

- ✅ **禁止 Think 标签**: 在系统提示词中明确要求 LLM 不使用思考标签
  - 中文提示词添加"不要使用<think>标签或展示思考过程"
  - 英文提示词添加"Do not use <think> tags or show thinking process"
  - 明确要求不包含任何 XML 标签或特殊标记
  - 从源头减少 think 标签出现的可能性

### 🧪 测试覆盖

- ✅ **单元测试**: 完整的测试覆盖
  - 测试正常响应处理（无 think 标签）
  - 测试单个和多个 think 标签块的移除
  - 测试多行内容和不规范格式的处理
  - 测试 think 标签与其他格式混合的情况
  - 测试错误处理（移除后内容为空）

---

## [0.1.0] - 2024-11-15

### 🎉 配置面板增强版本

本版本引入了全新的配置面板和改进的用户体验，使 LLM 服务配置更加直观和便捷。

### ✨ 新增功能

#### 专用配置面板

- ✅ **Webview 配置面板**: 提供专用的可视化配置界面，替代原有的命令行配置向导
- ✅ **实时配置加载**: 打开面板时自动加载当前配置值
- ✅ **配置保存**: 一键保存所有配置项到 VSCode 设置和安全存储
- ✅ **配置验证**: 保存前自动验证配置完整性和有效性
- ✅ **友好表单**: 清晰的表单布局，包含字段说明和验证提示
- ✅ **主题适配**: 自动适配 VSCode 主题（深色/浅色模式）

#### API 提供商选择器

- ✅ **下拉选择器**: 提供 API 提供商下拉选择器，支持快速选择常用服务
- ✅ **预定义提供商**: 内置 OpenAI、Azure OpenAI、Ollama 和自定义选项
- ✅ **自动填充**: 选择提供商时自动填充推荐的 Base URL 和模型名称
- ✅ **自定义支持**: 支持自定义 OpenAI 兼容服务配置
- ✅ **提供商管理**: 新增 ProviderManager 模块管理提供商配置

#### 源代码管理视图增强

- ✅ **SCM 按钮集成**: 在源代码管理视图标题栏添加生成按钮，作为首选操作入口
- ✅ **悬停提示**: 鼠标悬停在生成按钮上时显示当前配置摘要
- ✅ **配置信息显示**: 悬停提示中显示 API 提供商、Base URL、模型名称等信息
- ✅ **API 密钥遮蔽**: 在悬停提示中安全显示 API 密钥（部分遮蔽）
- ✅ **未配置提示**: 配置不完整时显示友好的提示信息

---

## [0.0.1] - 2024-11-14

### 🎉 Initial Release

首个版本发布，实现了基于 AI 的 Git 提交信息自动生成功能。

### ✨ Features

#### 核心功能

- **AI 驱动的提交信息生成**: 使用大语言模型智能分析代码变更并生成专业的提交信息
- **OpenAI 兼容 API 支持**: 支持所有 OpenAI 兼容的 LLM 服务（OpenAI、Azure OpenAI、Ollama、LocalAI 等）
- **约定式提交格式**: 自动生成符合 Conventional Commits 规范的提交信息
- **多语言支持**: 支持中文和英文提交信息生成

#### 配置管理

- ✅ **API 配置界面**: 提供完整的配置界面用于设置 API 端点、密钥和模型名称
- ✅ **安全存储**: API 密钥安全存储在 VSCode SecretStorage 中
- ✅ **配置验证**: 自动验证配置的有效性和完整性
- ✅ **配置向导**: 首次使用时自动引导用户完成配置
- ✅ **配置迁移**: 自动将旧版本的明文 API 密钥迁移到安全存储

#### Git 集成

- ✅ **Git 仓库检测**: 自动检测当前工作区是否为 Git 仓库
- ✅ **暂存变更获取**: 获取暂存区的文件变更列表和详细差异
- ✅ **智能过滤**: 自动过滤二进制文件和大文件的差异内容
- ✅ **变更验证**: 在无暂存变更时提示用户先暂存变更
- ✅ **Diff 优化**: 智能截断和格式化 diff 内容，避免超出 LLM 上下文限制

#### LLM 服务调用

- ✅ **提示词构建**: 将 Git 差异内容格式化为 LLM 可理解的提示词
- ✅ **API 调用**: 使用配置的 API 信息调用 OpenAI 兼容的 LLM 服务
- ✅ **加载状态**: 在调用 LLM 时显示进度指示器
- ✅ **响应解析**: 解析并提取 LLM 生成的提交信息
- ✅ **错误处理**: 完善的 API 错误处理和重试机制
- ✅ **请求超时**: 30 秒超时机制，防止长时间等待
- ✅ **自动重试**: 失败时自动重试最多 3 次，使用指数退避策略
- ✅ **取消支持**: 支持取消正在进行的 API 请求

---

**[0.0.1]**: 2024-11-14
