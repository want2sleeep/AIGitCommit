/**
 * VersionManager 单元测试
 */

import { VersionManager } from '../../version/VersionManager';
import { InvalidVersionError } from '../../version/errors';

describe('VersionManager', () => {
  let versionManager: VersionManager;

  beforeEach(() => {
    versionManager = new VersionManager();
  });

  describe('parseVersion', () => {
    it('应该正确解析标准版本号', () => {
      const result = versionManager.parseVersion('1.2.3');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: undefined,
      });
    });

    it('应该正确解析带预发布版本的版本号', () => {
      const result = versionManager.parseVersion('1.2.3-beta.1');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'beta.1',
        build: undefined,
      });
    });

    it('应该正确解析带构建元数据的版本号', () => {
      const result = versionManager.parseVersion('1.2.3+20231115');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: '20231115',
      });
    });

    it('应该正确解析完整的版本号', () => {
      const result = versionManager.parseVersion('1.2.3-beta.1+20231115');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'beta.1',
        build: '20231115',
      });
    });

    it('应该在版本号格式无效时抛出错误', () => {
      expect(() => versionManager.parseVersion('1.2')).toThrow(InvalidVersionError);
      expect(() => versionManager.parseVersion('v1.2.3')).toThrow(InvalidVersionError);
      expect(() => versionManager.parseVersion('1.2.3.4')).toThrow(InvalidVersionError);
      expect(() => versionManager.parseVersion('invalid')).toThrow(InvalidVersionError);
    });
  });

  describe('isValidVersion', () => {
    it('应该验证有效的版本号', () => {
      expect(versionManager.isValidVersion('1.2.3')).toBe(true);
      expect(versionManager.isValidVersion('0.0.1')).toBe(true);
      expect(versionManager.isValidVersion('10.20.30')).toBe(true);
      expect(versionManager.isValidVersion('1.2.3-beta.1')).toBe(true);
      expect(versionManager.isValidVersion('1.2.3+20231115')).toBe(true);
      expect(versionManager.isValidVersion('1.2.3-beta.1+20231115')).toBe(true);
    });

    it('应该拒绝无效的版本号', () => {
      expect(versionManager.isValidVersion('1.2')).toBe(false);
      expect(versionManager.isValidVersion('v1.2.3')).toBe(false);
      expect(versionManager.isValidVersion('1.2.3.4')).toBe(false);
      expect(versionManager.isValidVersion('invalid')).toBe(false);
      expect(versionManager.isValidVersion('')).toBe(false);
    });
  });

  describe('bumpVersion', () => {
    it('应该正确增加主版本号', () => {
      expect(versionManager.bumpVersion('1.2.3', 'major')).toBe('2.0.0');
      expect(versionManager.bumpVersion('0.1.0', 'major')).toBe('1.0.0');
      expect(versionManager.bumpVersion('9.9.9', 'major')).toBe('10.0.0');
    });

    it('应该正确增加次版本号', () => {
      expect(versionManager.bumpVersion('1.2.3', 'minor')).toBe('1.3.0');
      expect(versionManager.bumpVersion('1.0.0', 'minor')).toBe('1.1.0');
      expect(versionManager.bumpVersion('1.9.9', 'minor')).toBe('1.10.0');
    });

    it('应该正确增加修订号', () => {
      expect(versionManager.bumpVersion('1.2.3', 'patch')).toBe('1.2.4');
      expect(versionManager.bumpVersion('1.2.0', 'patch')).toBe('1.2.1');
      expect(versionManager.bumpVersion('1.2.9', 'patch')).toBe('1.2.10');
    });

    it('应该忽略预发布版本和构建元数据', () => {
      expect(versionManager.bumpVersion('1.2.3-beta.1', 'patch')).toBe('1.2.4');
      expect(versionManager.bumpVersion('1.2.3+20231115', 'minor')).toBe('1.3.0');
      expect(versionManager.bumpVersion('1.2.3-beta.1+20231115', 'major')).toBe('2.0.0');
    });

    it('应该在版本号无效时抛出错误', () => {
      expect(() => versionManager.bumpVersion('invalid', 'patch')).toThrow(InvalidVersionError);
    });
  });

  describe('compareVersions', () => {
    it('应该正确比较主版本号', () => {
      expect(versionManager.compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(versionManager.compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(versionManager.compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('应该正确比较次版本号', () => {
      expect(versionManager.compareVersions('1.2.0', '1.1.0')).toBe(1);
      expect(versionManager.compareVersions('1.1.0', '1.2.0')).toBe(-1);
      expect(versionManager.compareVersions('1.1.0', '1.1.0')).toBe(0);
    });

    it('应该正确比较修订号', () => {
      expect(versionManager.compareVersions('1.2.3', '1.2.2')).toBe(1);
      expect(versionManager.compareVersions('1.2.2', '1.2.3')).toBe(-1);
      expect(versionManager.compareVersions('1.2.3', '1.2.3')).toBe(0);
    });

    it('应该正确比较预发布版本', () => {
      expect(versionManager.compareVersions('1.2.3', '1.2.3-beta.1')).toBe(1);
      expect(versionManager.compareVersions('1.2.3-beta.1', '1.2.3')).toBe(-1);
      expect(versionManager.compareVersions('1.2.3-beta.2', '1.2.3-beta.1')).toBe(1);
      expect(versionManager.compareVersions('1.2.3-beta.1', '1.2.3-beta.2')).toBe(-1);
    });

    it('应该忽略构建元数据', () => {
      expect(versionManager.compareVersions('1.2.3+build1', '1.2.3+build2')).toBe(0);
      expect(versionManager.compareVersions('1.2.3+build1', '1.2.3')).toBe(0);
    });

    it('应该在版本号无效时抛出错误', () => {
      expect(() => versionManager.compareVersions('invalid', '1.2.3')).toThrow(InvalidVersionError);
      expect(() => versionManager.compareVersions('1.2.3', 'invalid')).toThrow(InvalidVersionError);
    });
  });

  describe('formatVersion', () => {
    it('应该正确格式化标准版本', () => {
      const version = { major: 1, minor: 2, patch: 3 };
      expect(versionManager.formatVersion(version)).toBe('1.2.3');
    });

    it('应该正确格式化带预发布版本的版本', () => {
      const version = { major: 1, minor: 2, patch: 3, prerelease: 'beta.1' };
      expect(versionManager.formatVersion(version)).toBe('1.2.3-beta.1');
    });

    it('应该正确格式化带构建元数据的版本', () => {
      const version = { major: 1, minor: 2, patch: 3, build: '20231115' };
      expect(versionManager.formatVersion(version)).toBe('1.2.3+20231115');
    });

    it('应该正确格式化完整版本', () => {
      const version = {
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'beta.1',
        build: '20231115',
      };
      expect(versionManager.formatVersion(version)).toBe('1.2.3-beta.1+20231115');
    });
  });

  describe('isPrerelease', () => {
    it('应该正确识别预发布版本', () => {
      expect(versionManager.isPrerelease('1.2.3-beta.1')).toBe(true);
      expect(versionManager.isPrerelease('1.2.3-alpha')).toBe(true);
      expect(versionManager.isPrerelease('1.2.3-rc.1')).toBe(true);
    });

    it('应该正确识别非预发布版本', () => {
      expect(versionManager.isPrerelease('1.2.3')).toBe(false);
      expect(versionManager.isPrerelease('1.2.3+20231115')).toBe(false);
    });
  });

  describe('getMainVersion', () => {
    it('应该返回主要版本号', () => {
      expect(versionManager.getMainVersion('1.2.3')).toBe('1.2.3');
      expect(versionManager.getMainVersion('1.2.3-beta.1')).toBe('1.2.3');
      expect(versionManager.getMainVersion('1.2.3+20231115')).toBe('1.2.3');
      expect(versionManager.getMainVersion('1.2.3-beta.1+20231115')).toBe('1.2.3');
    });
  });
});
