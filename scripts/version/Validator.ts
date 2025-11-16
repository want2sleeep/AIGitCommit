/**
 * 验证器
 * 负责执行各种验证检查
 */

import * as path from 'path';
import { ValidationResult, ChecklistItem } from './types';
import { fileExists, readFile, parseJsonFile, execSync } from './utils';

/**
 * 验证器类
 */
export class Validator {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * 验证 Git 钩子配置
   * @returns 验证结果
   */
  async validateGitHooks(): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // 检查 .husky/pre-commit 文件
    const preCommitPath = path.join(this.projectRoot, '.husky/pre-commit');
    if (!fileExists(preCommitPath)) {
      result.success = false;
      result.errors.push('.husky/pre-commit 文件不存在');
      result.suggestions.push('运行 pnpm exec husky init 初始化 Husky');
    } else {
      const content = readFile(preCommitPath);
      if (!content.includes('lint-staged')) {
        result.success = false;
        result.errors.push('pre-commit 钩子未包含 lint-staged');
        result.suggestions.push('在 .husky/pre-commit 中添加 pnpm lint-staged');
      }
    }

    // 检查 package.json 中的 lint-staged 配置
    const packagePath = path.join(this.projectRoot, 'package.json');
    if (fileExists(packagePath)) {
      const packageJson = parseJsonFile<Record<string, unknown>>(packagePath);
      if (!packageJson['lint-staged']) {
        result.warnings.push('package.json 中未配置 lint-staged');
        result.suggestions.push('在 package.json 中添加 lint-staged 配置');
      }
    }

    return result;
  }

  /**
   * 验证 CI/CD 工作流配置
   * @returns 验证结果
   */
  async validateCICD(): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // 检查 publish.yml
    const publishPath = path.join(this.projectRoot, '.github/workflows/publish.yml');
    if (!fileExists(publishPath)) {
      result.warnings.push('.github/workflows/publish.yml 文件不存在');
    } else {
      const content = readFile(publishPath);
      if (!content.includes('pnpm')) {
        result.warnings.push('publish.yml 未使用 pnpm');
      }
    }

    // 检查 ci.yml
    const ciPath = path.join(this.projectRoot, '.github/workflows/ci.yml');
    if (!fileExists(ciPath)) {
      result.warnings.push('.github/workflows/ci.yml 文件不存在');
    }

    return result;
  }

  /**
   * 检查版本一致性
   * @param version 要检查的版本号
   * @returns 验证结果
   */
  async checkVersionConsistency(version: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // 检查 CHANGELOG.md
    const changelogPath = path.join(this.projectRoot, 'CHANGELOG.md');
    if (fileExists(changelogPath)) {
      const content = readFile(changelogPath);
      if (!content.includes(`## [${version}]`)) {
        result.warnings.push(`CHANGELOG.md 中未找到版本 ${version} 的条目`);
      }
    }

    return result;
  }

  /**
   * 执行发布前检查清单
   * @returns 验证结果
   */
  async runPreReleaseChecklist(): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    const checklist: ChecklistItem[] = [];

    // 检查 lint
    try {
      execSync('pnpm run lint');
      checklist.push({
        name: 'ESLint 检查',
        passed: true,
        required: true,
      });
    } catch (error) {
      checklist.push({
        name: 'ESLint 检查',
        passed: false,
        message: 'ESLint 检查失败',
        required: true,
      });
      result.success = false;
      result.errors.push('ESLint 检查失败');
    }

    // 检查格式
    try {
      execSync('pnpm run format:check');
      checklist.push({
        name: '代码格式检查',
        passed: true,
        required: true,
      });
    } catch (error) {
      checklist.push({
        name: '代码格式检查',
        passed: false,
        message: '代码格式不符合规范',
        required: true,
      });
      result.success = false;
      result.errors.push('代码格式检查失败');
    }

    // 检查编译
    try {
      execSync('pnpm run compile');
      checklist.push({
        name: 'TypeScript 编译',
        passed: true,
        required: true,
      });
    } catch (error) {
      checklist.push({
        name: 'TypeScript 编译',
        passed: false,
        message: 'TypeScript 编译失败',
        required: true,
      });
      result.success = false;
      result.errors.push('TypeScript 编译失败');
    }

    // 检查测试
    try {
      execSync('pnpm test');
      checklist.push({
        name: '单元测试',
        passed: true,
        required: true,
      });
    } catch (error) {
      checklist.push({
        name: '单元测试',
        passed: false,
        message: '单元测试失败',
        required: true,
      });
      result.success = false;
      result.errors.push('单元测试失败');
    }

    return result;
  }
}
