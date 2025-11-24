/**
 * FirstTimeUserGuide 单元测试
 */

import * as vscode from 'vscode';
import { FirstTimeUserGuide } from '../FirstTimeUserGuide';
import { IConfigurationManager } from '../../types/interfaces';

// Mock VSCode API
jest.mock('vscode');

describe('FirstTimeUserGuide', () => {
  let guide: FirstTimeUserGuide;
  let mockConfigManager: jest.Mocked<IConfigurationManager>;
  let mockShowInformationMessage: jest.Mock;

  beforeEach(() => {
    // 创建 mock 配置管理器
    mockConfigManager = {
      showConfigurationWizard: jest.fn(),
    } as any;

    // Mock vscode.window.showInformationMessage
    mockShowInformationMessage = jest.fn();
    (vscode.window.showInformationMessage as jest.Mock) = mockShowInformationMessage;

    guide = new FirstTimeUserGuide(mockConfigManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('showWelcomeMessage', () => {
    it('应当显示欢迎消息', async () => {
      mockShowInformationMessage.mockResolvedValue('开始配置');

      await guide.showWelcomeMessage();

      expect(mockShowInformationMessage).toHaveBeenCalledTimes(1);
      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('欢迎使用 AI Git Commit'),
        { modal: true },
        '开始配置'
      );
    });

    it('应当在消息中包含功能介绍', async () => {
      mockShowInformationMessage.mockResolvedValue(undefined);

      await guide.showWelcomeMessage();

      const message = mockShowInformationMessage.mock.calls[0][0];
      expect(message).toContain('自动分析代码变更');
      expect(message).toContain('生成高质量的提交信息');
      expect(message).toContain('支持多种 AI 提供商');
    });
  });

  describe('startWizard', () => {
    it('应当在配置成功时返回 true', async () => {
      mockShowInformationMessage.mockResolvedValue('开始配置');
      mockConfigManager.showConfigurationWizard.mockResolvedValue(true);

      const result = await guide.startWizard();

      expect(result).toBe(true);
      expect(mockConfigManager.showConfigurationWizard).toHaveBeenCalledTimes(1);
      expect(mockShowInformationMessage).toHaveBeenCalledTimes(2); // 欢迎消息 + 完成消息
    });

    it('应当在配置失败时返回 false', async () => {
      mockShowInformationMessage.mockResolvedValue('开始配置');
      mockConfigManager.showConfigurationWizard.mockResolvedValue(false);

      const result = await guide.startWizard();

      expect(result).toBe(false);
      expect(mockConfigManager.showConfigurationWizard).toHaveBeenCalledTimes(1);
      expect(mockShowInformationMessage).toHaveBeenCalledTimes(1); // 只有欢迎消息
    });

    it('应当按正确顺序调用方法', async () => {
      const callOrder: string[] = [];

      mockShowInformationMessage.mockImplementation((msg: string) => {
        if (msg.includes('欢迎使用')) {
          callOrder.push('welcome');
        } else if (msg.includes('配置完成')) {
          callOrder.push('completion');
        }
        return Promise.resolve(undefined);
      });

      mockConfigManager.showConfigurationWizard.mockImplementation(() => {
        callOrder.push('wizard');
        return Promise.resolve(true);
      });

      await guide.startWizard();

      expect(callOrder).toEqual(['welcome', 'wizard', 'completion']);
    });
  });

  describe('showCompletionMessage', () => {
    it('应当显示完成消息', async () => {
      mockShowInformationMessage.mockResolvedValue(undefined);

      await guide.showCompletionMessage();

      expect(mockShowInformationMessage).toHaveBeenCalledTimes(1);
      expect(mockShowInformationMessage).toHaveBeenCalledWith(expect.stringContaining('配置完成'), {
        modal: false,
      });
    });

    it('应当在消息中包含使用说明', async () => {
      mockShowInformationMessage.mockResolvedValue(undefined);

      await guide.showCompletionMessage();

      const message = mockShowInformationMessage.mock.calls[0][0];
      expect(message).toContain('使用方法');
      expect(message).toContain('Git 暂存区');
      expect(message).toContain('生成 AI 提交信息');
    });

    it('应当使用非模态对话框', async () => {
      mockShowInformationMessage.mockResolvedValue(undefined);

      await guide.showCompletionMessage();

      const options = mockShowInformationMessage.mock.calls[0][1];
      expect(options).toEqual({ modal: false });
    });
  });
});
