/**
 * SSLValidator 单元测试
 * 测试 SSL 验证器的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { SSLValidator } from '../SSLValidator';

describe('SSLValidator', () => {
  let validator: SSLValidator;

  beforeEach(() => {
    validator = new SSLValidator();
  });

  afterEach(() => {
    validator.clearCustomCA();
  });

  describe('自定义 CA 证书管理', () => {
    it('应当能够设置自定义 CA 证书', () => {
      const caCert = '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----';
      validator.setCustomCA(caCert);
      expect(validator.getCustomCA()).toBe(caCert);
    });

    it('应当能够清除自定义 CA 证书', () => {
      validator.setCustomCA('test-cert');
      validator.clearCustomCA();
      expect(validator.getCustomCA()).toBeUndefined();
    });

    it('应当初始时没有自定义 CA 证书', () => {
      expect(validator.getCustomCA()).toBeUndefined();
    });
  });

  describe('URL 验证', () => {
    it('应当对非 HTTPS URL 返回有效', async () => {
      const result = await validator.validateCertificate('http://example.com');
      expect(result.valid).toBe(true);
      expect(result.error).toContain('Not an HTTPS URL');
    });

    it('应当处理无效的 URL', async () => {
      const result = await validator.validateCertificate('not-a-valid-url');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // 注意：实际的 SSL 验证测试需要网络连接，这里只测试基本逻辑
  describe('证书验证逻辑', () => {
    it('应当返回验证结果对象', async () => {
      // 使用一个不存在的主机来测试错误处理
      const result = await validator.validateCertificate('https://localhost:99999');
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
    });
  });
});
