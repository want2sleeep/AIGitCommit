import { GitChange, ChangeStatus, ExtensionConfig } from '../types';
import { ILLMService } from '../types/interfaces';
import { ILogManager, LogLevel } from './LogManager';

/**
 * 文件信息接口（发送给 AI 的数据结构）
 */
export interface FileInfo {
  /** 文件路径 */
  path: string;
  /** 人类可读的状态字符串 */
  status: string;
}

/**
 * 过滤统计信息
 */
export interface FilterStats {
  /** 原始文件总数 */
  totalFiles: number;
  /** 过滤后的文件数 */
  coreFiles: number;
  /** 被过滤掉的文件数 */
  ignoredFiles: number;
  /** 是否实际执行了过滤 */
  filtered: boolean;
  /** 跳过原因（如果跳过） */
  skipReason?: string;
}

/**
 * 过滤结果
 */
export interface FilterResult {
  /** 过滤后的文件变更列表 */
  filteredChanges: GitChange[];
  /** 过滤统计信息 */
  stats: FilterStats;
}

/**
 * 智能 Diff 过滤器接口
 */
export interface ISmartDiffFilter {
  /**
   * 过滤文件变更列表
   * @param changes 原始文件变更列表
   * @returns 过滤后的文件变更列表和过滤统计信息
   */
  filterChanges(changes: GitChange[]): Promise<FilterResult>;

  /**
   * 检查是否应该跳过过滤
   * @param changes 文件变更列表
   * @returns 是否跳过
   */
  shouldSkipFiltering(changes: GitChange[]): boolean;

  /**
   * 检查文件列表是否超过最大限制
   * @param changes 文件变更列表
   * @returns 是否超过限制
   */
  exceedsMaxFileListSize(changes: GitChange[]): boolean;

  /**
   * 构建发送给 AI 的文件列表
   * @param changes 文件变更列表
   * @returns JSON 格式的文件列表
   */
  buildFileList(changes: GitChange[]): FileInfo[];

  /**
   * 解析 AI 返回的结果
   * @param response AI 的原始响应
   * @returns 文件路径列表
   */
  parseFilterResult(response: string): string[];

  /**
   * 清理 JSON 字符串中的 Markdown 标记
   * @param jsonString 可能包含 Markdown 的 JSON 字符串
   * @returns 清理后的 JSON 字符串
   */
  cleanJsonOutput(jsonString: string): string;
}

/**
 * 默认最大文件列表大小（超过此数量跳过过滤）
 */
const DEFAULT_MAX_FILE_LIST_SIZE = 500;

/**
 * 默认最小文件数阈值（少于此数量跳过过滤）
 */
const DEFAULT_MIN_FILES_THRESHOLD = 3;

/**
 * 默认过滤超时时间（毫秒）
 */
const DEFAULT_FILTER_TIMEOUT = 10000;

/**
 * 状态转换器
 * 负责将 Git 状态枚举转换为人类可读的字符串
 */
export class StatusConverter {
  /**
   * 状态映射表
   * 将 ChangeStatus 枚举映射到人类可读的字符串
   */
  private static readonly STATUS_MAP: Record<ChangeStatus, string> = {
    [ChangeStatus.Added]: 'Added',
    [ChangeStatus.Modified]: 'Modified',
    [ChangeStatus.Deleted]: 'Deleted',
    [ChangeStatus.Renamed]: 'Renamed',
    [ChangeStatus.Copied]: 'Copied',
  };

  /**
   * 将状态枚举转换为字符串
   * @param status Git 状态枚举
   * @returns 人类可读的状态字符串
   */
  convertStatus(status: ChangeStatus): string {
    return StatusConverter.STATUS_MAP[status] || 'Unknown';
  }
}

/**
 * Prompt 构建器接口
 */
export interface IPromptBuilder {
  /**
   * 构建 System Prompt
   * @returns System Prompt 字符串
   */
  buildSystemPrompt(): string;

  /**
   * 构建 User Prompt
   * @param fileList 文件列表
   * @returns User Prompt 字符串
   */
  buildUserPrompt(fileList: FileInfo[]): string;
}

/**
 * 模型选择器接口
 */
export interface IModelSelector {
  /**
   * 选择过滤任务使用的模型
   * @param config 扩展配置
   * @returns 模型名称
   */
  selectFilterModel(config: ExtensionConfig): string;

  /**
   * 获取轻量级模型列表
   * @returns 轻量级模型名称列表
   */
  getLightweightModels(): string[];

  /**
   * 检查是否为本地模型服务商
   * @param config 扩展配置
   * @returns 是否为本地服务商
   */
  isLocalProvider(config: ExtensionConfig): boolean;
}

/**
 * 模型选择器
 * 负责为过滤任务选择合适的轻量级模型，并适配本地模型服务商
 */
export class ModelSelector implements IModelSelector {
  /**
   * 轻量级模型优先级列表（仅用于云端服务商）
   */
  private static readonly LIGHTWEIGHT_MODELS = [
    'gpt-4o-mini',
    'gpt-3.5-turbo',
    'gemini-flash',
    'gemini-1.5-flash',
    'claude-3-haiku',
    'qwen-turbo',
  ];

  /**
   * 本地模型服务商列表
   */
  private static readonly LOCAL_PROVIDERS = [
    'ollama',
    'lm-studio',
    'lm studio',
    'localai',
    'local-ai',
    'custom',
  ];

  /**
   * 选择过滤任务使用的模型
   * @param config 扩展配置
   * @returns 模型名称
   */
  selectFilterModel(config: ExtensionConfig): string {
    // 1. 如果用户配置了过滤专用模型，直接使用
    // 注意：这里检查 config 中是否有 filterModel 字段（未来会添加）
    const configWithFilter = config as ExtensionConfig & { filterModel?: string };
    if (configWithFilter.filterModel) {
      return configWithFilter.filterModel;
    }

    // 2. 检查是否为本地服务商
    if (this.isLocalProvider(config)) {
      // 本地模型不收费，直接使用主模型
      return config.modelName;
    }

    // 3. 云端服务商，优先使用轻量级模型
    const provider = this.getProviderFromEndpoint(config.apiEndpoint);

    // 根据服务商选择对应的轻量级模型
    if (provider.includes('openai')) {
      return 'gpt-4o-mini';
    } else if (provider.includes('gemini') || provider.includes('google')) {
      return 'gemini-1.5-flash';
    } else if (provider.includes('claude') || provider.includes('anthropic')) {
      return 'claude-3-haiku';
    } else if (provider.includes('qwen') || provider.includes('tongyi')) {
      return 'qwen-turbo';
    }

    // 4. 未知服务商，回退到主模型
    return config.modelName;
  }

  /**
   * 获取轻量级模型列表
   * @returns 轻量级模型名称列表
   */
  getLightweightModels(): string[] {
    return [...ModelSelector.LIGHTWEIGHT_MODELS];
  }

  /**
   * 检查是否为本地模型服务商
   * @param config 扩展配置
   * @returns 是否为本地服务商
   */
  isLocalProvider(config: ExtensionConfig): boolean {
    const endpoint = config.apiEndpoint.toLowerCase();

    // 检查端点是否包含本地服务商关键词
    return ModelSelector.LOCAL_PROVIDERS.some((provider) => endpoint.includes(provider));
  }

  /**
   * 从端点 URL 推断服务商
   * @param endpoint API 端点 URL
   * @returns 服务商标识
   */
  private getProviderFromEndpoint(endpoint: string): string {
    const lowerEndpoint = endpoint.toLowerCase();

    if (lowerEndpoint.includes('openai')) {
      return 'openai';
    } else if (lowerEndpoint.includes('gemini') || lowerEndpoint.includes('google')) {
      return 'gemini';
    } else if (lowerEndpoint.includes('claude') || lowerEndpoint.includes('anthropic')) {
      return 'anthropic';
    } else if (
      lowerEndpoint.includes('qwen') ||
      lowerEndpoint.includes('tongyi') ||
      lowerEndpoint.includes('dashscope') ||
      lowerEndpoint.includes('aliyun')
    ) {
      return 'qwen';
    }

    return 'unknown';
  }
}

/**
 * Prompt 构建器
 * 负责构建发送给 AI 的 System Prompt 和 User Prompt
 */
export class PromptBuilder implements IPromptBuilder {
  /**
   * System Prompt 模板
   */
  private static readonly SYSTEM_PROMPT = `你是一个资深 Tech Lead。你的任务是审查 Git 变更文件列表，找出代表核心逻辑变更的文件。

**需要忽略的杂音文件类型：**
1. Lockfiles: package-lock.json, pnpm-lock.yaml, yarn.lock, Gemfile.lock, Cargo.lock, poetry.lock 等
2. 构建产物: dist/, build/, out/, .next/, target/, bin/, obj/ 等目录下的文件
3. 自动生成的代码: *.generated.ts, *.g.cs, *_pb.js, *.pb.go 等
4. 测试快照: __snapshots__/, *.snap 等
5. 压缩文件: *.min.js, *.min.css, *.bundle.js 等
6. 静态资源: images/, fonts/, assets/ 目录下的 *.png, *.jpg, *.svg, *.woff 等
7. IDE 配置: .vscode/, .idea/, *.iml 等
8. 临时文件: *.tmp, *.temp, *.log, *.cache 等

**需要保留的核心逻辑文件：**
1. 源代码文件: *.ts, *.js, *.py, *.java, *.go, *.rs 等（非生成的）
2. 配置文件: package.json, tsconfig.json, .eslintrc.json 等（非 lockfiles）
3. 文档文件: README.md, CHANGELOG.md, *.md 等
4. 测试文件: *.test.ts, *.spec.js 等（非快照）
5. 样式文件: *.css, *.scss, *.less 等（非压缩的）

**输出要求：**
只返回一个 JSON 字符串数组，包含需要保留的文件路径。不要添加任何解释或 Markdown 标记。

**示例：**
输入: [{"path": "src/index.ts", "status": "Modified"}, {"path": "package-lock.json", "status": "Modified"}]
输出: ["src/index.ts"]`;

  /**
   * User Prompt 模板
   */
  private static readonly USER_PROMPT_TEMPLATE = `请分析以下文件列表，返回需要保留的核心逻辑文件路径：

{fileListJson}

只返回 JSON 字符串数组，格式如: ["file1.ts", "file2.js"]`;

  /**
   * 构建 System Prompt
   * @returns System Prompt 字符串
   */
  buildSystemPrompt(): string {
    return PromptBuilder.SYSTEM_PROMPT;
  }

  /**
   * 构建 User Prompt
   * @param fileList 文件列表
   * @returns User Prompt 字符串
   */
  buildUserPrompt(fileList: FileInfo[]): string {
    const fileListJson = JSON.stringify(fileList);
    return PromptBuilder.USER_PROMPT_TEMPLATE.replace('{fileListJson}', fileListJson);
  }
}

/**
 * 输出频道接口
 * 简化的 vscode.OutputChannel 接口
 */
export interface IOutputChannel {
  appendLine(value: string): void;
  show?(): void;
  dispose?(): void;
}

/**
 * UI 反馈管理器接口
 */
export interface IFilterFeedback {
  /**
   * 显示过滤统计信息
   * @param stats 过滤统计
   */
  showFilterStats(stats: FilterStats): void;

  /**
   * 在状态栏显示简短消息
   * @param message 消息内容
   * @param duration 显示时长（毫秒）
   */
  showStatusBarMessage(message: string, duration?: number): void;

  /**
   * 在输出频道记录详细信息
   * @param message 消息内容
   */
  logToOutputChannel(message: string): void;
}

/**
 * UI 反馈管理器
 * 负责显示过滤统计信息和用户反馈
 */
export class FilterFeedback implements IFilterFeedback {
  private outputChannel: IOutputChannel | null;
  private showStats: boolean;
  private enableDetailedLogging: boolean;

  constructor(
    outputChannel: IOutputChannel | null,
    showStats: boolean = true,
    enableDetailedLogging: boolean = true
  ) {
    this.outputChannel = outputChannel;
    this.showStats = showStats;
    this.enableDetailedLogging = enableDetailedLogging;
  }

  /**
   * 显示过滤统计信息
   * @param stats 过滤统计
   */
  showFilterStats(stats: FilterStats): void {
    // 如果配置禁用统计显示，直接返回
    if (!this.showStats) {
      return;
    }

    // 生成状态栏消息
    const statusMessage = this.generateStatusMessage(stats);
    this.showStatusBarMessage(statusMessage);

    // 记录详细日志
    if (this.enableDetailedLogging) {
      const detailedLog = this.generateDetailedLog(stats);
      this.logToOutputChannel(detailedLog);
    }
  }

  /**
   * 在状态栏显示简短消息
   * @param message 消息内容
   * @param duration 显示时长（毫秒），默认 5000ms
   */
  showStatusBarMessage(message: string, duration: number = 5000): void {
    // 这里需要 vscode API，在实际使用时会注入
    // vscode.window.showInformationMessage 会自动在指定时间后消失
    // 由于我们在服务层，这里只是接口定义，实际调用会在集成时完成
    // duration 参数将在实际集成时使用
    console.log(`[StatusBar] ${message} (duration: ${duration}ms)`);
  }

  /**
   * 在输出频道记录详细信息
   * @param message 消息内容
   */
  logToOutputChannel(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(message);
    }
  }

  /**
   * 生成状态栏消息
   * @param stats 过滤统计
   * @returns 状态栏消息
   */
  private generateStatusMessage(stats: FilterStats): string {
    if (!stats.filtered) {
      // 跳过过滤的情况
      if (stats.skipReason) {
        if (stats.skipReason.includes('Too few files')) {
          return `Smart Filter: Skipped (only ${stats.totalFiles} files)`;
        } else if (stats.skipReason.includes('Too many files')) {
          return `Smart Filter: Skipped (${stats.totalFiles} files, too large for filtering)`;
        } else if (stats.skipReason.includes('Empty')) {
          return 'Smart Filter: Skipped (empty file list)';
        } else {
          return `Smart Filter: Skipped (${stats.skipReason})`;
        }
      }
      return 'Smart Filter: Skipped';
    }

    // 实际执行了过滤
    if (stats.ignoredFiles === 0) {
      return `Smart Filter: Analyzed ${stats.totalFiles} files, all are core files`;
    }

    return `Smart Filter: Analyzed ${stats.totalFiles} files, focused on ${stats.coreFiles} core files (ignored ${stats.ignoredFiles} noise files)`;
  }

  /**
   * 生成详细日志
   * @param stats 过滤统计
   * @returns 详细日志内容
   */
  private generateDetailedLog(stats: FilterStats): string {
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    lines.push(`[${timestamp}] [Smart Filter] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (!stats.filtered) {
      lines.push(`[Smart Filter] Status: Skipped`);
      lines.push(`[Smart Filter] Reason: ${stats.skipReason || 'Unknown'}`);
      lines.push(`[Smart Filter] Total files: ${stats.totalFiles}`);
    } else {
      lines.push(`[Smart Filter] Status: Completed`);
      lines.push(`[Smart Filter] Total files: ${stats.totalFiles}`);
      lines.push(`[Smart Filter] Core files: ${stats.coreFiles}`);
      lines.push(`[Smart Filter] Ignored files: ${stats.ignoredFiles}`);

      if (stats.ignoredFiles > 0) {
        const percentage = ((stats.ignoredFiles / stats.totalFiles) * 100).toFixed(1);
        lines.push(`[Smart Filter] Token saved: ~${percentage}%`);
      }
    }

    lines.push(`[Smart Filter] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return lines.join('\n');
  }
}

/**
 * 智能 Diff 过滤器
 * 负责调用 AI 进行文件过滤的核心组件
 */
export class SmartDiffFilter implements ISmartDiffFilter {
  private statusConverter: StatusConverter;
  private promptBuilder: PromptBuilder;
  private logger?: ILogManager;
  private minFilesThreshold: number;
  private maxFileListSize: number;
  private filterTimeout: number;

  constructor(
    private llmService: ILLMService,
    private config: ExtensionConfig,
    logger?: ILogManager,
    smartFilterConfig?: {
      minFilesThreshold?: number;
      maxFileListSize?: number;
      filterTimeout?: number;
    }
  ) {
    this.statusConverter = new StatusConverter();
    this.promptBuilder = new PromptBuilder();
    this.logger = logger;

    // 从配置中读取参数，如果没有则使用默认值
    this.minFilesThreshold = smartFilterConfig?.minFilesThreshold ?? DEFAULT_MIN_FILES_THRESHOLD;
    this.maxFileListSize = smartFilterConfig?.maxFileListSize ?? DEFAULT_MAX_FILE_LIST_SIZE;
    this.filterTimeout = smartFilterConfig?.filterTimeout ?? DEFAULT_FILTER_TIMEOUT;
  }

  /**
   * 过滤文件变更列表
   * @param changes 原始文件变更列表
   * @returns 过滤后的文件变更列表和过滤统计信息
   */
  async filterChanges(changes: GitChange[]): Promise<FilterResult> {
    const totalFiles = changes.length;

    // 边界情况：空列表
    if (totalFiles === 0) {
      return {
        filteredChanges: [],
        stats: {
          totalFiles: 0,
          coreFiles: 0,
          ignoredFiles: 0,
          filtered: false,
          skipReason: 'Empty file list',
        },
      };
    }

    // 边界情况：单文件或双文件
    if (totalFiles <= 2) {
      return {
        filteredChanges: changes,
        stats: {
          totalFiles,
          coreFiles: totalFiles,
          ignoredFiles: 0,
          filtered: false,
          skipReason: `Only ${totalFiles} file(s), no filtering needed`,
        },
      };
    }

    // 检查是否应该跳过过滤（文件太少）
    if (this.shouldSkipFiltering(changes)) {
      return {
        filteredChanges: changes,
        stats: {
          totalFiles,
          coreFiles: totalFiles,
          ignoredFiles: 0,
          filtered: false,
          skipReason: `Too few files (< ${this.minFilesThreshold}), no filtering needed`,
        },
      };
    }

    // 检查是否超过最大限制
    if (this.exceedsMaxFileListSize(changes)) {
      return {
        filteredChanges: changes,
        stats: {
          totalFiles,
          coreFiles: totalFiles,
          ignoredFiles: 0,
          filtered: false,
          skipReason: `Too many files (> ${this.maxFileListSize}), skipping to prevent context overflow`,
        },
      };
    }

    // 执行过滤
    try {
      // 构建文件列表
      const fileList = this.buildFileList(changes);

      // 构建 Prompt
      const prompt = this.buildPrompt(fileList);

      // 调用 AI（带超时）
      const response = await this.callAIWithTimeout(prompt);

      // 解析结果
      const filteredPaths = this.parseFilterResult(response);

      // 验证路径有效性并过滤无效路径
      const validPaths = this.validatePaths(filteredPaths, changes);

      // 如果过滤后为空，返回原始列表（空列表保护）
      if (validPaths.length === 0) {
        const message = 'AI 返回空列表或所有路径无效，使用原始列表';
        this.logWarning(message);
        return {
          filteredChanges: changes,
          stats: {
            totalFiles,
            coreFiles: totalFiles,
            ignoredFiles: 0,
            filtered: false,
            skipReason: 'AI returned empty list or all paths invalid',
          },
        };
      }

      // 过滤文件
      const filteredChanges = changes.filter((change) => validPaths.includes(change.path));

      // 记录过滤统计
      this.logInfo(
        `过滤完成: ${totalFiles} 个文件 -> ${filteredChanges.length} 个核心文件 (忽略 ${totalFiles - filteredChanges.length} 个)`
      );

      return {
        filteredChanges,
        stats: {
          totalFiles,
          coreFiles: filteredChanges.length,
          ignoredFiles: totalFiles - filteredChanges.length,
          filtered: true,
        },
      };
    } catch (error) {
      // 任何错误都回退到原始列表（Fail Open 策略）
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logWarning(`过滤失败，使用原始列表: ${errorMessage}`);

      return {
        filteredChanges: changes,
        stats: {
          totalFiles,
          coreFiles: totalFiles,
          ignoredFiles: 0,
          filtered: false,
          skipReason: `Filtering failed: ${errorMessage}`,
        },
      };
    }
  }

  /**
   * 构建 Prompt
   * @param fileList 文件列表
   * @returns Prompt 字符串
   */
  private buildPrompt(fileList: FileInfo[]): string {
    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const userPrompt = this.promptBuilder.buildUserPrompt(fileList);
    return `${systemPrompt}\n\n${userPrompt}`;
  }

  /**
   * 调用 AI（带超时）
   * @param prompt Prompt 字符串
   * @returns AI 响应
   * @throws 超时错误或 AI 调用错误
   */
  private async callAIWithTimeout(prompt: string): Promise<string> {
    try {
      return await Promise.race([
        this.callAI(prompt),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('AI 调用超时')), this.filterTimeout)
        ),
      ]);
    } catch (error) {
      // 记录超时或调用错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logWarning(`AI 调用失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 调用 AI
   * @param prompt Prompt 字符串
   * @returns AI 响应
   */
  private async callAI(prompt: string): Promise<string> {
    // 创建一个临时的 GitChange 对象来传递 prompt
    const tempChange: GitChange = {
      path: 'filter-request',
      status: ChangeStatus.Modified,
      diff: prompt,
      additions: 0,
      deletions: 0,
    };

    // 调用 LLM 服务
    const response = await this.llmService.generateCommitMessage([tempChange], this.config);

    return response;
  }

  /**
   * 验证路径有效性并过滤无效路径
   * @param paths AI 返回的路径列表
   * @param changes 原始变更列表
   * @returns 有效的路径列表
   */
  private validatePaths(paths: string[], changes: GitChange[]): string[] {
    const validPaths = new Set(changes.map((c) => c.path));
    const filteredPaths = paths.filter((path) => validPaths.has(path));

    // 记录无效路径
    const invalidPaths = paths.filter((path) => !validPaths.has(path));
    if (invalidPaths.length > 0) {
      this.logWarning(
        `AI 返回了 ${invalidPaths.length} 个无效路径，已过滤: ${invalidPaths.slice(0, 5).join(', ')}${invalidPaths.length > 5 ? '...' : ''}`
      );
    }

    return filteredPaths;
  }

  /**
   * 检查是否应该跳过过滤
   * @param changes 文件变更列表
   * @returns 是否跳过
   */
  shouldSkipFiltering(changes: GitChange[]): boolean {
    return changes.length < this.minFilesThreshold;
  }

  /**
   * 检查文件列表是否超过最大限制
   * @param changes 文件变更列表
   * @returns 是否超过限制
   */
  exceedsMaxFileListSize(changes: GitChange[]): boolean {
    return changes.length > this.maxFileListSize;
  }

  /**
   * 构建发送给 AI 的文件列表
   * @param changes 文件变更列表
   * @returns JSON 格式的文件列表
   */
  buildFileList(changes: GitChange[]): FileInfo[] {
    return changes.map((change) => ({
      path: change.path,
      status: this.statusConverter.convertStatus(change.status),
    }));
  }

  /**
   * 解析 AI 返回的结果
   * @param response AI 的原始响应
   * @returns 文件路径列表
   * @throws JSON 解析错误
   */
  parseFilterResult(response: string): string[] {
    // 清理 Markdown 代码块标记
    const cleaned = this.cleanJsonOutput(response);

    // 解析 JSON 数组
    try {
      const parsed: unknown = JSON.parse(cleaned);

      // 验证是否为数组
      if (!Array.isArray(parsed)) {
        const error = new Error('AI 返回的不是数组格式');
        this.logWarning(`JSON 解析失败: ${error.message}`);
        throw error;
      }

      // 验证数组元素都是字符串
      if (!parsed.every((item) => typeof item === 'string')) {
        const error = new Error('AI 返回的数组包含非字符串元素');
        this.logWarning(`JSON 解析失败: ${error.message}`);
        throw error;
      }

      return parsed;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logWarning(`解析 AI 返回的 JSON 失败: ${errorMessage}`);
      throw new Error(`解析 AI 返回的 JSON 失败: ${errorMessage}`);
    }
  }

  /**
   * 清理 JSON 字符串中的 Markdown 标记
   * @param jsonString 可能包含 Markdown 的 JSON 字符串
   * @returns 清理后的 JSON 字符串
   */
  cleanJsonOutput(jsonString: string): string {
    let cleaned = jsonString.trim();

    // 移除 Markdown 代码块标记（```json ... ``` 或 ``` ... ```）
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
    cleaned = cleaned.replace(/\n?```\s*$/i, '');

    return cleaned.trim();
  }

  /**
   * 记录信息日志
   * @param message 日志消息
   */
  private logInfo(message: string): void {
    if (this.logger) {
      this.logger.log(LogLevel.INFO, `[SmartDiffFilter] ${message}`);
    } else {
      console.log(`[SmartDiffFilter] ${message}`);
    }
  }

  /**
   * 记录警告日志
   * @param message 日志消息
   */
  private logWarning(message: string): void {
    if (this.logger) {
      this.logger.log(LogLevel.WARN, `[SmartDiffFilter] ${message}`);
    } else {
      console.warn(`[SmartDiffFilter] ${message}`);
    }
  }
}
