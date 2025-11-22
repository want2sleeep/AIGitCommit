/**
 * ConfigurationPanelManager 候选项功能单元测试
 * 测试 OpenAI Compatible 提供商的候选项功能
 */

import * as vscode from 'vscode';
import { ConfigurationManager } from '../ConfigurationManager';

// Mock VSCode API
jest.mock('vscode');

describe('ConfigurationPanelManager - 候选项功能', () => {
  let context: vscode.ExtensionContext;
  let configManager: ConfigurationManager;

  beforeEach(() => {
    // 创建 mock context
    context = {
      subscriptions: [],
      secrets: {
        get: jest.fn(),
        store: jest.fn(),
        delete: jest.fn(),
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as vscode.ExtensionContext;

    // 创建实例
    configManager = new ConfigurationManager(context);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomBaseUrls', () => {
    it('应该返回空数组当没有自定义 Base URL 时', () => {
      // Mock workspace configuration
      const mockGet = jest.fn().mockReturnValue([]);
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet,
      });

      const result = configManager.getCustomBaseUrls();

      expect(result).toEqual([]);
      expect(mockGet).toHaveBeenCalledWith('customBaseUrls', []);
    });

    it('应该返回自定义 Base URL 列表', () => {
      const customUrls = ['https://custom1.com/v1', 'https://custom2.com/v1'];
      const mockGet = jest.fn().mockReturnValue(customUrls);
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet,
      });

      const result = configManager.getCustomBaseUrls();

      expect(result).toEqual(customUrls);
    });

    it('应该在读取失败时返回空数组', () => {
      const mockGet = jest.fn().mockImplementation(() => {
        throw new Error('Read error');
      });
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet,
      });

      const result = configManager.getCustomBaseUrls();

      expect(result).toEqual([]);
    });
  });

  describe('addCustomBaseUrl', () => {
    it('应该添加新的自定义 Base URL', async () => {
      const existingUrls = ['https://existing.com/v1'];
      const newUrl = 'https://new.com/v1';
      const mockGet = jest.fn().mockReturnValue([...existingUrls]); // 返回副本
      const mockUpdate = jest.fn();

      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet,
        update: mockUpdate,
      });

      await configManager.addCustomBaseUrl(newUrl);

      expect(mockUpdate).toHaveBeenCalledWith(
        'customBaseUrls',
        ['https://existing.com/v1', 'https://new.com/v1'],
        vscode.ConfigurationTarget.Global
      );
    });

    it('应该不添加重复的 Base URL', async () => {
      const existingUrls = ['https://existing.com/v1'];
      const duplicateUrl = 'https://existing.com/v1';
      const mockGet = jest.fn().mockReturnValue(existingUrls);
      const mockUpdate = jest.fn();

      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet,
        update: mockUpdate,
      });

      await configManager.addCustomBaseUrl(duplicateUrl);

      // 不应该调用 update，因为 URL 已存在
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getCustomModelNames', () => {
    it('应该返回空数组当没有自定义模型名称时', () => {
      const mockGet = jest.fn().mockReturnValue([]);
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet,
      });

      const result = configManager.getCustomModelNames();

      expect(result).toEqual([]);
      expect(mockGet).toHaveBeenCalledWith('customModelNames', []);
    });

    it('应该返回自定义模型名称列表', () => {
      const customModels = ['custom-model-1', 'custom-model-2'];
      const mockGet = jest.fn().mockReturnValue(customModels);
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet,
      });

      const result = configManager.getCustomModelNames();

      expect(result).toEqual(customModels);
    });
  });

  describe('addCustomModelName', () => {
    it('应该添加新的自定义模型名称', async () => {
      const existingModels = ['existing-model'];
      const newModel = 'new-model';
      const mockGet = jest.fn().mockReturnValue([...existingModels]); // 返回副本
      const mockUpdate = jest.fn();

      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet,
        update: mockUpdate,
      });

      await configManager.addCustomModelName(newModel);

      expect(mockUpdate).toHaveBeenCalledWith(
        'customModelNames',
        ['existing-model', 'new-model'],
        vscode.ConfigurationTarget.Global
      );
    });

    it('应该不添加重复的模型名称', async () => {
      const existingModels = ['existing-model'];
      const duplicateModel = 'existing-model';
      const mockGet = jest.fn().mockReturnValue(existingModels);
      const mockUpdate = jest.fn();

      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet,
        update: mockUpdate,
      });

      await configManager.addCustomModelName(duplicateModel);

      // 不应该调用 update，因为模型名称已存在
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
