/**
 * TemplateManager 单元测试
 * 测试模板管理器的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { TemplateManager } from '../TemplateManager';
import * as vscode from 'vscode';

// Mock vscode 模块
jest.mock('vscode', () => ({
  ExtensionContext: jest.fn(),
}));

describe('TemplateManager', () => {
  let manager: TemplateManager;
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

    manager = new TemplateManager(mockContext);
  });

  describe('模板创建', () => {
    it('应当能够创建模板', async () => {
      const template = await manager.createTemplate({
        name: 'Test Template',
        description: 'A test template',
        content: 'feat: {{type}} - {{description}}',
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Test Template');
      expect(template.content).toBe('feat: {{type}} - {{description}}');
    });

    it('应当自动提取变量', async () => {
      const template = await manager.createTemplate({
        name: 'Test',
        description: 'Test',
        content: '{{type}}: {{scope}} - {{description}}',
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(template.variables).toContain('type');
      expect(template.variables).toContain('scope');
      expect(template.variables).toContain('description');
    });
  });

  describe('模板获取', () => {
    it('应当能够获取所有模板', async () => {
      await manager.createTemplate({
        name: 'Template 1',
        description: 'Desc 1',
        content: 'Content 1',
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.createTemplate({
        name: 'Template 2',
        description: 'Desc 2',
        content: 'Content 2',
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const templates = manager.getTemplates();
      expect(templates.length).toBe(2);
    });

    it('应当能够获取指定模板', async () => {
      const created = await manager.createTemplate({
        name: 'Test',
        description: 'Test',
        content: 'Test content',
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const retrieved = manager.getTemplate(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test');
    });

    it('应当对不存在的模板返回 undefined', () => {
      const template = manager.getTemplate('nonexistent');
      expect(template).toBeUndefined();
    });
  });

  describe('模板更新', () => {
    it('应当能够更新模板', async () => {
      const created = await manager.createTemplate({
        name: 'Original',
        description: 'Original desc',
        content: 'Original content',
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.updateTemplate(created.id, {
        name: 'Updated',
        content: '{{newVar}}',
      });

      const updated = manager.getTemplate(created.id);
      expect(updated?.name).toBe('Updated');
      expect(updated?.variables).toContain('newVar');
    });

    it('应当拒绝更新不存在的模板', async () => {
      await expect(manager.updateTemplate('nonexistent', { name: 'Test' })).rejects.toThrow(
        '模板不存在'
      );
    });
  });

  describe('模板删除', () => {
    it('应当能够删除模板', async () => {
      const created = await manager.createTemplate({
        name: 'Test',
        description: 'Test',
        content: 'Test',
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.deleteTemplate(created.id);
      expect(manager.getTemplate(created.id)).toBeUndefined();
    });

    it('应当拒绝删除不存在的模板', async () => {
      await expect(manager.deleteTemplate('nonexistent')).rejects.toThrow('模板不存在');
    });
  });

  describe('模板应用', () => {
    it('应当正确替换变量', async () => {
      const template = await manager.createTemplate({
        name: 'Test',
        description: 'Test',
        content: '{{type}}: {{description}}',
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = manager.applyTemplate(template.id, {
        type: 'feat',
        description: 'add new feature',
      });

      expect(result).toBe('feat: add new feature');
    });

    it('应当处理缺失的变量', async () => {
      const template = await manager.createTemplate({
        name: 'Test',
        description: 'Test',
        content: '{{type}}: {{description}}',
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = manager.applyTemplate(template.id, {
        type: 'feat',
      });

      expect(result).toBe('feat: ');
    });

    it('应当拒绝应用不存在的模板', () => {
      expect(() => manager.applyTemplate('nonexistent', {})).toThrow('模板不存在');
    });
  });
});
