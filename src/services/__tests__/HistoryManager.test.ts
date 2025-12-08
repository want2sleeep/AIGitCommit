/**
 * HistoryManager 单元测试
 * 测试历史记录管理器的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { HistoryManager } from '../HistoryManager';
import * as vscode from 'vscode';

// Mock vscode 模块
jest.mock('vscode', () => ({
  ExtensionContext: jest.fn(),
}));

describe('HistoryManager', () => {
  let manager: HistoryManager;
  let mockContext: vscode.ExtensionContext;
  let mockGlobalState: Map<string, unknown>;

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

    manager = new HistoryManager(mockContext);
  });

  describe('添加历史记录', () => {
    it('应当能够添加历史记录', async () => {
      await manager.addEntry({
        commitMessage: 'feat: add new feature',
        changes: 'diff content',
        provider: 'openai',
        model: 'gpt-4',
        success: true,
      });

      const history = manager.getHistory();
      expect(history.length).toBe(1);
      expect(history[0]?.commitMessage).toBe('feat: add new feature');
    });

    it('应当自动生成 ID 和时间戳', async () => {
      await manager.addEntry({
        commitMessage: 'test',
        changes: 'changes',
        provider: 'openai',
        model: 'gpt-4',
        success: true,
      });

      const history = manager.getHistory();
      expect(history[0]?.id).toBeDefined();
      expect(history[0]?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('获取历史记录', () => {
    beforeEach(async () => {
      await manager.addEntry({
        commitMessage: 'feat: feature 1',
        changes: 'changes 1',
        provider: 'openai',
        model: 'gpt-4',
        success: true,
      });

      await manager.addEntry({
        commitMessage: 'fix: bug fix',
        changes: 'changes 2',
        provider: 'azure',
        model: 'gpt-35-turbo',
        success: false,
      });

      await manager.addEntry({
        commitMessage: 'feat: feature 2',
        changes: 'changes 3',
        provider: 'openai',
        model: 'gpt-4',
        success: true,
      });
    });

    it('应当返回所有历史记录', () => {
      const history = manager.getHistory();
      expect(history.length).toBe(3);
    });

    it('应当按时间倒序排列', () => {
      const history = manager.getHistory();
      // 验证历史记录按时间倒序排列（最新的在前）
      for (let i = 0; i < history.length - 1; i++) {
        expect(history[i]!.timestamp.getTime()).toBeGreaterThanOrEqual(
          history[i + 1]!.timestamp.getTime()
        );
      }
    });

    it('应当支持按提供商过滤', () => {
      const history = manager.getHistory({ provider: 'openai' });
      expect(history.length).toBe(2);
    });

    it('应当支持按成功状态过滤', () => {
      const history = manager.getHistory({ success: false });
      expect(history.length).toBe(1);
      expect(history[0]?.commitMessage).toBe('fix: bug fix');
    });

    it('应当支持数量限制', () => {
      const history = manager.getHistory(undefined, 2);
      expect(history.length).toBe(2);
    });
  });

  describe('删除历史记录', () => {
    it('应当能够删除指定记录', async () => {
      await manager.addEntry({
        commitMessage: 'test',
        changes: 'changes',
        provider: 'openai',
        model: 'gpt-4',
        success: true,
      });

      const history = manager.getHistory();
      const id = history[0]?.id;

      if (id) {
        await manager.deleteEntry(id);
        expect(manager.getHistory().length).toBe(0);
      }
    });

    it('应当拒绝删除不存在的记录', async () => {
      await expect(manager.deleteEntry('nonexistent')).rejects.toThrow('历史记录不存在');
    });
  });

  describe('清空历史记录', () => {
    it('应当能够清空所有记录', async () => {
      await manager.addEntry({
        commitMessage: 'test 1',
        changes: 'changes',
        provider: 'openai',
        model: 'gpt-4',
        success: true,
      });

      await manager.addEntry({
        commitMessage: 'test 2',
        changes: 'changes',
        provider: 'openai',
        model: 'gpt-4',
        success: true,
      });

      await manager.clearHistory();
      expect(manager.getHistory().length).toBe(0);
    });
  });

  describe('统计功能', () => {
    beforeEach(async () => {
      await manager.addEntry({
        commitMessage: 'feat: feature',
        changes: 'changes',
        provider: 'openai',
        model: 'gpt-4',
        success: true,
      });

      await manager.addEntry({
        commitMessage: 'fix: bug',
        changes: 'changes',
        provider: 'openai',
        model: 'gpt-4',
        success: true,
      });

      await manager.addEntry({
        commitMessage: 'error',
        changes: 'changes',
        provider: 'azure',
        model: 'gpt-35-turbo',
        success: false,
      });
    });

    it('应当正确统计总数', () => {
      const stats = manager.getStatistics();
      expect(stats.totalEntries).toBe(3);
    });

    it('应当正确统计成功和失败数', () => {
      const stats = manager.getStatistics();
      expect(stats.successfulEntries).toBe(2);
      expect(stats.failedEntries).toBe(1);
    });

    it('应当正确统计最常用的提供商', () => {
      const stats = manager.getStatistics();
      expect(stats.mostUsedProvider).toBe('openai');
    });

    it('应当正确统计最常用的模型', () => {
      const stats = manager.getStatistics();
      expect(stats.mostUsedModel).toBe('gpt-4');
    });

    it('应当正确计算平均消息长度', () => {
      const stats = manager.getStatistics();
      expect(stats.averageMessageLength).toBeGreaterThan(0);
    });
  });

  describe('导出功能', () => {
    it('应当导出有效的 JSON', async () => {
      await manager.addEntry({
        commitMessage: 'test',
        changes: 'changes',
        provider: 'openai',
        model: 'gpt-4',
        success: true,
      });

      const exported = manager.exportHistory();
      expect(() => JSON.parse(exported)).not.toThrow();
    });
  });
});
