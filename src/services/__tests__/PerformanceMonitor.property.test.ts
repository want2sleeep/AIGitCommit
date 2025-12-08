/**
 * PerformanceMonitor 属性测试
 *
 * **Feature: project-optimization-recommendations, Property 16: 性能指标记录完整性**
 * **Validates: Requirements 8.1**
 */

import * as fc from 'fast-check';
import { PerformanceMonitor } from '../PerformanceMonitor';

describe('PerformanceMonitor 属性测试', () => {
  describe('属性 16: 性能指标记录完整性', () => {
    it('对于任何关键操作，应当记录性能指标（响应时间、成功率）', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // 操作名称
          fc.integer({ min: 1, max: 1000 }), // 持续时间（毫秒）
          fc.boolean(), // 是否成功
          (operationName, duration, success) => {
            const monitor = new PerformanceMonitor();

            // 记录性能指标
            monitor.recordMetric(operationName, duration, success);

            // 获取统计数据
            const stats = monitor.getStatistics(operationName);

            // 验证指标被记录
            expect(stats.totalCalls).toBe(1);
            expect(stats.averageDuration).toBe(duration);
            expect(stats.minDuration).toBe(duration);
            expect(stats.maxDuration).toBe(duration);

            // 验证成功率
            if (success) {
              expect(stats.successfulCalls).toBe(1);
              expect(stats.failedCalls).toBe(0);
              expect(stats.successRate).toBe(100);
            } else {
              expect(stats.successfulCalls).toBe(0);
              expect(stats.failedCalls).toBe(1);
              expect(stats.successRate).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('对于任何测量操作，开始和结束应当正确记录持续时间', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // 操作名称
          fc.integer({ min: 0, max: 100 }), // 模拟延迟（毫秒）
          async (operationName, delay) => {
            const monitor = new PerformanceMonitor();

            // 开始测量
            const measurementId = monitor.startMeasurement(operationName);
            expect(measurementId).toBeTruthy();

            // 模拟操作延迟
            if (delay > 0) {
              await new Promise((resolve) => setTimeout(resolve, delay));
            }

            // 结束测量
            monitor.endMeasurement(measurementId);

            // 获取统计数据
            const stats = monitor.getStatistics(operationName);

            // 验证测量被记录
            expect(stats.totalCalls).toBe(1);
            expect(stats.successfulCalls).toBe(1);
            // 允许 5ms 的时间误差，因为 setTimeout 不是精确的
            expect(stats.averageDuration).toBeGreaterThanOrEqual(Math.max(0, delay - 5));
            expect(stats.minDuration).toBeGreaterThanOrEqual(Math.max(0, delay - 5));
            expect(stats.maxDuration).toBeGreaterThanOrEqual(Math.max(0, delay - 5));
          }
        ),
        { numRuns: 50 } // 减少运行次数因为有异步延迟
      );
    });

    it('对于任何多次操作，统计数据应当正确聚合', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // 操作名称
          fc.array(
            fc.record({
              duration: fc.integer({ min: 1, max: 1000 }),
              success: fc.boolean(),
            }),
            { minLength: 1, maxLength: 20 }
          ), // 多次操作记录
          (operationName, operations) => {
            const monitor = new PerformanceMonitor();

            // 记录所有操作
            for (const op of operations) {
              monitor.recordMetric(operationName, op.duration, op.success);
            }

            // 获取统计数据
            const stats = monitor.getStatistics(operationName);

            // 验证总调用次数
            expect(stats.totalCalls).toBe(operations.length);

            // 验证成功和失败次数
            const expectedSuccessful = operations.filter((op) => op.success).length;
            const expectedFailed = operations.filter((op) => !op.success).length;
            expect(stats.successfulCalls).toBe(expectedSuccessful);
            expect(stats.failedCalls).toBe(expectedFailed);

            // 验证持续时间统计
            const durations = operations.map((op) => op.duration);
            const expectedAvg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
            const expectedMin = Math.min(...durations);
            const expectedMax = Math.max(...durations);

            expect(stats.averageDuration).toBeCloseTo(expectedAvg, 2);
            expect(stats.minDuration).toBe(expectedMin);
            expect(stats.maxDuration).toBe(expectedMax);

            // 验证成功率
            const expectedSuccessRate = (expectedSuccessful / operations.length) * 100;
            expect(stats.successRate).toBeCloseTo(expectedSuccessRate, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('对于任何导出操作，应当返回有效的 JSON 格式', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              operationName: fc.string({ minLength: 1, maxLength: 50 }),
              duration: fc.integer({ min: 1, max: 1000 }),
              success: fc.boolean(),
            }),
            { minLength: 0, maxLength: 10 }
          ), // 操作记录数组
          (operations) => {
            const monitor = new PerformanceMonitor();

            // 记录所有操作
            for (const op of operations) {
              monitor.recordMetric(op.operationName, op.duration, op.success);
            }

            // 导出数据
            const exportedData = monitor.exportData();

            // 验证是有效的 JSON
            expect(() => JSON.parse(exportedData)).not.toThrow();

            // 验证包含必要字段
            const parsed = JSON.parse(exportedData);
            expect(parsed).toHaveProperty('exportTime');
            expect(parsed).toHaveProperty('activeMeasurements');
            expect(parsed).toHaveProperty('completedMeasurements');
            expect(parsed).toHaveProperty('statistics');

            // 验证导出时间是有效的 ISO 字符串
            expect(() => new Date(parsed.exportTime)).not.toThrow();
            expect(new Date(parsed.exportTime).toISOString()).toBe(parsed.exportTime);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('对于任何操作，未完成的测量不应出现在统计中', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // 操作名称
          fc.integer({ min: 1, max: 5 }), // 未完成的测量数量
          (operationName, unfinishedCount) => {
            const monitor = new PerformanceMonitor();

            // 开始多个测量但不结束
            for (let i = 0; i < unfinishedCount; i++) {
              monitor.startMeasurement(operationName);
            }

            // 获取统计数据
            const stats = monitor.getStatistics(operationName);

            // 验证未完成的测量不在统计中
            expect(stats.totalCalls).toBe(0);
            expect(stats.successfulCalls).toBe(0);
            expect(stats.failedCalls).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('对于任何不存在的操作名称，应当返回空统计', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // 不存在的操作名称
          (nonExistentOperation) => {
            const monitor = new PerformanceMonitor();

            // 获取不存在操作的统计
            const stats = monitor.getStatistics(nonExistentOperation);

            // 验证返回空统计
            expect(stats.operationName).toBe(nonExistentOperation);
            expect(stats.totalCalls).toBe(0);
            expect(stats.successfulCalls).toBe(0);
            expect(stats.failedCalls).toBe(0);
            expect(stats.averageDuration).toBe(0);
            expect(stats.minDuration).toBe(0);
            expect(stats.maxDuration).toBe(0);
            expect(stats.successRate).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
