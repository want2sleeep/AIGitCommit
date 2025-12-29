/**
 * 块处理器服务
 * 负责并发处理多个 diff chunks，实现 Map 阶段
 *
 * 功能：
 * 1. 并发控制：限制同时进行的 API 请求数
 * 2. 重试机制：使用指数退避策略处理失败
 * 3. 错误容错：单个 chunk 失败不影响其他 chunk
 * 4. 上下文构建：为每个 chunk 构建包含上下文的提示词
 */

import {
  ChunkSummary,
  DiffChunk,
  IChunkProcessor,
  IChunkSummaryGenerator,
  ProcessConfig,
} from '../types/interfaces';

/**
 * 块处理器实现类
 */
export class ChunkProcessor implements IChunkProcessor {
  private summaryGenerator: IChunkSummaryGenerator;
  private chunkSummaries: Map<string, string> = new Map();

  /**
   * 创建 ChunkProcessor 实例
   * @param summaryGenerator 摘要生成器实例
   */
  constructor(summaryGenerator: IChunkSummaryGenerator) {
    this.summaryGenerator = summaryGenerator;
  }

  /**
   * 并发处理多个 chunks
   * 使用批处理模式控制并发数
   *
   * @param chunks 待处理的 chunks
   * @param config 处理配置
   * @returns 处理结果（摘要列表）
   */
  async processChunks(chunks: DiffChunk[], config: ProcessConfig): Promise<ChunkSummary[]> {
    if (chunks.length === 0) {
      return [];
    }

    // 清空之前的摘要缓存
    this.chunkSummaries.clear();

    const { concurrency, mapModelId } = config;
    const results: ChunkSummary[] = new Array<ChunkSummary>(chunks.length);

    // 使用批处理模式控制并发
    for (let i = 0; i < chunks.length; i += concurrency) {
      const batch = chunks.slice(i, i + concurrency);
      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const globalIndex = i + batchIndex;
        const summary = await this.processChunk(chunk, config, mapModelId);
        results[globalIndex] = summary;

        // 缓存成功的摘要，供后续 chunk 使用
        if (summary.success) {
          const key = `${summary.filePath}:${summary.chunkIndex}`;
          this.chunkSummaries.set(key, summary.summary);
        }

        return summary;
      });

      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * 处理单个 chunk
   * 包含重试逻辑和错误处理
   *
   * @param chunk 待处理的 chunk
   * @param config 处理配置
   * @param modelId 可选的模型 ID，用于 Map 阶段
   * @returns 处理结果
   */
  async processChunk(
    chunk: DiffChunk,
    config: ProcessConfig,
    modelId?: string
  ): Promise<ChunkSummary> {
    const { maxRetries, initialRetryDelay } = config;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 构建提示词
        const prompt = this.buildChunkPrompt(chunk);

        // 调用摘要生成器，传入模型 ID（如果有）
        const summary = await this.summaryGenerator.generateSummary(prompt, {
          modelId,
        });

        return {
          filePath: chunk.filePath,
          summary,
          chunkIndex: chunk.chunkIndex,
          success: true,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果还有重试机会，等待后重试
        if (attempt < maxRetries) {
          const delay = this.calculateBackoffDelay(attempt, initialRetryDelay);
          await this.sleep(delay);
        }
      }
    }

    // 所有重试都失败，返回错误占位符
    return {
      filePath: chunk.filePath,
      summary: '',
      chunkIndex: chunk.chunkIndex,
      success: false,
      error: lastError?.message || '处理失败',
    };
  }

  /**
   * 构建 chunk 提示词
   * 包含上下文信息、文件名、块位置等
   *
   * @param chunk 待处理的 chunk
   * @returns 构建的提示词
   */
  buildChunkPrompt(chunk: DiffChunk): string {
    const parts: string[] = [];

    // 添加上下文信息
    parts.push(`文件: ${chunk.filePath}`);
    parts.push(`块位置: ${chunk.chunkIndex + 1}/${chunk.totalChunks}`);
    parts.push(`拆分级别: ${chunk.splitLevel}`);

    // 添加函数名（如果有）
    if (chunk.context.functionName) {
      parts.push(`函数: ${chunk.context.functionName}`);
    }

    // 添加前面块的摘要（如果有）
    if (chunk.chunkIndex > 0) {
      const previousSummary = this.getPreviousChunkSummary(chunk);
      if (previousSummary) {
        parts.push(`\n前面块的摘要:\n${previousSummary}`);
      }
    }

    // 添加 diff 内容
    parts.push(`\n变更内容:\n${chunk.content}`);

    return parts.join('\n');
  }

  /**
   * 获取前一个 chunk 的摘要
   *
   * @param chunk 当前 chunk
   * @returns 前一个 chunk 的摘要（如果存在）
   */
  private getPreviousChunkSummary(chunk: DiffChunk): string | undefined {
    if (chunk.chunkIndex === 0) {
      return undefined;
    }

    const key = `${chunk.filePath}:${chunk.chunkIndex - 1}`;
    return this.chunkSummaries.get(key);
  }

  /**
   * 计算指数退避延迟
   *
   * @param attempt 当前尝试次数（从 0 开始）
   * @param initialDelay 初始延迟（毫秒）
   * @returns 计算后的延迟（毫秒）
   */
  private calculateBackoffDelay(attempt: number, initialDelay: number): number {
    // 指数退避: delay = initialDelay * 2^attempt
    return initialDelay * Math.pow(2, attempt);
  }

  /**
   * 等待指定时间
   *
   * @param ms 等待时间（毫秒）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
