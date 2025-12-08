/**
 * Diff 拆分器服务
 * 负责将大型 diff 递归拆分为可处理的 chunks
 *
 * 拆分策略：
 * 1. 首先按文件边界拆分
 * 2. 如果单个文件仍然超限，按 Hunk 边界拆分
 * 3. 如果单个 Hunk 仍然超限，按行组拆分
 */

import { DiffSplitLevel } from '../constants';
import { DiffChunk, IDiffSplitter, ITokenEstimator } from '../types/interfaces';

/**
 * Diff 拆分器实现类
 */
export class DiffSplitter implements IDiffSplitter {
  private tokenEstimator: ITokenEstimator;

  /**
   * 创建 DiffSplitter 实例
   * @param tokenEstimator Token 估算器实例
   */
  constructor(tokenEstimator: ITokenEstimator) {
    this.tokenEstimator = tokenEstimator;
  }

  /**
   * 拆分 diff 内容
   * 递归拆分直到每个 chunk 都在 token 限制内
   *
   * @param diff 原始 diff 内容
   * @param maxTokens 最大 token 数
   * @returns 拆分后的 chunks
   */
  split(diff: string, maxTokens: number): DiffChunk[] {
    if (!diff || diff.trim().length === 0) {
      return [];
    }

    // 如果不需要拆分，返回单个 chunk
    if (this.tokenEstimator.estimate(diff) <= maxTokens) {
      return [this.createSingleChunk(diff)];
    }

    // 首先按文件拆分
    const fileChunks = this.splitByFiles(diff);

    // 对每个文件 chunk 检查是否需要进一步拆分
    const result: DiffChunk[] = [];
    for (const chunk of fileChunks) {
      if (this.tokenEstimator.estimate(chunk.content) <= maxTokens) {
        result.push(chunk);
      } else {
        // 需要按 Hunk 进一步拆分
        const hunkChunks = this.splitByHunks(chunk.content, maxTokens);
        result.push(...hunkChunks);
      }
    }

    // 更新所有 chunk 的索引信息
    return this.updateChunkIndices(result);
  }

  /**
   * 按文件边界拆分
   * 解析 `diff --git a/... b/...` 边界
   *
   * @param diff 原始 diff
   * @returns 按文件拆分的 chunks
   */
  splitByFiles(diff: string): DiffChunk[] {
    if (!diff || diff.trim().length === 0) {
      return [];
    }

    // 匹配 diff --git 开头的文件边界
    const filePattern = /^diff --git a\/.+ b\/(.+)$/gm;
    const matches: Array<{ index: number; filePath: string }> = [];

    let match;
    while ((match = filePattern.exec(diff)) !== null) {
      matches.push({
        index: match.index,
        filePath: match[1] || 'unknown',
      });
    }

    // 如果没有找到文件边界，返回整个 diff 作为单个 chunk
    if (matches.length === 0) {
      return [this.createSingleChunk(diff)];
    }

    const chunks: DiffChunk[] = [];

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i]!;
      const nextMatch = matches[i + 1];
      const startIndex = currentMatch.index;
      const endIndex = nextMatch ? nextMatch.index : diff.length;
      const content = diff.slice(startIndex, endIndex).trim();
      const filePath = currentMatch.filePath;

      // 提取文件头部信息
      const headerEndIndex = content.indexOf('\n@@');
      const fileHeader =
        headerEndIndex > 0 ? content.slice(0, headerEndIndex) : content.split('\n')[0] || '';

      chunks.push({
        content,
        filePath,
        chunkIndex: i,
        totalChunks: matches.length,
        splitLevel: DiffSplitLevel.File,
        context: {
          fileHeader,
        },
      });
    }

    return chunks;
  }

  /**
   * 按 Hunk 边界拆分单个文件的 diff
   * 解析 `@@ -x,y +a,b @@` 边界
   *
   * @param fileDiff 单文件 diff
   * @param maxTokens 最大 token 数
   * @returns 按 Hunk 拆分的 chunks
   */
  splitByHunks(fileDiff: string, maxTokens: number): DiffChunk[] {
    if (!fileDiff || fileDiff.trim().length === 0) {
      return [];
    }

    // 提取文件头部（diff --git 到第一个 @@ 之间的内容）
    const firstHunkIndex = fileDiff.indexOf('\n@@');
    const fileHeader = firstHunkIndex > 0 ? fileDiff.slice(0, firstHunkIndex + 1) : '';
    const filePath = this.extractFilePath(fileDiff);

    // 匹配 Hunk 边界
    const hunkPattern = /^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@.*$/gm;
    const hunkMatches: Array<{ index: number; header: string }> = [];

    let match;
    while ((match = hunkPattern.exec(fileDiff)) !== null) {
      hunkMatches.push({
        index: match.index,
        header: match[0],
      });
    }

    // 如果没有找到 Hunk 边界，返回整个文件作为单个 chunk
    if (hunkMatches.length === 0) {
      return [this.createSingleChunk(fileDiff, filePath)];
    }

    const chunks: DiffChunk[] = [];

    for (let i = 0; i < hunkMatches.length; i++) {
      const currentHunk = hunkMatches[i]!;
      const nextHunk = hunkMatches[i + 1];
      const startIndex = currentHunk.index;
      const endIndex = nextHunk ? nextHunk.index : fileDiff.length;
      const hunkContent = fileDiff.slice(startIndex, endIndex).trim();

      // 组合文件头部和 Hunk 内容
      const content = fileHeader + hunkContent;

      // 检查是否需要进一步按行拆分
      if (this.tokenEstimator.estimate(content) <= maxTokens) {
        chunks.push({
          content,
          filePath,
          chunkIndex: i,
          totalChunks: hunkMatches.length,
          splitLevel: DiffSplitLevel.Hunk,
          context: {
            fileHeader,
            functionName: this.extractFunctionName(currentHunk.header),
          },
        });
      } else {
        // 需要按行进一步拆分
        const lineChunks = this.splitByLines(content, maxTokens);
        chunks.push(...lineChunks);
      }
    }

    return chunks;
  }

  /**
   * 按行拆分单个 Hunk
   * 确保每个块包含完整的行，不在行中间断开
   *
   * @param hunk 单个 Hunk 内容（包含文件头部）
   * @param maxTokens 最大 token 数
   * @returns 按行拆分的 chunks
   */
  splitByLines(hunk: string, maxTokens: number): DiffChunk[] {
    if (!hunk || hunk.trim().length === 0) {
      return [];
    }

    const filePath = this.extractFilePath(hunk);
    const lines = hunk.split('\n');

    // 提取文件头部（到第一个 @@ 或 +/- 开头的行）
    let headerEndIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (line.startsWith('@@') || line.startsWith('+') || line.startsWith('-')) {
        headerEndIndex = i;
        break;
      }
      headerEndIndex = i + 1;
    }

    const headerLines = lines.slice(0, headerEndIndex);
    const contentLines = lines.slice(headerEndIndex);
    const fileHeader = headerLines.join('\n');

    // 如果内容行为空，返回空数组
    if (contentLines.length === 0) {
      return [];
    }

    const chunks: DiffChunk[] = [];
    let currentLines: string[] = [];
    let currentTokens = this.tokenEstimator.estimate(fileHeader);

    for (const line of contentLines) {
      const lineTokens = this.tokenEstimator.estimate(line + '\n');

      // 如果添加这一行会超过限制，先保存当前 chunk
      if (currentTokens + lineTokens > maxTokens && currentLines.length > 0) {
        chunks.push(
          this.createLineChunk(
            fileHeader,
            currentLines,
            filePath,
            chunks.length,
            DiffSplitLevel.Line
          )
        );
        currentLines = [];
        currentTokens = this.tokenEstimator.estimate(fileHeader);
      }

      currentLines.push(line);
      currentTokens += lineTokens;
    }

    // 保存最后一个 chunk
    if (currentLines.length > 0) {
      chunks.push(
        this.createLineChunk(fileHeader, currentLines, filePath, chunks.length, DiffSplitLevel.Line)
      );
    }

    // 更新 totalChunks
    return chunks.map((chunk, index) => ({
      ...chunk,
      chunkIndex: index,
      totalChunks: chunks.length,
    }));
  }

  /**
   * 创建单个 chunk（用于不需要拆分的情况）
   */
  private createSingleChunk(content: string, filePath?: string): DiffChunk {
    const extractedPath = filePath || this.extractFilePath(content);
    const headerEndIndex = content.indexOf('\n@@');
    const fileHeader =
      headerEndIndex > 0 ? content.slice(0, headerEndIndex) : (content.split('\n')[0] ?? '');

    return {
      content,
      filePath: extractedPath,
      chunkIndex: 0,
      totalChunks: 1,
      splitLevel: DiffSplitLevel.File,
      context: {
        fileHeader,
      },
    };
  }

  /**
   * 创建行级 chunk
   */
  private createLineChunk(
    fileHeader: string,
    lines: string[],
    filePath: string,
    index: number,
    splitLevel: DiffSplitLevel
  ): DiffChunk {
    const content = fileHeader + (fileHeader.endsWith('\n') ? '' : '\n') + lines.join('\n');

    return {
      content,
      filePath,
      chunkIndex: index,
      totalChunks: 0, // 将在后续更新
      splitLevel,
      context: {
        fileHeader,
      },
    };
  }

  /**
   * 从 diff 内容中提取文件路径
   */
  private extractFilePath(diff: string): string {
    // 尝试从 diff --git 行提取
    const gitMatch = diff.match(/^diff --git a\/.+ b\/(.+)$/m);
    if (gitMatch && gitMatch[1]) {
      return gitMatch[1];
    }

    // 尝试从 +++ 行提取
    const plusMatch = diff.match(/^\+\+\+ b\/(.+)$/m);
    if (plusMatch && plusMatch[1]) {
      return plusMatch[1];
    }

    // 尝试从 --- 行提取
    const minusMatch = diff.match(/^--- a\/(.+)$/m);
    if (minusMatch && minusMatch[1]) {
      return minusMatch[1];
    }

    return 'unknown';
  }

  /**
   * 从 Hunk 头部提取函数名（如果存在）
   */
  private extractFunctionName(hunkHeader: string): string | undefined {
    // Hunk 头部格式: @@ -x,y +a,b @@ function_name
    const match = hunkHeader.match(/@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@\s*(.+)?$/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return undefined;
  }

  /**
   * 更新所有 chunk 的索引信息
   */
  private updateChunkIndices(chunks: DiffChunk[]): DiffChunk[] {
    return chunks.map((chunk, index) => ({
      ...chunk,
      chunkIndex: index,
      totalChunks: chunks.length,
    }));
  }
}
