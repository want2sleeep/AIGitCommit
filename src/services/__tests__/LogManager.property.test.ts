/**
 * LogManager 属性测试
 *
 * **Feature: project-optimization-recommendations, Property 17: 错误上下文完整性**
 * **Feature: project-optimization-recommendations, Property 18: 日志导出格式正确性**
 * **Validates: Requirements 8.2, 8.4**
 */

import * as fc from 'fast-check';
import { LogManager, LogLevel } from '../LogManager';

describe('LogManager 属性测试', () => {
  describe('属性 17: 错误上下文完整性', () => {
    it('对于任何错误，日志应当包含详细的错误上下文和堆栈信息', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // 错误消息
          fc.string({ minLength: 1, maxLength: 50 }), // 上下文
          fc.record({
            stack: fc.string({ minLength: 10, maxLength: 200 }),
            code: fc.string({ minLength: 1, maxLength: 20 }),
            details: fc.string({ minLength: 1, maxLength: 100 }),
          }), // 元数据
          (message, context, metadata) => {
            const manager = new LogManager();

            // 记录错误日志
            manager.log(LogLevel.ERROR, message, context, metadata);

            // 导出日志
            const exported = manager.exportLogs();
            const parsed = JSON.parse(exported);

            // 验证日志包含错误信息
            expect(parsed.logs).toHaveLength(1);
            const log = parsed.logs[0];

            expect(log.level).toBe(LogLevel.ERROR);
            expect(log.message).toBeTruthy();
            expect(log.context).toBe(context);
            expect(log.metadata).toBeTruthy();
            expect(log.metadata.stack).toBeTruthy();
            expect(log.metadata.code).toBeTruthy();
            expect(log.metadata.details).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('对于任何日志级别，应当正确记录级别信息', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR),
          fc.string({ minLength: 1, maxLength: 100 }),
          (level, message) => {
            const manager = new LogManager();
            manager.setLogLevel(LogLevel.DEBUG); // 设置为最低级别以记录所有日志

            manager.log(level, message);

            const stats = manager.getLogStatistics();
            expect(stats.totalLogs).toBe(1);

            // 验证对应级别的计数
            switch (level) {
              case LogLevel.DEBUG:
                expect(stats.debugCount).toBe(1);
                break;
              case LogLevel.INFO:
                expect(stats.infoCount).toBe(1);
                break;
              case LogLevel.WARN:
                expect(stats.warningCount).toBe(1);
                break;
              case LogLevel.ERROR:
                expect(stats.errorCount).toBe(1);
                break;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('属性 18: 日志导出格式正确性', () => {
    it('对于任何日志导出操作，导出的日志应当是有效的 JSON 格式且包含所有必要字段', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              level: fc.constantFrom(LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR),
              message: fc.string({ minLength: 1, maxLength: 100 }),
              context: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (logs) => {
            const manager = new LogManager();
            manager.setLogLevel(LogLevel.DEBUG);

            // 记录所有日志
            for (const log of logs) {
              manager.log(log.level, log.message, log.context ?? undefined);
            }

            // 导出日志
            const exported = manager.exportLogs();

            // 验证是有效的 JSON
            expect(() => JSON.parse(exported)).not.toThrow();

            const parsed = JSON.parse(exported);

            // 验证包含必要字段
            expect(parsed).toHaveProperty('exportTime');
            expect(parsed).toHaveProperty('totalLogs');
            expect(parsed).toHaveProperty('logs');

            // 验证 exportTime 是有效的 ISO 字符串
            expect(() => new Date(parsed.exportTime)).not.toThrow();
            expect(new Date(parsed.exportTime).toISOString()).toBe(parsed.exportTime);

            // 验证 totalLogs 正确
            expect(parsed.totalLogs).toBe(logs.length);

            // 验证每个日志条目包含必要字段
            for (const logEntry of parsed.logs) {
              expect(logEntry).toHaveProperty('id');
              expect(logEntry).toHaveProperty('level');
              expect(logEntry).toHaveProperty('message');
              expect(logEntry).toHaveProperty('timestamp');
              expect(logEntry).toHaveProperty('sanitized');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('对于任何过滤条件，导出的日志应当符合过滤条件', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              level: fc.constantFrom(LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR),
              message: fc.string({ minLength: 1, maxLength: 100 }),
              context: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 5, maxLength: 20 }
          ),
          fc.constantFrom(LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR),
          (logs, filterLevel) => {
            const manager = new LogManager();
            manager.setLogLevel(LogLevel.DEBUG);

            // 记录所有日志
            for (const log of logs) {
              manager.log(log.level, log.message, log.context);
            }

            // 按级别过滤导出
            const exported = manager.exportLogs({ level: filterLevel });
            const parsed = JSON.parse(exported);

            // 验证所有导出的日志都符合过滤条件
            for (const logEntry of parsed.logs) {
              expect(logEntry.level).toBe(filterLevel);
            }

            // 验证导出的日志数量正确
            const expectedCount = logs.filter((log) => log.level === filterLevel).length;
            expect(parsed.totalLogs).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('敏感信息脱敏', () => {
    it('对于任何包含 API 密钥的日志，应当自动脱敏', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 20, maxLength: 50 }).filter((s) => /^[a-zA-Z0-9]{20,}$/.test(s)), // 生成有效的 API 密钥（只包含字母和数字）
          (prefix, apiKey) => {
            const manager = new LogManager();
            const message = `${prefix} API Key: sk-${apiKey}`;

            manager.log(LogLevel.INFO, message);

            const exported = manager.exportLogs();
            const parsed = JSON.parse(exported);

            // 验证 API 密钥被脱敏
            expect(parsed.logs[0].message).not.toContain(`sk-${apiKey}`);
            expect(parsed.logs[0].message).toContain('sk-***');
            expect(parsed.logs[0].sanitized).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('对于任何包含敏感键的元数据，应当自动脱敏', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 10, maxLength: 50 }),
          (message, secretValue) => {
            const manager = new LogManager();
            const metadata = {
              apiKey: secretValue,
              token: secretValue,
              password: secretValue,
              normalField: 'normal value',
            };

            manager.log(LogLevel.INFO, message, undefined, metadata);

            const exported = manager.exportLogs();
            const parsed = JSON.parse(exported);

            // 验证敏感字段被脱敏
            expect(parsed.logs[0].metadata.apiKey).toBe('***');
            expect(parsed.logs[0].metadata.token).toBe('***');
            expect(parsed.logs[0].metadata.password).toBe('***');
            // 验证普通字段未被脱敏
            expect(parsed.logs[0].metadata.normalField).toBe('normal value');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('日志级别过滤', () => {
    it('对于任何日志级别设置，应当只记录该级别及以上的日志', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR),
          (setLevel) => {
            const manager = new LogManager();
            manager.setLogLevel(setLevel);

            // 记录所有级别的日志
            manager.log(LogLevel.DEBUG, 'debug message');
            manager.log(LogLevel.INFO, 'info message');
            manager.log(LogLevel.WARN, 'warn message');
            manager.log(LogLevel.ERROR, 'error message');

            const stats = manager.getLogStatistics();

            // 定义级别优先级
            const levelPriority: Record<LogLevel, number> = {
              [LogLevel.DEBUG]: 0,
              [LogLevel.INFO]: 1,
              [LogLevel.WARN]: 2,
              [LogLevel.ERROR]: 3,
            };

            // 计算应该记录的日志数量
            const expectedCount = [
              LogLevel.DEBUG,
              LogLevel.INFO,
              LogLevel.WARN,
              LogLevel.ERROR,
            ].filter((level) => levelPriority[level] >= levelPriority[setLevel]).length;

            expect(stats.totalLogs).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
