/**
 * ProxyConfigManager 单元测试
 * 测试代理配置管理器的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { ProxyConfigManager, ProxyConfig } from '../ProxyConfigManager';
import * as vscode from 'vscode';

// Mock vscode 模块
jest.mock('vscode', () => ({
  ExtensionContext: jest.fn(),
}));

describe('ProxyConfigManager', () => {
  let manager: ProxyConfigManager;
  let mockContext: vscode.ExtensionContext;
  let mockGlobalState: Map<string, unknown>;

  beforeEach(() => {
    mockGlobalState = new Map();
    mockContext = {
      globalState: {
        get: jest.fn((key: string) => mockGlobalState.get(key)),
        update: jest.fn((key: string, value: unknown) => {
          if (value === undefined) {
            mockGlobalState.delete(key);
          } else {
            mockGlobalState.set(key, value);
          }
          return Promise.resolve();
        }),
      },
    } as unknown as vscode.ExtensionContext;

    manager = new ProxyConfigManager(mockContext);
  });

  describe('配置管理', () => {
    it('应当初始时没有代理配置', () => {
      expect(manager.getProxyConfig()).toBeUndefined();
    });

    it('应当能够设置代理配置', async () => {
      const config: ProxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'http',
      };

      await manager.setProxyConfig(config);
      expect(manager.getProxyConfig()).toEqual(config);
    });

    it('应当能够清除代理配置', async () => {
      const config: ProxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'http',
      };

      await manager.setProxyConfig(config);
      await manager.clearProxyConfig();
      expect(manager.getProxyConfig()).toBeUndefined();
    });

    it('应当持久化配置到全局状态', async () => {
      const config: ProxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'http',
      };

      await manager.setProxyConfig(config);
      expect(mockContext.globalState.update).toHaveBeenCalled();
    });
  });

  describe('配置验证', () => {
    it('应当拒绝空主机', async () => {
      const config: ProxyConfig = {
        host: '',
        port: 8080,
        protocol: 'http',
      };

      await expect(manager.setProxyConfig(config)).rejects.toThrow('代理主机不能为空');
    });

    it('应当拒绝无效端口', async () => {
      const config: ProxyConfig = {
        host: 'proxy.example.com',
        port: 0,
        protocol: 'http',
      };

      await expect(manager.setProxyConfig(config)).rejects.toThrow('代理端口必须在 1-65535 之间');
    });

    it('应当拒绝超出范围的端口', async () => {
      const config: ProxyConfig = {
        host: 'proxy.example.com',
        port: 70000,
        protocol: 'http',
      };

      await expect(manager.setProxyConfig(config)).rejects.toThrow('代理端口必须在 1-65535 之间');
    });

    it('应当拒绝无效协议', async () => {
      const config = {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'ftp' as 'http',
      };

      await expect(manager.setProxyConfig(config)).rejects.toThrow(
        '代理协议必须是 http、https 或 socks5'
      );
    });

    it('应当要求密码当提供用户名时', async () => {
      const config: ProxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'http',
        username: 'user',
      };

      await expect(manager.setProxyConfig(config)).rejects.toThrow('提供用户名时必须提供密码');
    });
  });

  describe('axios 配置', () => {
    it('应当返回 undefined 当没有代理配置时', () => {
      expect(manager.getAxiosProxyConfig()).toBeUndefined();
    });

    it('应当返回正确的 axios 代理配置', async () => {
      const config: ProxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'http',
      };

      await manager.setProxyConfig(config);
      const axiosConfig = manager.getAxiosProxyConfig();

      expect(axiosConfig).toEqual({
        protocol: 'http',
        host: 'proxy.example.com',
        port: 8080,
        auth: undefined,
      });
    });

    it('应当包含认证信息当提供时', async () => {
      const config: ProxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'http',
        username: 'user',
        password: 'pass',
      };

      await manager.setProxyConfig(config);
      const axiosConfig = manager.getAxiosProxyConfig();

      expect(axiosConfig?.auth).toEqual({
        username: 'user',
        password: 'pass',
      });
    });
  });

  describe('HTTPS Agent', () => {
    it('应当返回 undefined 当没有自定义 CA 时', () => {
      expect(manager.getHttpsAgent()).toBeUndefined();
    });

    it('应当返回 HTTPS Agent 当有自定义 CA 时', async () => {
      const config: ProxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'https',
        caCert: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----',
      };

      await manager.setProxyConfig(config);
      const agent = manager.getHttpsAgent();

      expect(agent).toBeDefined();
    });
  });

  describe('连接测试', () => {
    it('应当在没有配置时抛出错误', async () => {
      await expect(manager.testProxyConnection()).rejects.toThrow('代理配置未设置');
    });
  });
});
