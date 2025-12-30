/**
 * 大型 Diff 处理器服务
 * 整体协调器，协调各组件完成大型 diff 的处理
 *
 * 功能：
 * 1. 判断是否需要使用大型 diff 处理
 * 2. 协调 TokenEstimator、DiffSplitter、ChunkProcessor、SummaryMerger
 * 3. 支持 Map-Reduce 禁用回退
 */

import {
  IChunkProcessor,
  IChunkSummaryGenerator,
  IDiffSplitter,
  ILargeDiffHandler,
  ISummaryMerger,
  ITokenEstimator,
  ProcessConfig,
} from '../types/interfaces';
import { ChangeStatus, ExtensionConfig, FullConfig, GitChange } from '../types';
import { LARGE_DIFF_CONSTANTS, API_CONSTANTS } from '../constants';
import { ISmartDiffFilter, IFilterFeedback } from './SmartDiffFilter';
import { ModelSelector } from './ModelSelector';
import { HybridModelFeedback } from './HybridModelFeedback';

/**
 * 大型 Diff 处理配置
 */
export interface LargeDiffConfig {
  /** 是否启用 Map-Reduce 处理 */
  enableMapReduce: boolean;
  /** 最大并发 API 请求数 */
  maxConcurrentRequests: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始重试延迟（毫秒） */
  initialRetryDelay: number;
}

/**
 * 大型 Diff 处理器实现类
 */
export class LargeDiffHandler implements ILargeDiffHandler {
  private tokenEstimator: ITokenEstimator;
  private diffSplitter: IDiffSplitter;
  private chunkProcessor: IChunkProcessor;
  private summaryMerger: ISummaryMerger;
  private summaryGenerator: IChunkSummaryGenerator;
  private largeDiffConfig: LargeDiffConfig;
  private smartDiffFilter?: ISmartDiffFilter;
  private filterFeedback?: IFilterFeedback;
  private modelSelector?: ModelSelector;
  private hybridModelFeedback?: HybridModelFeedback;

  /**
   * 创建 LargeDiffHandler 实例
   */
  constructor(
    tokenEstimator: ITokenEstimator,
    diffSplitter: IDiffSplitter,
    chunkProcessor: IChunkProcessor,
    summaryMerger: ISummaryMerger,
    summaryGenerator: IChunkSummaryGenerator,
    largeDiffConfig?: Partial<LargeDiffConfig>,
    smartDiffFilter?: ISmartDiffFilter,
    filterFeedback?: IFilterFeedback,
    modelSelector?: ModelSelector,
    hybridModelFeedback?: HybridModelFeedback
  ) {
    this.tokenEstimator = tokenEstimator;
    this.diffSplitter = diffSplitter;
    this.chunkProcessor = chunkProcessor;
    this.summaryMerger = summaryMerger;
    this.summaryGenerator = summaryGenerator;
    this.smartDiffFilter = smartDiffFilter;
    this.filterFeedback = filterFeedback;
    this.modelSelector = modelSelector;
    this.hybridModelFeedback = hybridModelFeedback;
    this.largeDiffConfig = {
      enableMapReduce: largeDiffConfig?.enableMapReduce ?? true,
      maxConcurrentRequests:
        largeDiffConfig?.maxConcurrentRequests ??
        LARGE_DIFF_CONSTANTS.DEFAULT_MAX_CONCURRENT_REQUESTS,
      maxRetries: largeDiffConfig?.maxRetries ?? API_CONSTANTS.MAX_RETRIES,
      initialRetryDelay: largeDiffConfig?.initialRetryDelay ?? API_CONSTANTS.INITIAL_RETRY_DELAY,
    };
  }

  /**
   * 处理大型 diff
   *
   * @param changes Git 变更列表
   * @param config 扩展配置
   * @returns 生成的提交信息
   */
  async handle(changes: GitChange[], config: ExtensionConfig | FullConfig): Promise<string> {
    // 检查是否启用智能过滤
    const enableSmartFilter = this.isSmartFilterEnabled(config);

    // 在处理前调用 SmartDiffFilter 过滤文件
    let filteredChanges = changes;
    if (enableSmartFilter && this.smartDiffFilter) {
      try {
        const filterResult = await this.smartDiffFilter.filterChanges(changes);
        filteredChanges = filterResult.filteredChanges;

        // 显示过滤统计信息
        if (this.filterFeedback) {
          this.filterFeedback.showFilterStats(filterResult.stats);
        }
      } catch (error) {
        // 过滤失败时使用原始列表（Fail Open 策略）
        console.warn('[LargeDiffHandler] SmartDiffFilter 失败，使用原始文件列表:', error);
        filteredChanges = changes;
      }
    }

    // 将变更转换为 diff 字符串
    const diff = this.changesToDiff(filteredChanges);

    // 如果 Map-Reduce 被禁用，使用截断行为
    // 此时忽略 chunkModel 配置，使用主模型处理所有阶段
    if (!this.largeDiffConfig.enableMapReduce) {
      console.log('[LargeDiffHandler] Map-Reduce 已禁用，忽略 chunkModel 配置，使用主模型');
      return this.handleWithTruncation(diff);
    }

    // 检查是否需要拆分
    if (!this.tokenEstimator.needsSplit(diff)) {
      // 不需要拆分，直接生成摘要
      return this.summaryGenerator.generateSummary(diff);
    }

    // 需要拆分，使用 Map-Reduce 处理
    return this.handleWithMapReduce(diff, config);
  }

  /**
   * 检查是否需要使用大型 diff 处理
   *
   * @param changes Git 变更列表
   * @returns 是否需要
   */
  needsLargeDiffHandling(changes: GitChange[]): boolean {
    const diff = this.changesToDiff(changes);
    return this.tokenEstimator.needsSplit(diff);
  }

  /**
   * 选择并验证 Map 阶段使用的模型
   */
  private selectAndValidateMapModel(config: ExtensionConfig | FullConfig): {
    mapModelId: string | undefined;
    usedFallback: boolean;
  } {
    if (!this.modelSelector || !this.isFullConfig(config)) {
      return { mapModelId: undefined, usedFallback: false };
    }

    const selectedModel = this.modelSelector.selectMapModel(config);
    const isValid = this.modelSelector.validateModel(selectedModel, config.provider);

    if (isValid) {
      console.log(`[LargeDiffHandler] Map 阶段使用模型: ${selectedModel}`);
      console.log(`[LargeDiffHandler] Reduce 阶段使用模型: ${config.modelName}`);
      return { mapModelId: selectedModel, usedFallback: false };
    }

    // 验证失败，回退到主模型
    console.warn(
      `[LargeDiffHandler] 选定的 Map 模型 ${selectedModel} 验证失败，回退到主模型 ${config.modelName}`
    );

    // 显示回退警告
    if (this.hybridModelFeedback) {
      this.hybridModelFeedback.showFallbackWarning(selectedModel, config.modelName);
    }

    // 验证主模型
    const isPrimaryValid = this.modelSelector.validateModel(config.modelName, config.provider);
    if (!isPrimaryValid) {
      console.error(
        `[LargeDiffHandler] 主模型 ${config.modelName} 也验证失败！将继续使用但可能出现问题`
      );
    }

    return { mapModelId: config.modelName, usedFallback: true };
  }

  /**
   * 显示使用情况摘要
   */
  private showUsageSummaryIfApplicable(
    config: ExtensionConfig | FullConfig,
    mapModelId: string | undefined,
    chunksLength: number,
    processingTime: number,
    usedFallback: boolean
  ): void {
    if (
      !this.hybridModelFeedback ||
      !this.isFullConfig(config) ||
      !mapModelId ||
      mapModelId === config.modelName ||
      usedFallback
    ) {
      return;
    }

    const tokenSavings = this.calculateTokenSavings(
      mapModelId,
      config.modelName,
      chunksLength,
      config.provider
    );

    console.log(`[LargeDiffHandler] 处理完成，耗时: ${processingTime}ms`);

    this.hybridModelFeedback.showUsageSummary(
      mapModelId,
      config.modelName,
      chunksLength,
      tokenSavings,
      processingTime
    );
  }

  /**
   * 使用 Map-Reduce 处理大型 diff
   */
  private async handleWithMapReduce(
    diff: string,
    config: ExtensionConfig | FullConfig
  ): Promise<string> {
    const startTime = Date.now();

    // 1. 选择 Map 阶段使用的模型
    const { mapModelId, usedFallback } = this.selectAndValidateMapModel(config);

    // 2. 拆分 diff
    const effectiveLimit = this.tokenEstimator.getEffectiveLimit();
    const chunks = this.diffSplitter.split(diff, effectiveLimit);

    if (chunks.length === 0) {
      return '';
    }

    // 记录模型选择信息
    if (this.hybridModelFeedback && this.isFullConfig(config) && mapModelId) {
      this.hybridModelFeedback.logModelSelection(mapModelId, config.modelName, chunks.length);
    }

    // 记录处理开始
    if (this.hybridModelFeedback) {
      this.hybridModelFeedback.logProcessingStart(chunks.length);
    }

    // 3. Map 阶段：并发处理 chunks
    const processConfig: ProcessConfig = {
      concurrency: this.largeDiffConfig.maxConcurrentRequests,
      maxRetries: this.largeDiffConfig.maxRetries,
      initialRetryDelay: this.largeDiffConfig.initialRetryDelay,
      mapModelId,
    };

    const summaries = await this.chunkProcessor.processChunks(chunks, processConfig);

    // 4. Reduce 阶段：合并摘要
    const finalMessage = await this.summaryMerger.merge(summaries, config);

    // 记录处理时间
    const processingTime = Date.now() - startTime;

    // 记录处理完成
    if (this.hybridModelFeedback) {
      this.hybridModelFeedback.logProcessingComplete(chunks.length, processingTime);
    }

    // 5. 显示使用情况摘要（如果使用了混合模型策略）
    this.showUsageSummaryIfApplicable(
      config,
      mapModelId,
      chunks.length,
      processingTime,
      usedFallback
    );

    return finalMessage;
  }

  /**
   * 使用截断行为处理（Map-Reduce 禁用时的回退）
   */
  private async handleWithTruncation(diff: string): Promise<string> {
    const effectiveLimit = this.tokenEstimator.getEffectiveLimit();

    // 简单截断到有效限制
    let truncatedDiff = diff;
    while (this.tokenEstimator.estimate(truncatedDiff) > effectiveLimit) {
      // 按行截断
      const lines = truncatedDiff.split('\n');
      truncatedDiff = lines.slice(0, Math.floor(lines.length * 0.9)).join('\n');
    }

    // 添加截断提示
    if (truncatedDiff !== diff) {
      truncatedDiff += '\n\n[注意: diff 内容已被截断]';
    }

    return this.summaryGenerator.generateSummary(truncatedDiff);
  }

  /**
   * 将 Git 变更列表转换为 diff 字符串
   */
  private changesToDiff(changes: GitChange[]): string {
    return changes
      .map((change) => {
        const header = `diff --git a/${change.path} b/${change.path}`;
        const statusText = change.status === ChangeStatus.Added ? 'new file' : change.status;
        return `${header}\n${statusText}\n${change.diff || ''}`;
      })
      .join('\n');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LargeDiffConfig>): void {
    this.largeDiffConfig = {
      ...this.largeDiffConfig,
      ...config,
    };
  }

  /**
   * 获取当前配置
   */
  getConfig(): LargeDiffConfig {
    return { ...this.largeDiffConfig };
  }

  /**
   * 设置 SmartDiffFilter（用于依赖注入）
   * @param filter SmartDiffFilter 实例
   */
  setSmartDiffFilter(filter: ISmartDiffFilter): void {
    this.smartDiffFilter = filter;
  }

  /**
   * 设置 FilterFeedback（用于依赖注入）
   * @param feedback FilterFeedback 实例
   */
  setFilterFeedback(feedback: IFilterFeedback): void {
    this.filterFeedback = feedback;
  }

  /**
   * 设置 ModelSelector（用于依赖注入）
   * @param modelSelector ModelSelector 实例
   */
  setModelSelector(modelSelector: ModelSelector): void {
    this.modelSelector = modelSelector;
  }

  /**
   * 设置 HybridModelFeedback（用于依赖注入）
   * @param feedback HybridModelFeedback 实例
   */
  setHybridModelFeedback(feedback: HybridModelFeedback): void {
    this.hybridModelFeedback = feedback;
  }

  /**
   * 计算 token 节省百分比
   * @param mapModel Map 阶段使用的模型
   * @param _reduceModel Reduce 阶段使用的模型（主模型）
   * @param chunkCount 处理的 chunk 数量
   * @param _provider Provider 类型
   * @returns token 节省百分比
   */
  private calculateTokenSavings(
    mapModel: string,
    _reduceModel: string,
    chunkCount: number,
    _provider: string
  ): number {
    // 模型相对成本映射表（相对于主模型的成本比例）
    const modelCostMap: Record<string, number> = {
      'gpt-4o-mini': 0.1,
      'gemini-1.5-flash': 0.05,
      'gpt-3.5-turbo': 0.05,
      // 默认情况下，如果模型不在映射表中，假设成本相同
    };

    // 获取 Map 模型的相对成本，默认为 1.0（与主模型相同）
    const mapModelCost = modelCostMap[mapModel] ?? 1.0;

    // 计算传统方式的总成本（所有阶段都使用主模型）
    // Map 阶段: chunkCount × 主模型成本
    // Reduce 阶段: 1 × 主模型成本
    const traditionalCost = chunkCount + 1;

    // 计算混合模型策略的总成本
    // Map 阶段: chunkCount × Map 模型成本
    // Reduce 阶段: 1 × 主模型成本
    const hybridCost = chunkCount * mapModelCost + 1;

    // 计算节省百分比
    const savings = ((traditionalCost - hybridCost) / traditionalCost) * 100;

    // 返回四舍五入到整数的节省百分比
    return Math.round(savings);
  }

  /**
   * 检查是否启用智能过滤
   * @param config 扩展配置
   * @returns 是否启用
   */
  private isSmartFilterEnabled(config: ExtensionConfig | FullConfig): boolean {
    // 检查配置中的 enableSmartFilter 选项
    // 注意：这个字段可能还未添加到配置类型中，所以使用类型断言
    const configWithFilter = config as ExtensionConfig & { enableSmartFilter?: boolean };

    // 默认启用智能过滤
    return configWithFilter.enableSmartFilter !== false;
  }

  /**
   * 检查配置是否为 FullConfig 类型
   * @param config 配置对象
   * @returns 是否为 FullConfig
   */
  private isFullConfig(config: ExtensionConfig | FullConfig): config is FullConfig {
    return 'provider' in config && 'modelName' in config;
  }
}
