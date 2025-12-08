/**
 * 健康检查服务
 * 负责系统健康状态监控和报告
 */

/**
 * 健康检查项
 */
export interface HealthCheckItem {
  name: string;
  status: 'pass' | 'fail';
  message?: string;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  healthy: boolean;
  checks: HealthCheckItem[];
  timestamp: Date;
}

/**
 * 系统状态
 */
export interface SystemStatus {
  uptime: number;
  memoryUsage: number;
  activeRequests: number;
  cacheSize: number;
}

/**
 * 健康检查接口
 */
export interface IHealthCheckService {
  /**
   * 执行健康检查
   */
  performHealthCheck(): Promise<HealthCheckResult>;

  /**
   * 注册健康检查项
   * @param name 检查项名称
   * @param checker 检查函数
   */
  registerCheck(name: string, checker: () => Promise<boolean>): void;

  /**
   * 取消注册健康检查项
   * @param name 检查项名称
   */
  unregisterCheck(name: string): void;

  /**
   * 获取系统状态
   */
  getSystemStatus(): SystemStatus;
}

/**
 * 健康检查服务实现
 */
export class HealthCheckService implements IHealthCheckService {
  // 健康检查项注册表
  private checks: Map<string, () => Promise<boolean>> = new Map();

  // 系统启动时间
  private startTime: number = Date.now();

  // 活动请求计数
  private activeRequestCount = 0;

  // 缓存大小
  private currentCacheSize = 0;

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const checkResults: HealthCheckItem[] = [];

    // 执行所有注册的检查
    for (const [name, checker] of this.checks.entries()) {
      try {
        const passed = await checker();
        checkResults.push({
          name,
          status: passed ? 'pass' : 'fail',
          message: passed ? undefined : '检查未通过',
        });
      } catch (error) {
        checkResults.push({
          name,
          status: 'fail',
          message: error instanceof Error ? error.message : '检查执行失败',
        });
      }
    }

    // 判断整体健康状态
    const healthy = checkResults.every((check) => check.status === 'pass');

    return {
      healthy,
      checks: checkResults,
      timestamp: new Date(),
    };
  }

  /**
   * 注册健康检查项
   * @param name 检查项名称
   * @param checker 检查函数
   */
  registerCheck(name: string, checker: () => Promise<boolean>): void {
    this.checks.set(name, checker);
  }

  /**
   * 取消注册健康检查项
   * @param name 检查项名称
   */
  unregisterCheck(name: string): void {
    this.checks.delete(name);
  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): SystemStatus {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

    return {
      uptime,
      memoryUsage,
      activeRequests: this.activeRequestCount,
      cacheSize: this.currentCacheSize,
    };
  }

  /**
   * 增加活动请求计数
   */
  incrementActiveRequests(): void {
    this.activeRequestCount++;
  }

  /**
   * 减少活动请求计数
   */
  decrementActiveRequests(): void {
    this.activeRequestCount = Math.max(0, this.activeRequestCount - 1);
  }

  /**
   * 设置缓存大小
   * @param size 缓存大小
   */
  setCacheSize(size: number): void {
    this.currentCacheSize = size;
  }
}
