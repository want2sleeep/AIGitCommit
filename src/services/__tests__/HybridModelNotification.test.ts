/**
 * HybridModelNotification 单元测试
 * 验证混合模型策略通知管理器的功能
 */

import * as vscode from 'vscode';
import { HybridModelNotification } from '../HybridModelNotification';

jest.mock('vscode');

describe('HybridModelNotification', () => {
  let notification: HybridModelNotification;
  let mockContext: jest.Mocked<vscode.ExtensionContext>;
  let mockGlobalState: Map<string, any>;

  beforeEach(() => {
    // 创建模拟的 globalState
    mockGlobalState = new Map();

    mockContext = {
      globalState: {
        get: jest.fn((key: string, defaultValue?: any) => {
          return mockGlobalState.has(key) ? mockGlobalState.get(key) : defaultValue;
        }),
        update: jest.fn(async (key: string, value: any) => {
          mockGlobalState.set(key, value);
        }),
      },
    } as any;

    notification = new HybridModelNotification(mockContext);
  });

  describe('shouldShowNotification', () => {
    it('应当在首次使用时返回 true', () => {
      expect(notification.shouldShowNotification()).toBe(true);
    });

    it('应当在通知已显示后返回 false', async () => {
      await notification.markNotificationShown();
      expect(notification.shouldShowNotification()).toBe(false);
    });
  });

  describe('showFeatureNotification', () => {
    let mockShowInformationMessage: jest.Mock;

    beforeEach(() => {
      mockShowInformationMessage = jest.fn();
      (vscode.window.showInformationMessage as jest.Mock) = mockShowInformationMessage;
    });

    it('应当在首次使用时显示通知', async () => {
      mockShowInformationMessage.mockResolvedValue(undefined);

      await notification.showFeatureNotification();

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('混合模型策略'),
        '了解更多',
        '稍后提醒',
        '不再显示'
      );
    });

    it('应当在通知已显示后不再显示', async () => {
      await notification.markNotificationShown();

      await notification.showFeatureNotification();

      expect(mockShowInformationMessage).not.toHaveBeenCalled();
    });

    it('应当在用户选择"了解更多"时打开文档并标记为已显示', async () => {
      mockShowInformationMessage.mockResolvedValue('了解更多');
      const mockOpenExternal = jest.fn();
      (vscode.env.openExternal as jest.Mock) = mockOpenExternal;

      await notification.showFeatureNotification();

      expect(mockOpenExternal).toHaveBeenCalledWith(
        expect.objectContaining({
          toString: expect.any(Function),
        })
      );
      expect(notification.shouldShowNotification()).toBe(false);
    });

    it('应当在用户选择"不再显示"时标记为已显示', async () => {
      mockShowInformationMessage.mockResolvedValue('不再显示');

      await notification.showFeatureNotification();

      expect(notification.shouldShowNotification()).toBe(false);
    });

    it('应当在用户选择"稍后提醒"时不标记为已显示', async () => {
      mockShowInformationMessage.mockResolvedValue('稍后提醒');

      await notification.showFeatureNotification();

      expect(notification.shouldShowNotification()).toBe(true);
    });
  });

  describe('recordHybridModelStatus', () => {
    it('应当记录混合模型策略启用状态', async () => {
      await notification.recordHybridModelStatus(true);

      expect(notification.isHybridModelEnabled()).toBe(true);
    });

    it('应当记录混合模型策略禁用状态', async () => {
      await notification.recordHybridModelStatus(false);

      expect(notification.isHybridModelEnabled()).toBe(false);
    });
  });

  describe('isHybridModelEnabled', () => {
    it('应当在未记录状态时返回 false', () => {
      expect(notification.isHybridModelEnabled()).toBe(false);
    });

    it('应当返回记录的状态', async () => {
      await notification.recordHybridModelStatus(true);

      expect(notification.isHybridModelEnabled()).toBe(true);
    });
  });

  describe('logHybridModelInfo', () => {
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;

    beforeEach(() => {
      mockOutputChannel = {
        appendLine: jest.fn(),
        append: jest.fn(),
        clear: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn(),
        name: 'Test',
        replace: jest.fn(),
      };
    });

    it('应当在配置了 chunk 模型时记录启用信息', () => {
      notification.logHybridModelInfo(mockOutputChannel, 'gpt-4o-mini');

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('混合模型策略已启用')
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('gpt-4o-mini')
      );
    });

    it('应当在未配置 chunk 模型时记录提示信息', () => {
      notification.logHybridModelInfo(mockOutputChannel);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('您可以配置 Chunk Model 以优化性能')
      );
    });
  });

  describe('resetNotificationState', () => {
    it('应当重置通知状态', async () => {
      await notification.markNotificationShown();
      await notification.recordHybridModelStatus(true);

      // 验证状态已设置
      expect(notification.shouldShowNotification()).toBe(false);
      expect(notification.isHybridModelEnabled()).toBe(true);

      await notification.resetNotificationState();

      // 验证状态已重置
      expect(notification.shouldShowNotification()).toBe(true);
      // 注意：重置后 globalState.get 返回 undefined，但我们的默认值是 false
      const enabled = notification.isHybridModelEnabled();
      expect(enabled === false || enabled === undefined).toBe(true);
    });
  });
});
