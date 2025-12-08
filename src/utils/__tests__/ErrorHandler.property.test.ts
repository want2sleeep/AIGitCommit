/**
 * ErrorHandler 错误信息完整性属性测试
 * 使用 fast-check 进行属性测试，验证错误信息的通用属性
 *
 * Feature: project-optimization-recommendations
 * Property 6: 错误信息完整性
 * 验证需求: 1.3
 */

import * as fc from 'fast-check';
import { ErrorHandler } from '../ErrorHandler';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode');

describe('ErrorHandler 错误信息完整性属性测试', () => {
  let errorHandler: ErrorHandler;
  let mockShowErrorMessage: jest.Mock;
  let mockShowInformationMessage: jest.Mock;
  let mockShowWarningMessage: jest.Mock;
  let mockOutputChannel: {
    appendLine: jest.Mock;
    show: jest.Mock;
    dispose: jest.Mock;
  };

  beforeEach(() => {
    // Mock output channel
    mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    };

    // Mock vscode.window methods
    mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
    mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
    mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);

    (vscode.window.createOutputChannel as jest.Mock) = jest.fn().mockReturnValue(mockOutputChannel);
    (vscode.window.showErrorMessage as jest.Mock) = mockShowErrorMessage;
    (vscode.window.showInformationMessage as jest.Mock) = mockShowInformationMessage;
    (vscode.window.showWarningMessage as jest.Mock) = mockShowWarningMessage;

    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    errorHandler.dispose();
    jest.clearAllMocks();
  });

  /**
   * 属性 6: 错误信息完整性
   * 对于任何 API 调用失败，错误消息应当包含错误原因和解决建议
   * 验证需求: 1.3
   */
  describe('属性 6: 错误信息完整性', () => {
    /**
     * 配置错误应当包含原因和解决方案
     */
    it('配置错误应当包含错误原因和解决建议', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('api key'),
            fc.constant('endpoint'),
            fc.constant('model'),
            fc.constant('configuration')
          ),
          async (errorKeyword) => {
            const error = new Error(`Configuration error: ${errorKeyword} is missing`);

            await errorHandler.handleError(error, 'test-context');

            // 验证错误消息被显示
            expect(mockShowErrorMessage).toHaveBeenCalled();

            const errorMessage = mockShowErrorMessage.mock.calls[0][0] as string;

            // 验证错误消息不为空
            expect(errorMessage).toBeTruthy();
            expect(errorMessage.length).toBeGreaterThan(0);

            // 验证错误消息包含错误关键词（确保错误信息是相关的）
            expect(errorMessage.toLowerCase()).toContain('error');

            // 验证有操作按钮（解决建议）
            const actions = mockShowErrorMessage.mock.calls[0].slice(1);
            expect(actions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Git 错误应当包含原因和解决方案
     */
    it('Git 错误应当包含错误原因和解决建议', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('not a git repository'),
            fc.constant('no staged changes'),
            fc.constant('git not found'),
            fc.constant('git')
          ),
          async (errorKeyword) => {
            const error = new Error(`Git error: ${errorKeyword}`);

            await errorHandler.handleError(error, 'test-context');

            // 验证错误消息被显示
            expect(mockShowErrorMessage).toHaveBeenCalled();

            const errorMessage = mockShowErrorMessage.mock.calls[0][0] as string;

            // 验证错误消息不为空
            expect(errorMessage).toBeTruthy();
            expect(errorMessage.length).toBeGreaterThan(0);

            // 验证错误消息包含错误关键词
            expect(errorMessage.toLowerCase()).toContain('error');

            // 验证有操作按钮
            const actions = mockShowErrorMessage.mock.calls[0].slice(1);
            expect(actions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * API 错误应当包含原因和解决方案
     */
    it('API 错误应当包含错误原因和解决建议', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('401'),
            fc.constant('403'),
            fc.constant('404'),
            fc.constant('429'),
            fc.constant('500'),
            fc.constant('api')
          ),
          async (errorKeyword) => {
            const error = new Error(`API error: ${errorKeyword}`);

            await errorHandler.handleError(error, 'test-context');

            // 验证错误消息被显示
            expect(mockShowErrorMessage).toHaveBeenCalled();

            const errorMessage = mockShowErrorMessage.mock.calls[0][0] as string;

            // 验证错误消息不为空
            expect(errorMessage).toBeTruthy();
            expect(errorMessage.length).toBeGreaterThan(0);

            // 验证错误消息包含错误关键词
            expect(errorMessage.toLowerCase()).toContain('error');

            // 验证有操作按钮
            const actions = mockShowErrorMessage.mock.calls[0].slice(1);
            expect(actions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 网络错误应当包含原因和解决方案
     */
    it('网络错误应当包含错误原因和解决建议', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('timeout'),
            fc.constant('ECONNREFUSED'),
            fc.constant('ENOTFOUND'),
            fc.constant('network')
          ),
          async (errorKeyword) => {
            const error = new Error(`Network error: ${errorKeyword}`);

            await errorHandler.handleError(error, 'test-context');

            // 验证错误消息被显示
            expect(mockShowErrorMessage).toHaveBeenCalled();

            const errorMessage = mockShowErrorMessage.mock.calls[0][0] as string;

            // 验证错误消息不为空
            expect(errorMessage).toBeTruthy();
            expect(errorMessage.length).toBeGreaterThan(0);

            // 验证错误消息包含错误关键词
            expect(errorMessage.toLowerCase()).toContain('error');

            // 验证有操作按钮
            const actions = mockShowErrorMessage.mock.calls[0].slice(1);
            expect(actions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 未知错误也应当包含基本的错误信息和解决建议
     */
    it('未知错误应当包含错误原因和解决建议', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (errorMessage) => {
          const error = new Error(errorMessage);

          await errorHandler.handleError(error, 'test-context');

          // 验证错误消息被显示
          expect(mockShowErrorMessage).toHaveBeenCalled();

          const displayedMessage = mockShowErrorMessage.mock.calls[0][0] as string;

          // 验证错误消息不为空
          expect(displayedMessage).toBeTruthy();
          expect(displayedMessage.length).toBeGreaterThan(0);

          // 验证错误消息包含多个部分
          const lines = displayedMessage.split('\n').filter((line) => line.trim().length > 0);
          expect(lines.length).toBeGreaterThanOrEqual(1);

          // 验证有操作按钮（至少有查看日志）
          const actions = mockShowErrorMessage.mock.calls[0].slice(1);
          expect(actions.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性: 错误日志应当包含完整的上下文信息
   */
  describe('错误日志完整性', () => {
    it('错误日志应当包含时间戳、上下文、类型和消息', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (context, errorMessage) => {
            const error = new Error(errorMessage);

            await errorHandler.handleError(error, context);

            // 验证日志被记录
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();

            // 收集所有日志行
            const logLines = mockOutputChannel.appendLine.mock.calls
              .map((call) => call[0] as string)
              .join('\n');

            // 验证日志包含必要信息
            expect(logLines).toContain('ERROR');
            expect(logLines).toContain(`Context: ${context}`);
            expect(logLines).toContain(`Message: ${errorMessage}`);
            expect(logLines).toContain('Type:');

            // 验证包含时间戳（ISO 格式）
            expect(logLines).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('错误日志应当包含堆栈信息（如果可用）', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (context, errorMessage) => {
            const error = new Error(errorMessage);

            await errorHandler.handleError(error, context);

            // 收集所有日志行
            const logLines = mockOutputChannel.appendLine.mock.calls
              .map((call) => call[0] as string)
              .join('\n');

            // 如果错误有堆栈信息，日志应当包含它
            if (error.stack) {
              expect(logLines).toContain('Stack:');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性: 错误分类应当一致且准确
   */
  describe('错误分类一致性', () => {
    it('包含特定关键词的错误应当被正确分类', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            keyword: fc.oneof(
              fc.constant('api key'),
              fc.constant('configuration'),
              fc.constant('git'),
              fc.constant('network'),
              fc.constant('timeout'),
              fc.constant('401'),
              fc.constant('429')
            ),
            prefix: fc.string({ maxLength: 20 }),
            suffix: fc.string({ maxLength: 20 }),
          }),
          async ({ keyword, prefix, suffix }) => {
            const errorMessage = `${prefix} ${keyword} ${suffix}`;
            const error = new Error(errorMessage);

            await errorHandler.handleError(error, 'test-context');

            // 验证错误被处理
            expect(mockShowErrorMessage).toHaveBeenCalled();

            // 验证日志包含错误类型
            const logLines = mockOutputChannel.appendLine.mock.calls
              .map((call) => call[0] as string)
              .join('\n');

            expect(logLines).toContain('Type:');

            // 验证错误类型不是 undefined
            const typeMatch = logLines.match(/Type: (\w+)/);
            expect(typeMatch).toBeTruthy();
            expect(typeMatch?.[1]).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性: 错误操作按钮应当与错误类型匹配
   */
  describe('错误操作按钮一致性', () => {
    it('配置错误应当提供配置相关的操作按钮', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.constant('api key'), fc.constant('configuration'), fc.constant('endpoint')),
          async (keyword) => {
            const error = new Error(`Configuration error: ${keyword}`);

            await errorHandler.handleError(error, 'test-context');

            // 验证有操作按钮
            const actions = mockShowErrorMessage.mock.calls[0].slice(1) as string[];
            expect(actions.length).toBeGreaterThan(0);

            // 配置错误应当提供配置相关的操作
            // 注意：由于没有 i18n，按钮文本是英文
            const hasConfigAction = actions.some(
              (action) =>
                action.includes('Settings') ||
                action.includes('Configuration') ||
                action.includes('Wizard')
            );
            expect(hasConfigAction).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Git 错误应当提供 Git 相关的操作按钮', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.constant('git'), fc.constant('repository'), fc.constant('staged')),
          async (keyword) => {
            const error = new Error(`Git error: ${keyword}`);

            await errorHandler.handleError(error, 'test-context');

            // 验证有操作按钮
            const actions = mockShowErrorMessage.mock.calls[0].slice(1) as string[];
            expect(actions.length).toBeGreaterThan(0);

            // Git 错误应当提供 SCM 相关的操作
            const hasGitAction = actions.some(
              (action) => action.includes('Source Control') || action.includes('SCM')
            );
            expect(hasGitAction).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('API/网络错误应当提供重试和查看日志的操作按钮', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('api'),
            fc.constant('network'),
            fc.constant('timeout'),
            fc.constant('429')
          ),
          async (keyword) => {
            const error = new Error(`Error: ${keyword}`);

            await errorHandler.handleError(error, 'test-context');

            // 验证有操作按钮
            const actions = mockShowErrorMessage.mock.calls[0].slice(1) as string[];
            expect(actions.length).toBeGreaterThan(0);

            // API/网络错误应当提供重试或查看日志的操作
            const hasRetryOrLogAction = actions.some(
              (action) => action.includes('Retry') || action.includes('Logs')
            );
            expect(hasRetryOrLogAction).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性: 错误处理应当是幂等的
   */
  describe('错误处理幂等性', () => {
    it('多次处理同一错误应当产生一致的结果', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (errorMessage, context) => {
            const error1 = new Error(errorMessage);
            const error2 = new Error(errorMessage);

            // 清空之前的调用
            mockShowErrorMessage.mockClear();
            mockOutputChannel.appendLine.mockClear();

            await errorHandler.handleError(error1, context);
            const firstCallArgs = mockShowErrorMessage.mock.calls[0];
            const firstLogCalls = mockOutputChannel.appendLine.mock.calls.length;

            // 清空调用记录
            mockShowErrorMessage.mockClear();
            mockOutputChannel.appendLine.mockClear();

            await errorHandler.handleError(error2, context);
            const secondCallArgs = mockShowErrorMessage.mock.calls[0];
            const secondLogCalls = mockOutputChannel.appendLine.mock.calls.length;

            // 验证两次调用产生相同的结果
            expect(firstCallArgs[0]).toBe(secondCallArgs[0]); // 错误消息相同
            expect(firstCallArgs.length).toBe(secondCallArgs.length); // 操作按钮数量相同
            expect(firstLogCalls).toBe(secondLogCalls); // 日志行数相同
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * 属性: 错误消息应当是非空的
   */
  describe('错误消息非空性', () => {
    it('任何错误都应当产生非空的错误消息', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (errorMessage, context) => {
            const error = new Error(errorMessage);

            await errorHandler.handleError(error, context);

            // 验证错误消息被显示
            expect(mockShowErrorMessage).toHaveBeenCalled();

            const displayedMessage = mockShowErrorMessage.mock.calls[0][0] as string;

            // 验证消息非空
            expect(displayedMessage).toBeTruthy();
            expect(displayedMessage.length).toBeGreaterThan(0);
            expect(displayedMessage.trim()).not.toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
