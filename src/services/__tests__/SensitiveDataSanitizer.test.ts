/**
 * SensitiveDataSanitizer 单元测试
 * 测试敏感数据脱敏器的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { SensitiveDataSanitizer } from '../SensitiveDataSanitizer';

describe('SensitiveDataSanitizer', () => {
  let sanitizer: SensitiveDataSanitizer;

  beforeEach(() => {
    sanitizer = new SensitiveDataSanitizer();
  });

  afterEach(() => {
    sanitizer.clearCustomRules();
  });

  describe('基本脱敏', () => {
    it('应当脱敏 OpenAI API 密钥', () => {
      const text = 'API key: sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890ab';
      const result = sanitizer.sanitize(text);
      expect(result).not.toContain('1234567890abcdefghijklmnopqrstuvwxyz1234567890ab');
      expect(result).toContain('sk-***');
    });

    it('应当脱敏 GitHub 个人访问令牌', () => {
      const text = 'Token: ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      const result = sanitizer.sanitize(text);
      expect(result).not.toContain('1234567890abcdefghijklmnopqrstuvwxyz');
      expect(result).toContain('ghp_***');
    });

    it('应当脱敏邮箱地址', () => {
      const text = 'Contact: user@example.com';
      const result = sanitizer.sanitize(text);
      expect(result).not.toContain('user@example.com');
      expect(result).toContain('***@***.***');
    });

    it('应当脱敏 Bearer token', () => {
      const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const result = sanitizer.sanitize(text);
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      // 验证敏感信息被脱敏
      expect(result).toContain('***');
    });

    it('应当处理空字符串', () => {
      expect(sanitizer.sanitize('')).toBe('');
    });

    it('应当处理不包含敏感信息的文本', () => {
      const text = 'Hello, World!';
      expect(sanitizer.sanitize(text)).toBe(text);
    });
  });

  describe('API 密钥脱敏', () => {
    it('应当保留前后4个字符', () => {
      const result = sanitizer.sanitizeApiKey('sk-1234567890abcdef');
      expect(result).toBe('sk-1***cdef');
    });

    it('应当处理短密钥', () => {
      const result = sanitizer.sanitizeApiKey('short');
      expect(result).toBe('***');
    });

    it('应当处理空密钥', () => {
      expect(sanitizer.sanitizeApiKey('')).toBe('');
    });
  });

  describe('代码脱敏', () => {
    it('应当脱敏代码中的敏感字符串', () => {
      const code = 'const apiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890ab";';
      const result = sanitizer.sanitizeCode(code);
      expect(result).not.toContain('1234567890abcdefghijklmnopqrstuvwxyz1234567890ab');
    });

    it('应当保留代码结构', () => {
      const code = 'const name = "John";';
      const result = sanitizer.sanitizeCode(code);
      expect(result).toContain('const');
      expect(result).toContain('name');
    });

    it('应当处理空代码', () => {
      expect(sanitizer.sanitizeCode('')).toBe('');
    });
  });

  describe('自定义规则', () => {
    it('应当支持添加自定义规则', () => {
      sanitizer.addCustomRule(/CUSTOM_\d+/g, 'CUSTOM_***');
      const text = 'ID: CUSTOM_12345';
      const result = sanitizer.sanitize(text);
      expect(result).toBe('ID: CUSTOM_***');
    });

    it('应当能够清除自定义规则', () => {
      sanitizer.addCustomRule(/CUSTOM_\d+/g, 'CUSTOM_***');
      sanitizer.clearCustomRules();
      const text = 'ID: CUSTOM_12345';
      const result = sanitizer.sanitize(text);
      expect(result).toBe(text);
    });

    it('应当支持多个自定义规则', () => {
      sanitizer.addCustomRule(/RULE1_\d+/g, 'RULE1_***');
      sanitizer.addCustomRule(/RULE2_\d+/g, 'RULE2_***');
      const text = 'RULE1_123 and RULE2_456';
      const result = sanitizer.sanitize(text);
      expect(result).toBe('RULE1_*** and RULE2_***');
    });
  });

  describe('对象脱敏', () => {
    it('应当脱敏对象中的敏感字段', () => {
      const obj = {
        name: 'John',
        apiKey: 'secret-key-value',
        password: 'my-password',
      };
      const result = sanitizer.sanitizeObject(obj);
      expect(result.name).toBe('John');
      expect(result.apiKey).toBe('***');
      expect(result.password).toBe('***');
    });

    it('应当递归脱敏嵌套对象', () => {
      const obj = {
        user: {
          name: 'John',
          credentials: {
            apiKey: 'secret',
          },
        },
      };
      const result = sanitizer.sanitizeObject(obj);
      expect(result.user.name).toBe('John');
      expect(result.user.credentials.apiKey).toBe('***');
    });

    it('应当处理数组', () => {
      const arr = [{ apiKey: 'secret1' }, { apiKey: 'secret2' }];
      const result = sanitizer.sanitizeObject(arr);
      expect(result[0]?.apiKey).toBe('***');
      expect(result[1]?.apiKey).toBe('***');
    });

    it('应当处理 null 和 undefined', () => {
      expect(sanitizer.sanitizeObject(null)).toBeNull();
      expect(sanitizer.sanitizeObject(undefined)).toBeUndefined();
    });
  });
});
