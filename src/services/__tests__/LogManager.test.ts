/**
 * LogManager 单元测试
 * 测试日志管理服务的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { LogManager, LogLevel } from '../LogManager';

describe('LogManager', () => {
  let manager: LogManager;

  beforeEach(() => {
    manager = new LogManager();
  });

  afterEach(() => {
    manager.clearLogs();
  });

  describe('日志记录', () => {
    it('应当能够记录不同级别的日志', () => {
      manager.setLogLevel(LogLevel.DEBUG);
      manager.log(LogLevel.DEBUG, 'Debug message');
      manager.log(LogLevel.INFO, 'Info message');
      manager.log(LogLevel.WARN, 'Warning message');
      manager.log(LogLevel.ERROR, 'Error message');

      const stats = manager.getLogStatistics();
      expect(stats.totalLogs).toBe(4);
      expect(stats.debugCount).toBe(1);
      expect(stats.infoCount).toBe(1);
      expect(stats.warningCount).toBe(1);
      expect(stats.errorCount).toBe(1);
    });

    it('应当支持上下文信息', () => {
      manager.log(LogLevel.INFO, 'Test message', 'TestContext');

      const exported = manager.exportLogs();
      const data = JSON.parse(exported);

      expect(data.logs[0].context).toBe('TestContext');
    });

    it('应当支持元数据', () => {
      manager.log(LogLevel.INFO, 'Test message', undefined, { name: 'value', count: 42 });

      const exported = manager.exportLogs();
      const data = JSON.parse(exported);

      expect(data.logs[0].metadata).toEqual({ name: 'value', count: 42 });
    });
  });

  describe('日志级别过滤', () => {
    it('应当根据日志级别过滤', () => {
      manager.setLogLevel(LogLevel.WARN);
      manager.log(LogLevel.DEBUG, 'Debug message');
      manager.log(LogLevel.INFO, 'Info message');
      manager.log(LogLevel.WARN, 'Warning message');
      manager.log(LogLevel.ERROR, 'Error message');

      const stats = manager.getLogStatistics();
      expect(stats.totalLogs).toBe(2);
      expect(stats.warningCount).toBe(1);
      expect(stats.errorCount).toBe(1);
    });

    it('应当能够动态更改日志级别', () => {
      manager.setLogLevel(LogLevel.ERROR);
      manager.log(LogLevel.INFO, 'Info message 1');

      manager.setLogLevel(LogLevel.INFO);
      manager.log(LogLevel.INFO, 'Info message 2');

      const stats = manager.getLogStatistics();
      expect(stats.infoCount).toBe(1);
    });
  });

  describe('敏感信息脱敏', () => {
    it('应当脱敏 API 密钥', () => {
      manager.log(LogLevel.INFO, 'API key: sk-1234567890abcdefghijklmnop');

      const exported = manager.exportLogs();
      const data = JSON.parse(exported);

      expect(data.logs[0].message).not.toContain('1234567890abcdefghijklmnop');
      expect(data.logs[0].message).toContain('sk-***');
    });

    it('应当脱敏邮箱地址', () => {
      manager.log(LogLevel.INFO, 'Email: user@example.com');

      const exported = manager.exportLogs();
      const data = JSON.parse(exported);

      expect(data.logs[0].message).not.toContain('user@example.com');
      expect(data.logs[0].message).toContain('***@***.***');
    });

    it('应当脱敏元数据中的敏感字段', () => {
      manager.log(LogLevel.INFO, 'Test', undefined, {
        apiKey: 'secret-key-value',
        normalField: 'normal-value',
      });

      const exported = manager.exportLogs();
      const data = JSON.parse(exported);

      expect(data.logs[0].metadata.apiKey).toBe('***');
      expect(data.logs[0].metadata.normalField).toBe('normal-value');
    });
  });

  describe('日志导出', () => {
    it('应当导出有效的 JSON', () => {
      manager.log(LogLevel.INFO, 'Test message');

      const exported = manager.exportLogs();
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('应当包含导出时间', () => {
      manager.log(LogLevel.INFO, 'Test message');

      const exported = manager.exportLogs();
      const data = JSON.parse(exported);

      expect(data.exportTime).toBeDefined();
    });

    it('应当支持按级别过滤导出', () => {
      manager.setLogLevel(LogLevel.DEBUG);
      manager.log(LogLevel.DEBUG, 'Debug');
      manager.log(LogLevel.INFO, 'Info');
      manager.log(LogLevel.ERROR, 'Error');

      const exported = manager.exportLogs({ level: LogLevel.ERROR });
      const data = JSON.parse(exported);

      expect(data.totalLogs).toBe(1);
      expect(data.logs[0].level).toBe(LogLevel.ERROR);
    });

    it('应当支持按上下文过滤导出', () => {
      manager.log(LogLevel.INFO, 'Message 1', 'Context1');
      manager.log(LogLevel.INFO, 'Message 2', 'Context2');

      const exported = manager.exportLogs({ context: 'Context1' });
      const data = JSON.parse(exported);

      expect(data.totalLogs).toBe(1);
      expect(data.logs[0].context).toBe('Context1');
    });
  });

  describe('日志清理', () => {
    it('应当能够清空所有日志', () => {
      manager.log(LogLevel.INFO, 'Message 1');
      manager.log(LogLevel.INFO, 'Message 2');

      manager.clearLogs();

      const stats = manager.getLogStatistics();
      expect(stats.totalLogs).toBe(0);
    });
  });

  describe('统计功能', () => {
    it('应当正确统计各级别日志数量', () => {
      manager.setLogLevel(LogLevel.DEBUG);
      manager.log(LogLevel.DEBUG, 'Debug 1');
      manager.log(LogLevel.DEBUG, 'Debug 2');
      manager.log(LogLevel.INFO, 'Info 1');
      manager.log(LogLevel.WARN, 'Warn 1');
      manager.log(LogLevel.ERROR, 'Error 1');
      manager.log(LogLevel.ERROR, 'Error 2');

      const stats = manager.getLogStatistics();
      expect(stats.totalLogs).toBe(6);
      expect(stats.debugCount).toBe(2);
      expect(stats.infoCount).toBe(1);
      expect(stats.warningCount).toBe(1);
      expect(stats.errorCount).toBe(2);
    });
  });
});
