/**
 * 性能监控服务
 * 负责测量和记录系统性能指标
 */

/**
 * 性能测量数据
 */
interface PerformanceMeasurement {
  id: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
}

/**
 * 性能统计数据
 */
export interface PerformanceStatistics {
  operationName: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
}

/**
 * 性能监控接口
 */
export interface IPerformanceMonitor {
  /**
   * 开始性能测量
   * @param operationName 操作名称
   * @returns 测量 ID
   */
  startMeasurement(operationName: string): string;

  /**
   * 结束性能测量
   * @param measurementId 测量 ID
   */
  endMeasurement(measurementId: string): void;

  /**
   * 记录性能指标
   * @param operationName 操作名称
   * @param duration 持续时间（毫秒）
   * @param success 是否成功
   */
  recordMetric(operationName: string, duration: number, success: boolean): void;

  /**
   * 获取性能统计
   * @param operationName 操作名称（可选）
   */
  getStatistics(operationName?: string): PerformanceStatistics;

  /**
   * 导出性能数据
   */
  exportData(): string;
}

/**
 * 性能监控服务实现
 */
export class PerformanceMonitor implements IPerformanceMonitor {
  // 活动的测量
  private activeMeasurements: Map<string, PerformanceMeasurement> = new Map();

  // 完成的测量记录
  private completedMeasurements: PerformanceMeasurement[] = [];

  // 测量 ID 计数器
  private measurementIdCounter = 0;

  /**
   * 开始性能测量
   * @param operationName 操作名称
   * @returns 测量 ID
   */
  startMeasurement(operationName: string): string {
    const id = `measurement_${++this.measurementIdCounter}_${Date.now()}`;
    const measurement: PerformanceMeasurement = {
      id,
      operationName,
      startTime: Date.now(),
    };

    this.activeMeasurements.set(id, measurement);
    return id;
  }

  /**
   * 结束性能测量
   * @param measurementId 测量 ID
   */
  endMeasurement(measurementId: string): void {
    const measurement = this.activeMeasurements.get(measurementId);

    if (!measurement) {
      console.warn(`测量 ID ${measurementId} 不存在或已完成`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - measurement.startTime;

    measurement.endTime = endTime;
    measurement.duration = duration;
    measurement.success = true;

    // 移动到完成列表
    this.activeMeasurements.delete(measurementId);
    this.completedMeasurements.push(measurement);
  }

  /**
   * 记录性能指标
   * @param operationName 操作名称
   * @param duration 持续时间（毫秒）
   * @param success 是否成功
   */
  recordMetric(operationName: string, duration: number, success: boolean): void {
    const measurement: PerformanceMeasurement = {
      id: `metric_${++this.measurementIdCounter}_${Date.now()}`,
      operationName,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      success,
    };

    this.completedMeasurements.push(measurement);
  }

  /**
   * 获取性能统计
   * @param operationName 操作名称（可选）
   */
  getStatistics(operationName?: string): PerformanceStatistics {
    // 过滤测量数据
    const measurements = operationName
      ? this.completedMeasurements.filter((m) => m.operationName === operationName)
      : this.completedMeasurements;

    if (measurements.length === 0) {
      return {
        operationName: operationName || 'all',
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
      };
    }

    // 计算统计数据
    const totalCalls = measurements.length;
    const successfulCalls = measurements.filter((m) => m.success === true).length;
    const failedCalls = measurements.filter((m) => m.success === false).length;

    const durations = measurements.filter((m) => m.duration !== undefined).map((m) => m.duration!);

    const averageDuration =
      durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

    return {
      operationName: operationName || 'all',
      totalCalls,
      successfulCalls,
      failedCalls,
      averageDuration,
      minDuration,
      maxDuration,
      successRate,
    };
  }

  /**
   * 导出性能数据
   */
  exportData(): string {
    const data = {
      exportTime: new Date().toISOString(),
      activeMeasurements: Array.from(this.activeMeasurements.values()),
      completedMeasurements: this.completedMeasurements,
      statistics: this.getAllStatistics(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * 获取所有操作的统计数据
   */
  private getAllStatistics(): Record<string, PerformanceStatistics> {
    const operationNames = new Set(this.completedMeasurements.map((m) => m.operationName));

    const statistics: Record<string, PerformanceStatistics> = {};

    for (const operationName of operationNames) {
      statistics[operationName] = this.getStatistics(operationName);
    }

    return statistics;
  }
}
