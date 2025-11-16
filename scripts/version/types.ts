/**
 * 版本更新系统的类型定义
 */

/**
 * 语义化版本对象
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/**
 * 版本类型
 */
export type VersionType = 'major' | 'minor' | 'patch';

/**
 * 版本信息
 */
export interface VersionInfo {
  /** 当前版本号 */
  current: string;
  /** 下一个版本号 */
  next: string;
  /** 版本类型 */
  type: VersionType;
  /** 发布日期（YYYY-MM-DD） */
  date: string;
  /** 变更内容 */
  changes: string;
  /** Git 标签名（vX.Y.Z） */
  tag: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 验证是否成功 */
  success: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 建议列表 */
  suggestions: string[];
}

/**
 * 检查清单项
 */
export interface ChecklistItem {
  /** 检查项名称 */
  name: string;
  /** 是否通过 */
  passed: boolean;
  /** 详细消息 */
  message?: string;
  /** 是否必需 */
  required: boolean;
}

/**
 * 版本更新配置
 */
export interface VersionConfig {
  /** 文件配置 */
  files: {
    /** 版本文件列表 */
    version: string[];
    /** CHANGELOG 文件路径 */
    changelog: string;
    /** 文档文件列表 */
    docs: string[];
  };
  /** Git 配置 */
  git: {
    /** 标签前缀 */
    tagPrefix: string;
    /** 提交消息模板 */
    commitMessage: string;
    /** 是否要求工作区干净 */
    requireCleanWorkingTree: boolean;
  };
  /** 验证配置 */
  validation: {
    /** Git 钩子验证 */
    gitHooks: {
      required: boolean;
      files: string[];
    };
    /** CI/CD 验证 */
    cicd: {
      required: boolean;
      files: string[];
    };
    /** 发布前检查 */
    preRelease: {
      runTests: boolean;
      runLint: boolean;
      runFormat: boolean;
      runCompile: boolean;
      checkCoverage: boolean;
      coverageThreshold: number;
    };
  };
  /** CHANGELOG 配置 */
  changelog: {
    /** Unreleased 部分标题 */
    unreleasedSection: string;
    /** 日期格式 */
    dateFormat: string;
    /** 变更类型部分 */
    sections: string[];
  };
}
