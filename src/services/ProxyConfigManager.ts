import * as vscode from 'vscode';
import axios from 'axios';
import * as https from 'https';

/**
 * 代理配置
 */
export interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks5';
  username?: string;
  password?: string;
  caCert?: string;
}

/**
 * 代理配置管理器
 * 负责管理代理配置和测试代理连接
 */
export class ProxyConfigManager {
  private static readonly STORAGE_KEY = 'aigitcommit.proxyConfig';
  private proxyConfig: ProxyConfig | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.loadProxyConfig();
  }

  /**
   * 获取代理配置
   */
  getProxyConfig(): ProxyConfig | undefined {
    return this.proxyConfig;
  }

  /**
   * 设置代理配置
   * @param config 代理配置
   */
  async setProxyConfig(config: ProxyConfig): Promise<void> {
    // 验证配置
    this.validateProxyConfig(config);

    // 保存到全局状态
    await this.context.globalState.update(ProxyConfigManager.STORAGE_KEY, config);

    // 更新内存中的配置
    this.proxyConfig = config;
  }

  /**
   * 清除代理配置
   */
  async clearProxyConfig(): Promise<void> {
    await this.context.globalState.update(ProxyConfigManager.STORAGE_KEY, undefined);
    this.proxyConfig = undefined;
  }

  /**
   * 测试代理连接
   * @returns 连接是否成功
   */
  async testProxyConnection(): Promise<boolean> {
    if (!this.proxyConfig) {
      throw new Error('代理配置未设置');
    }

    try {
      // 使用代理测试连接到一个公共 API
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = await axios.get('https://api.github.com', {
        proxy: {
          protocol: this.proxyConfig.protocol,
          host: this.proxyConfig.host,
          port: this.proxyConfig.port,
          auth:
            this.proxyConfig.username && this.proxyConfig.password
              ? {
                  username: this.proxyConfig.username,
                  password: this.proxyConfig.password,
                }
              : undefined,
        },
        timeout: 10000,
        httpsAgent: this.proxyConfig.caCert
          ? new https.Agent({ ca: this.proxyConfig.caCert })
          : undefined,
      });

      return response.status === 200;
    } catch (error) {
      console.error('代理连接测试失败:', error);
      return false;
    }
  }

  /**
   * 获取 axios 代理配置
   * @returns axios 代理配置对象
   */
  getAxiosProxyConfig():
    | {
        protocol: string;
        host: string;
        port: number;
        auth?: { username: string; password: string };
      }
    | undefined {
    if (!this.proxyConfig) {
      return undefined;
    }

    return {
      protocol: this.proxyConfig.protocol,
      host: this.proxyConfig.host,
      port: this.proxyConfig.port,
      auth:
        this.proxyConfig.username && this.proxyConfig.password
          ? {
              username: this.proxyConfig.username,
              password: this.proxyConfig.password,
            }
          : undefined,
    };
  }

  /**
   * 获取 HTTPS Agent（用于自定义 CA）
   * @returns HTTPS Agent 或 undefined
   */
  getHttpsAgent(): https.Agent | undefined {
    if (!this.proxyConfig?.caCert) {
      return undefined;
    }

    return new https.Agent({
      ca: this.proxyConfig.caCert,
    });
  }

  /**
   * 加载代理配置
   */
  private loadProxyConfig(): void {
    const config = this.context.globalState.get<ProxyConfig>(ProxyConfigManager.STORAGE_KEY);
    if (config) {
      this.proxyConfig = config;
    }
  }

  /**
   * 验证代理配置
   * @param config 代理配置
   */
  private validateProxyConfig(config: ProxyConfig): void {
    if (!config.host || config.host.trim().length === 0) {
      throw new Error('代理主机不能为空');
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      throw new Error('代理端口必须在 1-65535 之间');
    }

    if (!['http', 'https', 'socks5'].includes(config.protocol)) {
      throw new Error('代理协议必须是 http、https 或 socks5');
    }

    // 如果提供了用户名，必须提供密码
    if (config.username && !config.password) {
      throw new Error('提供用户名时必须提供密码');
    }
  }
}
