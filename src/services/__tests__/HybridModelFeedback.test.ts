/**
 * HybridModelFeedback 单元测试
 */

import { HybridModelFeedback } from '../HybridModelFeedback';

describe('HybridModelFeedback', () => {
  let feedback: HybridModelFeedback;
  let mockOutputChannel: {
    appendLine: jest.Mock;
    show: jest.Mock;
    dispose: jest.Mock;
  };

  beforeEach(() => {
    mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    };
    feedback = new HybridModelFeedback(mockOutputChannel as any);
  });

  describe('logModelSelection', () => {
    it('应当记录模型选择信息', () => {
      feedback.logModelSelection('gpt-4o-mini', 'gpt-4', 10);

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const calls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0]);

      // 验证包含关键信息
      expect(calls.some((log: string) => log.includes('模型选择'))).toBe(true);
      expect(calls.some((log: string) => log.includes('gpt-4o-mini'))).toBe(true);
      expect(calls.some((log: string) => log.includes('gpt-4'))).toBe(true);
      expect(calls.some((log: string) => log.includes('10'))).toBe(true);
    });
  });

  describe('logProcessingStart', () => {
    it('应当记录处理开始', () => {
      feedback.logProcessingStart(5);

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const calls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0]);

      expect(calls.some((log: string) => log.includes('开始处理'))).toBe(true);
      expect(calls.some((log: string) => log.includes('5'))).toBe(true);
    });
  });

  describe('logProcessingComplete', () => {
    it('应当记录处理完成信息', () => {
      feedback.logProcessingComplete(10, 5000);

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const calls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0]);

      // 验证包含关键信息
      expect(calls.some((log: string) => log.includes('处理完成'))).toBe(true);
      expect(calls.some((log: string) => log.includes('10'))).toBe(true);
      expect(calls.some((log: string) => log.includes('5.00秒'))).toBe(true);
      expect(calls.some((log: string) => log.includes('500ms'))).toBe(true); // 平均每个 chunk
    });
  });

  describe('showUsageSummary', () => {
    it('应当显示使用摘要', () => {
      feedback.showUsageSummary('gpt-4o-mini', 'gpt-4', 10, 85, 5000);

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const calls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0]);

      // 验证包含关键信息
      expect(calls.some((log: string) => log.includes('使用摘要'))).toBe(true);
      expect(calls.some((log: string) => log.includes('gpt-4o-mini'))).toBe(true);
      expect(calls.some((log: string) => log.includes('gpt-4'))).toBe(true);
      expect(calls.some((log: string) => log.includes('10'))).toBe(true);
      expect(calls.some((log: string) => log.includes('85%'))).toBe(true);
      expect(calls.some((log: string) => log.includes('5.00秒'))).toBe(true);
    });

    it('应当在节省超过70%时显示通知', () => {
      const vscode = require('vscode');
      const showInformationMessage = jest.fn();
      vscode.window.showInformationMessage = showInformationMessage;

      feedback.showUsageSummary('gpt-4o-mini', 'gpt-4', 10, 85);

      expect(showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('85%'));
    });

    it('应当在节省不足70%时不显示通知', () => {
      const vscode = require('vscode');
      const showInformationMessage = jest.fn();
      vscode.window.showInformationMessage = showInformationMessage;

      feedback.showUsageSummary('gpt-4o-mini', 'gpt-4', 10, 50);

      expect(showInformationMessage).not.toHaveBeenCalled();
    });
  });

  describe('showFallbackWarning', () => {
    it('应当显示回退警告', () => {
      feedback.showFallbackWarning('gpt-4o-mini', 'gpt-4');

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const calls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0]);

      expect(calls.some((log: string) => log.includes('回退警告'))).toBe(true);
      expect(calls.some((log: string) => log.includes('gpt-4o-mini'))).toBe(true);
      expect(calls.some((log: string) => log.includes('gpt-4'))).toBe(true);
    });
  });

  describe('logSmartDowngrade', () => {
    it('应当记录智能降级信息', () => {
      feedback.logSmartDowngrade('gpt-4', 'gpt-4o-mini');

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const calls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0]);

      expect(calls.some((log: string) => log.includes('智能降级'))).toBe(true);
      expect(calls.some((log: string) => log.includes('gpt-4'))).toBe(true);
      expect(calls.some((log: string) => log.includes('gpt-4o-mini'))).toBe(true);
    });
  });

  describe('show', () => {
    it('应当显示输出频道', () => {
      feedback.show();
      expect(mockOutputChannel.show).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('应当清理资源', () => {
      feedback.dispose();
      expect(mockOutputChannel.dispose).toHaveBeenCalled();
    });
  });
});
