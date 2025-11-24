/**
 * ServiceContainer 单元测试
 */

import * as vscode from 'vscode';
import { ServiceContainer, ServiceKeys, configureServices } from '../ServiceContainer';

// Mock VSCode API
jest.mock('vscode');

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  afterEach(() => {
    container.clear();
  });

  describe('register', () => {
    it('应当注册服务工厂', () => {
      const factory = jest.fn(() => ({ name: 'TestService' }));

      container.register('TestService', factory);

      expect(container.has('TestService')).toBe(true);
    });

    it('应当默认注册为单例', () => {
      const factory = jest.fn(() => ({ id: Math.random() }));

      container.register('TestService', factory);

      const instance1 = container.resolve('TestService');
      const instance2 = container.resolve('TestService');

      expect(instance1).toBe(instance2);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('应当支持非单例模式', () => {
      const factory = jest.fn(() => ({ id: Math.random() }));

      container.register('TestService', factory, false);

      const instance1 = container.resolve('TestService');
      const instance2 = container.resolve('TestService');

      expect(instance1).not.toBe(instance2);
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe('registerInstance', () => {
    it('应当注册服务实例', () => {
      const instance = { name: 'TestService' };

      container.registerInstance('TestService', instance);

      expect(container.has('TestService')).toBe(true);
      expect(container.resolve('TestService')).toBe(instance);
    });

    it('应当将实例注册为单例', () => {
      const instance = { name: 'TestService' };

      container.registerInstance('TestService', instance);

      const resolved1 = container.resolve('TestService');
      const resolved2 = container.resolve('TestService');

      expect(resolved1).toBe(instance);
      expect(resolved2).toBe(instance);
    });
  });

  describe('resolve', () => {
    it('应当解析已注册的服务', () => {
      const service = { name: 'TestService' };
      container.register('TestService', () => service);

      const resolved = container.resolve('TestService');

      expect(resolved).toBe(service);
    });

    it('应当在服务未注册时抛出错误', () => {
      expect(() => container.resolve('NonExistentService')).toThrow(
        'Service not registered: NonExistentService'
      );
    });

    it('应当优先返回已缓存的实例', () => {
      const factory = jest.fn(() => ({ id: Math.random() }));
      container.register('TestService', factory);

      const instance1 = container.resolve('TestService');
      const instance2 = container.resolve('TestService');

      expect(instance1).toBe(instance2);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('应当支持泛型类型', () => {
      interface ITestService {
        getName(): string;
      }

      class TestService implements ITestService {
        getName(): string {
          return 'test';
        }
      }

      container.register<ITestService>('TestService', () => new TestService());

      const service = container.resolve<ITestService>('TestService');

      expect(service.getName()).toBe('test');
    });
  });

  describe('has', () => {
    it('应当在服务已注册时返回 true', () => {
      container.register('TestService', () => ({}));

      expect(container.has('TestService')).toBe(true);
    });

    it('应当在服务未注册时返回 false', () => {
      expect(container.has('NonExistentService')).toBe(false);
    });

    it('应当检测已注册的实例', () => {
      container.registerInstance('TestService', {});

      expect(container.has('TestService')).toBe(true);
    });
  });

  describe('clear', () => {
    it('应当清除所有服务', () => {
      container.register('Service1', () => ({}));
      container.register('Service2', () => ({}));
      container.registerInstance('Service3', {});

      container.clear();

      expect(container.has('Service1')).toBe(false);
      expect(container.has('Service2')).toBe(false);
      expect(container.has('Service3')).toBe(false);
    });

    it('应当清除已缓存的实例', () => {
      const factory = jest.fn(() => ({ id: Math.random() }));
      container.register('TestService', factory);

      const instance1 = container.resolve('TestService');
      container.clear();

      container.register('TestService', factory);
      const instance2 = container.resolve('TestService');

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getRegisteredKeys', () => {
    it('应当返回所有已注册的服务键', () => {
      container.register('Service1', () => ({}));
      container.register('Service2', () => ({}));
      container.registerInstance('Service3', {});

      const keys = container.getRegisteredKeys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('Service1');
      expect(keys).toContain('Service2');
      expect(keys).toContain('Service3');
    });

    it('应当在没有服务时返回空数组', () => {
      const keys = container.getRegisteredKeys();

      expect(keys).toEqual([]);
    });

    it('应当不包含重复的键', () => {
      container.register('TestService', () => ({}));
      container.resolve('TestService'); // 创建实例

      const keys = container.getRegisteredKeys();

      expect(keys).toEqual(['TestService']);
    });
  });

  describe('依赖注入', () => {
    it('应当支持服务间的依赖关系', () => {
      interface ILogger {
        log(message: string): void;
      }

      interface IUserService {
        getUser(): string;
      }

      class Logger implements ILogger {
        log(_message: string): void {
          // Mock implementation
        }
      }

      class UserService implements IUserService {
        constructor(private logger: ILogger) {}

        getUser(): string {
          this.logger.log('Getting user');
          return 'user';
        }
      }

      container.register<ILogger>('Logger', () => new Logger());
      container.register<IUserService>('UserService', () => {
        const logger = container.resolve<ILogger>('Logger');
        return new UserService(logger);
      });

      const userService = container.resolve<IUserService>('UserService');

      expect(userService.getUser()).toBe('user');
    });
  });
});

describe('ServiceKeys', () => {
  it('应当定义所有服务的键', () => {
    expect(ServiceKeys.ErrorHandler).toBe('ErrorHandler');
    expect(ServiceKeys.UIManager).toBe('UIManager');
    expect(ServiceKeys.ConfigurationManager).toBe('ConfigurationManager');
    expect(ServiceKeys.GitService).toBe('GitService');
    expect(ServiceKeys.LLMService).toBe('LLMService');
    expect(ServiceKeys.CommandHandler).toBe('CommandHandler');
  });

  it('应当包含所有必需的服务键', () => {
    const requiredKeys = [
      'ErrorHandler',
      'UIManager',
      'ConfigurationManager',
      'ConfigurationStatusChecker',
      'ConfigurationInterceptor',
      'FirstTimeUserGuide',
      'GitService',
      'LLMService',
      'ProviderManager',
      'CustomCandidatesManager',
      'ConfigurationPanelManager',
      'CommandHandler',
    ];

    requiredKeys.forEach((key) => {
      expect(ServiceKeys).toHaveProperty(key);
    });
  });
});

describe('configureServices', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = {
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
      secrets: {
        get: jest.fn(),
        store: jest.fn(),
        delete: jest.fn(),
      },
      subscriptions: [],
    } as any;
  });

  it('应当返回配置好的服务容器', () => {
    const container = configureServices(mockContext);

    expect(container).toBeInstanceOf(ServiceContainer);
  });

  it('应当注册所有核心服务', () => {
    const container = configureServices(mockContext);

    expect(container.has(ServiceKeys.ErrorHandler)).toBe(true);
    expect(container.has(ServiceKeys.UIManager)).toBe(true);
    expect(container.has(ServiceKeys.ConfigurationManager)).toBe(true);
    expect(container.has(ServiceKeys.GitService)).toBe(true);
    expect(container.has(ServiceKeys.LLMService)).toBe(true);
    expect(container.has(ServiceKeys.CommandHandler)).toBe(true);
  });

  it('应当能够解析所有已注册的服务', () => {
    const container = configureServices(mockContext);

    expect(() => container.resolve(ServiceKeys.ErrorHandler)).not.toThrow();
    expect(() => container.resolve(ServiceKeys.UIManager)).not.toThrow();
    expect(() => container.resolve(ServiceKeys.ConfigurationManager)).not.toThrow();
    expect(() => container.resolve(ServiceKeys.GitService)).not.toThrow();
    expect(() => container.resolve(ServiceKeys.LLMService)).not.toThrow();
  });

  it('应当正确处理服务依赖关系', () => {
    const container = configureServices(mockContext);

    // CommandHandler 依赖多个服务
    const commandHandler = container.resolve(ServiceKeys.CommandHandler);

    expect(commandHandler).toBeDefined();
  });

  it('应当将服务注册为单例', () => {
    const container = configureServices(mockContext);

    const errorHandler1 = container.resolve(ServiceKeys.ErrorHandler);
    const errorHandler2 = container.resolve(ServiceKeys.ErrorHandler);

    expect(errorHandler1).toBe(errorHandler2);
  });
});
