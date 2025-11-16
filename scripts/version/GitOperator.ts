/**
 * Git 操作器
 * 负责 Git 相关操作
 */

import { execSync, exec } from './utils';
import { GitOperationError, DirtyWorkingTreeError, VersionExistsError } from './errors';

/**
 * Git 操作器类
 */
export class GitOperator {
  /**
   * 检查工作区状态
   * @returns 是否干净（无未提交变更）
   */
  async isWorkingTreeClean(): Promise<boolean> {
    try {
      const status = execSync('git status --porcelain');
      return status.length === 0;
    } catch (error) {
      throw new GitOperationError(
        '检查工作区状态',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 检查标签是否存在
   * @param tag 标签名
   * @returns 是否存在
   */
  async tagExists(tag: string): Promise<boolean> {
    try {
      const tags = execSync('git tag --list');
      return tags.split('\n').includes(tag);
    } catch (error) {
      throw new GitOperationError(
        '检查标签存在性',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 创建 Git 标签
   * @param version 版本号
   * @param message 标签消息
   * @throws {VersionExistsError} 如果标签已存在
   * @throws {GitOperationError} 如果创建失败
   */
  async createTag(version: string, message: string): Promise<void> {
    const tag = `v${version}`;

    // 检查标签是否已存在
    if (await this.tagExists(tag)) {
      throw new VersionExistsError(version);
    }

    try {
      execSync(`git tag -a ${tag} -m "${message}"`);
    } catch (error) {
      throw new GitOperationError(
        `创建标签 ${tag}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 推送标签到远程仓库
   * @param tag 标签名
   * @throws {GitOperationError} 如果推送失败
   */
  async pushTag(tag: string): Promise<void> {
    try {
      execSync(`git push origin ${tag}`);
    } catch (error) {
      throw new GitOperationError(
        `推送标签 ${tag}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 删除本地标签
   * @param tag 标签名
   * @throws {GitOperationError} 如果删除失败
   */
  async deleteLocalTag(tag: string): Promise<void> {
    try {
      if (await this.tagExists(tag)) {
        execSync(`git tag -d ${tag}`);
      }
    } catch (error) {
      throw new GitOperationError(
        `删除标签 ${tag}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 提交变更
   * @param message 提交消息
   * @param files 要提交的文件列表
   * @throws {GitOperationError} 如果提交失败
   */
  async commit(message: string, files: string[]): Promise<void> {
    try {
      // 添加文件到暂存区
      for (const file of files) {
        execSync(`git add ${file}`);
      }

      // 提交变更
      execSync(`git commit -m "${message}"`);
    } catch (error) {
      throw new GitOperationError(
        '提交变更',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 确保工作区干净
   * @throws {DirtyWorkingTreeError} 如果工作区不干净
   */
  async ensureCleanWorkingTree(): Promise<void> {
    const isClean = await this.isWorkingTreeClean();
    if (!isClean) {
      throw new DirtyWorkingTreeError();
    }
  }

  /**
   * 获取当前分支名
   * @returns 分支名
   */
  async getCurrentBranch(): Promise<string> {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD');
    } catch (error) {
      throw new GitOperationError(
        '获取当前分支',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 获取最新的标签
   * @returns 最新标签名，如果没有标签则返回 null
   */
  async getLatestTag(): Promise<string | null> {
    try {
      const tag = execSync('git describe --tags --abbrev=0');
      return tag || null;
    } catch {
      // 如果没有标签，git describe 会失败
      return null;
    }
  }

  /**
   * 推送提交到远程仓库
   * @throws {GitOperationError} 如果推送失败
   */
  async pushCommits(): Promise<void> {
    try {
      const branch = await this.getCurrentBranch();
      execSync(`git push origin ${branch}`);
    } catch (error) {
      throw new GitOperationError(
        '推送提交',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 检查是否在 Git 仓库中
   * @returns 是否在 Git 仓库中
   */
  async isGitRepository(): Promise<boolean> {
    try {
      execSync('git rev-parse --git-dir');
      return true;
    } catch {
      return false;
    }
  }
}
