import * as vscode from 'vscode';
import { GitService } from '../GitService';
import { ChangeStatus } from '../../types';
import { GitOperationError } from '../../errors';

describe('GitService', () => {
  let gitService: GitService;
  let mockGitExtension: any;
  let mockGitApi: any;
  let mockRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock repository state
    mockRepository = {
      rootUri: {
        fsPath: '/test/repo',
        path: '/test/repo',
      },
      state: {
        indexChanges: [],
      },
      show: jest.fn(),
      commit: jest.fn(),
    };

    // Mock Git API
    mockGitApi = {
      repositories: [mockRepository],
    };

    // Mock Git extension
    mockGitExtension = {
      isActive: true,
      exports: {
        getAPI: jest.fn().mockReturnValue(mockGitApi),
      },
      activate: jest.fn().mockResolvedValue({
        getAPI: jest.fn().mockReturnValue(mockGitApi),
      }),
    };

    // Mock vscode.extensions.getExtension
    (vscode.extensions as any) = {
      getExtension: jest.fn().mockReturnValue(mockGitExtension),
    };

    // Mock vscode.workspace.fs
    (vscode.workspace as any).fs = {
      stat: jest.fn().mockResolvedValue({ size: 1024 }),
    };

    gitService = new GitService();
  });

  describe('isGitRepository', () => {
    it('should return true when Git repository exists', () => {
      const result = gitService.isGitRepository();
      expect(result).toBe(true);
    });

    it('should return false when no Git extension available', () => {
      (vscode.extensions as any).getExtension = jest.fn().mockReturnValue(undefined);
      const newGitService = new GitService();

      const result = newGitService.isGitRepository();
      expect(result).toBe(false);
    });

    it('should return false when no repositories available', () => {
      mockGitApi.repositories = [];

      const result = gitService.isGitRepository();
      expect(result).toBe(false);
    });
  });

  describe('getRepositoryRoot', () => {
    it('should return repository root path', () => {
      const result = gitService.getRepositoryRoot();
      expect(result).toBe('/test/repo');
    });

    it('should throw GitOperationError when not a Git repository', () => {
      mockGitApi.repositories = [];

      expect(() => gitService.getRepositoryRoot()).toThrow(GitOperationError);
      expect(() => gitService.getRepositoryRoot()).toThrow('当前工作区不是Git仓库');
    });
  });

  describe('getStagedChanges', () => {
    it('should throw GitOperationError when not a Git repository', async () => {
      mockGitApi.repositories = [];

      await expect(gitService.getStagedChanges()).rejects.toThrow(GitOperationError);
      await expect(gitService.getStagedChanges()).rejects.toThrow('当前工作区不是Git仓库');
    });

    it('should return empty array when no staged changes', async () => {
      mockRepository.state.indexChanges = [];

      const result = await gitService.getStagedChanges();
      expect(result).toEqual([]);
    });

    it('should return staged changes for modified file', async () => {
      const mockChange = {
        uri: {
          fsPath: '/test/repo/file.ts',
          path: '/test/repo/file.ts',
        },
        status: 0, // INDEX_MODIFIED
      };
      mockRepository.state.indexChanges = [mockChange];
      mockRepository.show.mockResolvedValueOnce('old content\n');
      mockRepository.show.mockResolvedValueOnce('new content\n');

      const result = await gitService.getStagedChanges();

      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe('/test/repo/file.ts');
      expect(result[0]?.status).toBe(ChangeStatus.Modified);
      expect(result[0]?.diff).toContain('-old content');
      expect(result[0]?.diff).toContain('+new content');
    });

    it('should return staged changes for added file', async () => {
      const mockChange = {
        uri: {
          fsPath: '/test/repo/newfile.ts',
          path: '/test/repo/newfile.ts',
        },
        status: 1, // INDEX_ADDED
      };
      mockRepository.state.indexChanges = [mockChange];
      mockRepository.show.mockRejectedValueOnce(new Error('Not found in HEAD'));
      mockRepository.show.mockResolvedValueOnce('new file content\n');

      const result = await gitService.getStagedChanges();

      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe('/test/repo/newfile.ts');
      expect(result[0]?.status).toBe(ChangeStatus.Added);
      expect(result[0]?.diff).toContain('+new file content');
      expect(result[0]?.diff).toContain('--- /dev/null');
    });

    it('should return staged changes for deleted file', async () => {
      const mockChange = {
        uri: {
          fsPath: '/test/repo/deleted.ts',
          path: '/test/repo/deleted.ts',
        },
        status: 2, // INDEX_DELETED
      };
      mockRepository.state.indexChanges = [mockChange];
      mockRepository.show.mockRejectedValueOnce(new Error('Not found in HEAD'));
      mockRepository.show.mockRejectedValueOnce(new Error('Not found in index'));
      mockRepository.show.mockResolvedValueOnce('deleted content\n');

      const result = await gitService.getStagedChanges();

      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe('/test/repo/deleted.ts');
      expect(result[0]?.status).toBe(ChangeStatus.Deleted);
      expect(result[0]?.diff).toContain('-deleted content');
      expect(result[0]?.diff).toContain('+++ /dev/null');
    });

    it('should handle binary files', async () => {
      const mockChange = {
        uri: {
          fsPath: '/test/repo/image.png',
          path: '/test/repo/image.png',
        },
        status: 1, // INDEX_ADDED
      };
      mockRepository.state.indexChanges = [mockChange];

      const result = await gitService.getStagedChanges();

      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe('/test/repo/image.png');
      expect(result[0]?.diff).toBe('[Binary file]');
      expect(result[0]?.additions).toBe(0);
      expect(result[0]?.deletions).toBe(0);
    });

    it('should handle large files', async () => {
      const mockChange = {
        uri: {
          fsPath: '/test/repo/large.ts',
          path: '/test/repo/large.ts',
        },
        status: 0, // INDEX_MODIFIED
      };
      mockRepository.state.indexChanges = [mockChange];
      (vscode.workspace.fs.stat as jest.Mock).mockResolvedValueOnce({ size: 200 * 1024 }); // 200KB

      const result = await gitService.getStagedChanges();

      expect(result).toHaveLength(1);
      expect(result[0]?.diff).toBe('[File too large]');
    });

    it('should simplify lock files', async () => {
      const mockChange = {
        uri: {
          fsPath: '/test/repo/package-lock.json',
          path: '/test/repo/package-lock.json',
        },
        status: 0, // INDEX_MODIFIED
      };
      mockRepository.state.indexChanges = [mockChange];

      const result = await gitService.getStagedChanges();

      expect(result).toHaveLength(1);
      expect(result[0]?.diff).toContain('自动生成文件，已省略详细diff');
    });
  });

  describe('hasStagedChanges', () => {
    it('should return true when there are staged changes', async () => {
      mockRepository.state.indexChanges = [
        {
          uri: { fsPath: '/test/repo/file.ts', path: '/test/repo/file.ts' },
          status: 0,
        },
      ];

      const result = await gitService.hasStagedChanges();
      expect(result).toBe(true);
    });

    it('should return false when no staged changes', async () => {
      mockRepository.state.indexChanges = [];

      const result = await gitService.hasStagedChanges();
      expect(result).toBe(false);
    });

    it('should return false when not a Git repository', async () => {
      mockGitApi.repositories = [];

      const result = await gitService.hasStagedChanges();
      expect(result).toBe(false);
    });
  });

  describe('commitWithMessage', () => {
    it('should commit with provided message', async () => {
      await gitService.commitWithMessage('test commit message');

      expect(mockRepository.commit).toHaveBeenCalledWith('test commit message');
    });

    it('should throw GitOperationError when not a Git repository', async () => {
      mockGitApi.repositories = [];

      await expect(gitService.commitWithMessage('test')).rejects.toThrow(GitOperationError);
      await expect(gitService.commitWithMessage('test')).rejects.toThrow('当前工作区不是Git仓库');
    });

    it('should throw GitOperationError when commit message is empty', async () => {
      await expect(gitService.commitWithMessage('')).rejects.toThrow(GitOperationError);
      await expect(gitService.commitWithMessage('')).rejects.toThrow('提交信息不能为空');
    });

    it('should throw GitOperationError when commit fails', async () => {
      mockRepository.commit.mockRejectedValue(new Error('Commit failed'));

      await expect(gitService.commitWithMessage('test')).rejects.toThrow(GitOperationError);
      await expect(gitService.commitWithMessage('test')).rejects.toThrow('提交失败');
    });

    it('should provide helpful error message for unconfigured git user', async () => {
      mockRepository.commit.mockRejectedValueOnce(new Error('user.name not configured'));

      await expect(gitService.commitWithMessage('test')).rejects.toThrow('请配置Git用户名和邮箱');
    });

    it('should provide helpful error message for no changes', async () => {
      mockRepository.commit.mockRejectedValueOnce(new Error('no changes added to commit'));

      await expect(gitService.commitWithMessage('test')).rejects.toThrow('暂存区没有变更可以提交');
    });

    it('should provide helpful error message for conflicts', async () => {
      mockRepository.commit.mockRejectedValueOnce(new Error('conflict detected'));

      await expect(gitService.commitWithMessage('test')).rejects.toThrow('存在未解决的冲突');
    });
  });

  describe('formatChanges', () => {
    it('should format empty changes', () => {
      const result = gitService.formatChanges([]);
      expect(result).toBe('没有暂存的变更');
    });

    it('should format single change', () => {
      const changes = [
        {
          path: '/test/file.ts',
          status: ChangeStatus.Modified,
          diff: '--- a/test/file.ts\n+++ b/test/file.ts\n-old line\n+new line',
          additions: 1,
          deletions: 1,
        },
      ];

      const result = gitService.formatChanges(changes);

      expect(result).toContain('共 1 个文件变更');
      expect(result).toContain('文件: /test/file.ts');
      expect(result).toContain('状态: 修改');
      expect(result).toContain('变更: +1 -1');
      expect(result).toContain('-old line');
      expect(result).toContain('+new line');
    });

    it('should format multiple changes', () => {
      const changes = [
        {
          path: '/test/file1.ts',
          status: ChangeStatus.Added,
          diff: '+new file',
          additions: 1,
          deletions: 0,
        },
        {
          path: '/test/file2.ts',
          status: ChangeStatus.Deleted,
          diff: '-deleted file',
          additions: 0,
          deletions: 1,
        },
      ];

      const result = gitService.formatChanges(changes);

      expect(result).toContain('共 2 个文件变更');
      expect(result).toContain('文件: /test/file1.ts');
      expect(result).toContain('状态: 新增');
      expect(result).toContain('文件: /test/file2.ts');
      expect(result).toContain('状态: 删除');
    });

    it('should omit diff when exceeding length limit', () => {
      const longDiff = 'a'.repeat(25000);
      const changes = [
        {
          path: '/test/file1.ts',
          status: ChangeStatus.Modified,
          diff: longDiff,
          additions: 100,
          deletions: 50,
        },
        {
          path: '/test/file2.ts',
          status: ChangeStatus.Modified,
          diff: 'short diff',
          additions: 1,
          deletions: 1,
        },
      ];

      const result = gitService.formatChanges(changes);

      expect(result).toContain('[Diff省略以避免超出长度限制]');
    });
  });

  describe('diff parsing and filtering', () => {
    it('should count additions and deletions correctly', async () => {
      const mockChange = {
        uri: {
          fsPath: '/test/repo/file.ts',
          path: '/test/repo/file.ts',
        },
        status: 0, // INDEX_MODIFIED
      };
      mockRepository.state.indexChanges = [mockChange];
      mockRepository.show.mockResolvedValueOnce('line1\nline2\nline3\n');
      mockRepository.show.mockResolvedValueOnce('line1\nmodified line2\nline3\nnew line4\n');

      const result = await gitService.getStagedChanges();

      expect(result[0]?.additions).toBeGreaterThan(0);
      expect(result[0]?.deletions).toBeGreaterThan(0);
    });

    it('should filter binary file extensions', async () => {
      const binaryExtensions = ['.png', '.jpg', '.pdf', '.zip', '.exe', '.mp3'];

      for (const ext of binaryExtensions) {
        const mockChange = {
          uri: {
            fsPath: `/test/repo/file${ext}`,
            path: `/test/repo/file${ext}`,
          },
          status: 1,
        };
        mockRepository.state.indexChanges = [mockChange];

        const result = await gitService.getStagedChanges();
        expect(result[0]?.diff).toBe('[Binary file]');
      }
    });

    it('should simplify ignored file patterns', async () => {
      const ignoredFiles = [
        'package-lock.json',
        'yarn.lock',
        'dist/bundle.js',
        'build/output.js',
        'file.min.js',
      ];

      for (const file of ignoredFiles) {
        const mockChange = {
          uri: {
            fsPath: `/test/repo/${file}`,
            path: `/test/repo/${file}`,
          },
          status: 0,
        };
        mockRepository.state.indexChanges = [mockChange];

        const result = await gitService.getStagedChanges();
        expect(result[0]?.diff).toContain('自动生成文件，已省略详细diff');
      }
    });

    it('should handle renamed files', async () => {
      const mockChange = {
        uri: {
          fsPath: '/test/repo/renamed.ts',
          path: '/test/repo/renamed.ts',
        },
        status: 3, // INDEX_RENAMED
      };
      mockRepository.state.indexChanges = [mockChange];
      mockRepository.show.mockResolvedValueOnce('content\n');
      mockRepository.show.mockResolvedValueOnce('content\n');

      const result = await gitService.getStagedChanges();

      expect(result[0]?.status).toBe(ChangeStatus.Renamed);
    });

    it('should handle copied files', async () => {
      const mockChange = {
        uri: {
          fsPath: '/test/repo/copied.ts',
          path: '/test/repo/copied.ts',
        },
        status: 4, // INDEX_COPIED
      };
      mockRepository.state.indexChanges = [mockChange];
      mockRepository.show.mockResolvedValueOnce('content\n');
      mockRepository.show.mockResolvedValueOnce('content\n');

      const result = await gitService.getStagedChanges();

      expect(result[0]?.status).toBe(ChangeStatus.Copied);
    });
  });

  describe('boundary conditions', () => {
    it('should handle multiple files with mixed statuses', async () => {
      const mockChanges = [
        {
          uri: { fsPath: '/test/repo/added.ts', path: '/test/repo/added.ts' },
          status: 1, // INDEX_ADDED
        },
        {
          uri: { fsPath: '/test/repo/modified.ts', path: '/test/repo/modified.ts' },
          status: 0, // INDEX_MODIFIED
        },
        {
          uri: { fsPath: '/test/repo/deleted.ts', path: '/test/repo/deleted.ts' },
          status: 2, // INDEX_DELETED
        },
      ];
      mockRepository.state.indexChanges = mockChanges;

      // Mock for added file
      mockRepository.show
        .mockRejectedValueOnce(new Error('Not in HEAD'))
        .mockResolvedValueOnce('new content\n')
        // Mock for modified file
        .mockResolvedValueOnce('old content\n')
        .mockResolvedValueOnce('modified content\n')
        // Mock for deleted file
        .mockRejectedValueOnce(new Error('Not in HEAD'))
        .mockRejectedValueOnce(new Error('Not in index'))
        .mockResolvedValueOnce('deleted content\n');

      const result = await gitService.getStagedChanges();

      expect(result).toHaveLength(3);
      expect(result[0]?.status).toBe(ChangeStatus.Added);
      expect(result[1]?.status).toBe(ChangeStatus.Modified);
      expect(result[2]?.status).toBe(ChangeStatus.Deleted);
    });

    it('should handle individual file processing errors gracefully', async () => {
      const mockChanges = [
        {
          uri: { fsPath: '/test/repo/good.ts', path: '/test/repo/good.ts' },
          status: 0,
        },
        {
          uri: { fsPath: '/test/repo/bad.ts', path: '/test/repo/bad.ts' },
          status: 0,
        },
      ];
      mockRepository.state.indexChanges = mockChanges;

      // First file succeeds
      mockRepository.show
        .mockResolvedValueOnce('old\n')
        .mockResolvedValueOnce('new\n')
        // Second file fails completely
        .mockRejectedValueOnce(new Error('Fatal error'))
        .mockRejectedValueOnce(new Error('Fatal error'))
        .mockRejectedValueOnce(new Error('Fatal error'));

      const result = await gitService.getStagedChanges();

      expect(result).toHaveLength(2);
      expect(result[0]?.path).toBe('/test/repo/good.ts');
      expect(result[0]?.diff).toContain('-old');
      expect(result[1]?.path).toBe('/test/repo/bad.ts');
      expect(result[1]?.diff).toBe('[处理文件时出错]');
    });

    it('should truncate very long diffs', async () => {
      const longContent = 'line\n'.repeat(6000); // Exceeds MAX_FILE_DIFF_LINES
      const mockChange = {
        uri: { fsPath: '/test/repo/long.ts', path: '/test/repo/long.ts' },
        status: 1,
      };
      mockRepository.state.indexChanges = [mockChange];
      mockRepository.show.mockRejectedValueOnce(new Error('Not in HEAD'));
      mockRepository.show.mockResolvedValueOnce(longContent);

      const result = await gitService.getStagedChanges();

      expect(result[0]?.diff).toContain('truncated');
    });

    it('should handle whitespace-only commit message', async () => {
      await expect(gitService.commitWithMessage('   \n\t  ')).rejects.toThrow(GitOperationError);
      await expect(gitService.commitWithMessage('   \n\t  ')).rejects.toThrow('提交信息不能为空');
    });

    it('should handle file stat errors gracefully', async () => {
      const mockChange = {
        uri: {
          fsPath: '/test/repo/deleted-before-stat.ts',
          path: '/test/repo/deleted-before-stat.ts',
        },
        status: 0,
      };
      mockRepository.state.indexChanges = [mockChange];
      (vscode.workspace.fs.stat as jest.Mock).mockRejectedValueOnce(new Error('File not found'));
      mockRepository.show.mockResolvedValueOnce('old\n').mockResolvedValueOnce('new\n');

      const result = await gitService.getStagedChanges();

      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe('/test/repo/deleted-before-stat.ts');
    });

    it('should handle very large diff content', async () => {
      const veryLongLine = 'a'.repeat(25000); // Exceeds MAX_DIFF_LENGTH
      const mockChange = {
        uri: { fsPath: '/test/repo/huge.ts', path: '/test/repo/huge.ts' },
        status: 1,
      };
      mockRepository.state.indexChanges = [mockChange];
      mockRepository.show.mockRejectedValueOnce(new Error('Not in HEAD'));
      mockRepository.show.mockResolvedValueOnce(veryLongLine);

      const result = await gitService.getStagedChanges();

      expect(result[0]?.diff.length).toBeLessThanOrEqual(20100); // MAX_DIFF_LENGTH + some buffer
      expect(result[0]?.diff).toContain('truncated');
    });
  });
});
