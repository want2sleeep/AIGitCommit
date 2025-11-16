/**
 * GitOperator 单元测试
 */

import { GitOperator } from '../../version/GitOperator';
import { GitOperationError, DirtyWorkingTreeError, VersionExistsError } from '../../version/errors';
import * as utils from '../../version/utils';

// Mock utils 模块
jest.mock('../../version/utils');

describe('GitOperator', () => {
  let gitOperator: GitOperator;
  const mockExecSync = utils.execSync as jest.MockedFunction<typeof utils.execSync>;

  beforeEach(() => {
    gitOperator = new GitOperator();
    jest.clearAllMocks();
  });

  describe('isWorkingTreeClean', () => {
    it('应该在工作区干净时返回 true', async () => {
      mockExecSync.mockReturnValue('');

      const result = await gitOperator.isWorkingTreeClean();

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git status --porcelain');
    });

    it('应该在工作区不干净时返回 false', async () => {
      mockExecSync.mockReturnValue(' M file.txt\n?? newfile.txt');

      const result = await gitOperator.isWorkingTreeClean();

      expect(result).toBe(false);
    });

    it('应该在 Git 命令失败时抛出错误', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      await expect(gitOperator.isWorkingTreeClean()).rejects.toThrow(GitOperationError);
    });
  });

  describe('tagExists', () => {
    it('应该在标签存在时返回 true', async () => {
      mockExecSync.mockReturnValue('v1.0.0\nv1.1.0\nv1.2.0');

      const result = await gitOperator.tagExists('v1.1.0');

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git tag --list');
    });

    it('应该在标签不存在时返回 false', async () => {
      mockExecSync.mockReturnValue('v1.0.0\nv1.1.0');

      const result = await gitOperator.tagExists('v1.2.0');

      expect(result).toBe(false);
    });

    it('应该在没有标签时返回 false', async () => {
      mockExecSync.mockReturnValue('');

      const result = await gitOperator.tagExists('v1.0.0');

      expect(result).toBe(false);
    });

    it('应该在 Git 命令失败时抛出错误', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      await expect(gitOperator.tagExists('v1.0.0')).rejects.toThrow(GitOperationError);
    });
  });

  describe('createTag', () => {
    it('应该成功创建标签', async () => {
      mockExecSync
        .mockReturnValueOnce('') // tagExists check
        .mockReturnValueOnce(''); // create tag

      await gitOperator.createTag('1.2.0', 'Release 1.2.0');

      expect(mockExecSync).toHaveBeenCalledWith('git tag --list');
      expect(mockExecSync).toHaveBeenCalledWith('git tag -a v1.2.0 -m "Release 1.2.0"');
    });

    it('应该在标签已存在时抛出错误', async () => {
      mockExecSync.mockReturnValue('v1.2.0');

      await expect(gitOperator.createTag('1.2.0', 'Release 1.2.0')).rejects.toThrow(
        VersionExistsError
      );
    });

    it('应该在创建失败时抛出错误', async () => {
      mockExecSync
        .mockReturnValueOnce('') // tagExists check
        .mockImplementationOnce(() => {
          throw new Error('Git command failed');
        });

      await expect(gitOperator.createTag('1.2.0', 'Release 1.2.0')).rejects.toThrow(
        GitOperationError
      );
    });
  });

  describe('pushTag', () => {
    it('应该成功推送标签', async () => {
      mockExecSync.mockReturnValue('');

      await gitOperator.pushTag('v1.2.0');

      expect(mockExecSync).toHaveBeenCalledWith('git push origin v1.2.0');
    });

    it('应该在推送失败时抛出错误', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      await expect(gitOperator.pushTag('v1.2.0')).rejects.toThrow(GitOperationError);
    });
  });

  describe('deleteLocalTag', () => {
    it('应该成功删除存在的标签', async () => {
      mockExecSync
        .mockReturnValueOnce('v1.2.0') // tagExists check
        .mockReturnValueOnce(''); // delete tag

      await gitOperator.deleteLocalTag('v1.2.0');

      expect(mockExecSync).toHaveBeenCalledWith('git tag -d v1.2.0');
    });

    it('应该在标签不存在时不执行删除', async () => {
      mockExecSync.mockReturnValue(''); // tagExists returns false

      await gitOperator.deleteLocalTag('v1.2.0');

      expect(mockExecSync).toHaveBeenCalledTimes(1); // Only tagExists check
      expect(mockExecSync).not.toHaveBeenCalledWith('git tag -d v1.2.0');
    });

    it('应该在删除失败时抛出错误', async () => {
      mockExecSync
        .mockReturnValueOnce('v1.2.0') // tagExists check
        .mockImplementationOnce(() => {
          throw new Error('Git command failed');
        });

      await expect(gitOperator.deleteLocalTag('v1.2.0')).rejects.toThrow(GitOperationError);
    });
  });

  describe('commit', () => {
    it('应该成功提交变更', async () => {
      mockExecSync.mockReturnValue('');

      await gitOperator.commit('chore: update version', ['package.json', 'CHANGELOG.md']);

      expect(mockExecSync).toHaveBeenCalledWith('git add package.json');
      expect(mockExecSync).toHaveBeenCalledWith('git add CHANGELOG.md');
      expect(mockExecSync).toHaveBeenCalledWith('git commit -m "chore: update version"');
    });

    it('应该在提交失败时抛出错误', async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.startsWith('git commit')) {
          throw new Error('Git command failed');
        }
        return '';
      });

      await expect(gitOperator.commit('chore: update version', ['package.json'])).rejects.toThrow(
        GitOperationError
      );
    });
  });

  describe('ensureCleanWorkingTree', () => {
    it('应该在工作区干净时不抛出错误', async () => {
      mockExecSync.mockReturnValue('');

      await expect(gitOperator.ensureCleanWorkingTree()).resolves.not.toThrow();
    });

    it('应该在工作区不干净时抛出错误', async () => {
      mockExecSync.mockReturnValue(' M file.txt');

      await expect(gitOperator.ensureCleanWorkingTree()).rejects.toThrow(DirtyWorkingTreeError);
    });
  });

  describe('getCurrentBranch', () => {
    it('应该返回当前分支名', async () => {
      mockExecSync.mockReturnValue('main');

      const result = await gitOperator.getCurrentBranch();

      expect(result).toBe('main');
      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse --abbrev-ref HEAD');
    });

    it('应该在获取失败时抛出错误', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      await expect(gitOperator.getCurrentBranch()).rejects.toThrow(GitOperationError);
    });
  });

  describe('getLatestTag', () => {
    it('应该返回最新标签', async () => {
      mockExecSync.mockReturnValue('v1.2.0');

      const result = await gitOperator.getLatestTag();

      expect(result).toBe('v1.2.0');
      expect(mockExecSync).toHaveBeenCalledWith('git describe --tags --abbrev=0');
    });

    it('应该在没有标签时返回 null', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('No tags found');
      });

      const result = await gitOperator.getLatestTag();

      expect(result).toBeNull();
    });
  });

  describe('pushCommits', () => {
    it('应该成功推送提交', async () => {
      mockExecSync
        .mockReturnValueOnce('main') // getCurrentBranch
        .mockReturnValueOnce(''); // push

      await gitOperator.pushCommits();

      expect(mockExecSync).toHaveBeenCalledWith('git push origin main');
    });

    it('应该在推送失败时抛出错误', async () => {
      mockExecSync
        .mockReturnValueOnce('main') // getCurrentBranch
        .mockImplementationOnce(() => {
          throw new Error('Git command failed');
        });

      await expect(gitOperator.pushCommits()).rejects.toThrow(GitOperationError);
    });
  });

  describe('isGitRepository', () => {
    it('应该在 Git 仓库中返回 true', async () => {
      mockExecSync.mockReturnValue('.git');

      const result = await gitOperator.isGitRepository();

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse --git-dir');
    });

    it('应该在非 Git 仓库中返回 false', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const result = await gitOperator.isGitRepository();

      expect(result).toBe(false);
    });
  });
});
