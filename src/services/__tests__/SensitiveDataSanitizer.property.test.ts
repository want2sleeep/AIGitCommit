import * as fc from 'fast-check';
import { SensitiveDataSanitizer } from '../SensitiveDataSanitizer';

/**
 * Feature: project-optimization-recommendations, Property 11: 日志脱敏完整性
 *
 * 属性测试：验证敏感数据脱敏器能够正确脱敏所有敏感信息
 */
describe('SensitiveDataSanitizer 属性测试', () => {
  let sanitizer: SensitiveDataSanitizer;

  beforeEach(() => {
    sanitizer = new SensitiveDataSanitizer();
  });

  describe('属性 11: 日志脱敏完整性', () => {
    it('应当脱敏所有 API 密钥', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc
            .string({ minLength: 48, maxLength: 48 })
            .map((s) => 'sk-' + s.replace(/[^a-zA-Z0-9]/g, 'a')),
          (message, apiKey) => {
            const logMessage = `${message} API Key: ${apiKey}`;
            const sanitized = sanitizer.sanitize(logMessage);

            // 验证 API 密钥被脱敏
            expect(sanitized).not.toContain(apiKey);
            expect(sanitized).toContain('sk-***');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当脱敏所有 GitHub token', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc
            .string({ minLength: 36, maxLength: 36 })
            .map((s) => 'ghp_' + s.replace(/[^a-zA-Z0-9]/g, 'a')),
          (message, token) => {
            const logMessage = `${message} Token: ${token}`;
            const sanitized = sanitizer.sanitize(logMessage);

            // 验证 token 被脱敏
            expect(sanitized).not.toContain(token);
            expect(sanitized).toContain('ghp_***');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当脱敏 Bearer token', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc
            .string({ minLength: 20, maxLength: 50 })
            .map((s) => s.replace(/[^a-zA-Z0-9_\-\.]/g, 'a')),
          (message, token) => {
            const logMessage = `${message} Bearer ${token}`;
            const sanitized = sanitizer.sanitize(logMessage);

            // 验证 Bearer token 被脱敏
            expect(sanitized).not.toContain(token);
            expect(sanitized).toContain('Bearer ***');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当脱敏邮箱地址', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.emailAddress(),
          (message, email) => {
            const logMessage = `${message} Email: ${email}`;
            const sanitized = sanitizer.sanitize(logMessage);

            // 验证邮箱被脱敏
            expect(sanitized).not.toContain(email);
            expect(sanitized).toContain('***@***.***');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当脱敏密码字段', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 8, maxLength: 32 })
            .filter((s) => !s.includes('@') && !s.includes('.')),
          (password) => {
            const jsonString = JSON.stringify({ password, username: 'test' });
            const sanitized = sanitizer.sanitize(jsonString);

            // 验证密码被脱敏
            expect(sanitized).not.toContain(password);
            expect(sanitized).toContain('"password": "***"');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当脱敏代理认证信息', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 20 }).map((s) => s.replace(/[^a-zA-Z0-9]/g, 'a')),
          fc.string({ minLength: 8, maxLength: 20 }).map((s) => s.replace(/[^a-zA-Z0-9]/g, 'a')),
          fc.string({ minLength: 5, maxLength: 20 }).map((s) => s.replace(/[^a-zA-Z0-9]/g, 'a')),
          (username, password, host) => {
            const proxyUrl = `http://${username}:${password}@${host}:8080`;
            const sanitized = sanitizer.sanitize(proxyUrl);

            // 验证用户名和密码被脱敏
            expect(sanitized).not.toContain(`${username}:${password}`);
            expect(sanitized).toContain('//***:***@');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('sanitizeApiKey 方法', () => {
    it('应当保留前4和后4个字符', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 8, maxLength: 100 }), (apiKey) => {
          const sanitized = sanitizer.sanitizeApiKey(apiKey);

          // 验证格式
          expect(sanitized).toContain('***');

          // 验证保留了前4和后4个字符
          if (apiKey.length >= 8) {
            expect(sanitized).toContain(apiKey.substring(0, 4));
            expect(sanitized).toContain(apiKey.substring(apiKey.length - 4));
          }
        }),
        { numRuns: 100 }
      );
    });

    it('应当处理短密钥', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 7 }), (apiKey) => {
          const sanitized = sanitizer.sanitizeApiKey(apiKey);

          // 短密钥应该完全被替换为 ***
          expect(sanitized).toBe('***');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('sanitizeCode 方法', () => {
    it('应当脱敏代码中的长字符串字面量', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 32, maxLength: 64 })
            .map((s) => 'sk-' + s.replace(/[^a-zA-Z0-9]/g, 'a')),
          (apiKey) => {
            const code = `const apiKey = "${apiKey}";`;
            const sanitized = sanitizer.sanitizeCode(code);

            // 验证 API 密钥被脱敏
            expect(sanitized).not.toContain(apiKey);
            expect(sanitized).toContain('"***"');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当保留短字符串不变', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 19 }), (shortString) => {
          const code = `const name = "${shortString}";`;
          const sanitized = sanitizer.sanitizeCode(code);

          // 短字符串应该保留（除非匹配其他规则）
          if (!shortString.includes('@') && !shortString.startsWith('sk-')) {
            expect(sanitized).toContain(shortString);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('addCustomRule 方法', () => {
    it('应当应用自定义脱敏规则', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 20 }).map((s) => s.replace(/[^a-zA-Z0-9]/g, 'a')), // 确保只包含字母数字字符
          (customSecret) => {
            // 添加自定义规则
            sanitizer.addCustomRule(/CUSTOM_SECRET_\w+/g, 'CUSTOM_SECRET_***');

            const text = `Secret: CUSTOM_SECRET_${customSecret}`;
            const sanitized = sanitizer.sanitize(text);

            // 验证自定义规则被应用
            expect(sanitized).not.toContain(`CUSTOM_SECRET_${customSecret}`);
            expect(sanitized).toContain('CUSTOM_SECRET_***');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('sanitizeObject 方法', () => {
    it('应当脱敏对象中的敏感字段', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 8, maxLength: 32 }),
          fc.string({ minLength: 20, maxLength: 50 }),
          (password, apiKey) => {
            const obj = {
              username: 'testuser',
              password,
              apiKey,
              data: 'normal data',
            };

            const sanitized = sanitizer.sanitizeObject(obj);

            // 验证敏感字段被脱敏
            expect(sanitized.password).toBe('***');
            expect(sanitized.apiKey).toBe('***');

            // 验证普通字段保留
            expect(sanitized.username).toBe('testuser');
            expect(sanitized.data).toBe('normal data');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当递归脱敏嵌套对象', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 8, maxLength: 32 }), (secret) => {
          const obj = {
            config: {
              auth: {
                secret,
                username: 'test',
              },
            },
          };

          const sanitized = sanitizer.sanitizeObject(obj);

          // 验证嵌套的敏感字段被脱敏
          expect(sanitized.config.auth.secret).toBe('***');
          expect(sanitized.config.auth.username).toBe('test');
        }),
        { numRuns: 100 }
      );
    });

    it('应当脱敏数组中的敏感数据', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc
              .string({ minLength: 48, maxLength: 48 })
              .map((s) => 'sk-' + s.replace(/[^a-zA-Z0-9]/g, 'a')),
            { minLength: 1, maxLength: 5 }
          ),
          (apiKeys) => {
            const sanitized = sanitizer.sanitizeObject(apiKeys);

            // 验证数组中的每个 API 密钥都被脱敏
            for (let i = 0; i < apiKeys.length; i++) {
              expect(sanitized[i]).not.toContain(apiKeys[i]);
              expect(sanitized[i]).toContain('sk-***');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('边界情况', () => {
    it('应当处理空字符串', () => {
      const sanitized = sanitizer.sanitize('');
      expect(sanitized).toBe('');
    });

    it('应当处理 null 和 undefined', () => {
      expect(sanitizer.sanitizeObject(null)).toBeNull();
      expect(sanitizer.sanitizeObject(undefined)).toBeUndefined();
    });

    it('应当处理不包含敏感信息的文本', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 100 })
            .filter(
              (s) =>
                !s.includes('sk-') &&
                !s.includes('ghp_') &&
                !s.includes('@') &&
                !s.includes('password') &&
                s.length < 32
            ),
          (normalText) => {
            const sanitized = sanitizer.sanitize(normalText);

            // 普通文本应该保持不变
            expect(sanitized).toBe(normalText);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
