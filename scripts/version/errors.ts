/**
 * 版本更新系统的错误类定义
 */

/**
 * 版本错误码枚举
 */
export enum VersionErrorCode {
  /** 无效的版本号格式 */
  INVALID_VERSION = 'INVALID_VERSION',
  /** 版本已存在 */
  VERSION_EXISTS = 'VERSION_EXISTS',
  /** 工作区不干净 */
  DIRTY_WORKING_TREE = 'DIRTY_WORKING_TREE',
  /** 验证失败 */
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  /** Git 操作失败 */
  GIT_OPERATION_FAILED = 'GIT_OPERATION_FAILED',
  /** 文件更新失败 */
  FILE_UPDATE_FAILED = 'FILE_UPDATE_FAILED',
  /** CHANGELOG 为空 */
  CHANGELOG_EMPTY = 'CHANGELOG_EMPTY',
  /** 配置错误 */
  CONFIG_ERROR = 'CONFIG_ERROR',
  /** 文件不存在 */
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
}

/**
 * 版本错误基类
 */
export class VersionError extends Error {
  /**
   * 创建版本错误
   * @param message 错误消息
   * @param code 错误码
   */
  constructor(
    message: string,
    public code: VersionErrorCode
  ) {
    super(message);
    this.name = 'VersionError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 无效版本错误
 */
export class InvalidVersionError extends VersionError {
  constructor(version: string) {
    super(
      `无效的版本号格式: ${version}。期望格式: X.Y.Z 或 X.Y.Z-prerelease+build`,
      VersionErrorCode.INVALID_VERSION
    );
    this.name = 'InvalidVersionError';
  }
}

/**
 * 版本已存在错误
 */
export class VersionExistsError extends VersionError {
  constructor(version: string) {
    super(
      `版本 ${version} 已存在。请使用不同的版本号或删除现有标签。`,
      VersionErrorCode.VERSION_EXISTS
    );
    this.name = 'VersionExistsError';
  }
}

/**
 * 工作区不干净错误
 */
export class DirtyWorkingTreeError extends VersionError {
  constructor() {
    super('工作区包含未提交的变更。请先提交或暂存所有变更。', VersionErrorCode.DIRTY_WORKING_TREE);
    this.name = 'DirtyWorkingTreeError';
  }
}

/**
 * 验证失败错误
 */
export class ValidationFailedError extends VersionError {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message, VersionErrorCode.VALIDATION_FAILED);
    this.name = 'ValidationFailedError';
  }
}

/**
 * Git 操作失败错误
 */
export class GitOperationError extends VersionError {
  constructor(
    operation: string,
    public originalError: Error
  ) {
    super(
      `Git 操作失败: ${operation}。错误: ${originalError.message}`,
      VersionErrorCode.GIT_OPERATION_FAILED
    );
    this.name = 'GitOperationError';
  }
}

/**
 * 文件更新失败错误
 */
export class FileUpdateError extends VersionError {
  constructor(
    file: string,
    public originalError: Error
  ) {
    super(
      `文件更新失败: ${file}。错误: ${originalError.message}`,
      VersionErrorCode.FILE_UPDATE_FAILED
    );
    this.name = 'FileUpdateError';
  }
}

/**
 * CHANGELOG 为空错误
 */
export class ChangelogEmptyError extends VersionError {
  constructor() {
    super(
      'CHANGELOG.md 的 [Unreleased] 部分为空。请先添加变更内容。',
      VersionErrorCode.CHANGELOG_EMPTY
    );
    this.name = 'ChangelogEmptyError';
  }
}

/**
 * 配置错误
 */
export class ConfigError extends VersionError {
  constructor(message: string) {
    super(`配置错误: ${message}`, VersionErrorCode.CONFIG_ERROR);
    this.name = 'ConfigError';
  }
}

/**
 * 文件不存在错误
 */
export class FileNotFoundError extends VersionError {
  constructor(file: string) {
    super(`文件不存在: ${file}`, VersionErrorCode.FILE_NOT_FOUND);
    this.name = 'FileNotFoundError';
  }
}
