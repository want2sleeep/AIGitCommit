/**
 * HealthCheckService 单元测试
 * 测试健康检查服务的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { HealthCheckService } from '../HealthCheckService';

describe('HealthCheckService', () => {
  let service: HealthCheckService;

  beforeEach(() => {
    service = new HealthCheckService();
  });

  describe('健康检查注册', () => {
    it('应当能够注册健康检查项', async () => {
      service.registerCheck('test-check', async () => true);

      const result = await service.performHealthCheck();
      expect(result.checks.length).toBe(1);
      expect(result.checks[0]?.name).toBe('test-check');
    });

    it('应当能够注册多个健康检查项', async () => {
      service.registerCheck('check1', async () => true);
      service.registerCheck('check2', async () => true);
      service.registerCheck('check3', async () => true);

      const result = await service.performHealthCheck();
      expect(result.checks.length).toBe(3);
    });

    it('应当能够取消注册健康检查项', async () => {
      service.registerCheck('test-check', async () => true);
      service.unregisterCheck('test-check');

      const result = await service.performHealthCheck();
      expect(result.checks.length).toBe(0);
    });
  });

  describe('健康检查执行', () => {
    it('应当返回健康状态当所有检查通过', async () => {
      service.registerCheck('check1', async () => true);
      service.registerCheck('check2', async () => true);

      const result = await service.performHealthCheck();
      expect(result.healthy).toBe(true);
      expect(result.checks.every((c) => c.status === 'pass')).toBe(true);
    });

    it('应当返回不健康状态当任何检查失败', async () => {
      service.registerCheck('check1', async () => true);
      service.registerCheck('check2', async () => false);

      const result = await service.performHealthCheck();
      expect(result.healthy).toBe(false);
    });

    it('应当处理检查函数抛出的错误', async () => {
      service.registerCheck('error-check', async () => {
        throw new Error('Check failed');
      });

      const result = await service.performHealthCheck();
      expect(result.healthy).toBe(false);
      expect(result.checks[0]?.status).toBe('fail');
      expect(result.checks[0]?.message).toBe('Check failed');
    });

    it('应当包含时间戳', async () => {
      const result = await service.performHealthCheck();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('应当返回健康状态当没有注册检查项', async () => {
      const result = await service.performHealthCheck();
      expect(result.healthy).toBe(true);
      expect(result.checks.length).toBe(0);
    });
  });

  describe('系统状态', () => {
    it('应当返回系统运行时间', () => {
      const status = service.getSystemStatus();
      expect(status.uptime).toBeGreaterThanOrEqual(0);
    });

    it('应当返回内存使用情况', () => {
      const status = service.getSystemStatus();
      expect(status.memoryUsage).toBeGreaterThan(0);
    });

    it('应当跟踪活动请求数量', () => {
      service.incrementActiveRequests();
      service.incrementActiveRequests();

      let status = service.getSystemStatus();
      expect(status.activeRequests).toBe(2);

      service.decrementActiveRequests();
      status = service.getSystemStatus();
      expect(status.activeRequests).toBe(1);
    });

    it('应当不允许活动请求数量为负', () => {
      service.decrementActiveRequests();
      service.decrementActiveRequests();

      const status = service.getSystemStatus();
      expect(status.activeRequests).toBe(0);
    });

    it('应当能够设置缓存大小', () => {
      service.setCacheSize(1024);

      const status = service.getSystemStatus();
      expect(status.cacheSize).toBe(1024);
    });
  });

  describe('异步检查', () => {
    it('应当等待所有异步检查完成', async () => {
      service.registerCheck('slow-check', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return true;
      });

      const start = Date.now();
      const result = await service.performHealthCheck();
      const duration = Date.now() - start;

      expect(result.healthy).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(40);
    });
  });
});
