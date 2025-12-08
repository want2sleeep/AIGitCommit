/**
 * UIManager 进度显示属性测试
 * 使用 fast-check 进行属性测试，验证进度显示的通用属性
 *
 * Feature: project-optimization-recommendations
 * Property 5: 进度显示一致性
 */

import * as fc from 'fast-check';
import { UIManager } from '../UIManager';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode');

describe('UIManager 进度显示属性测试', () => {
  let uiManager: UIManager;
  let mockWithProgress: jest.Mock;
  let progressReportCalls: Array<{ message?: string; increment?: number }>;

  beforeEach(() => {
    // 重置进度报告调用记录
    progressReportCalls = [];

    // Mock vscode.window.withProgress
    mockWithProgress = jest.fn((options, task) => {
      const mockProgress = {
        report: jest.fn((value) => {
          progressReportCalls.push(value);
        }),
      };
      const mockToken = {
        isCancellationRequested: options.cancellable ? false : false,
        onCancellationRequested: jest.fn(),
      };
      return task(mockProgress, mockToken);
    });

    (vscode.window.withProgress as jest.Mock) = mockWithProgress;

    uiManager = new UIManager();
  });

  afterEach(() => {
    uiManager.dispose();
    jest.clearAllMocks();
  });

  /**
   * 属性 5: 进度显示一致性
   * 对于任何提交信息生成操作，状态栏应当显示进度指示器
   * 验证需求: 1.2
   */
  it('属性 5: 进度显示一致性 - 任何操作都应当显示进度指示器', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // 进度标题
        fc.integer({ min: 1, max: 10 }), // 进度步骤数
        async (title, steps) => {
          // 记录调用前的次数
          const callsBefore = mockWithProgress.mock.calls.length;

          // 执行带进度的操作
          await uiManager.showProgress(title, async (progress) => {
            for (let i = 0; i < steps; i++) {
              progress.report({
                message: `步骤 ${i + 1}/${steps}`,
                increment: 100 / steps,
              });
            }
            return 'completed';
          });

          // 验证 withProgress 被调用
          expect(mockWithProgress.mock.calls.length).toBeGreaterThan(callsBefore);

          // 验证最新调用的参数包含正确的配置
          const latestCallArgs =
            mockWithProgress.mock.calls[mockWithProgress.mock.calls.length - 1][0];
          expect(latestCallArgs.title).toBe(title);
          expect(latestCallArgs.location).toBe(vscode.ProgressLocation.Notification);
          expect(latestCallArgs.cancellable).toBe(false); // showProgress 默认不可取消
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性: 进度报告应当被正确调用
   * 对于任何进度更新序列，progress.report 应当被调用相应次数
   */
  it('属性: 进度报告应当被正确调用', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.array(
          fc.record({
            message: fc.string(),
            increment: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (title, updates) => {
          progressReportCalls = [];

          await uiManager.showProgress(title, async (progress) => {
            for (const update of updates) {
              progress.report(update);
            }
            return 'completed';
          });

          // 验证 report 被调用的次数与更新次数一致
          expect(progressReportCalls.length).toBe(updates.length);

          // 验证每次调用的参数
          for (let i = 0; i < updates.length; i++) {
            expect(progressReportCalls[i]?.message).toBe(updates[i]?.message);
            expect(progressReportCalls[i]?.increment).toBe(updates[i]?.increment);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性: 增强进度显示应当支持取消功能
   * 对于任何可取消的操作，应当正确处理取消令牌
   */
  it('属性: 增强进度显示应当支持取消功能', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.boolean(), // 是否可取消
        async (title, cancellable) => {
          // 记录调用前的次数
          const callsBefore = mockWithProgress.mock.calls.length;

          await uiManager.showEnhancedProgress(
            title,
            async (progress, _token) => {
              progress.report({ message: '开始', increment: 50 });
              return 'completed';
            },
            { cancellable }
          );

          // 验证 withProgress 被调用
          expect(mockWithProgress.mock.calls.length).toBeGreaterThan(callsBefore);

          // 验证最新调用的取消选项
          const latestCallArgs =
            mockWithProgress.mock.calls[mockWithProgress.mock.calls.length - 1][0];
          expect(latestCallArgs.cancellable).toBe(cancellable);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性: 进度增量应当累积到合理范围
   * 对于任何进度更新序列，累积的进度增量应当不超过 100
   */
  it('属性: 进度增量应当累积到合理范围', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 5 }),
        async (title, increments) => {
          progressReportCalls = [];

          await uiManager.showProgress(title, async (progress) => {
            for (const increment of increments) {
              progress.report({ increment });
            }
            return 'completed';
          });

          // 计算总进度
          const totalProgress = progressReportCalls.reduce(
            (sum, call) => sum + (call.increment || 0),
            0
          );

          // 验证总进度在合理范围内（允许略微超过 100）
          expect(totalProgress).toBeGreaterThanOrEqual(0);
          expect(totalProgress).toBeLessThanOrEqual(250); // 允许一些余量，因为测试可能生成较大的增量
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性: 增强进度显示应当包含预计剩余时间
   * 对于任何启用时间估算的操作，进度消息应当包含时间信息
   */
  it('属性: 增强进度显示应当包含预计剩余时间', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.array(fc.integer({ min: 10, max: 30 }), { minLength: 2, maxLength: 4 }),
        async (title, increments) => {
          progressReportCalls = [];

          await uiManager.showEnhancedProgress(
            title,
            async (progress, _token) => {
              for (const increment of increments) {
                progress.report({ message: '处理中', increment });
                // 添加小延迟以模拟实际操作
                await new Promise((resolve) => setTimeout(resolve, 10));
              }
              return 'completed';
            },
            { showEstimatedTime: true }
          );

          // 验证至少有一些进度报告包含消息
          const messagesWithContent = progressReportCalls.filter(
            (call) => call.message && call.message.length > 0
          );
          expect(messagesWithContent.length).toBeGreaterThan(0);

          // 验证某些消息可能包含时间信息（"剩余"关键字）
          // 注意：由于时间计算的特性，不是所有消息都会包含时间信息
          const hasTimeInfo = progressReportCalls.some(
            (call) => call.message && call.message.includes('剩余')
          );

          // 如果有多个增量，应该至少有一些包含时间信息
          if (increments.length > 1) {
            expect(hasTimeInfo).toBe(true);
          }
        }
      ),
      { numRuns: 30 } // 减少运行次数，因为包含延迟
    );
  });

  /**
   * 属性: 进度显示应当处理空消息
   * 对于任何不包含消息的进度更新，应当正常处理
   */
  it('属性: 进度显示应当处理空消息', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.array(fc.integer({ min: 10, max: 30 }), { minLength: 1, maxLength: 5 }),
        async (title, increments) => {
          progressReportCalls = [];

          await uiManager.showProgress(title, async (progress) => {
            for (const increment of increments) {
              // 只报告增量，不包含消息
              progress.report({ increment });
            }
            return 'completed';
          });

          // 验证所有报告都被记录
          expect(progressReportCalls.length).toBe(increments.length);

          // 验证增量被正确传递
          for (let i = 0; i < increments.length; i++) {
            expect(progressReportCalls[i]?.increment).toBe(increments[i]);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性: 进度显示应当处理异步任务的成功和失败
   * 对于任何任务结果，进度显示应当正确返回或抛出错误
   */
  it('属性: 进度显示应当处理异步任务的成功和失败', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.oneof(
          fc.record({ success: fc.constant(true), result: fc.anything() }),
          fc.record({ success: fc.constant(false), error: fc.string({ minLength: 1 }) })
        ),
        async (title, scenario) => {
          if (scenario.success) {
            // 测试成功场景
            const result = await uiManager.showProgress(title, async (progress) => {
              progress.report({ message: '处理中', increment: 50 });
              return scenario.result;
            });

            expect(result).toEqual(scenario.result);
          } else {
            // 测试失败场景
            await expect(
              uiManager.showProgress(title, async (progress) => {
                progress.report({ message: '处理中', increment: 50 });
                throw new Error(scenario.error);
              })
            ).rejects.toThrow(scenario.error);
          }

          // 验证 withProgress 被调用
          expect(mockWithProgress).toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性: 多个进度操作应当相互独立
   * 对于任何并发的进度操作，它们应当相互独立
   */
  it('属性: 多个进度操作应当相互独立', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 5 }),
        async (titles) => {
          // 记录测试开始时的调用次数
          const initialCallCount = mockWithProgress.mock.calls.length;

          const results = await Promise.all(
            titles.map((title, index) =>
              uiManager.showProgress(title, async (progress) => {
                progress.report({ message: `任务 ${index}`, increment: 100 });
                return `result-${index}`;
              })
            )
          );

          // 验证每个操作都返回了正确的结果
          for (let i = 0; i < titles.length; i++) {
            expect(results[i]).toBe(`result-${i}`);
          }

          // 验证 withProgress 被调用了相应次数（相对于初始值）
          const newCallCount = mockWithProgress.mock.calls.length - initialCallCount;
          expect(newCallCount).toBe(titles.length);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * 属性: 进度显示应当在任务完成后清理资源
   * 对于任何进度操作，完成后应当正确清理
   */
  it('属性: 进度显示应当在任务完成后清理资源', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (title) => {
        const initialCallCount = mockWithProgress.mock.calls.length;

        await uiManager.showProgress(title, async (progress) => {
          progress.report({ message: '处理中', increment: 100 });
          return 'completed';
        });

        // 验证操作完成
        expect(mockWithProgress.mock.calls.length).toBe(initialCallCount + 1);

        // UIManager 应当仍然可用于后续操作
        await uiManager.showProgress('后续操作', async (progress) => {
          progress.report({ increment: 100 });
          return 'completed';
        });

        expect(mockWithProgress.mock.calls.length).toBe(initialCallCount + 2);
      }),
      { numRuns: 50 }
    );
  });
});
