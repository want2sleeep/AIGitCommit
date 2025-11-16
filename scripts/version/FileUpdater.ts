/**
 * 文件更新器
 * 负责更新项目文件中的版本信息
 */

import * as path from 'path';
import {
  readFile,
  writeFile,
  copyFile,
  deleteFile,
  fileExists,
  parseJsonFile,
  writeJsonFile,
  getProjectRoot,
} from './utils';
import { FileUpdateError, ChangelogEmptyError, FileNotFoundError } from './errors';

/**
 * 文件更新器类
 */
export class FileUpdater {
  private projectRoot: string;
  private backupSuffix = '.backup';

  constructor() {
    this.projectRoot = getProjectRoot();
  }

  /**
   * 更新 package.json 中的版本号
   * @param newVersion 新版本号
   * @throws {FileUpdateError} 如果更新失败
   */
  async updatePackageJson(newVersion: string): Promise<void> {
    const packagePath = path.join(this.projectRoot, 'package.json');

    try {
      // 创建备份
      this.createBackup(packagePath);

      // 读取并解析 package.json
      const packageJson = parseJsonFile<Record<string, unknown>>(packagePath);

      // 更新版本号
      packageJson.version = newVersion;

      // 写回文件（保持格式）
      writeJsonFile(packagePath, packageJson, 2);
    } catch (error) {
      // 恢复备份
      this.restoreBackup(packagePath);
      throw new FileUpdateError(
        'package.json',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 更新 CHANGELOG.md
   * @param version 版本号
   * @param date 发布日期
   * @param changes 变更内容（从 Unreleased 部分提取）
   * @throws {FileUpdateError} 如果更新失败
   */
  async updateChangelog(version: string, date: string, changes: string): Promise<void> {
    const changelogPath = path.join(this.projectRoot, 'CHANGELOG.md');

    if (!fileExists(changelogPath)) {
      throw new FileNotFoundError(changelogPath);
    }

    try {
      // 创建备份
      this.createBackup(changelogPath);

      // 读取 CHANGELOG
      let content = readFile(changelogPath);

      // 查找 Unreleased 部分
      const unreleasedRegex = /## \[Unreleased\]/;
      const match = content.match(unreleasedRegex);

      if (!match) {
        throw new Error('未找到 [Unreleased] 部分');
      }

      // 构建新版本条目
      const versionEntry = `## [${version}] - ${date}\n\n${changes}\n\n---\n\n`;

      // 在 Unreleased 后插入新版本条目
      content = content.replace(unreleasedRegex, `## [Unreleased]\n\n---\n\n${versionEntry}`);

      // 写回文件
      writeFile(changelogPath, content);
    } catch (error) {
      // 恢复备份
      this.restoreBackup(changelogPath);
      throw new FileUpdateError(
        'CHANGELOG.md',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 从 CHANGELOG 提取 Unreleased 内容
   * @returns Unreleased 部分的内容
   * @throws {ChangelogEmptyError} 如果 Unreleased 部分为空
   * @throws {FileNotFoundError} 如果文件不存在
   */
  async extractUnreleasedChanges(): Promise<string> {
    const changelogPath = path.join(this.projectRoot, 'CHANGELOG.md');

    if (!fileExists(changelogPath)) {
      throw new FileNotFoundError(changelogPath);
    }

    const content = readFile(changelogPath);

    // 匹配 Unreleased 部分
    const unreleasedRegex = /## \[Unreleased\]\s*\n([\s\S]*?)(?=\n---\n|## \[|$)/;
    const match = content.match(unreleasedRegex);

    if (!match) {
      throw new Error('未找到 [Unreleased] 部分');
    }

    const changes = match[1].trim();

    if (!changes || changes.length === 0) {
      throw new ChangelogEmptyError();
    }

    return changes;
  }

  /**
   * 更新文档中的版本引用
   * @param oldVersion 旧版本号
   * @param newVersion 新版本号
   * @param files 需要更新的文件列表
   * @throws {FileUpdateError} 如果更新失败
   */
  async updateDocVersions(oldVersion: string, newVersion: string, files: string[]): Promise<void> {
    for (const file of files) {
      const filePath = path.join(this.projectRoot, file);

      if (!fileExists(filePath)) {
        continue; // 跳过不存在的文件
      }

      try {
        // 创建备份
        this.createBackup(filePath);

        // 读取文件内容
        let content = readFile(filePath);

        // 替换版本号引用（支持多种格式）
        const patterns = [
          new RegExp(`v${oldVersion}`, 'g'), // v1.2.0
          new RegExp(`${oldVersion}`, 'g'), // 1.2.0
          new RegExp(`version ${oldVersion}`, 'gi'), // version 1.2.0
          new RegExp(`版本 ${oldVersion}`, 'g'), // 版本 1.2.0
        ];

        const replacements = [
          `v${newVersion}`,
          newVersion,
          `version ${newVersion}`,
          `版本 ${newVersion}`,
        ];

        for (let i = 0; i < patterns.length; i++) {
          content = content.replace(patterns[i], replacements[i]);
        }

        // 写回文件
        writeFile(filePath, content);
      } catch (error) {
        // 恢复备份
        this.restoreBackup(filePath);
        throw new FileUpdateError(file, error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * 创建文件备份
   * @param filePath 文件路径
   */
  private createBackup(filePath: string): void {
    if (fileExists(filePath)) {
      const backupPath = filePath + this.backupSuffix;
      copyFile(filePath, backupPath);
    }
  }

  /**
   * 恢复文件备份
   * @param filePath 文件路径
   */
  private restoreBackup(filePath: string): void {
    const backupPath = filePath + this.backupSuffix;
    if (fileExists(backupPath)) {
      copyFile(backupPath, filePath);
      deleteFile(backupPath);
    }
  }

  /**
   * 删除文件备份
   * @param filePath 文件路径
   */
  deleteBackup(filePath: string): void {
    const backupPath = filePath + this.backupSuffix;
    deleteFile(backupPath);
  }

  /**
   * 删除所有备份文件
   * @param files 文件列表
   */
  deleteAllBackups(files: string[]): void {
    for (const file of files) {
      const filePath = path.join(this.projectRoot, file);
      this.deleteBackup(filePath);
    }
  }
}
