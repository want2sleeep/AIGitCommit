/**
 * 日志管理服务
 * 负责结构化日志记录、过滤和导出
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * 日志条目
 */
interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  sanitized: boolean;
}

/**
 * 日志过滤条件
 */
export interface LogFilter {
  level?: LogLevel;
  context?: string;
  startTime?: Date;
  endTime?: Date;
}

/**
 * 日志统计
 */
export interface LogStatistics {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
}

/**
 * 日志管理接口
 */
export interface ILogManager {
  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param context 上下文信息
   * @param metadata 元数据
   */
  log(level: LogLevel, message: string, context?: string, metadata?: Record<string, unknown>): void;

  /**
   * 导出日志
   * @param filter 过滤条件
   */
  exportLogs(filter?: LogFilter): string;

  /**
   * 清空日志
   */
  clearLogs(): void;

  /**
   * 设置日志级别
   * @param level 日志级别
   */
  setLogLevel(level: LogLevel): void;

  /**
   * 获取日志统计
   */
  getLogStatistics(): LogStatistics;
}

/**
 * 日志管理服务实现
 */
export class LogManager implements ILogManager {
  // 日志存储
  private logs: LogEntry[] = [];

  // 日志 ID 计数器
  private logIdCounter = 0;

  // 当前日志级别
  private currentLogLevel: LogLevel = LogLevel.INFO;

  // 日志级别优先级映射
  private readonly levelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
  };

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param context 上下文信息
   * @param metadata 元数据
   */
  log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    // 检查日志级别是否应该记录
    if (this.levelPriority[level] < this.levelPriority[this.currentLogLevel]) {
      return;
    }

    // 脱敏敏感信息
    const sanitizedMessage = this.sanitizeMessage(message);
    const sanitizedMetadata = metadata ? this.sanitizeMetadata(metadata) : undefined;

    const logEntry: LogEntry = {
      id: `log_${++this.logIdCounter}_${Date.now()}`,
      level,
      message: sanitizedMessage,
      context,
      metadata: sanitizedMetadata,
      timestamp: new Date(),
      sanitized: sanitizedMessage !== message || sanitizedMetadata !== metadata,
    };

    this.logs.push(logEntry);
  }

  /**
   * 导出日志
   * @param filter 过滤条件
   */
  exportLogs(filter?: LogFilter): string {
    let filteredLogs = this.logs;

    if (filter) {
      filteredLogs = this.filterLogs(filteredLogs, filter);
    }

    return JSON.stringify(
      {
        exportTime: new Date().toISOString(),
        totalLogs: filteredLogs.length,
        logs: filteredLogs,
      },
      null,
      2
    );
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * 设置日志级别
   * @param level 日志级别
   */
  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * 获取日志统计
   */
  getLogStatistics(): LogStatistics {
    return {
      totalLogs: this.logs.length,
      errorCount: this.logs.filter((log) => log.level === LogLevel.ERROR).length,
      warningCount: this.logs.filter((log) => log.level === LogLevel.WARN).length,
      infoCount: this.logs.filter((log) => log.level === LogLevel.INFO).length,
      debugCount: this.logs.filter((log) => log.level === LogLevel.DEBUG).length,
    };
  }

  /**
   * 过滤日志
   * @param logs 日志数组
   * @param filter 过滤条件
   */
  private filterLogs(logs: LogEntry[], filter: LogFilter): LogEntry[] {
    return logs.filter((log) => {
      // 按级别过滤
      if (filter.level && log.level !== filter.level) {
        return false;
      }

      // 按上下文过滤
      if (filter.context && log.context !== filter.context) {
        return false;
      }

      // 按时间范围过滤
      if (filter.startTime && log.timestamp < filter.startTime) {
        return false;
      }

      if (filter.endTime && log.timestamp > filter.endTime) {
        return false;
      }

      return true;
    });
  }

  /**
   * 脱敏消息中的敏感信息
   * @param message 原始消息
   * @returns 脱敏后的消息
   */
  private sanitizeMessage(message: string): string {
    let sanitized = message;

    // 脱敏 API 密钥（如 sk-xxx, ghp_xxx 等）
    // 匹配 sk- 后跟至少 20 个字符（包括空格和其他字符）
    sanitized = sanitized.replace(/\b(sk|ghp|gho|ghu|ghs|ghr)-[^\s]{20,}/g, '$1-***');

    // 脱敏邮箱地址
    sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/g, '***@***.***');

    // 脱敏可能的密码或令牌（长字符串）
    sanitized = sanitized.replace(/\b[a-zA-Z0-9]{32,}\b/g, '***');

    return sanitized;
  }

  /**
   * 脱敏元数据中的敏感信息
   * @param metadata 原始元数据
   * @returns 脱敏后的元数据
   */
  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      // 检查键名是否包含敏感词
      const sensitiveKeys = ['key', 'token', 'password', 'secret', 'credential'];
      const isSensitiveKey = sensitiveKeys.some((sk) => key.toLowerCase().includes(sk));

      if (isSensitiveKey && typeof value === 'string') {
        sanitized[key] = '***';
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeMessage(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
