/**
 * 版本更新 CLI 工具
 */

import { VersionType, VersionInfo } from './types';
import { VersionManager } from './VersionManager';
import { FileUpdater } from './FileUpdater';
import { GitOperator } from './GitOperator';
import { Validator } from './Validator';
import { loadConfig } from './config';
import { getProjectRoot, getCurrentDate, parseJsonFile } from './utils';
import * as path from 'path';

/**
 * 版本 CLI 类
 */
export class VersionCLI {
  private versionManager: VersionManager;
  private fileUpdater: FileUpdater;
  private gitOperator: GitOperator;
  private validator: Validator;
  private projectRoot: string;

  constructor() {
    this.projectRoot = getProjectRoot();
    this.versionManager = new VersionManager();
    this.fileUpdater = new FileUpdater();
    this.gitOperator = new GitOperator();
    this.validator = new Validator(this.projectRoot);
  }

  /**
   * 运行版本更新流程
   * @param type 版本类型
   */
  async run(type: VersionType): Promise<void> {
    console.log('🚀 开始版本更新流程...\n');

    try {
      // 1. 检查 Git 仓库
      console.log('📋 检查 Git 仓库...');
      const isGitRepo = await this.gitOperator.isGitRepository();
      if (!isGitRepo) {
        throw new Error('当前目录不是 Git 仓库');
      }

      // 2. 检查工作区状态
      console.log('📋 检查工作区状态...');
      await this.gitOperator.ensureCleanWorkingTree();
      console.log('✅ 工作区干净\n');

      // 3. 获取当前版本
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageJson = parseJsonFile<{ version: string }>(packagePath);
      const currentVersion = packageJson.version;
      console.log(`📦 当前版本: ${currentVersion}`);

      // 4. 计算新版本
      const newVersion = this.versionManager.bumpVersion(currentVersion, type);
      console.log(`📦 新版本: ${newVersion}\n`);

      // 5. 提取 CHANGELOG 变更
      console.log('📝 提取 CHANGELOG 变更...');
      const changes = await this.fileUpdater.extractUnreleasedChanges();
      console.log('✅ 变更内容已提取\n');

      // 6. 更新文件
      console.log('📝 更新文件...');
      await this.fileUpdater.updatePackageJson(newVersion);
      console.log('✅ package.json 已更新');

      const date = getCurrentDate();
      await this.fileUpdater.updateChangelog(newVersion, date, changes);
      console.log('✅ CHANGELOG.md 已更新\n');

      // 7. 提交变更
      console.log('💾 提交变更...');
      const commitMessage = `chore(release): bump version to ${newVersion}`;
      await this.gitOperator.commit(commitMessage, ['package.json', 'CHANGELOG.md']);
      console.log('✅ 变更已提交\n');

      // 8. 创建标签
      console.log('🏷️  创建 Git 标签...');
      await this.gitOperator.createTag(newVersion, `Release ${newVersion}`);
      console.log(`✅ 标签 v${newVersion} 已创建\n`);

      // 9. 推送到远程
      console.log('🚀 推送到远程仓库...');
      await this.gitOperator.pushCommits();
      await this.gitOperator.pushTag(`v${newVersion}`);
      console.log('✅ 已推送到远程仓库\n');

      console.log('🎉 版本更新完成！');
      console.log(`\n版本 ${currentVersion} → ${newVersion}`);
      console.log(`标签: v${newVersion}`);
      console.log('\n下一步：');
      console.log('- 在 GitHub 上创建 Release 以触发自动发布');
      console.log(`- 访问: https://github.com/your-repo/releases/new?tag=v${newVersion}`);
    } catch (error) {
      console.error('\n❌ 版本更新失败:');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * 显示当前版本
   */
  showCurrentVersion(): void {
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageJson = parseJsonFile<{ version: string; name: string }>(packagePath);
      console.log(`${packageJson.name} v${packageJson.version}`);
    } catch (error) {
      console.error('无法读取版本信息');
      process.exit(1);
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp(): void {
    console.log(`
版本更新工具

用法:
  pnpm run version:bump <type>    更新版本号
  pnpm run version:current        显示当前版本
  pnpm run version:help           显示帮助信息

版本类型:
  major    主版本号 (X.0.0)
  minor    次版本号 (x.Y.0)
  patch    修订号 (x.y.Z)

示例:
  pnpm run version:bump patch     1.2.0 → 1.2.1
  pnpm run version:bump minor     1.2.0 → 1.3.0
  pnpm run version:bump major     1.2.0 → 2.0.0

快捷命令:
  pnpm run version:patch          等同于 version:bump patch
  pnpm run version:minor          等同于 version:bump minor
  pnpm run version:major          等同于 version:bump major
`);
  }
}
