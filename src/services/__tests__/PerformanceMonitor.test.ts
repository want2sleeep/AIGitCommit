/**
 * PerformanceMonitor 单元测试
 * 测试性能监控服务的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { PerformanceMonitor } from '../PerformanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('测量功能', () => {
    it('应当能够开始和结束测量', () => {
      const id = monitor.startMeasurement('test-operation');
      expect(id).toBeDefined();
      expect(id).toContain('measurement_');

      monitor.endMeasurement(id);

      const stats = monitor.getStatistics('test-operation');
      expect(stats.totalCalls).toBe(1);
    });

    it('应当记录测量持续时间', async () => {
      const id = monitor.startMeasurement('test-operation');
      await new Promise((resolve) => setTimeout(resolve, 50));
      monitor.endMeasurement(id);

      const stats = monitor.getStatistics('test-operation');
      expect(stats.averageDuration).toBeGreaterThanOrEqual(40);
    });

    it('应当处理不存在的测量 ID', () => {
      // 不应抛出错误
      expect(() => monitor.endMeasurement('nonexistent-id')).not.toThrow();
    });
  });

  describe('指标记录', () => {
    it('应当能够直接记录指标', () => {
      monitor.recordMetric('api-call', 100, true);
      monitor.recordMetric('api-call', 150, true);
      monitor.recordMetric('api-call', 200, false);

      const stats = monitor.getStatistics('api-call');
      expect(stats.totalCalls).toBe(3);
      expect(stats.successfulCalls).toBe(2);
      expect(stats.failedCalls).toBe(1);
    });

    it('应当正确计算平均持续时间', () => {
      monitor.recordMetric('operation', 100, true);
      monitor.recordMetric('operation', 200, true);
      monitor.recordMetric('operation', 300, true);

      const stats = monitor.getStatistics('operation');
      expect(stats.averageDuration).toBe(200);
    });

    it('应当正确计算最小和最大持续时间', () => {
      monitor.recordMetric('operation', 100, true);
      monitor.recordMetric('operation', 50, true);
      monitor.recordMetric('operation', 200, true);

      const stats = monitor.getStatistics('operation');
      expect(stats.minDuration).toBe(50);
      expect(stats.maxDuration).toBe(200);
    });
  });

  describe('统计功能', () => {
    it('应当返回空统计当没有数据时', () => {
      const stats = monitor.getStatistics('nonexistent');
      expect(stats.totalCalls).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('应当正确计算成功率', () => {
      monitor.recordMetric('operation', 100, true);
      monitor.recordMetric('operation', 100, true);
      monitor.recordMetric('operation', 100, false);
      monitor.recordMetric('operation', 100, true);

      const stats = monitor.getStatistics('operation');
      expect(stats.successRate).toBe(75);
    });

    it('应当能够获取所有操作的统计', () => {
      monitor.recordMetric('operation1', 100, true);
      monitor.recordMetric('operation2', 200, true);

      const allStats = monitor.getStatistics();
      expect(allStats.totalCalls).toBe(2);
    });
  });

  describe('数据导出', () => {
    it('应当能够导出数据为 JSON', () => {
      monitor.recordMetric('operation', 100, true);

      const exported = monitor.exportData();
      const data = JSON.parse(exported);

      expect(data.exportTime).toBeDefined();
      expect(data.completedMeasurements).toBeDefined();
      expect(data.statistics).toBeDefined();
    });

    it('应当包含所有完成的测量', () => {
      monitor.recordMetric('op1', 100, true);
      monitor.recordMetric('op2', 200, false);

      const exported = monitor.exportData();
      const data = JSON.parse(exported);

      expect(data.completedMeasurements.length).toBe(2);
    });
  });
});
