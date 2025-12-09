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
    filterFeedback?: IFilterFeedback
  ) {
    this.tokenEstimator = tokenEstimator;
    this.diffSplitter = diffSplitter;
    this.chunkProcessor = chunkProcessor;
    this.summaryMerger = summaryMerger;
    this.summaryGenerator = summaryGenerator;
    this.smartDiffFilter = smartDiffFilter;
    this.filterFeedback = filterFeedback;
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
    if (!this.largeDiffConfig.enableMapReduce) {
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
   * 使用 Map-Reduce 处理大型 diff
   */
  private async handleWithMapReduce(
    diff: string,
    config: ExtensionConfig | FullConfig
  ): Promise<string> {
    // 1. 拆分 diff
    const effectiveLimit = this.tokenEstimator.getEffectiveLimit();
    const chunks = this.diffSplitter.split(diff, effectiveLimit);

    if (chunks.length === 0) {
      return '';
    }

    // 2. Map 阶段：并发处理 chunks
    const processConfig: ProcessConfig = {
      concurrency: this.largeDiffConfig.maxConcurrentRequests,
      maxRetries: this.largeDiffConfig.maxRetries,
      initialRetryDelay: this.largeDiffConfig.initialRetryDelay,
    };

    const summaries = await this.chunkProcessor.processChunks(chunks, processConfig);

    // 3. Reduce 阶段：合并摘要
    return this.summaryMerger.merge(summaries, config as ExtensionConfig);
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
}
