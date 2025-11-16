/**
 * 配置管理
 */

import * as path from 'path';
import { VersionConfig } from './types';
import { fileExists, parseJsonFile } from './utils';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: VersionConfig = {
  files: {
    version: ['package.json'],
    changelog: 'CHANGELOG.md',
    docs: ['README.md', 'MARKETPLACE.md'],
  },
  git: {
    tagPrefix: 'v',
    commitMessage: 'chore(release): bump version to {{version}}',
    requireCleanWorkingTree: true,
  },
  validation: {
    gitHooks: {
      required: true,
      files: ['.husky/pre-commit'],
    },
    cicd: {
      required: true,
      files: ['.github/workflows/publish.yml', '.github/workflows/ci.yml'],
    },
    preRelease: {
      runTests: true,
      runLint: true,
      runFormat: true,
      runCompile: true,
      checkCoverage: true,
      coverageThreshold: 70,
    },
  },
  changelog: {
    unreleasedSection: '## [Unreleased]',
    dateFormat: 'YYYY-MM-DD',
    sections: [
      '✨ 新增功能',
      '🐛 Bug 修复',
      '🔧 代码质量改进',
      '📚 文档',
      '🔄 Breaking Changes',
      '📦 依赖更新',
      '⚡ 性能优化',
    ],
  },
};

/**
 * 加载配置
 * @param projectRoot 项目根目录
 * @returns 配置对象
 */
export function loadConfig(projectRoot: string): VersionConfig {
  const configPath = path.join(projectRoot, '.versionrc.json');

  if (fileExists(configPath)) {
    const userConfig = parseJsonFile<Partial<VersionConfig>>(configPath);
    return mergeConfig(DEFAULT_CONFIG, userConfig);
  }

  return DEFAULT_CONFIG;
}

/**
 * 合并配置
 * @param defaultConfig 默认配置
 * @param userConfig 用户配置
 * @returns 合并后的配置
 */
function mergeConfig(
  defaultConfig: VersionConfig,
  userConfig: Partial<VersionConfig>
): VersionConfig {
  return {
    files: { ...defaultConfig.files, ...userConfig.files },
    git: { ...defaultConfig.git, ...userConfig.git },
    validation: {
      gitHooks: {
        ...defaultConfig.validation.gitHooks,
        ...userConfig.validation?.gitHooks,
      },
      cicd: {
        ...defaultConfig.validation.cicd,
        ...userConfig.validation?.cicd,
      },
      preRelease: {
        ...defaultConfig.validation.preRelease,
        ...userConfig.validation?.preRelease,
      },
    },
    changelog: { ...defaultConfig.changelog, ...userConfig.changelog },
  };
}
