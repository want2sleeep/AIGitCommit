/**
 * 摘要合并器服务
 * 负责将多个 chunk 摘要合并为最终的提交信息，实现 Reduce 阶段
 *
 * 功能：
 * 1. 摘要合并：将多个摘要合并为连贯的提交信息
 * 2. 递归合并：当合并后的摘要超限时递归应用 Map-Reduce
 * 3. 格式遵守：确保输出遵循配置的提交格式
 */

import {
  ChunkSummary,
  IChunkSummaryGenerator,
  ISummaryMerger,
  ITokenEstimator,
} from '../types/interfaces';
import { ExtensionConfig } from '../types';

/**
 * 摘要合并器实现类
 */
export class SummaryMerger implements ISummaryMerger {
  private tokenEstimator: ITokenEstimator;
  private summaryGenerator: IChunkSummaryGenerator;

  /**
   * 创建 SummaryMerger 实例
   * @param tokenEstimator Token 估算器实例
   * @param summaryGenerator 摘要生成器实例
   */
  constructor(tokenEstimator: ITokenEstimator, summaryGenerator: IChunkSummaryGenerator) {
    this.tokenEstimator = tokenEstimator;
    this.summaryGenerator = summaryGenerator;
  }

  /**
   * 合并摘要为最终提交信息
   *
   * @param summaries 摘要列表
   * @param config 扩展配置
   * @returns 最终提交信息
   */
  async merge(summaries: ChunkSummary[], config: ExtensionConfig): Promise<string> {
    if (summaries.length === 0) {
      return '';
    }

    // 过滤成功的摘要
    const successfulSummaries = summaries.filter((s) => s.success && s.summary);

    if (successfulSummaries.length === 0) {
      // 所有摘要都失败，返回错误信息
      const errors = summaries
        .filter((s) => !s.success)
        .map((s) => s.error || '未知错误')
        .join('; ');
      return `无法生成提交信息: ${errors}`;
    }

    // 如果只有一个摘要，直接格式化返回
    if (successfulSummaries.length === 1) {
      return this.formatCommitMessage(successfulSummaries[0]!.summary, config);
    }

    // 构建合并提示词
    const mergePrompt = this.buildMergePrompt(successfulSummaries, config);

    // 检查是否需要递归合并
    if (this.tokenEstimator.needsSplit(mergePrompt)) {
      return this.recursiveMerge(summaries, config);
    }

    // 调用 LLM 合并摘要
    const mergedSummary = await this.summaryGenerator.generateSummary(mergePrompt);

    return this.formatCommitMessage(mergedSummary, config);
  }

  /**
   * 递归合并（当摘要总量超限时）
   * 将摘要分组，先合并每组，再合并组结果
   *
   * @param summaries 摘要列表
   * @param config 扩展配置
   * @param depth 递归深度（防止无限递归）
   * @returns 合并后的摘要
   */
  async recursiveMerge(
    summaries: ChunkSummary[],
    config: ExtensionConfig,
    depth: number = 0
  ): Promise<string> {
    const maxDepth = 5; // 最大递归深度
    const successfulSummaries = summaries.filter((s) => s.success && s.summary);

    if (successfulSummaries.length === 0) {
      return '';
    }

    // 防止无限递归
    if (depth >= maxDepth) {
      // 达到最大深度，强制合并所有摘要
      const combinedSummary = successfulSummaries.map((s) => s.summary).join('\n');
      return this.formatCommitMessage(combinedSummary, config);
    }

    // 计算每组的大小，确保每组不超过 token 限制
    const effectiveLimit = this.tokenEstimator.getEffectiveLimit();
    const groupSize = this.calculateGroupSize(successfulSummaries, effectiveLimit);

    // 如果 groupSize 等于总数，说明无法进一步分组，直接合并
    if (groupSize >= successfulSummaries.length) {
      const combinedSummary = successfulSummaries.map((s) => s.summary).join('\n');
      return this.formatCommitMessage(combinedSummary, config);
    }

    // 将摘要分组
    const groups: ChunkSummary[][] = [];
    for (let i = 0; i < successfulSummaries.length; i += groupSize) {
      groups.push(successfulSummaries.slice(i, i + groupSize));
    }

    // 如果只有一组，直接合并
    if (groups.length === 1) {
      const prompt = this.buildMergePrompt(groups[0]!, config);
      const merged = await this.summaryGenerator.generateSummary(prompt);
      return this.formatCommitMessage(merged, config);
    }

    // 并行合并每组
    const groupSummaries = await Promise.all(
      groups.map(async (group, index) => {
        const prompt = this.buildMergePrompt(group, config);
        const summary = await this.summaryGenerator.generateSummary(prompt);
        return {
          filePath: `group-${index}`,
          summary,
          chunkIndex: index,
          success: true,
        } as ChunkSummary;
      })
    );

    // 递归合并组结果
    return this.recursiveMerge(groupSummaries, config, depth + 1);
  }

  /**
   * 构建合并提示词
   *
   * @param summaries 摘要列表
   * @param config 扩展配置
   * @returns 合并提示词
   */
  private buildMergePrompt(summaries: ChunkSummary[], config: ExtensionConfig): string {
    const parts: string[] = [];

    parts.push('请将以下代码变更摘要合并为一个连贯的 Git 提交信息：');
    parts.push('');

    // 按文件分组摘要
    const byFile = new Map<string, string[]>();
    for (const summary of summaries) {
      const existing = byFile.get(summary.filePath) || [];
      existing.push(summary.summary);
      byFile.set(summary.filePath, existing);
    }

    // 添加每个文件的摘要
    for (const [filePath, fileSummaries] of byFile) {
      parts.push(`文件: ${filePath}`);
      for (const summary of fileSummaries) {
        parts.push(`  - ${summary}`);
      }
      parts.push('');
    }

    // 添加格式要求
    if (config.commitFormat === 'conventional') {
      parts.push('请使用约定式提交格式: type(scope): subject');
      parts.push('类型包括: feat, fix, docs, style, refactor, test, chore');
    }

    if (config.language === 'zh-CN') {
      parts.push('请使用中文生成提交信息');
    } else {
      parts.push('请使用英文生成提交信息');
    }

    return parts.join('\n');
  }

  /**
   * 格式化提交信息
   * 确保输出遵循配置的提交格式
   *
   * @param message 原始提交信息
   * @param config 扩展配置
   * @returns 格式化后的提交信息
   */
  private formatCommitMessage(message: string, config: ExtensionConfig): string {
    let formatted = message.trim();

    // 如果配置了约定式提交但消息不符合格式，尝试添加默认类型
    if (config.commitFormat === 'conventional' && !this.isConventionalFormat(formatted)) {
      // 检测变更类型
      const type = this.detectChangeType(formatted);
      formatted = `${type}: ${formatted}`;
    }

    return formatted;
  }

  /**
   * 检查消息是否符合约定式提交格式
   *
   * @param message 提交信息
   * @returns 是否符合格式
   */
  private isConventionalFormat(message: string): boolean {
    // 约定式提交格式: type(scope): subject 或 type: subject
    const pattern =
      /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?:\s*.+/;
    return pattern.test(message);
  }

  /**
   * 变更类型关键词映射表
   * 用于根据提交信息内容检测变更类型
   */
  private static readonly CHANGE_TYPE_KEYWORDS: ReadonlyArray<{
    type: string;
    keywords: readonly string[];
  }> = [
    { type: 'fix', keywords: ['fix', '修复', 'bug'] },
    { type: 'feat', keywords: ['add', '添加', '新增', 'feat'] },
    { type: 'docs', keywords: ['doc', '文档'] },
    { type: 'refactor', keywords: ['refactor', '重构', '优化'] },
    { type: 'test', keywords: ['test', '测试'] },
    { type: 'style', keywords: ['style', '格式'] },
  ];

  /**
   * 检测变更类型
   *
   * @param message 提交信息
   * @returns 检测到的类型
   */
  private detectChangeType(message: string): string {
    const lowerMessage = message.toLowerCase();

    for (const { type, keywords } of SummaryMerger.CHANGE_TYPE_KEYWORDS) {
      if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
        return type;
      }
    }

    return 'chore';
  }

  /**
   * 计算每组的大小
   *
   * @param summaries 摘要列表
   * @param effectiveLimit 有效 token 限制
   * @returns 每组的大小
   */
  private calculateGroupSize(summaries: ChunkSummary[], effectiveLimit: number): number {
    // 估算每个摘要的平均 token 数
    const totalTokens = summaries.reduce(
      (sum, s) => sum + this.tokenEstimator.estimate(s.summary),
      0
    );
    const avgTokensPerSummary = totalTokens / summaries.length;

    // 计算每组可以容纳的摘要数（留出一些空间给提示词）
    const promptOverhead = 500; // 提示词的估计 token 数
    const availableTokens = effectiveLimit - promptOverhead;
    const groupSize = Math.max(1, Math.floor(availableTokens / avgTokensPerSummary));

    return Math.min(groupSize, summaries.length);
  }
}
