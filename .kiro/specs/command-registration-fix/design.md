# 设计文档

## 概述

本设计文档描述了AI Git Commit插件命令注册和执行问题的修复方案。主要解决配置命令在某些情况下未正确注册导致的"command not found"错误，以及增强命令注册的可靠性和可调试性。

## 架构

### 当前架构问题分析

通过代码审查发现以下问题：

1. **命令注册时机**: 命令在`activate()`函数中注册，但在配置迁移等异步操作之后，可能导致注册延迟
2. **错误处理缺失**: 命令注册没有try-catch包裹，注册失败时无法捕获错误
3. **命令标识符硬编码**: 命令标识符在多处硬编码（package.json、extension.ts、tooltip等），容易出现拼写错误
4. **缺少注册验证**: 没有验证机制确认命令是否成功注册
5. **日志记录不足**: 命令执行时缺少详细的日志记录，难以调试

### 解决方案架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Extension Activation                     │
│                                                               │
│  1. Define Command Constants                                 │
│  2. Register Commands (with error handling)                  │
│  3. Verify Command Registration (dev mode)                   │
│  4. Initialize Services                                      │
│  5. Setup Event Listeners                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Command Registration                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Command Constants (constants.ts)                     │  │
│  │  - GENERATE_MESSAGE_COMMAND                           │  │
│  │  - CONFIGURE_SETTINGS_COMMAND                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Command Registration (extension.ts)                  │  │
│  │  - Try-catch wrapper                                  │  │
│  │  - Detailed logging                                   │  │
│  │  - Error notification                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Command Verification (dev mode)                      │  │
│  │  - Get registered commands                            │  │
│  │  - Verify expected commands exist                     │  │
│  │  - Log warnings if missing                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Command Execution                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Command Handler                                      │  │
│  │  - Log command execution start                        │  │
│  │  - Execute command logic                              │  │
│  │  - Log success/failure                                │  │
│  │  - Handle errors gracefully                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 组件和接口

### 1. 命令常量模块 (src/constants.ts)

新建文件，定义所有命令标识符常量。

```typescript
/**
 * 命令标识符常量
 */
export const COMMANDS = {
    /** 生成AI提交信息命令 */
    GENERATE_MESSAGE: 'aiGitCommit.generateMessage',
    
    /** 配置AI Git Commit命令 */
    CONFIGURE_SETTINGS: 'aiGitCommit.configureSettings'
} as const;

/**
 * 命令标识符类型
 */
export type CommandId = typeof COMMANDS[keyof typeof COMMANDS];
```

### 2. 命令注册增强 (src/extension.ts)

#### 2.1 导入命令常量

```typescript
import { COMMANDS } from './constants';
```

#### 2.2 命令注册函数

创建独立的命令注册函数，包含错误处理和日志记录：

```typescript
/**
 * 注册扩展命令
 * @param context 扩展上下文
 * @param commandHandler 命令处理器
 * @param configurationPanelManager 配置面板管理器
 * @param errorHandler 错误处理器
 * @returns 命令disposable数组
 */
function registerCommands(
    context: vscode.ExtensionContext,
    commandHandler: CommandHandler,
    configurationPanelManager: ConfigurationPanelManager,
    errorHandler: ErrorHandler
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    
    try {
        // 注册生成提交信息命令
        errorHandler.logInfo(`Registering command: ${COMMANDS.GENERATE_MESSAGE}`, 'Extension');
        const generateCommand = vscode.commands.registerCommand(
            COMMANDS.GENERATE_MESSAGE,
            async () => {
                errorHandler.logInfo('Executing generate message command', 'Extension');
                try {
                    await commandHandler.generateCommitMessage();
                    errorHandler.logInfo('Generate message command completed', 'Extension');
                } catch (error) {
                    errorHandler.logError('Generate message command failed', error, 'Extension');
                    throw error;
                }
            }
        );
        disposables.push(generateCommand);
        errorHandler.logInfo(`Command registered successfully: ${COMMANDS.GENERATE_MESSAGE}`, 'Extension');
        
        // 注册配置面板命令
        errorHandler.logInfo(`Registering command: ${COMMANDS.CONFIGURE_SETTINGS}`, 'Extension');
        const configCommand = vscode.commands.registerCommand(
            COMMANDS.CONFIGURE_SETTINGS,
            () => {
                errorHandler.logInfo('Executing configure settings command', 'Extension');
                try {
                    configurationPanelManager.showPanel();
                    errorHandler.logInfo('Configuration panel opened successfully', 'Extension');
                } catch (error) {
                    errorHandler.logError('Failed to open configuration panel', error, 'Extension');
                    vscode.window.showErrorMessage(`打开配置面板失败: ${error}`);
                }
            }
        );
        disposables.push(configCommand);
        errorHandler.logInfo(`Command registered successfully: ${COMMANDS.CONFIGURE_SETTINGS}`, 'Extension');
        
    } catch (error) {
        errorHandler.logError('Command registration failed', error, 'Extension');
        vscode.window.showErrorMessage(`命令注册失败: ${error}`);
    }
    
    return disposables;
}
```

#### 2.3 命令验证函数

创建命令验证函数，在开发模式下验证命令是否成功注册：

```typescript
/**
 * 验证命令是否已注册（开发模式）
 * @param errorHandler 错误处理器
 */
async function verifyCommandRegistration(errorHandler: ErrorHandler): Promise<void> {
    // 仅在开发模式下执行验证
    if (process.env.NODE_ENV !== 'production') {
        try {
            const registeredCommands = await vscode.commands.getCommands(true);
            const expectedCommands = Object.values(COMMANDS);
            
            for (const command of expectedCommands) {
                if (registeredCommands.includes(command)) {
                    errorHandler.logInfo(`Command verified: ${command}`, 'Extension');
                } else {
                    errorHandler.logWarning(`Command not found: ${command}`, 'Extension');
                    vscode.window.showWarningMessage(`命令未注册: ${command}`);
                }
            }
        } catch (error) {
            errorHandler.logError('Command verification failed', error, 'Extension');
        }
    }
}
```

#### 2.4 更新activate函数

重构`activate()`函数，优化命令注册时机和顺序：

```typescript
export async function activate(context: vscode.ExtensionContext) {
    console.log('AI Git Commit Generator is now active');
    
    try {
        // 初始化错误处理器（最先初始化，用于后续日志记录）
        errorHandler = new ErrorHandler();
        errorHandler.logInfo('Extension activation started', 'Extension');
        
        // 初始化UI管理器
        uiManager = new UIManager();
        
        // 初始化配置管理器
        const configManager = new ConfigurationManager(context);
        
        // 初始化其他服务
        const gitService = new GitService();
        const llmService = new LLMService();
        const providerManager = new ProviderManager();
        
        // 初始化配置面板管理器
        configurationPanelManager = ConfigurationPanelManager.getInstance(
            context,
            configManager,
            providerManager
        );
        
        // 初始化命令处理器
        commandHandler = new CommandHandler(
            configManager,
            gitService,
            llmService,
            uiManager,
            errorHandler
        );
        
        // 注册命令（在服务初始化后立即注册）
        const commandDisposables = registerCommands(
            context,
            commandHandler,
            configurationPanelManager,
            errorHandler
        );
        context.subscriptions.push(...commandDisposables);
        
        // 验证命令注册（开发模式）
        await verifyCommandRegistration(errorHandler);
        
        // 执行配置迁移（在命令注册后执行）
        await configManager.migrateConfiguration();
        
        // 创建状态栏项
        statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        statusBarItem.command = COMMANDS.GENERATE_MESSAGE;
        statusBarItem.text = '$(sparkle) AI Commit';
        statusBarItem.tooltip = createDefaultTooltip();
        
        if (gitService.isGitRepository()) {
            statusBarItem.show();
        }
        
        // 异步更新tooltip
        updateStatusBarTooltip(configManager, statusBarItem).catch(err => {
            errorHandler.logError('Failed to initialize status bar tooltip', err, 'Extension');
        });
        
        // 监听配置变更
        const configChangeListener = configManager.onConfigurationChanged(async (config) => {
            errorHandler.logInfo('Configuration changed', 'Extension');
            
            const validation = await configManager.validateConfig();
            if (!validation.valid) {
                vscode.window.showWarningMessage(
                    `配置验证失败: ${validation.errors.join(', ')}`
                );
            }
            
            scheduleTooltipUpdate(configManager, statusBarItem);
        });
        
        // 监听工作区变化
        const workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(() => {
            if (gitService.isGitRepository()) {
                statusBarItem.show();
            } else {
                statusBarItem.hide();
            }
        });
        
        // 注册所有disposable对象
        context.subscriptions.push(
            configChangeListener,
            workspaceChangeListener,
            statusBarItem,
            errorHandler,
            uiManager,
            { dispose: () => configurationPanelManager.dispose() }
        );
        
        errorHandler.logInfo('Extension activation completed successfully', 'Extension');
        
    } catch (error) {
        console.error('Extension activation failed:', error);
        if (errorHandler) {
            errorHandler.logError('Extension activation failed', error, 'Extension');
        }
        vscode.window.showErrorMessage(`AI Git Commit插件激活失败: ${error}`);
        throw error;
    }
}
```

### 3. Tooltip命令链接更新 (src/extension.ts)

更新tooltip创建函数，使用命令常量：

```typescript
/**
 * 创建未配置状态的tooltip
 */
function createUnconfiguredTooltip(): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString(
        '**AI Git Commit**\n\n' +
        '⚠️ 未配置\n\n' +
        '点击生成提交信息\n\n' +
        `[配置设置](command:${COMMANDS.CONFIGURE_SETTINGS})`
    );
    tooltip.isTrusted = true;
    return tooltip;
}

/**
 * 创建已配置状态的tooltip
 */
function createConfiguredTooltip(summary: any): vscode.MarkdownString {
    const providerName = getProviderDisplayName(summary.provider);
    
    const tooltip = new vscode.MarkdownString(
        '**AI Git Commit**\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        `**提供商:** ${providerName}\n\n` +
        `**API密钥:** ${summary.apiKeyMasked}\n\n` +
        `**Base URL:** ${summary.baseUrl}\n\n` +
        `**模型:** ${summary.modelName}\n\n` +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '点击生成提交信息\n\n' +
        `[编辑配置](command:${COMMANDS.CONFIGURE_SETTINGS})`
    );
    tooltip.isTrusted = true;
    return tooltip;
}
```

### 4. Package.json更新

确保package.json中的命令定义与常量一致（无需修改，已经正确）：

```json
{
  "contributes": {
    "commands": [
      {
        "command": "aiGitCommit.generateMessage",
        "title": "生成AI提交信息",
        "category": "AI Git Commit",
        "icon": "$(sparkle)"
      },
      {
        "command": "aiGitCommit.configureSettings",
        "title": "配置AI Git Commit",
        "category": "AI Git Commit",
        "icon": "$(gear)"
      }
    ]
  }
}
```

## 数据模型

### 命令注册状态

```typescript
interface CommandRegistrationStatus {
    /** 命令标识符 */
    commandId: string;
    
    /** 是否已注册 */
    registered: boolean;
    
    /** 注册时间戳 */
    timestamp?: number;
    
    /** 错误信息（如果注册失败） */
    error?: string;
}
```

### 命令执行日志

```typescript
interface CommandExecutionLog {
    /** 命令标识符 */
    commandId: string;
    
    /** 执行开始时间 */
    startTime: number;
    
    /** 执行结束时间 */
    endTime?: number;
    
    /** 执行状态 */
    status: 'started' | 'completed' | 'failed';
    
    /** 错误信息（如果执行失败） */
    error?: Error;
}
```

## 错误处理

### 1. 命令注册错误

**场景**: 命令注册失败

**处理策略**:
- 捕获注册异常
- 记录详细错误日志（包括命令标识符和错误堆栈）
- 向用户显示错误通知
- 继续激活其他功能，不阻塞整个扩展

**示例**:
```typescript
try {
    const command = vscode.commands.registerCommand(commandId, handler);
    disposables.push(command);
    errorHandler.logInfo(`Command registered: ${commandId}`, 'Extension');
} catch (error) {
    errorHandler.logError(`Failed to register command: ${commandId}`, error, 'Extension');
    vscode.window.showErrorMessage(`命令注册失败: ${commandId}`);
}
```

### 2. 命令执行错误

**场景**: 命令执行过程中发生错误

**处理策略**:
- 在命令处理器中使用try-catch
- 记录执行开始和结束日志
- 记录错误详情和堆栈
- 向用户显示友好的错误消息
- 不影响后续命令执行

**示例**:
```typescript
vscode.commands.registerCommand(commandId, async () => {
    errorHandler.logInfo(`Executing command: ${commandId}`, 'Extension');
    try {
        await handler();
        errorHandler.logInfo(`Command completed: ${commandId}`, 'Extension');
    } catch (error) {
        errorHandler.logError(`Command failed: ${commandId}`, error, 'Extension');
        vscode.window.showErrorMessage(`命令执行失败: ${error}`);
    }
});
```

### 3. 命令验证错误

**场景**: 命令验证失败（命令未在注册表中找到）

**处理策略**:
- 仅在开发模式下执行验证
- 记录警告日志
- 向开发者显示警告通知
- 不影响生产环境运行

**示例**:
```typescript
if (process.env.NODE_ENV !== 'production') {
    const commands = await vscode.commands.getCommands(true);
    if (!commands.includes(commandId)) {
        errorHandler.logWarning(`Command not registered: ${commandId}`, 'Extension');
    }
}
```

## 测试策略

### 1. 单元测试

**测试目标**: 命令常量定义

**测试用例**:
- 验证COMMANDS对象包含所有预期的命令标识符
- 验证命令标识符格式正确（包含扩展ID前缀）
- 验证命令标识符唯一性

**测试文件**: `src/__tests__/constants.test.ts`

### 2. 集成测试

**测试目标**: 命令注册和执行

**测试用例**:
- 验证扩展激活后命令已注册
- 验证命令可以通过vscode.commands.executeCommand执行
- 验证命令执行时调用正确的处理器
- 验证命令执行错误被正确捕获和记录

**测试文件**: `src/__tests__/extension.test.ts`

### 3. 手动测试

**测试场景**:

1. **命令面板测试**
   - 打开命令面板（Ctrl+Shift+P）
   - 搜索"配置AI Git Commit"
   - 验证命令出现在列表中
   - 执行命令，验证配置面板打开

2. **状态栏tooltip测试**
   - 悬停在状态栏AI Commit按钮上
   - 验证tooltip显示
   - 点击tooltip中的"编辑配置"链接
   - 验证配置面板打开，无"command not found"错误

3. **错误场景测试**
   - 模拟命令注册失败（通过修改代码）
   - 验证错误日志记录
   - 验证用户收到错误通知
   - 验证扩展继续运行

4. **日志验证测试**
   - 打开开发者工具控制台
   - 激活扩展
   - 验证命令注册日志
   - 执行命令
   - 验证命令执行日志

## 性能考虑

### 1. 命令注册性能

**优化策略**:
- 命令注册在扩展激活早期同步执行，避免异步延迟
- 使用批量注册，减少VSCode API调用次数
- 命令验证仅在开发模式下执行，不影响生产性能

**预期影响**:
- 命令注册时间: < 10ms
- 扩展激活时间增加: < 5ms

### 2. 日志记录性能

**优化策略**:
- 使用ErrorHandler统一管理日志，避免重复创建日志对象
- 日志记录异步执行，不阻塞命令执行
- 生产环境减少详细日志级别

**预期影响**:
- 单次日志记录时间: < 1ms
- 对命令执行性能影响: 可忽略

### 3. 命令验证性能

**优化策略**:
- 仅在开发模式下执行
- 使用缓存避免重复验证
- 异步执行，不阻塞扩展激活

**预期影响**:
- 命令验证时间: < 50ms（仅开发模式）
- 对扩展激活时间影响: 0ms（异步执行）

## 安全考虑

### 1. 命令标识符安全

**风险**: 命令标识符被恶意扩展冒用

**缓解措施**:
- 使用扩展ID作为命令前缀（aiGitCommit.）
- 命令标识符定义为常量，避免运行时修改
- 不暴露命令注册API给外部

### 2. 命令执行安全

**风险**: 命令执行时访问敏感数据

**缓解措施**:
- 命令处理器中验证用户权限
- API密钥等敏感数据使用SecretStorage存储
- 命令执行日志不记录敏感信息

### 3. 错误信息安全

**风险**: 错误消息泄露敏感信息

**缓解措施**:
- 错误消息不包含API密钥等敏感数据
- 详细错误堆栈仅记录到控制台，不显示给用户
- 用户看到的错误消息经过过滤和简化

## 部署考虑

### 1. 向后兼容性

**考虑点**:
- 命令标识符不变，保持与现有版本兼容
- package.json中的命令定义不变
- 用户现有的快捷键绑定继续有效

**验证方法**:
- 在旧版本工作区中测试新版本
- 验证命令面板中的命令仍然可用
- 验证快捷键绑定仍然有效

### 2. 升级路径

**步骤**:
1. 用户安装新版本扩展
2. VSCode重新加载扩展
3. 扩展激活，命令重新注册
4. 用户无需手动配置

**回滚策略**:
- 如果新版本有问题，用户可以回滚到旧版本
- 命令标识符不变，回滚不影响功能

### 3. 监控和诊断

**监控指标**:
- 命令注册成功率
- 命令执行成功率
- 命令执行平均时间
- 错误发生频率

**诊断工具**:
- 开发者工具控制台日志
- ErrorHandler日志输出
- VSCode扩展诊断报告

## 文档更新

### 1. 用户文档

**更新内容**:
- 无需更新（用户界面和使用方式不变）

### 2. 开发者文档

**更新内容**:
- 添加命令常量使用说明
- 添加命令注册最佳实践
- 添加错误处理指南
- 添加日志记录规范

### 3. 变更日志

**更新内容**:
```markdown
## [0.1.1] - 2024-XX-XX

### Fixed
- 修复配置命令在某些情况下未正确注册的问题
- 修复点击状态栏tooltip中的"编辑配置"链接时出现"command not found"错误

### Improved
- 增强命令注册错误处理和日志记录
- 优化扩展激活流程，确保命令在激活早期注册
- 添加命令注册验证机制（开发模式）
```

## 实现优先级

### P0 (必须实现)
1. 创建命令常量模块
2. 重构命令注册逻辑，添加错误处理
3. 更新tooltip命令链接使用常量
4. 优化activate函数中的命令注册时机

### P1 (应该实现)
5. 添加命令执行日志记录
6. 实现命令验证函数（开发模式）
7. 增强错误处理和用户通知

### P2 (可选实现)
8. 添加单元测试
9. 添加集成测试
10. 更新开发者文档
