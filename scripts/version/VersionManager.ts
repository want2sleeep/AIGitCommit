/**
 * 版本管理器
 * 负责版本号的解析、验证和计算
 */

import { SemanticVersion, VersionType } from './types';
import { InvalidVersionError } from './errors';

/**
 * 版本管理器类
 */
export class VersionManager {
  /**
   * 版本号正则表达式
   * 格式: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
   */
  private static readonly VERSION_REGEX =
    /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;

  /**
   * 解析版本号字符串
   * @param version 版本号字符串（如 "1.2.0" 或 "1.2.0-beta.1+20231115"）
   * @returns 解析后的版本对象
   * @throws {InvalidVersionError} 如果版本号格式无效
   */
  parseVersion(version: string): SemanticVersion {
    const match = version.match(VersionManager.VERSION_REGEX);

    if (!match) {
      throw new InvalidVersionError(version);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
      build: match[5],
    };
  }

  /**
   * 验证版本号格式
   * @param version 版本号字符串
   * @returns 是否有效
   */
  isValidVersion(version: string): boolean {
    return VersionManager.VERSION_REGEX.test(version);
  }

  /**
   * 计算下一个版本号
   * @param current 当前版本号
   * @param type 版本类型（major/minor/patch）
   * @returns 新版本号
   * @throws {InvalidVersionError} 如果当前版本号格式无效
   */
  bumpVersion(current: string, type: VersionType): string {
    const parsed = this.parseVersion(current);

    switch (type) {
      case 'major':
        return `${parsed.major + 1}.0.0`;
      case 'minor':
        return `${parsed.major}.${parsed.minor + 1}.0`;
      case 'patch':
        return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
      default:
        throw new Error(`未知的版本类型: ${type}`);
    }
  }

  /**
   * 比较两个版本号
   * @param v1 版本1
   * @param v2 版本2
   * @returns -1: v1<v2, 0: v1=v2, 1: v1>v2
   * @throws {InvalidVersionError} 如果任一版本号格式无效
   */
  compareVersions(v1: string, v2: string): number {
    const parsed1 = this.parseVersion(v1);
    const parsed2 = this.parseVersion(v2);

    // 比较主版本号
    if (parsed1.major !== parsed2.major) {
      return parsed1.major > parsed2.major ? 1 : -1;
    }

    // 比较次版本号
    if (parsed1.minor !== parsed2.minor) {
      return parsed1.minor > parsed2.minor ? 1 : -1;
    }

    // 比较修订号
    if (parsed1.patch !== parsed2.patch) {
      return parsed1.patch > parsed2.patch ? 1 : -1;
    }

    // 比较预发布版本
    if (parsed1.prerelease !== parsed2.prerelease) {
      // 没有预发布版本的版本号大于有预发布版本的版本号
      if (!parsed1.prerelease) {
        return 1;
      }
      if (!parsed2.prerelease) {
        return -1;
      }
      // 字符串比较预发布版本
      return parsed1.prerelease > parsed2.prerelease ? 1 : -1;
    }

    // 版本号相同
    return 0;
  }

  /**
   * 格式化版本对象为字符串
   * @param version 版本对象
   * @returns 版本号字符串
   */
  formatVersion(version: SemanticVersion): string {
    let result = `${version.major}.${version.minor}.${version.patch}`;

    if (version.prerelease) {
      result += `-${version.prerelease}`;
    }

    if (version.build) {
      result += `+${version.build}`;
    }

    return result;
  }

  /**
   * 检查版本号是否为预发布版本
   * @param version 版本号字符串
   * @returns 是否为预发布版本
   */
  isPrerelease(version: string): boolean {
    const parsed = this.parseVersion(version);
    return !!parsed.prerelease;
  }

  /**
   * 获取版本号的主要部分（不包含预发布和构建元数据）
   * @param version 版本号字符串
   * @returns 主要版本号（X.Y.Z）
   */
  getMainVersion(version: string): string {
    const parsed = this.parseVersion(version);
    return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  }
}
