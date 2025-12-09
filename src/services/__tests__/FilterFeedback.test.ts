import { FilterFeedback, FilterStats, IOutputChannel } from '../SmartDiffFilter';

describe('FilterFeedback Unit Tests', () => {
  let mockOutputChannel: IOutputChannel;

  beforeEach(() => {
    mockOutputChannel = {
      appendLine: jest.fn(),
    };
  });

  describe('状态栏消息生成', () => {
    it('应当为成功过滤生成正确的消息', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, false);
      const stats: FilterStats = {
        totalFiles: 10,
        coreFiles: 5,
        ignoredFiles: 5,
        filtered: true,
      };

      // 使用 console.log 的 spy 来捕获状态栏消息
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      feedback.showFilterStats(stats);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Smart Filter: Analyzed 10 files, focused on 5 core files')
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ignored 5 noise files'));

      consoleSpy.mockRestore();
    });

    it('应当为未过滤任何文件生成正确的消息', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, false);
      const stats: FilterStats = {
        totalFiles: 10,
        coreFiles: 10,
        ignoredFiles: 0,
        filtered: true,
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      feedback.showFilterStats(stats);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('all are core files'));

      consoleSpy.mockRestore();
    });

    it('应当为跳过过滤（文件太少）生成正确的消息', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, false);
      const stats: FilterStats = {
        totalFiles: 2,
        coreFiles: 2,
        ignoredFiles: 0,
        filtered: false,
        skipReason: 'Too few files (< 3), no filtering needed',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      feedback.showFilterStats(stats);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Skipped (only 2 files)'));

      consoleSpy.mockRestore();
    });

    it('应当为跳过过滤（文件太多）生成正确的消息', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, false);
      const stats: FilterStats = {
        totalFiles: 600,
        coreFiles: 600,
        ignoredFiles: 0,
        filtered: false,
        skipReason: 'Too many files (> 500), skipping to prevent context overflow',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      feedback.showFilterStats(stats);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipped (600 files, too large for filtering)')
      );

      consoleSpy.mockRestore();
    });

    it('应当为空文件列表生成正确的消息', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, false);
      const stats: FilterStats = {
        totalFiles: 0,
        coreFiles: 0,
        ignoredFiles: 0,
        filtered: false,
        skipReason: 'Empty file list',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      feedback.showFilterStats(stats);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Skipped (empty file list)'));

      consoleSpy.mockRestore();
    });
  });

  describe('输出频道日志记录', () => {
    it('应当在启用详细日志时记录到输出频道', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, true);
      const stats: FilterStats = {
        totalFiles: 10,
        coreFiles: 5,
        ignoredFiles: 5,
        filtered: true,
      };

      feedback.showFilterStats(stats);

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();

      // 验证日志包含关键信息
      const calls = (mockOutputChannel.appendLine as jest.Mock).mock.calls;
      const fullLog = calls.map((call) => call[0]).join('\n');

      expect(fullLog).toContain('Smart Filter');
      expect(fullLog).toContain('Total files: 10');
      expect(fullLog).toContain('Core files: 5');
      expect(fullLog).toContain('Ignored files: 5');
      expect(fullLog).toContain('Token saved');
    });

    it('应当在禁用详细日志时不记录到输出频道', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, false);
      const stats: FilterStats = {
        totalFiles: 10,
        coreFiles: 5,
        ignoredFiles: 5,
        filtered: true,
      };

      feedback.showFilterStats(stats);

      expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    });

    it('应当为跳过的过滤记录正确的日志', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, true);
      const stats: FilterStats = {
        totalFiles: 2,
        coreFiles: 2,
        ignoredFiles: 0,
        filtered: false,
        skipReason: 'Too few files (< 3), no filtering needed',
      };

      feedback.showFilterStats(stats);

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();

      const calls = (mockOutputChannel.appendLine as jest.Mock).mock.calls;
      const fullLog = calls.map((call) => call[0]).join('\n');

      expect(fullLog).toContain('Status: Skipped');
      expect(fullLog).toContain('Reason: Too few files');
      expect(fullLog).toContain('Total files: 2');
    });

    it('应当计算并显示 token 节省百分比', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, true);
      const stats: FilterStats = {
        totalFiles: 100,
        coreFiles: 25,
        ignoredFiles: 75,
        filtered: true,
      };

      feedback.showFilterStats(stats);

      const calls = (mockOutputChannel.appendLine as jest.Mock).mock.calls;
      const fullLog = calls.map((call) => call[0]).join('\n');

      expect(fullLog).toContain('Token saved: ~75.0%');
    });

    it('应当在没有忽略文件时不显示 token 节省', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, true);
      const stats: FilterStats = {
        totalFiles: 10,
        coreFiles: 10,
        ignoredFiles: 0,
        filtered: true,
      };

      feedback.showFilterStats(stats);

      const calls = (mockOutputChannel.appendLine as jest.Mock).mock.calls;
      const fullLog = calls.map((call) => call[0]).join('\n');

      expect(fullLog).not.toContain('Token saved');
    });
  });

  describe('配置开关', () => {
    it('应当在禁用统计显示时不输出任何内容', () => {
      const feedback = new FilterFeedback(mockOutputChannel, false, true);
      const stats: FilterStats = {
        totalFiles: 10,
        coreFiles: 5,
        ignoredFiles: 5,
        filtered: true,
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      feedback.showFilterStats(stats);

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('应当支持自定义显示时长', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, false);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      feedback.showStatusBarMessage('Test message', 3000);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('duration: 3000ms'));

      consoleSpy.mockRestore();
    });

    it('应当使用默认显示时长（5000ms）', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, false);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      feedback.showStatusBarMessage('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('duration: 5000ms'));

      consoleSpy.mockRestore();
    });
  });

  describe('直接调用方法', () => {
    it('应当支持直接调用 logToOutputChannel', () => {
      const feedback = new FilterFeedback(mockOutputChannel, true, true);

      feedback.logToOutputChannel('Test log message');

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Test log message');
    });

    it('应当在 outputChannel 为 null 时不抛出错误', () => {
      const feedback = new FilterFeedback(null, true, true);

      expect(() => {
        feedback.logToOutputChannel('Test log message');
      }).not.toThrow();
    });
  });
});
