/**
 * 敏感数据脱敏器
 * 负责脱敏日志和错误信息中的敏感信息
 */
export class SensitiveDataSanitizer {
  // 内置脱敏规则
  private readonly builtInRules: Array<{ pattern: RegExp; replacement: string }> = [
    // API 密钥模式
    { pattern: /sk-[a-zA-Z0-9]{48}/g, replacement: 'sk-***' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/g, replacement: 'ghp_***' },
    { pattern: /gho_[a-zA-Z0-9]{36}/g, replacement: 'gho_***' },

    // Bearer token（必须在 Authorization 规则之前）
    { pattern: /Bearer\s+[a-zA-Z0-9_\-.]+/gi, replacement: 'Bearer ***' },

    // Authorization 头（通用）
    { pattern: /Authorization:\s*[^\s]+/gi, replacement: 'Authorization: ***' },

    // 邮箱地址（更宽松的匹配）
    { pattern: /[^\s@]+@[^\s@]+\.[^\s@]+/g, replacement: '***@***.***' },

    // 密码字段（JSON格式，处理转义字符）
    { pattern: /"password"\s*:\s*"(?:[^"\\]|\\.)*"/gi, replacement: '"password": "***"' },
    { pattern: /'password'\s*:\s*'(?:[^'\\]|\\.)*'/gi, replacement: "'password': '***'" },

    // 代理认证信息
    { pattern: /\/\/[^:]+:[^@]+@/g, replacement: '//***:***@' },

    // 通用密钥模式（长度超过20的字母数字组合）
    { pattern: /\b[a-zA-Z0-9]{32,}\b/g, replacement: '***' },
  ];

  // 自定义脱敏规则
  private customRules: Array<{ pattern: RegExp; replacement: string }> = [];

  /**
   * 脱敏文本中的敏感信息
   * @param text 原始文本
   * @returns 脱敏后的文本
   */
  sanitize(text: string): string {
    if (!text) {
      return text;
    }

    let sanitized = text;

    // 应用内置规则
    for (const rule of this.builtInRules) {
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }

    // 应用自定义规则
    for (const rule of this.customRules) {
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }

    return sanitized;
  }

  /**
   * 脱敏 API 密钥
   * @param apiKey API 密钥
   * @returns 脱敏后的密钥
   */
  sanitizeApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length === 0) {
      return apiKey;
    }

    // 如果密钥长度小于8，全部替换为星号
    if (apiKey.length < 8) {
      return '***';
    }

    // 保留前4个字符和后4个字符，中间用星号替换
    const prefix = apiKey.substring(0, 4);
    const suffix = apiKey.substring(apiKey.length - 4);
    return `${prefix}***${suffix}`;
  }

  /**
   * 脱敏代码内容
   * 移除代码中可能包含的敏感信息，但保留代码结构
   * @param code 代码内容
   * @returns 脱敏后的代码
   */
  sanitizeCode(code: string): string {
    if (!code) {
      return code;
    }

    let sanitized = code;

    // 脱敏字符串字面量中的敏感信息
    // 匹配双引号字符串
    sanitized = sanitized.replace(/"([^"]{20,})"/g, (match, content: string) => {
      // 如果字符串看起来像密钥或密码，脱敏
      if (this.looksLikeSensitiveData(content)) {
        return '"***"';
      }
      return match;
    });

    // 匹配单引号字符串
    sanitized = sanitized.replace(/'([^']{20,})'/g, (match, content: string) => {
      // 如果字符串看起来像密钥或密码，脱敏
      if (this.looksLikeSensitiveData(content)) {
        return "'***'";
      }
      return match;
    });

    // 脱敏模板字符串中的敏感信息
    sanitized = sanitized.replace(/`([^`]{20,})`/g, (match, content: string) => {
      if (this.looksLikeSensitiveData(content)) {
        return '`***`';
      }
      return match;
    });

    // 应用通用脱敏规则
    sanitized = this.sanitize(sanitized);

    return sanitized;
  }

  /**
   * 添加自定义脱敏规则
   * @param pattern 正则表达式
   * @param replacement 替换文本
   */
  addCustomRule(pattern: RegExp, replacement: string): void {
    // 确保pattern是全局匹配
    const globalPattern = pattern.global
      ? pattern
      : new RegExp(pattern.source, pattern.flags + 'g');

    this.customRules.push({
      pattern: globalPattern,
      replacement,
    });
  }

  /**
   * 清除所有自定义规则
   */
  clearCustomRules(): void {
    this.customRules = [];
  }

  /**
   * 判断字符串是否看起来像敏感数据
   * @param text 文本内容
   * @returns 是否像敏感数据
   */
  private looksLikeSensitiveData(text: string): boolean {
    // 检查是否包含常见的密钥前缀
    const keyPrefixes = ['sk-', 'ghp_', 'gho_', 'key_', 'secret_', 'token_', 'api_'];
    for (const prefix of keyPrefixes) {
      if (text.toLowerCase().startsWith(prefix)) {
        return true;
      }
    }

    // 检查是否是长的字母数字组合（可能是密钥）
    if (text.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(text)) {
      return true;
    }

    // 检查是否包含密码相关的关键词
    const passwordKeywords = ['password', 'passwd', 'pwd', 'secret', 'token', 'key'];
    const lowerText = text.toLowerCase();
    for (const keyword of passwordKeywords) {
      if (lowerText.includes(keyword)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 脱敏对象（递归处理）
   * @param obj 原始对象
   * @returns 脱敏后的对象
   */
  sanitizeObject<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // 如果是字符串，直接脱敏
    if (typeof obj === 'string') {
      return this.sanitize(obj) as T;
    }

    // 如果是数组，递归处理每个元素
    if (Array.isArray(obj)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return obj.map((item) => this.sanitizeObject(item)) as T;
    }

    // 如果是对象，递归处理每个属性
    if (typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        // 对于敏感字段名，直接替换值
        if (this.isSensitiveFieldName(key)) {
          sanitized[key] = '***';
        } else {
          sanitized[key] = this.sanitizeObject(value);
        }
      }
      return sanitized as T;
    }

    // 其他类型（数字、布尔等）直接返回
    return obj;
  }

  /**
   * 判断字段名是否为敏感字段
   * @param fieldName 字段名
   * @returns 是否为敏感字段
   */
  private isSensitiveFieldName(fieldName: string): boolean {
    const lowerKey = fieldName.toLowerCase();
    return (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('key') ||
      lowerKey.includes('apikey') ||
      lowerKey.includes('api_key')
    );
  }
}
