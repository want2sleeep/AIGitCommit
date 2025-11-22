import { IConfigurationManager } from '../types/interfaces';

/**
 * 配置状态枚举
 */
export enum ConfigurationStatus {
  Configured = 'configured',
  NotConfigured = 'not_configured',
}

/**
 * 配置项枚举
 */
export enum ConfigurationItem {
  ApiKey = 'apiKey',
  Provider = 'provider',
  Model = 'model',
}

/**
 * 配置缓存接口
 */
interface ConfigurationCache {
  status: ConfigurationStatus;
  timestamp: number;
  missingItems: ConfigurationItem[];
}

/**
 * 配置状态检查器
 * 负责检查和缓存配置状态
 */
export class ConfigurationStatusChecker {
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 分钟
  private cache: ConfigurationCache | null = null;

  constructor(private configManager: IConfigurationManager) {}

  /**
   * 检查配置状态（带缓存）
   * @param forceRefresh - 是否强制刷新缓存
   * @returns 配置状态
   */
  async getStatus(forceRefresh: boolean = false): Promise<ConfigurationStatus> {
    // 如果缓存有效且不强制刷新，返回缓存结果
    if (!forceRefresh && this.cache && this.isCacheValid()) {
      return this.cache.status;
    }

    // 执行实际检查
    const startTime = Date.now();
    const missingItems = await this.getMissingItems();
    const status =
      missingItems.length === 0
        ? ConfigurationStatus.Configured
        : ConfigurationStatus.NotConfigured;

    // 更新缓存
    this.cache = {
      status,
      timestamp: Date.now(),
      missingItems,
    };

    // 记录性能（用于调试）
    const duration = Date.now() - startTime;
    if (duration > 100) {
      console.warn(`配置检查耗时 ${duration}ms，超过 100ms 阈值`);
    }

    return status;
  }

  /**
   * 验证特定配置项
   * @param item - 配置项名称
   * @returns 是否已配置
   */
  async validateConfigurationItem(item: ConfigurationItem): Promise<boolean> {
    switch (item) {
      case ConfigurationItem.ApiKey: {
        const apiKey = await this.configManager.getApiKey();
        return !!apiKey && apiKey.trim().length > 0;
      }

      case ConfigurationItem.Provider: {
        const provider = this.configManager.getProvider();
        return !!provider && provider.trim().length > 0;
      }

      case ConfigurationItem.Model: {
        const config = await this.configManager.getConfig();
        return !!config.modelName && config.modelName.trim().length > 0;
      }

      default:
        return false;
    }
  }

  /**
   * 使缓存失效
   */
  invalidateCache(): void {
    this.cache = null;
  }

  /**
   * 获取缺失的配置项列表
   * @returns 缺失的配置项
   */
  async getMissingItems(): Promise<ConfigurationItem[]> {
    const missingItems: ConfigurationItem[] = [];

    // 并发检查所有配置项
    const checks = await Promise.all([
      this.validateConfigurationItem(ConfigurationItem.ApiKey),
      this.validateConfigurationItem(ConfigurationItem.Provider),
      this.validateConfigurationItem(ConfigurationItem.Model),
    ]);

    if (!checks[0]) {
      missingItems.push(ConfigurationItem.ApiKey);
    }
    if (!checks[1]) {
      missingItems.push(ConfigurationItem.Provider);
    }
    if (!checks[2]) {
      missingItems.push(ConfigurationItem.Model);
    }

    return missingItems;
  }

  /**
   * 检查缓存是否有效
   * @returns 缓存是否有效
   */
  private isCacheValid(): boolean {
    if (!this.cache) {
      return false;
    }
    return Date.now() - this.cache.timestamp < ConfigurationStatusChecker.CACHE_TTL;
  }
}
