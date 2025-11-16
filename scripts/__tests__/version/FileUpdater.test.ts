/**
 * FileUpdater 单元测试
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileUpdater } from '../../version/FileUpdater';
import { FileUpdateError, ChangelogEmptyError, FileNotFoundError } from '../../version/errors';

// Mock fs 模块
jest.mock('fs');

describe('FileUpdater', () => {
  let fileUpdater: FileUpdater;
  const mockProjectRoot = '/mock/project';

  beforeEach(() => {
    fileUpdater = new FileUpdater();
    jest.clearAllMocks();

    // Mock getProjectRoot
    jest.spyOn(require('../../version/utils'), 'getProjectRoot').mockReturnValue(mockProjectRoot);
  });

  describe('updatePackageJson', () => {
    const packagePath = path.join(mockProjectRoot, 'package.json');
    const mockPackageJson = {
      name: 'test-package',
      version: '1.2.0',
      description: 'Test package',
    };

    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson, null, 2));
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    });

    it('应该正确更新 package.json 中的版本号', async () => {
      await fileUpdater.updatePackageJson('1.3.0');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        packagePath,
        expect.stringContaining('"version": "1.3.0"'),
        'utf-8'
      );
    });

    it('应该在更新前创建备份', async () => {
      await fileUpdater.updatePackageJson('1.3.0');

      expect(fs.copyFileSync).toHaveBeenCalledWith(packagePath, packagePath + '.backup');
    });

    it('应该保持 JSON 格式（2 空格缩进）', async () => {
      await fileUpdater.updatePackageJson('1.3.0');

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      const writtenContent = writeCall[1];

      // 验证格式正确
      expect(writtenContent).toContain('  "name"');
      expect(writtenContent).toContain('  "version"');
    });

    it('应该在更新失败时恢复备份', async () => {
      (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Write failed');
      });

      await expect(fileUpdater.updatePackageJson('1.3.0')).rejects.toThrow(FileUpdateError);

      expect(fs.copyFileSync).toHaveBeenCalledWith(packagePath + '.backup', packagePath);
    });
  });

  describe('updateChangelog', () => {
    const changelogPath = path.join(mockProjectRoot, 'CHANGELOG.md');
    const mockChangelog = `# Changelog

## [Unreleased]

### Added
- New feature

---

## [1.2.0] - 2023-11-15

### Fixed
- Bug fix
`;

    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockChangelog);
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    });

    it('应该正确插入新版本条目', async () => {
      const changes = '### Added\n- New feature';
      await fileUpdater.updateChangelog('1.3.0', '2023-11-16', changes);

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      const writtenContent = writeCall[1];

      expect(writtenContent).toContain('## [Unreleased]');
      expect(writtenContent).toContain('## [1.3.0] - 2023-11-16');
      expect(writtenContent).toContain(changes);
    });

    it('应该在 Unreleased 后插入新版本', async () => {
      const changes = '### Added\n- New feature';
      await fileUpdater.updateChangelog('1.3.0', '2023-11-16', changes);

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      const writtenContent = writeCall[1];

      const unreleasedIndex = writtenContent.indexOf('## [Unreleased]');
      const newVersionIndex = writtenContent.indexOf('## [1.3.0]');

      expect(newVersionIndex).toBeGreaterThan(unreleasedIndex);
    });

    it('应该在文件不存在时抛出错误', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(fileUpdater.updateChangelog('1.3.0', '2023-11-16', 'changes')).rejects.toThrow(
        FileNotFoundError
      );
    });

    it('应该在更新失败时恢复备份', async () => {
      (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Write failed');
      });

      await expect(fileUpdater.updateChangelog('1.3.0', '2023-11-16', 'changes')).rejects.toThrow(
        FileUpdateError
      );

      expect(fs.copyFileSync).toHaveBeenCalledWith(changelogPath + '.backup', changelogPath);
    });
  });

  describe('extractUnreleasedChanges', () => {
    const changelogPath = path.join(mockProjectRoot, 'CHANGELOG.md');

    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
    });

    it('应该正确提取 Unreleased 内容', async () => {
      const mockChangelog = `# Changelog

## [Unreleased]

### Added
- New feature
- Another feature

### Fixed
- Bug fix

---

## [1.2.0] - 2023-11-15
`;
      (fs.readFileSync as jest.Mock).mockReturnValue(mockChangelog);

      const result = await fileUpdater.extractUnreleasedChanges();

      expect(result).toContain('### Added');
      expect(result).toContain('- New feature');
      expect(result).toContain('### Fixed');
      expect(result).toContain('- Bug fix');
    });

    it('应该在 Unreleased 为空时抛出错误', async () => {
      const mockChangelog = `# Changelog

## [Unreleased]

---

## [1.2.0] - 2023-11-15
`;
      (fs.readFileSync as jest.Mock).mockReturnValue(mockChangelog);

      await expect(fileUpdater.extractUnreleasedChanges()).rejects.toThrow(ChangelogEmptyError);
    });

    it('应该在文件不存在时抛出错误', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(fileUpdater.extractUnreleasedChanges()).rejects.toThrow(FileNotFoundError);
    });
  });

  describe('updateDocVersions', () => {
    const readmePath = path.join(mockProjectRoot, 'README.md');
    const mockReadme = `# Test Project

Version: 1.2.0
Current version is v1.2.0
版本 1.2.0
`;

    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockReadme);
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    });

    it('应该更新所有版本引用', async () => {
      await fileUpdater.updateDocVersions('1.2.0', '1.3.0', ['README.md']);

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      const writtenContent = writeCall[1];

      expect(writtenContent).toContain('Version: 1.3.0');
      expect(writtenContent).toContain('v1.3.0');
      expect(writtenContent).toContain('版本 1.3.0');
      expect(writtenContent).not.toContain('1.2.0');
    });

    it('应该跳过不存在的文件', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(
        fileUpdater.updateDocVersions('1.2.0', '1.3.0', ['NONEXISTENT.md'])
      ).resolves.not.toThrow();
    });

    it('应该在更新失败时恢复备份', async () => {
      (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Write failed');
      });

      await expect(fileUpdater.updateDocVersions('1.2.0', '1.3.0', ['README.md'])).rejects.toThrow(
        FileUpdateError
      );

      expect(fs.copyFileSync).toHaveBeenCalledWith(readmePath + '.backup', readmePath);
    });
  });

  describe('备份管理', () => {
    const testFile = path.join(mockProjectRoot, 'test.txt');
    const backupFile = testFile + '.backup';

    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    });

    it('应该删除单个备份文件', () => {
      fileUpdater.deleteBackup(testFile);

      expect(fs.unlinkSync).toHaveBeenCalledWith(backupFile);
    });

    it('应该删除所有备份文件', () => {
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];

      fileUpdater.deleteAllBackups(files);

      expect(fs.unlinkSync).toHaveBeenCalledTimes(3);
      files.forEach((file) => {
        expect(fs.unlinkSync).toHaveBeenCalledWith(path.join(mockProjectRoot, file) + '.backup');
      });
    });
  });
});
