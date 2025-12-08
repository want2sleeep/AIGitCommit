# Changelog

All notable changes to the "AI Git Commit" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-12-08

### ✨ 新增功能

#### 大型 Diff 处理 (Map-Reduce 模式)

- ✅ **TokenEstimator**: Token 数量估算器
  - 基于字符和单词的混合估算算法
  - 支持模型上下文窗口自动检测
  - 可配置安全边界百分比

- ✅ **DiffSplitter**: 智能 Diff 拆分器
  - 三级递归拆分策略（文件 → Hunk → 行）
  - 保持语义完整性的拆分边界
  - 上下文信息传递机制

- ✅ **ChunkProcessor**: 并发块处理器
  - 可配置的并发数控制
  - 指数退避重试机制
  - 进度跟踪和错误收集

- ✅ **SummaryMerger**: 摘要合并器
  - 多摘要智能合并
  - 递归合并支持（当摘要总量超限时）
  - 保持提交信息格式一致性

- ✅ **LargeDiffHandler**: 大型 Diff 处理协调器
  - 自动检测是否需要 Map-Reduce 处理
  - 协调各组件完成处理流程
  - 与现有 LLMService 无缝集成

- ✅ **ProgressManager**: 进度管理器
  - VSCode 进度条集成
  - 实时处理状态显示
  - 处理时间统计

#### 新增配置项

- `aigitcommit.enableMapReduce`: 启用 Map-Reduce 模式（默认: true）
- `aigitcommit.customTokenLimit`: 自定义 Token 限制（0 表示自动检测）
- `aigitcommit.safetyMarginPercent`: 安全边界百分比（默认: 85%）
- `aigitcommit.maxConcurrentRequests`: 最大并发请求数（默认: 5）

### 🔧 改进

- ✅ **LLMService 集成**: 自动检测并使用大型 Diff 处理
- ✅ **ServiceContainer 更新**: 注册所有新服务
- ✅ **接口定义**: 新增完整的类型定义和接口

### 🧪 测试

- ✅ 新增 Property-based 测试覆盖所有新服务
- ✅ 测试 Token 估算准确性
- ✅ 测试拆分策略正确性
- ✅ 测试并发处理和错误恢复

### 📚 文档

- ✅ 更新配置项文档
- ✅ 添加大型 Diff 处理功能说明

---

## [1.3.1] - 2024-11-24

### 🐛 修复

#### 自定义候选项保存失败问题

- ✅ **CustomCandidatesManager**: 新增自定义候选项管理器服务
  - 实现带重试机制的保存操作（最多 3 次重试，递增延迟）
  - 添加输入验证（URL 格式、长度、危险字符检查）
  - 实现列表大小限制（最多 50 个候选项）
  - 提供详细的错误日志记录
  - 支持删除自定义候选项

- ✅ **ConfigurationManager 增强**: 添加删除方法
  - `removeCustomBaseUrl()`: 删除自定义 Base URL
  - `removeCustomModelName()`: 删除自定义模型名称

- ✅ **ConfigurationPanelManager 集成**: 使用 CustomCandidatesManager 处理候选项
  - 候选项保存失败不影响主配置
  - 显示详细的错误消息
  - 异步保存，不阻塞 UI

- ✅ **自定义错误类**: 添加候选项相关错误类型
  - `CandidateSaveError`: 候选项保存错误
  - `CandidateValidationError`: 候选项验证错误

- ✅ **ServiceContainer 更新**: 注册 CustomCandidatesManager 服务

## [1.3.0] - 2024-11-22

### ✨ 新增功能

#### 首次用户配置自动重定向

- ✅ **配置拦截器**: 新增 `ConfigurationInterceptor` 服务，自动检测配置状态并拦截未配置的操作
  - 在用户首次使用时自动打开配置向导
  - 支持通过 `autoRedirectToConfiguration` 配置项控制自动重定向行为
  - 防止重复打开配置向导
  - 提供友好的错误提示和手动配置选项

- ✅ **配置状态检查器**: 新增 `ConfigurationStatusChecker` 服务，提供配置状态检查和缓存机制
  - 检查 API 密钥、提供商和模型名称是否已配置
  - 5 分钟缓存 TTL，避免频繁检查
  - 支持强制刷新缓存
  - 性能监控：检查耗时超过 100ms 时发出警告

- ✅ **首次用户引导**: 新增 `FirstTimeUserGuide` 服务，为首次用户提供友好的引导界面
  - 显示欢迎消息，介绍扩展功能
  - 引导用户完成配置向导
  - 配置完成后显示使用说明

- ✅ **配置状态预加载**: 在扩展激活时异步预加载配置状态到缓存
  - 不阻塞扩展激活流程
  - 提升首次检查配置状态的响应速度
  - 监听配置变更，自动使缓存失效

- ✅ **新增配置项**: 添加 `autoRedirectToConfiguration` 配置项
  - 默认值: `true`（启用自动重定向）
  - 用户可以选择禁用自动重定向，改为手动打开配置

#### OpenAI Compatible 提供商候选项功能

- ✅ **Base URL 候选项**: 为 OpenAI Compatible 提供商提供 Base URL 下拉选择器
  - **预设候选项**: OpenRouter、Together AI、Groq、Perplexity、DeepSeek
  - **自定义候选项**: 支持用户添加自定义 Base URL
  - **智能输入**: 选择"新增"选项时自动切换为文本输入框
  - **自动保存**: 新输入的 Base URL 自动保存到候选项列表
  - **去重处理**: 自动去重，避免重复添加相同的 URL

- ✅ **模型名称候选项**: 为 OpenAI Compatible 提供商提供模型名称下拉选择器
  - **预设候选项**: gpt-3.5-turbo、gpt-4、gpt-4-turbo、claude-3-opus、claude-3-sonnet、llama-3-70b
  - **自定义候选项**: 支持用户添加自定义模型名称
  - **智能输入**: 选择"新增"选项时自动切换为文本输入框
  - **自动保存**: 新输入的模型名称自动保存到候选项列表
  - **去重处理**: 自动去重，避免重复添加相同的模型名称

- ✅ **动态输入控件**: 根据提供商类型动态生成输入控件
  - OpenAI Compatible: 显示下拉选择器（包含预设和自定义候选项）
  - 其他提供商: 显示普通文本输入框
  - 提供商切换时自动更新输入控件类型
  - 保留用户当前输入的值

- ✅ **候选项持久化**: 自定义候选项保存到 VSCode 全局配置
  - `customBaseUrls`: 用户自定义的 Base URL 列表
  - `customModelNames`: 用户自定义的模型名称列表
  - 跨工作区共享，方便用户在不同项目中使用

### 🔧 改进

#### 配置管理增强

- ✅ **ConfigurationManager 扩展**: 添加候选项管理方法
  - `getCustomBaseUrls()`: 获取自定义 Base URL 列表
  - `addCustomBaseUrl(url)`: 添加自定义 Base URL
  - `getCustomModelNames()`: 获取自定义模型名称列表
  - `addCustomModelName(modelName)`: 添加自定义模型名称
  - 自动去重和错误处理

- ✅ **ConfigurationPanelManager 重构**: 支持动态输入控件生成
  - `generateBaseUrlInput()`: 根据提供商类型生成 Base URL 输入控件
  - `generateModelNameInput()`: 根据提供商类型生成模型名称输入控件
  - 异步加载配置和候选项
  - 提供商切换时动态更新输入控件

#### 命令处理优化

- ✅ **CommandHandler 重构**: 集成配置拦截器
  - 在生成提交信息前自动检查配置状态
  - 未配置时自动打开配置向导
  - 移除原有的配置验证逻辑（由拦截器统一处理）
  - 简化前置条件验证流程

#### 错误处理增强

- ✅ **新增错误类**: 添加配置相关的自定义错误类
  - `ConfigurationCheckError`: 配置状态检查失败错误
  - `WizardOpenError`: 配置向导打开失败错误
  - 两者都标记为可恢复错误，支持重试

### 🎨 用户界面改进

- ✅ **配置面板样式优化**: 改进下拉选择器的样式和交互
  - 下拉选择框最大高度限制，支持滚动
  - "新增"选项特殊样式，使用分隔线和不同颜色
  - 键盘导航支持，改进可访问性
  - 主题适配，确保在深色和浅色主题下都清晰可见

- ✅ **输入控件容器**: 为动态输入控件添加容器元素
  - 便于动态替换输入控件
  - 保持布局稳定性

### 🧪 测试

- ✅ **新增测试**: 为候选项功能添加测试
  - `ConfigurationPanelManager.candidates.test.ts`: 测试候选项相关功能
  - 测试预设候选项的正确性
  - 测试自定义候选项的添加和去重
  - 测试输入控件的动态生成

### 📚 文档

- ✅ **配置项文档**: 更新 package.json 中的配置项说明
  - `autoRedirectToConfiguration`: 说明自动重定向功能
  - `customBaseUrls`: 说明自定义 Base URL 候选项
  - `customModelNames`: 说明自定义模型名称候选项

### 🔄 Breaking Changes

无破坏性变更。所有变更向后兼容。

### 📦 依赖更新

无依赖更新。

---

## [1.2.1] - 2025-11-19

### 🔧 内部优化

本次更新为内部基础设施优化，对用户功能无影响，所有改进对用户透明。

#### 构建系统升级

- ✅ **esbuild 构建系统**: 从 TypeScript 编译器（tsc）迁移到 esbuild
  - 构建速度提升 10-100 倍
  - 生产包体积减少约 20-30%
  - 开发模式支持 watch 模式，提升开发效率
  - 生产模式优化：代码压缩、tree-shaking
  - 开发模式保留 sourcemap，便于调试
  - 配置文件：`esbuild.js`

#### 自动化发布工作流改进

- ✅ **GitHub Actions 工作流优化**: 完善自动发布流程
  - 自动版本验证和 CHANGELOG 检查
  - 完整的代码质量检查流程（lint、test、build）
  - 智能错误处理和通知机制
  - 支持稳定版本和预发布版本
  - 干运行模式用于发布前测试

### 📚 文档

- ✅ **版本号更新**: 更新所有文档中的版本号至 1.2.1
- ✅ **esbuild 文档**: 添加 esbuild 构建系统的说明和配置文档

### 🧪 质量保证

- ✅ **测试验证**: 所有 346 个测试通过
- ✅ **代码质量**: ESLint 检查通过，无错误
- ✅ **构建验证**: esbuild 构建成功，输出正常

---

## [1.2.0] - 2025-11-16

### ✨ 新增功能

#### 多提供商支持增强

- ✅ **Google Gemini API 支持**: 新增 Google Gemini API 作为 LLM 提供商选项
  - 在配置向导中添加 Gemini 选项
  - 默认使用 `gemini-1.5-flash` 模型
  - 默认端点: `https://generativelanguage.googleapis.com/v1beta`
  - 支持 Gemini 特定的 API 格式和认证方式
  - 请求格式转换（OpenAI → Gemini）
  - 响应解析和错误处理
  - System role 自动合并到 user message
  - API 密钥通过 URL 参数传递

- ✅ **完整的提供商生态**: 现已支持 6 种 LLM 提供商
  - **OpenAI** - GPT-3.5/GPT-4 等官方模型
  - **Google Gemini** - Google 最新 AI 模型（新增）
  - **Qwen** - 阿里云通义千问大模型
  - **Ollama** - 本地开源模型运行环境
  - **vLLM** - 高性能本地 LLM 推理引擎
  - **OpenAI Compatible** - 任何兼容 OpenAI API 的服务（包括 Azure OpenAI、LocalAI 等）

### 🔧 代码质量改进

#### ESLint 警告修复

- ✅ **代码复杂度优化**: 解决所有复杂度相关的 ESLint 警告
  - ErrorHandler: 重构 `classifyError` 方法（复杂度 21 → ≤10）
  - LLMService: 重构 `makeAPIRequest`、`shouldRetry`、`createAPIError` 方法
  - ConfigurationPanelManager: 重构 `handleMessage` 方法（复杂度 13 → ≤10）
  - GitService: 重构 `commitWithMessage` 方法（复杂度 11 → ≤10）

- ✅ **函数行数优化**: 解决所有 max-lines-per-function 警告
  - ConfigurationPanelManager: 重构 `getWebviewContent` 方法（334行 → 模块化）
  - GitService: 重构 `convertToGitChange` 方法（71行 → ≤50行）
  - extension.ts: 重构 `activate` 和 `registerCommands` 方法
  - UIManager: 重构 `showCommitMessageInput` 方法（58行 → ≤50行）
  - ErrorHandler: 重构 `getAPIErrorMessage` 方法（66行 → ≤50行）
  - LLMService: 重构 `makeAPIRequest` 方法（65行 → ≤50行）

- ✅ **嵌套深度优化**: 解决所有 max-depth 警告
  - 使用提前返回模式减少嵌套
  - 提取嵌套逻辑到独立方法
  - 改进代码可读性

#### 代码重构

- ✅ **方法提取**: 将大型方法拆分为多个小型、专注的方法
  - 提取错误分类逻辑到独立分类器
  - 提取请求构建和响应验证逻辑
  - 提取 HTML 模板生成逻辑
  - 提取服务初始化和配置逻辑

- ✅ **查找表优化**: 使用 Map 和 Set 替代复杂的条件判断
  - 消息处理器映射
  - 可重试状态码集合
  - 错误消息映射表

### 🧪 测试和验证

- ✅ **ESLint 清洁**: 运行 `pnpm run lint` 无警告或错误
- ✅ **测试通过**: 所有单元测试和集成测试通过
- ✅ **覆盖率维持**: 保持 70%+ 的代码覆盖率
- ✅ **编译成功**: TypeScript 编译无错误

### 📚 文档

- ✅ **Gemini 配置指南**: 更新文档说明如何配置 Gemini API
- ✅ **代码质量改进**: 记录所有重构和优化工作

---

## [1.1.1] - 2025-11-16

### 🔧 基础设施改进

本次更新为开发者和维护者改进了发布流程，用户无需关注这些变更。

- ✅ **自动化发布工作流**: 实现 GitHub Actions 自动发布到 VSCode 插件市场
  - 自动版本验证和 CHANGELOG 检查
  - 完整的代码质量检查流程
  - 支持稳定版本和预发布版本
  - 干运行模式用于发布前测试
  - 智能错误处理和通知

- ✅ **CI/CD 增强**: 完善持续集成和持续部署流程
- ✅ **发布文档**: 创建详细的发布流程文档和故障排查指南

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
  - OpenAI/Qwen/Ollama/vLLM 及 OpenAI Compatible 兼容服务支持

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
- ✅ **预定义提供商**: 内置 OpenAI、Qwen、Ollama、vLLM 和 OpenAI Compatible 选项
- ✅ **自动填充**: 选择提供商时自动填充推荐的 Base URL 和模型名称
- ✅ **OpenAI Compatible 支持**: 支持任何 OpenAI 兼容的 API 服务配置
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
- **OpenAI 兼容 API 支持**: 支持所有 OpenAI 兼容的 LLM 服务（OpenAI、Qwen、Ollama、vLLM、LocalAI 等）
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
