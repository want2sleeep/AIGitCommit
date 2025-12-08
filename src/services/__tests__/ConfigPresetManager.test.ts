/**
 * ConfigPresetManager 单元测试
 * 测试配置预设管理器的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { ConfigPresetManager } from '../ConfigPresetManager';
import { IConfigurationManager } from '../../types/interfaces';
import { FullConfig } from '../../types';
import * as vscode from 'vscode';

// Mock vscode 模块
jest.mock('vscode', () => ({
  ExtensionContext: jest.fn(),
}));

describe('ConfigPresetManager', () => {
  let manager: ConfigPresetManager;
  let mockContext: vscode.ExtensionContext;
  let mockConfigManager: jest.Mocked<IConfigurationManager>;
  let mockGlobalState: Map<string, unknown>;

  const mockFullConfig: FullConfig = {
    provider: 'openai',
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: 'sk-test-key',
    modelName: 'gpt-4',
    language: 'en',
    commitFormat: 'conventional',
    maxTokens: 500,
    temperature: 0.7,
  };

  beforeEach(() => {
    mockGlobalState = new Map();
    mockContext = {
      globalState: {
        get: jest.fn(
          (key: string, defaultValue?: unknown) => mockGlobalState.get(key) ?? defaultValue
        ),
        update: jest.fn((key: string, value: unknown) => {
          mockGlobalState.set(key, value);
          return Promise.resolve();
        }),
      },
    } as unknown as vscode.ExtensionContext;

    mockConfigManager = {
      getFullConfig: jest.fn().mockResolvedValue(mockFullConfig),
      saveFullConfig: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IConfigurationManager>;

    manager = new ConfigPresetManager(mockContext, mockConfigManager);
  });

  describe('预设创建', () => {
    it('应当能够创建预设', async () => {
      const preset = await manager.createPreset({
        name: 'Test Preset',
        description: 'A test preset',
        config: mockFullConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(preset.id).toBeDefined();
      expect(preset.name).toBe('Test Preset');
      expect(preset.config).toEqual(mockFullConfig);
    });

    it('应当从当前配置创建预设', async () => {
      const preset = await manager.createPresetFromCurrent('Current Config');

      expect(preset.name).toBe('Current Config');
      expect(preset.config).toEqual(mockFullConfig);
      expect(mockConfigManager.getFullConfig).toHaveBeenCalled();
    });
  });

  describe('预设获取', () => {
    it('应当能够获取所有预设', async () => {
      await manager.createPreset({
        name: 'Preset 1',
        description: 'Desc 1',
        config: mockFullConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.createPreset({
        name: 'Preset 2',
        description: 'Desc 2',
        config: mockFullConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const presets = manager.getPresets();
      expect(presets.length).toBe(2);
    });

    it('应当能够获取指定预设', async () => {
      const created = await manager.createPreset({
        name: 'Test',
        description: 'Test',
        config: mockFullConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const retrieved = manager.getPreset(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test');
    });

    it('应当对不存在的预设返回 undefined', () => {
      const preset = manager.getPreset('nonexistent');
      expect(preset).toBeUndefined();
    });
  });

  describe('预设更新', () => {
    it('应当能够更新预设', async () => {
      const created = await manager.createPreset({
        name: 'Original',
        description: 'Original desc',
        config: mockFullConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.updatePreset(created.id, {
        name: 'Updated',
        description: 'Updated desc',
      });

      const updated = manager.getPreset(created.id);
      expect(updated?.name).toBe('Updated');
      expect(updated?.description).toBe('Updated desc');
    });

    it('应当拒绝更新不存在的预设', async () => {
      await expect(manager.updatePreset('nonexistent', { name: 'Test' })).rejects.toThrow(
        '配置预设不存在'
      );
    });
  });

  describe('预设删除', () => {
    it('应当能够删除预设', async () => {
      const created = await manager.createPreset({
        name: 'Test',
        description: 'Test',
        config: mockFullConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.deletePreset(created.id);
      expect(manager.getPreset(created.id)).toBeUndefined();
    });

    it('应当拒绝删除不存在的预设', async () => {
      await expect(manager.deletePreset('nonexistent')).rejects.toThrow('配置预设不存在');
    });
  });

  describe('预设应用', () => {
    it('应当能够应用预设', async () => {
      const preset = await manager.createPreset({
        name: 'Test',
        description: 'Test',
        config: mockFullConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.applyPreset(preset.id);
      expect(mockConfigManager.saveFullConfig).toHaveBeenCalledWith(mockFullConfig);
    });

    it('应当拒绝应用不存在的预设', async () => {
      await expect(manager.applyPreset('nonexistent')).rejects.toThrow('配置预设不存在');
    });
  });
});
