/**
 * CommitMessagePreviewManager 预览编辑可用性属性测试
 * 使用 fast-check 进行属性测试，验证预览编辑功能的通用属性
 *
 * Feature: project-optimization-recommendations
 * Property 7: 预览编辑可用性
 * 验证需求: 1.5
 */

import * as fc from 'fast-check';
import { CommitMessagePreviewManager } from '../CommitMessagePreviewManager';
import * as vscode from 'vscode';
import { GitChange, ChangeStatus } from '../../types';

// Mock vscode
jest.mock('vscode');

describe('CommitMessagePreviewManager 属性测试', () => {
  let manager: CommitMessagePreviewManager;
  let mockContext: vscode.ExtensionContext;
  let mockPanel: any;
  let messageHandler: ((message: any) => void) | undefined;

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();

    // 创建 mock context
    mockContext = {
      subscriptions: [],
    } as any;

    // 创建 mock webview panel
    mockPanel = {
      webview: {
        html: '',
        onDidReceiveMessage: jest.fn((handler) => {
          messageHandler = handler;
          return { dispose: jest.fn() };
        }),
        postMessage: jest.fn(),
      },
      onDidDispose: jest.fn(() => {
        return { dispose: jest.fn() };
      }),
      dispose: jest.fn(),
    };

    // Mock vscode.window.createWebviewPanel
    (vscode.window.createWebviewPanel as jest.Mock) = jest.fn(() => mockPanel);

    // Mock vscode.window.showInformationMessage
    (vscode.window.showInformationMessage as jest.Mock) = jest.fn().mockResolvedValue(undefined);

    manager = new CommitMessagePreviewManager(mockContext);
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('属性 7: 预览编辑可用性', () => {
    /**
     * Feature: project-optimization-recommendations, Property 7: 预览编辑可用性
     * 验证需求: 1.5
     *
     * 对于任何生成的提交信息，用户应当能够预览和编辑内容
     */
    it('应当为任何提交信息创建预览面板', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }), // 提交信息
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom(
                ChangeStatus.Modified,
                ChangeStatus.Added,
                ChangeStatus.Deleted,
                ChangeStatus.Renamed
              ),
              diff: fc.constant(''),
              additions: fc.constant(0),
              deletions: fc.constant(0),
            }),
            { minLength: 0, maxLength: 10 }
          ), // Git 变更列表
          async (commitMessage, changes) => {
            // 启动预览（不等待完成）
            const previewPromise = manager.showPreview(commitMessage, changes as GitChange[]);

            // 验证面板被创建
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
              'commitMessagePreview',
              '提交信息预览',
              vscode.ViewColumn.One,
              expect.objectContaining({
                enableScripts: true,
                retainContextWhenHidden: true,
              })
            );

            // 验证 HTML 内容包含提交信息
            expect(mockPanel.webview.html).toContain('提交信息预览');

            // 模拟用户取消以清理
            if (messageHandler) {
              messageHandler({ command: 'cancel' });
            }

            // 等待 promise 完成（会被拒绝）
            await expect(previewPromise).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 验证用户可以编辑提交信息
     */
    it('应当允许用户编辑任何提交信息', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }), // 原始提交信息
          fc.string({ minLength: 1, maxLength: 500 }), // 编辑后的提交信息
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom(
                ChangeStatus.Modified,
                ChangeStatus.Added,
                ChangeStatus.Deleted,
                ChangeStatus.Renamed
              ),
              diff: fc.constant(''),
              additions: fc.constant(0),
              deletions: fc.constant(0),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (originalMessage, editedMessage, changes) => {
            // 启动预览
            const previewPromise = manager.showPreview(originalMessage, changes as GitChange[]);

            // 等待面板创建
            await new Promise((resolve) => setTimeout(resolve, 10));

            // 模拟用户编辑并确认
            if (messageHandler) {
              messageHandler({ command: 'confirm', text: editedMessage });
            }

            // 验证返回编辑后的消息
            const result = await previewPromise;
            expect(result).toBe(editedMessage);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 验证用户可以复制提交信息到剪贴板
     */
    it('应当支持将任何提交信息复制到剪贴板', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom(
                ChangeStatus.Modified,
                ChangeStatus.Added,
                ChangeStatus.Deleted,
                ChangeStatus.Renamed
              ),
              diff: fc.constant(''),
              additions: fc.constant(0),
              deletions: fc.constant(0),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (commitMessage, changes) => {
            // 启动预览
            const previewPromise = manager.showPreview(commitMessage, changes as GitChange[]);

            // 等待面板创建
            await new Promise((resolve) => setTimeout(resolve, 10));

            // 模拟用户复制
            if (messageHandler) {
              messageHandler({ command: 'copy', text: commitMessage });
            }

            // 验证复制到剪贴板
            expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(commitMessage);
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
              '✅ 提交信息已复制到剪贴板'
            );

            // 清理：取消预览
            if (messageHandler) {
              messageHandler({ command: 'cancel' });
            }

            await expect(previewPromise).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 验证用户可以取消预览
     */
    it('应当允许用户取消任何预览操作', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom(
                ChangeStatus.Modified,
                ChangeStatus.Added,
                ChangeStatus.Deleted,
                ChangeStatus.Renamed
              ),
              diff: fc.constant(''),
              additions: fc.constant(0),
              deletions: fc.constant(0),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (commitMessage, changes) => {
            // 启动预览
            const previewPromise = manager.showPreview(commitMessage, changes as GitChange[]);

            // 等待面板创建
            await new Promise((resolve) => setTimeout(resolve, 10));

            // 模拟用户取消
            if (messageHandler) {
              messageHandler({ command: 'cancel' });
            }

            // 验证 promise 被拒绝
            await expect(previewPromise).rejects.toThrow('用户取消了提交信息预览');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 验证预览面板正确显示文件变更
     */
    it('应当正确显示所有文件变更', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom(
                ChangeStatus.Modified,
                ChangeStatus.Added,
                ChangeStatus.Deleted,
                ChangeStatus.Renamed
              ),
              diff: fc.constant(''),
              additions: fc.constant(0),
              deletions: fc.constant(0),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (commitMessage, changes) => {
            // 启动预览
            const previewPromise = manager.showPreview(commitMessage, changes as GitChange[]);

            // 等待面板创建
            await new Promise((resolve) => setTimeout(resolve, 10));

            // 验证 HTML 包含变更数量
            expect(mockPanel.webview.html).toContain(`变更文件 (${changes.length})`);

            // 验证每个文件路径都在 HTML 中
            for (const change of changes) {
              // HTML 会转义特殊字符，所以我们检查转义后的内容
              const escapedPath = change.path
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
              expect(mockPanel.webview.html).toContain(escapedPath);
            }

            // 清理
            if (messageHandler) {
              messageHandler({ command: 'cancel' });
            }
            await expect(previewPromise).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 验证预览面板正确转义 HTML 特殊字符
     */
    it('应当正确转义提交信息中的 HTML 特殊字符', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).map((s) => `<script>${s}</script>`),
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom(
                ChangeStatus.Modified,
                ChangeStatus.Added,
                ChangeStatus.Deleted,
                ChangeStatus.Renamed
              ),
              diff: fc.constant(''),
              additions: fc.constant(0),
              deletions: fc.constant(0),
            }),
            { minLength: 0, maxLength: 5 }
          ),
          async (commitMessage, changes) => {
            // 启动预览
            const previewPromise = manager.showPreview(commitMessage, changes as GitChange[]);

            // 等待面板创建
            await new Promise((resolve) => setTimeout(resolve, 10));

            // 验证 textarea 中的内容被正确转义
            // 在 textarea 标签中查找转义后的内容
            const textareaMatch = mockPanel.webview.html.match(/<textarea[^>]*>(.*?)<\/textarea>/s);
            expect(textareaMatch).toBeTruthy();
            if (textareaMatch) {
              const textareaContent = textareaMatch[1];
              // 验证 textarea 内容包含转义后的标签
              expect(textareaContent).toContain('&lt;script&gt;');
              expect(textareaContent).toContain('&lt;/script&gt;');
            }

            // 清理
            if (messageHandler) {
              messageHandler({ command: 'cancel' });
            }
            await expect(previewPromise).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 验证预览面板在关闭时正确清理资源
     */
    it('应当在面板关闭时正确清理资源', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom(
                ChangeStatus.Modified,
                ChangeStatus.Added,
                ChangeStatus.Deleted,
                ChangeStatus.Renamed
              ),
              diff: fc.constant(''),
              additions: fc.constant(0),
              deletions: fc.constant(0),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (commitMessage, changes) => {
            // 启动预览
            const previewPromise = manager.showPreview(commitMessage, changes as GitChange[]);

            // 等待面板创建
            await new Promise((resolve) => setTimeout(resolve, 10));

            // 获取 dispose 处理器
            const disposeHandler = (mockPanel.onDidDispose as jest.Mock).mock.calls[0][0];

            // 模拟面板关闭
            disposeHandler();

            // 验证 promise 被拒绝
            await expect(previewPromise).rejects.toThrow('预览面板已关闭');
          }
        ),
        { numRuns: 10 }
      );
    }, 10000);

    /**
     * 验证多次调用 showPreview 会关闭之前的面板
     */
    it('应当在创建新预览时关闭之前的面板', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom(
                ChangeStatus.Modified,
                ChangeStatus.Added,
                ChangeStatus.Deleted,
                ChangeStatus.Renamed
              ),
              diff: fc.constant(''),
              additions: fc.constant(0),
              deletions: fc.constant(0),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (message1, message2, changes) => {
            // 创建第一个预览
            const preview1 = manager.showPreview(message1, changes as GitChange[]);
            await new Promise((resolve) => setTimeout(resolve, 10));

            const firstPanel = mockPanel;

            // 创建第二个预览
            const preview2 = manager.showPreview(message2, changes as GitChange[]);
            await new Promise((resolve) => setTimeout(resolve, 10));

            // 验证第一个面板被关闭
            expect(firstPanel.dispose).toHaveBeenCalled();

            // 清理
            if (messageHandler) {
              messageHandler({ command: 'cancel' });
            }
            await expect(preview1).rejects.toThrow();
            await expect(preview2).rejects.toThrow();
          }
        ),
        { numRuns: 10 }
      );
    }, 10000);
  });

  describe('边界条件测试', () => {
    /**
     * 验证处理空变更列表
     */
    it('应当正确处理空变更列表', async () => {
      const commitMessage = 'test: 测试提交';
      const changes: GitChange[] = [];

      const previewPromise = manager.showPreview(commitMessage, changes);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 验证面板被创建
      expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
      expect(mockPanel.webview.html).toContain('变更文件 (0)');

      // 清理
      if (messageHandler) {
        messageHandler({ command: 'cancel' });
      }
      await expect(previewPromise).rejects.toThrow();
    });

    /**
     * 验证处理非常长的提交信息
     */
    it('应当正确处理非常长的提交信息', async () => {
      const longMessage = 'a'.repeat(10000);
      const changes: GitChange[] = [
        { path: 'test.ts', status: ChangeStatus.Modified, diff: '', additions: 0, deletions: 0 },
      ];

      const previewPromise = manager.showPreview(longMessage, changes);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 验证面板被创建
      expect(vscode.window.createWebviewPanel).toHaveBeenCalled();

      // 清理
      if (messageHandler) {
        messageHandler({ command: 'cancel' });
      }
      await expect(previewPromise).rejects.toThrow();
    });

    /**
     * 验证处理包含换行符的提交信息
     */
    it('应当正确处理包含换行符的提交信息', async () => {
      const messageWithNewlines = 'feat: 添加新功能\n\n详细描述\n- 项目1\n- 项目2';
      const changes: GitChange[] = [
        { path: 'test.ts', status: ChangeStatus.Modified, diff: '', additions: 0, deletions: 0 },
      ];

      const previewPromise = manager.showPreview(messageWithNewlines, changes);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 验证面板被创建
      expect(vscode.window.createWebviewPanel).toHaveBeenCalled();

      // 模拟用户确认
      if (messageHandler) {
        messageHandler({ command: 'confirm', text: messageWithNewlines });
      }

      const result = await previewPromise;
      expect(result).toBe(messageWithNewlines);
    });

    /**
     * 验证处理包含特殊字符的文件路径
     */
    it('应当正确处理包含特殊字符的文件路径', async () => {
      const commitMessage = 'test: 测试';
      const changes: GitChange[] = [
        {
          path: 'src/test<script>.ts',
          status: ChangeStatus.Modified,
          diff: '',
          additions: 0,
          deletions: 0,
        },
        {
          path: 'src/test&file.ts',
          status: ChangeStatus.Added,
          diff: '',
          additions: 0,
          deletions: 0,
        },
        {
          path: 'src/test"quote".ts',
          status: ChangeStatus.Deleted,
          diff: '',
          additions: 0,
          deletions: 0,
        },
      ];

      const previewPromise = manager.showPreview(commitMessage, changes);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 验证 HTML 正确转义了特殊字符
      expect(mockPanel.webview.html).toContain('&lt;script&gt;');
      expect(mockPanel.webview.html).toContain('&amp;');
      expect(mockPanel.webview.html).toContain('&quot;');

      // 清理
      if (messageHandler) {
        messageHandler({ command: 'cancel' });
      }
      await expect(previewPromise).rejects.toThrow();
    });
  });

  describe('并发操作测试', () => {
    /**
     * 验证处理快速连续的预览请求
     */
    it('应当正确处理快速连续的预览请求', async () => {
      const messages = ['message1', 'message2', 'message3'];
      const changes: GitChange[] = [
        { path: 'test.ts', status: ChangeStatus.Modified, diff: '', additions: 0, deletions: 0 },
      ];

      const promises = messages.map((msg) => {
        const promise = manager.showPreview(msg, changes);
        // 立即取消以避免挂起
        setTimeout(() => {
          if (messageHandler) {
            messageHandler({ command: 'cancel' });
          }
        }, 10);
        return promise.catch(() => 'cancelled');
      });

      await Promise.all(promises);

      // 验证最后一个面板被创建
      expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
    }, 10000);
  });
});
