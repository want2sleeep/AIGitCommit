import * as vscode from 'vscode';
import { ProgressManager } from '../ProgressManager';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    withProgress: jest.fn(),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
  },
  ProgressLocation: {
    Notification: 1,
  },
}));

describe('ProgressManager', () => {
  let progressManager: ProgressManager;
  let mockWithProgress: jest.Mock;
  let mockShowInformationMessage: jest.Mock;
  let mockShowErrorMessage: jest.Mock;

  beforeEach(() => {
    progressManager = new ProgressManager();
    mockWithProgress = vscode.window.withProgress as jest.Mock;
    mockShowInformationMessage = vscode.window.showInformationMessage as jest.Mock;
    mockShowErrorMessage = vscode.window.showErrorMessage as jest.Mock;

    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should initialize progress tracking with total chunks', () => {
      const totalChunks = 10;
      progressManager.start(totalChunks);

      const progress = progressManager.getProgress();
      expect(progress.total).toBe(totalChunks);
      expect(progress.completed).toBe(0);
      expect(progress.percentage).toBe(0);
    });
  });

  describe('update', () => {
    it('should update completed chunks and calculate percentage', () => {
      const totalChunks = 10;
      progressManager.start(totalChunks);

      progressManager.update(5);

      const progress = progressManager.getProgress();
      expect(progress.completed).toBe(5);
      expect(progress.percentage).toBe(50);
    });

    it('should update progress reporter when available', () => {
      const totalChunks = 10;
      const mockProgressReporter = {
        report: jest.fn(),
      };

      progressManager.start(totalChunks);
      // Access private property for testing
      (progressManager as any).progressReporter = mockProgressReporter;

      progressManager.update(3);

      expect(mockProgressReporter.report).toHaveBeenCalledWith({
        message: '处理中... 3/10 (30%)',
        increment: 10,
      });
    });
  });

  describe('complete', () => {
    it('should show completion message and clean up', () => {
      const totalChunks = 10;
      const processingTime = 5000;

      progressManager.start(totalChunks);
      // Set up mock resolve function
      const mockResolve = jest.fn();
      (progressManager as any).progressResolve = mockResolve;

      progressManager.complete(processingTime);

      expect(mockResolve).toHaveBeenCalled();
      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        '✅ 大型 Diff 处理完成！处理了 10 个块，耗时 5.0 秒'
      );
      expect((progressManager as any).progressResolve).toBeNull();
      expect((progressManager as any).progressReporter).toBeNull();
    });
  });

  describe('reportError', () => {
    it('should show error message and clean up', () => {
      const errorMessage = 'Test error';
      const mockResolve = jest.fn();

      (progressManager as any).progressResolve = mockResolve;

      progressManager.reportError(errorMessage);

      expect(mockResolve).toHaveBeenCalled();
      expect(mockShowErrorMessage).toHaveBeenCalledWith(`❌ 大型 Diff 处理失败: ${errorMessage}`);
      expect((progressManager as any).progressResolve).toBeNull();
      expect((progressManager as any).progressReporter).toBeNull();
    });
  });

  describe('withProgress', () => {
    it('should execute operation with progress tracking', async () => {
      const totalChunks = 5;
      const mockResult = 'test result';
      const mockOperation = jest.fn().mockResolvedValue(mockResult);
      const mockProgress = {
        report: jest.fn(),
      };

      mockWithProgress.mockImplementation((_options, callback) => {
        return callback(mockProgress);
      });

      const result = await progressManager.withProgress(totalChunks, mockOperation);

      expect(mockOperation).toHaveBeenCalled();
      expect(result).toBe(mockResult);
      expect(mockProgress.report).toHaveBeenCalledWith({
        message: '准备处理 5 个块...',
        increment: 0,
      });
    });

    it('should handle operation errors', async () => {
      const totalChunks = 5;
      const error = new Error('Test error');
      const mockOperation = jest.fn().mockRejectedValue(error);
      const mockProgress = {
        report: jest.fn(),
      };

      mockWithProgress.mockImplementation((_options, callback) => {
        return callback(mockProgress);
      });

      await expect(progressManager.withProgress(totalChunks, mockOperation)).rejects.toThrow(error);
      expect(mockShowErrorMessage).toHaveBeenCalledWith('❌ 大型 Diff 处理失败: Test error');
    });
  });

  describe('getProgress', () => {
    it('should return correct progress information', () => {
      const totalChunks = 10;
      progressManager.start(totalChunks);
      progressManager.update(3);

      const progress = progressManager.getProgress();

      expect(progress).toEqual({
        total: 10,
        completed: 3,
        percentage: 30,
      });
    });

    it('should return 0 percentage when total chunks is 0', () => {
      progressManager.start(0);

      const progress = progressManager.getProgress();

      expect(progress.percentage).toBe(0);
    });
  });

  describe('getElapsedTime', () => {
    it('should return elapsed time after start', () => {
      progressManager.start(10);

      // Mock Date.now to return a fixed time
      const originalDateNow = Date.now;
      const startTime = 1000000;
      Date.now = jest.fn(() => startTime);

      progressManager.start(10);

      // Simulate 1000ms elapsed
      Date.now = jest.fn(() => startTime + 1000);

      const elapsedTime = progressManager.getElapsedTime();
      expect(elapsedTime).toBe(1000);

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('should return 0 when not started', () => {
      const elapsedTime = progressManager.getElapsedTime();
      expect(elapsedTime).toBe(0);
    });
  });
});
