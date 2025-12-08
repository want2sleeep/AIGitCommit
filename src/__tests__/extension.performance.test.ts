/**
 * 扩展激活性能测试
 * 验证扩展激活时间符合性能要求
 *
 * Feature: project-optimization-recommendations
 * Property 1: 扩展激活时间限制
 */

import * as vscode from 'vscode';
import { activate } from '../extension';

describe('扩展激活性能测试', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    // 创建模拟的扩展上下文
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn(() => []),
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
        setKeysForSync: jest.fn(),
        keys: jest.fn(() => []),
      },
      secrets: {
        get: jest.fn(),
        store: jest.fn(),
        delete: jest.fn(),
        onDidChange: jest.fn(),
        keys: jest.fn(() => Promise.resolve([])),
      },
      extensionUri: vscode.Uri.file('/mock/extension/path'),
      extensionPath: '/mock/extension/path',
      environmentVariableCollection: {} as any,
      asAbsolutePath: jest.fn((relativePath: string) => `/mock/extension/path/${relativePath}`),
      storageUri: vscode.Uri.file('/mock/storage'),
      storagePath: '/mock/storage',
      globalStorageUri: vscode.Uri.file('/mock/global/storage'),
      globalStoragePath: '/mock/global/storage',
      logUri: vscode.Uri.file('/mock/log'),
      logPath: '/mock/log',
      extensionMode: vscode.ExtensionMode.Test,
      extension: {} as any,
      languageModelAccessInformation: {} as any,
    } as vscode.ExtensionContext;
  });

  afterEach(() => {
    // 清理订阅
    mockContext.subscriptions.forEach((subscription: any) => {
      if (subscription && typeof subscription.dispose === 'function') {
        subscription.dispose();
      }
    });
  });

  /**
   * 属性 1: 扩展激活时间限制
   * 对于任何扩展激活操作，激活时间应当不超过 500 毫秒
   * 验证需求: 2.1
   */
  it('属性 1: 扩展激活时间应当不超过 500ms', async () => {
    const startTime = performance.now();

    // 激活扩展
    await activate(mockContext);

    const activationTime = performance.now() - startTime;

    // 验证激活时间
    expect(activationTime).toBeLessThan(500);

    console.log(`扩展激活时间: ${Math.round(activationTime)}ms`);
  });

  /**
   * 多次激活测试 - 确保激活时间稳定
   */
  it('多次激活应当保持稳定的性能', async () => {
    const activationTimes: number[] = [];
    const iterations = 5;

    for (let i = 0; i < iterations; i++) {
      // 重新创建上下文
      const context = {
        ...mockContext,
        subscriptions: [],
      };

      const startTime = performance.now();
      await activate(context);
      const activationTime = performance.now() - startTime;

      activationTimes.push(activationTime);

      // 清理
      context.subscriptions.forEach((subscription: any) => {
        if (subscription && typeof subscription.dispose === 'function') {
          subscription.dispose();
        }
      });
    }

    // 计算平均激活时间
    const avgTime = activationTimes.reduce((sum, time) => sum + time, 0) / iterations;
    const maxTime = Math.max(...activationTimes);

    console.log(`平均激活时间: ${Math.round(avgTime)}ms`);
    console.log(`最大激活时间: ${Math.round(maxTime)}ms`);
    console.log(`所有激活时间: ${activationTimes.map((t) => Math.round(t)).join(', ')}ms`);

    // 验证所有激活都在限制内
    activationTimes.forEach((time) => {
      expect(time).toBeLessThan(500);
    });

    // 验证平均时间也在合理范围内
    expect(avgTime).toBeLessThan(400);
  });

  /**
   * 冷启动测试 - 模拟首次激活
   */
  it('冷启动激活时间应当在限制内', async () => {
    // 模拟冷启动 - 清空所有缓存
    const coldStartContext = {
      ...mockContext,
      workspaceState: {
        get: jest.fn(() => undefined),
        update: jest.fn(),
        keys: jest.fn(() => []),
      },
      globalState: {
        get: jest.fn(() => undefined),
        update: jest.fn(),
        setKeysForSync: jest.fn(),
        keys: jest.fn(() => []),
      },
    };

    const startTime = performance.now();
    await activate(coldStartContext);
    const activationTime = performance.now() - startTime;

    console.log(`冷启动激活时间: ${Math.round(activationTime)}ms`);

    // 冷启动可能稍慢，但仍应在限制内
    expect(activationTime).toBeLessThan(500);
  });

  /**
   * 热启动测试 - 模拟有缓存的激活
   */
  it('热启动激活时间应当更快', async () => {
    // 模拟热启动 - 有缓存数据
    const hotStartContext = {
      ...mockContext,
      workspaceState: {
        get: jest.fn((key: string) => {
          if (key === 'hasShownWelcome') {
            return true;
          }
          return undefined;
        }),
        update: jest.fn(),
        keys: jest.fn(() => ['hasShownWelcome']),
      },
      globalState: {
        get: jest.fn((key: string) => {
          if (key === 'configVersion') {
            return '1.0.0';
          }
          return undefined;
        }),
        update: jest.fn(),
        setKeysForSync: jest.fn(),
        keys: jest.fn(() => ['configVersion']),
      },
    };

    const startTime = performance.now();
    await activate(hotStartContext);
    const activationTime = performance.now() - startTime;

    console.log(`热启动激活时间: ${Math.round(activationTime)}ms`);

    // 热启动应该更快
    expect(activationTime).toBeLessThan(300);
  });

  /**
   * 服务初始化性能测试
   */
  it('服务容器初始化应当快速完成', async () => {
    const startTime = performance.now();

    await activate(mockContext);

    const activationTime = performance.now() - startTime;

    // 验证服务已注册
    expect(mockContext.subscriptions.length).toBeGreaterThan(0);

    // 验证激活时间
    expect(activationTime).toBeLessThan(500);

    console.log(`服务初始化完成，注册了 ${mockContext.subscriptions.length} 个订阅`);
  });

  /**
   * 命令注册性能测试
   */
  it('命令注册应当不影响激活性能', async () => {
    const startTime = performance.now();

    await activate(mockContext);

    const activationTime = performance.now() - startTime;

    // 验证命令已注册（通过检查订阅数量）
    expect(mockContext.subscriptions.length).toBeGreaterThan(0);

    // 验证激活时间仍在限制内
    expect(activationTime).toBeLessThan(500);

    console.log(`命令注册完成，激活时间: ${Math.round(activationTime)}ms`);
  });

  /**
   * 内存使用测试
   */
  it('激活后内存使用应当合理', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    await activate(mockContext);

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

    console.log(`激活后内存增加: ${Math.round(memoryIncrease * 100) / 100}MB`);

    // 验证内存增加在合理范围内（不超过 50MB）
    expect(memoryIncrease).toBeLessThan(50);
  });
});
