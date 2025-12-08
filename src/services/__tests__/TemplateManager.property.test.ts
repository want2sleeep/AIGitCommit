/**
 * TemplateManager 属性测试
 *
 * **Feature: project-optimization-recommendations, Property 13: 模板变量替换正确性**
 * **验证需求: 6.1**
 */

import * as fc from 'fast-check';
import { TemplateManager } from '../TemplateManager';

// Mock VSCode ExtensionContext
const createMockContext = () => {
  const storage = new Map<string, unknown>();
  return {
    globalState: {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        return storage.get(key) ?? defaultValue;
      }),
      update: jest.fn(async (key: string, value: unknown) => {
        storage.set(key, value);
      }),
      keys: jest.fn(() => Array.from(storage.keys())),
      setKeysForSync: jest.fn(),
    },
    workspaceState: {
      get: jest.fn(),
      update: jest.fn(),
      keys: jest.fn(() => []),
      setKeysForSync: jest.fn(),
    },
    subscriptions: [],
    extensionPath: '/mock/path',
    extensionUri: {} as any,
    environmentVariableCollection: {} as any,
    storagePath: '/mock/storage',
    globalStoragePath: '/mock/global-storage',
    logPath: '/mock/log',
    extensionMode: 3,
    storageUri: {} as any,
    globalStorageUri: {} as any,
    logUri: {} as any,
    extension: {} as any,
    secrets: {} as any,
    languageModelAccessInformation: {} as any,
  } as any;
};

describe('TemplateManager 属性测试', () => {
  /**
   * 属性 13: 模板变量替换正确性
   * *对于任何* 模板和变量集合，应用模板后所有变量占位符应当被正确替换
   * **验证需求: 6.1**
   */
  describe('属性 13: 模板变量替换正确性', () => {
    it('应当正确替换所有变量占位符', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成变量名数组（1-5个变量）
          fc.array(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]*$/), { minLength: 1, maxLength: 5 }),
          // 生成变量值数组
          fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
          async (variableNames, variableValues) => {
            // 确保变量名唯一
            const uniqueVarNames = Array.from(new Set(variableNames));
            if (uniqueVarNames.length === 0) {
              return true; // 跳过空数组
            }

            const context = createMockContext();
            const manager = new TemplateManager(context);

            // 构建模板内容，包含所有变量
            const templateContent = uniqueVarNames.map((name) => `{{${name}}}`).join(' ');

            // 创建模板
            const template = await manager.createTemplate({
              name: '测试模板',
              description: '用于属性测试',
              content: templateContent,
              variables: uniqueVarNames,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // 构建变量映射
            const variables: Record<string, string> = {};
            uniqueVarNames.forEach((name, index) => {
              const value = variableValues[index % variableValues.length];
              if (value !== undefined) {
                variables[name] = value;
              }
            });

            // 应用模板
            const result = manager.applyTemplate(template.id, variables);

            // 验证：结果不应包含任何未替换的变量占位符
            const hasUnreplacedVars = /\{\{[a-zA-Z][a-zA-Z0-9]*\}\}/.test(result);
            expect(hasUnreplacedVars).toBe(false);

            // 验证：结果应包含所有替换后的值
            uniqueVarNames.forEach((name) => {
              const expectedValue = variables[name];
              expect(result).toContain(expectedValue);
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当处理缺失的变量（替换为空字符串）', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]*$/), { minLength: 2, maxLength: 5 }),
          async (variableNames) => {
            const uniqueVarNames = Array.from(new Set(variableNames));
            if (uniqueVarNames.length < 2) {
              return true; // 需要至少2个变量
            }

            const context = createMockContext();
            const manager = new TemplateManager(context);

            // 构建模板内容
            const templateContent = uniqueVarNames.map((name) => `{{${name}}}`).join(' ');

            // 创建模板
            const template = await manager.createTemplate({
              name: '测试模板',
              description: '用于属性测试',
              content: templateContent,
              variables: uniqueVarNames,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // 只提供部分变量的值
            const variables: Record<string, string> = {};
            const firstVar = uniqueVarNames[0];
            if (firstVar) {
              variables[firstVar] = 'value1';
            }
            // 其他变量不提供值

            // 应用模板
            const result = manager.applyTemplate(template.id, variables);

            // 验证：提供值的变量应被替换
            expect(result).toContain('value1');

            // 验证：未提供值的变量应被替换为空字符串
            const hasUnreplacedVars = /\{\{[a-zA-Z][a-zA-Z0-9]*\}\}/.test(result);
            expect(hasUnreplacedVars).toBe(false);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当处理重复的变量占位符', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]*$/),
          fc.string(),
          fc.integer({ min: 2, max: 5 }),
          async (variableName, variableValue, repeatCount) => {
            const context = createMockContext();
            const manager = new TemplateManager(context);

            // 使用唯一分隔符来避免值本身包含分隔符的问题
            const separator = '|||SEPARATOR|||';
            const templateContent = Array(repeatCount).fill(`{{${variableName}}}`).join(separator);

            // 创建模板
            const template = await manager.createTemplate({
              name: '测试模板',
              description: '用于属性测试',
              content: templateContent,
              variables: [variableName],
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // 应用模板
            const variables = { [variableName]: variableValue };
            const result = manager.applyTemplate(template.id, variables);

            // 验证：所有重复的变量都应被替换
            const hasUnreplacedVars = /\{\{[a-zA-Z][a-zA-Z0-9]*\}\}/.test(result);
            expect(hasUnreplacedVars).toBe(false);

            // 验证：结果应该是值和分隔符的组合
            const expectedParts = Array(repeatCount).fill(variableValue);
            const expected = expectedParts.join(separator);
            expect(result).toBe(expected);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当正确处理包含特殊字符的变量值', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]*$/),
          fc.string(), // 可能包含特殊字符
          async (variableName, variableValue) => {
            const context = createMockContext();
            const manager = new TemplateManager(context);

            // 创建模板
            const template = await manager.createTemplate({
              name: '测试模板',
              description: '用于属性测试',
              content: `{{${variableName}}}`,
              variables: [variableName],
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // 应用模板
            const variables = { [variableName]: variableValue };
            const result = manager.applyTemplate(template.id, variables);

            // 验证：结果应等于变量值
            expect(result).toBe(variableValue);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
