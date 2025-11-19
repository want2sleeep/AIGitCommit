import * as vscode from 'vscode';
import {
  GitChange,
  ChangeStatus,
  GitAPI,
  GitExtension,
  GitRepository,
  GitFileChange,
} from '../types';
import { GitOperationError } from '../errors';
import { GIT_CONSTANTS } from '../constants';

/**
 * Git服务
 * 负责封装Git操作，获取仓库变更信息
 */
export class GitService {
  private static readonly BINARY_FILE_EXTENSIONS = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.bmp',
    '.ico',
    '.svg',
    '.pdf',
    '.zip',
    '.tar',
    '.gz',
    '.rar',
    '.7z',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.mp3',
    '.mp4',
    '.avi',
    '.mov',
    '.wav',
    '.ttf',
    '.woff',
    '.woff2',
    '.eot',
  ];

  // 应该被过滤或简化的文件模式
  private static readonly IGNORED_FILE_PATTERNS = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'Cargo.lock',
    'Gemfile.lock',
    'poetry.lock',
    'composer.lock',
    '*.min.js',
    '*.min.css',
    '*.bundle.js',
    '*.chunk.js',
    'dist/',
    'build/',
    '.next/',
    'out/',
  ];

  private gitExtension: vscode.Extension<GitExtension> | undefined;
  private git: GitAPI | undefined;

  constructor() {
    this.initializeGitExtension();
  }

  /**
   * 初始化Git扩展
   */
  private initializeGitExtension(): void {
    this.gitExtension = vscode.extensions.getExtension('vscode.git');
    if (this.gitExtension) {
      if (!this.gitExtension.isActive) {
        void this.gitExtension.activate().then((gitApi) => {
          this.git = gitApi.getAPI(1);
        });
      } else {
        this.git = this.gitExtension.exports.getAPI(1);
      }
    }
  }

  /**
   * 检查当前工作区是否为Git仓库
   * @returns 是否为Git仓库
   */
  isGitRepository(): boolean {
    if (!this.git || !this.git.repositories || this.git.repositories.length === 0) {
      return false;
    }
    return true;
  }

  /**
   * 获取Git仓库根目录
   * @returns 仓库根目录路径
   * @throws {GitOperationError} 当Git仓库不可用时
   */
  getRepositoryRoot(): string {
    if (!this.isGitRepository() || !this.git) {
      throw new GitOperationError(
        '当前工作区不是Git仓库。无法获取仓库根目录。',
        'getRepositoryRoot'
      );
    }
    const repository = this.git.repositories[0];
    if (!repository) {
      throw new GitOperationError(
        '无法获取Git仓库实例。Git扩展可能未正确初始化。',
        'getRepositoryRoot'
      );
    }

    try {
      return repository.rootUri.fsPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new GitOperationError(`获取仓库根目录失败: ${errorMessage}`, 'getRepositoryRoot');
    }
  }

  /**
   * 获取暂存区的变更
   * @returns Git变更列表
   * @throws {GitOperationError} 当Git仓库不可用或获取变更失败时
   */
  async getStagedChanges(): Promise<GitChange[]> {
    if (!this.isGitRepository() || !this.git) {
      throw new GitOperationError(
        '当前工作区不是Git仓库。请确保在Git仓库中打开项目，并且已安装VSCode Git扩展。',
        'getStagedChanges'
      );
    }

    const repository = this.git.repositories[0];
    if (!repository) {
      throw new GitOperationError(
        '无法获取Git仓库实例。Git扩展可能未正确初始化，请尝试重新加载窗口。',
        'getStagedChanges'
      );
    }

    try {
      const changes: GitChange[] = [];

      // 获取暂存区的变更
      const indexChanges = repository.state.indexChanges || [];

      for (const change of indexChanges) {
        try {
          const gitChange = await this.convertToGitChange(change, repository);
          if (gitChange) {
            changes.push(gitChange);
          }
        } catch (error) {
          // 记录单个文件处理失败，但继续处理其他文件
          // 添加一个占位符，表明该文件处理失败
          changes.push({
            path: change.uri.fsPath,
            status: this.mapStatus(change.status),
            diff: '[处理文件时出错]',
            additions: 0,
            deletions: 0,
          });
        }
      }

      return changes;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new GitOperationError(
        `获取暂存区变更失败: ${errorMessage}。请检查Git仓库状态是否正常。`,
        'getStagedChanges'
      );
    }
  }

  /**
   * 将VSCode Git API的变更对象转换为GitChange
   * @param change VSCode Git变更对象
   * @param repository Git仓库对象
   * @returns GitChange对象或null（如果应该过滤）
   * @throws {GitOperationError} 当文件转换失败时
   */
  private async convertToGitChange(
    change: GitFileChange,
    repository: GitRepository
  ): Promise<GitChange | null> {
    const filePath = change.uri.fsPath;

    try {
      // 检查是否为二进制文件
      if (this.isBinaryFile(filePath)) {
        return {
          path: change.uri.fsPath,
          status: this.mapStatus(change.status),
          diff: '[Binary file]',
          additions: 0,
          deletions: 0,
        };
      }

      // 检查是否应该简化处理
      if (this.shouldSimplifyFile(filePath)) {
        const status = this.mapStatus(change.status);
        return {
          path: change.uri.fsPath,
          status: status,
          diff: `[${this.getStatusText(status)} - 自动生成文件，已省略详细diff]`,
          additions: 0,
          deletions: 0,
        };
      }

      // 检查文件大小
      try {
        const stat = await vscode.workspace.fs.stat(change.uri);
        if (stat.size > GIT_CONSTANTS.MAX_FILE_SIZE) {
          return {
            path: change.uri.fsPath,
            status: this.mapStatus(change.status),
            diff: '[File too large]',
            additions: 0,
            deletions: 0,
          };
        }
      } catch (error) {
        // 文件可能已被删除，继续处理
      }

      // 获取diff
      const diff = await this.getDiff(change.uri, repository);
      const { additions, deletions } = this.countDiffLines(diff);

      return {
        path: change.uri.fsPath,
        status: this.mapStatus(change.status),
        diff: this.limitDiffLength(diff),
        additions,
        deletions,
      };
    } catch (error) {
      // 如果是GitOperationError，直接抛出
      if (error instanceof GitOperationError) {
        throw error;
      }

      // 否则包装为GitOperationError
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new GitOperationError(
        `转换文件变更失败 (${filePath}): ${errorMessage}`,
        'convertToGitChange'
      );
    }
  }

  /**
   * 获取文件的diff内容
   * @param uri 文件URI
   * @param repository Git仓库对象
   * @returns diff内容
   * @throws {GitOperationError} 当无法获取文件diff时
   */
  private async getDiff(uri: vscode.Uri, repository: GitRepository): Promise<string> {
    try {
      return await this.getDiffForModifiedFile(uri, repository);
    } catch (error) {
      return await this.getDiffForSpecialFile(uri, repository);
    }
  }

  /**
   * 获取修改文件的diff
   * @param uri 文件URI
   * @param repository Git仓库对象
   * @returns diff内容
   */
  private async getDiffForModifiedFile(
    uri: vscode.Uri,
    repository: GitRepository
  ): Promise<string> {
    const headContent = await repository.show('HEAD', uri.path);
    const indexContent = await repository.show(':', uri.path);
    return this.generateSimpleDiff(headContent, indexContent, uri.path);
  }

  /**
   * 获取特殊文件（新增或删除）的diff
   * @param uri 文件URI
   * @param repository Git仓库对象
   * @returns diff内容
   * @throws {GitOperationError} 当无法获取文件diff时
   */
  private async getDiffForSpecialFile(uri: vscode.Uri, repository: GitRepository): Promise<string> {
    try {
      const indexContent = await repository.show(':', uri.path);
      return this.generateAddedFileDiff(indexContent, uri.path);
    } catch {
      try {
        const headContent = await repository.show('HEAD', uri.path);
        return this.generateDeletedFileDiff(headContent, uri.path);
      } catch (finalError) {
        const errorMessage = finalError instanceof Error ? finalError.message : String(finalError);
        throw new GitOperationError(
          `无法获取文件 ${uri.fsPath} 的diff内容: ${errorMessage}。文件可能已被移动或删除。`,
          'getDiff'
        );
      }
    }
  }

  /**
   * 生成简单的diff格式
   * @param oldContent 旧内容
   * @param newContent 新内容
   * @param filePath 文件路径
   * @returns diff字符串
   */
  private generateSimpleDiff(oldContent: string, newContent: string, filePath: string): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    let diff = `--- a${filePath}\n+++ b${filePath}\n`;

    // 简单的逐行比较
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine !== newLine) {
        if (oldLine !== undefined) {
          diff += `-${oldLine}\n`;
        }
        if (newLine !== undefined) {
          diff += `+${newLine}\n`;
        }
      }
    }

    return diff;
  }

  /**
   * 生成新增文件的diff
   * @param content 文件内容
   * @param filePath 文件路径
   * @returns diff字符串
   */
  private generateAddedFileDiff(content: string, filePath: string): string {
    const lines = content.split('\n');
    let diff = `--- /dev/null\n+++ b${filePath}\n`;

    for (const line of lines) {
      diff += `+${line}\n`;
    }

    return diff;
  }

  /**
   * 生成删除文件的diff
   * @param content 文件内容
   * @param filePath 文件路径
   * @returns diff字符串
   */
  private generateDeletedFileDiff(content: string, filePath: string): string {
    const lines = content.split('\n');
    let diff = `--- a${filePath}\n+++ /dev/null\n`;

    for (const line of lines) {
      diff += `-${line}\n`;
    }

    return diff;
  }

  /**
   * 映射VSCode Git状态到ChangeStatus
   * @param status VSCode Git状态
   * @returns ChangeStatus枚举值
   */
  private mapStatus(status: number): ChangeStatus {
    // VSCode Git API状态码
    // 0: INDEX_MODIFIED
    // 1: INDEX_ADDED
    // 2: INDEX_DELETED
    // 3: INDEX_RENAMED
    // 4: INDEX_COPIED
    // 5: MODIFIED
    // 6: DELETED
    // 7: UNTRACKED
    // 8: IGNORED
    // 9: INTENT_TO_ADD

    switch (status) {
      case 1:
      case 7:
      case 9:
        return ChangeStatus.Added;
      case 2:
      case 6:
        return ChangeStatus.Deleted;
      case 3:
        return ChangeStatus.Renamed;
      case 4:
        return ChangeStatus.Copied;
      case 0:
      case 5:
      default:
        return ChangeStatus.Modified;
    }
  }

  /**
   * 检查是否为二进制文件
   * @param filePath 文件路径
   * @returns 是否为二进制文件
   */
  private isBinaryFile(filePath: string): boolean {
    const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    return GitService.BINARY_FILE_EXTENSIONS.includes(extension);
  }

  /**
   * 检查文件是否应该被简化处理
   * @param filePath 文件路径
   * @returns 是否应该简化
   */
  private shouldSimplifyFile(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');

    return GitService.IGNORED_FILE_PATTERNS.some((pattern) => {
      if (pattern.includes('*')) {
        // 通配符匹配
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(normalizedPath);
      } else if (pattern.endsWith('/')) {
        // 目录匹配
        return normalizedPath.includes(pattern);
      } else {
        // 精确文件名匹配
        return normalizedPath.endsWith(pattern) || normalizedPath.includes(`/${pattern}`);
      }
    });
  }

  /**
   * 统计diff的新增和删除行数
   * @param diff diff内容
   * @returns 新增和删除行数
   */
  private countDiffLines(diff: string): { additions: number; deletions: number } {
    const lines = diff.split('\n');
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
      }
    }

    return { additions, deletions };
  }

  /**
   * 限制diff长度
   * @param diff diff内容
   * @returns 限制后的diff内容
   */
  private limitDiffLength(diff: string): string {
    const lines = diff.split('\n');

    // 限制行数
    if (lines.length > GIT_CONSTANTS.MAX_FILE_DIFF_LINES) {
      const truncatedLines = lines.slice(0, GIT_CONSTANTS.MAX_FILE_DIFF_LINES);
      truncatedLines.push(
        `\n... (truncated ${lines.length - GIT_CONSTANTS.MAX_FILE_DIFF_LINES} lines)`
      );
      diff = truncatedLines.join('\n');
    }

    // 限制总字符数
    if (diff.length > GIT_CONSTANTS.MAX_DIFF_LENGTH) {
      diff = diff.substring(0, GIT_CONSTANTS.MAX_DIFF_LENGTH) + '\n... (truncated)';
    }

    return diff;
  }

  /**
   * 格式化变更信息为可读文本
   * @param changes Git变更列表
   * @returns 格式化的变更信息
   */
  formatChanges(changes: GitChange[]): string {
    if (changes.length === 0) {
      return '没有暂存的变更';
    }

    let formatted = `共 ${changes.length} 个文件变更:\n\n`;
    let totalDiffLength = 0;

    for (const change of changes) {
      formatted += `文件: ${change.path}\n`;
      formatted += `状态: ${this.getStatusText(change.status)}\n`;
      formatted += `变更: +${change.additions} -${change.deletions}\n`;

      // 检查是否会超出总长度限制
      if (totalDiffLength + change.diff.length <= GIT_CONSTANTS.MAX_DIFF_LENGTH) {
        formatted += `\n${change.diff}\n\n`;
        totalDiffLength += change.diff.length;
      } else {
        formatted += `\n[Diff省略以避免超出长度限制]\n\n`;
      }

      formatted += '---\n\n';
    }

    return formatted;
  }

  /**
   * 获取状态的文本描述
   * @param status 变更状态
   * @returns 状态文本
   */
  private getStatusText(status: ChangeStatus): string {
    switch (status) {
      case ChangeStatus.Added:
        return '新增';
      case ChangeStatus.Modified:
        return '修改';
      case ChangeStatus.Deleted:
        return '删除';
      case ChangeStatus.Renamed:
        return '重命名';
      case ChangeStatus.Copied:
        return '复制';
      default:
        return '未知';
    }
  }

  /**
   * 执行Git提交
   * @param message 提交信息
   * @throws {GitOperationError} 当Git仓库不可用或提交失败时
   */
  async commitWithMessage(message: string): Promise<void> {
    if (!this.isGitRepository() || !this.git) {
      throw new GitOperationError(
        '当前工作区不是Git仓库。请确保在Git仓库中打开项目。',
        'commitWithMessage'
      );
    }

    const repository = this.git.repositories[0];
    if (!repository) {
      throw new GitOperationError(
        '无法获取Git仓库实例。Git扩展可能未正确初始化。',
        'commitWithMessage'
      );
    }

    if (!message || message.trim().length === 0) {
      throw new GitOperationError('提交信息不能为空。请提供有效的提交信息。', 'commitWithMessage');
    }

    try {
      await repository.commit(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 提供更具体的错误信息
      let detailedMessage = `提交失败: ${errorMessage}`;

      if (errorMessage.includes('not configured')) {
        detailedMessage +=
          '\n请配置Git用户名和邮箱: git config user.name "Your Name" 和 git config user.email "your@email.com"';
      } else if (errorMessage.includes('no changes')) {
        detailedMessage += '\n暂存区没有变更可以提交。';
      } else if (errorMessage.includes('conflict')) {
        detailedMessage += '\n存在未解决的冲突，请先解决冲突后再提交。';
      }

      throw new GitOperationError(detailedMessage, 'commitWithMessage');
    }
  }

  /**
   * 检查是否有暂存的变更
   * @returns 是否有暂存的变更
   */
  hasStagedChanges(): boolean {
    if (!this.isGitRepository() || !this.git) {
      return false;
    }

    const repository = this.git.repositories[0];
    if (!repository) {
      return false;
    }

    const indexChanges = repository.state.indexChanges || [];

    return indexChanges.length > 0;
  }
  /**
   * 设置提交信息到SCM输入框
   * @param message 提交信息
   */
  setCommitMessage(message: string): void {
    if (!this.isGitRepository() || !this.git) {
      return;
    }

    const repository = this.git.repositories[0];
    if (repository) {
      repository.inputBox.value = message;
    }
  }
}
