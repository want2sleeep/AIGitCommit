/**
 * CustomCandidatesManager 单元测试
 */

import { CustomCandidatesManager } from '../CustomCandidatesManager';
import { ConfigurationManager } from '../ConfigurationManager';
import { ErrorHandler } from '../../utils/ErrorHandler';

describe('CustomCandidatesManager', () => {
  let manager: CustomCandidatesManager;
  let mockConfigManager: jest.Mocked<ConfigurationManager>;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;

  beforeEach(() => {
    // 创建 mock 对象
    mockConfigManager = {
      addCustomBaseUrl: jest.fn().mockResolvedValue(undefined),
      addCustomModelName: jest.fn().mockResolvedValue(undefined),
      getCustomBaseUrls: jest.fn().mockReturnValue([]),
      getCustomModelNames: jest.fn().mockReturnValue([]),
      removeCustomBaseUrl: jest.fn().mockResolvedValue(undefined),
      removeCustomModelName: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockErrorHandler = {
      handleError: jest.fn(),
      logError: jest.fn(),
      logInfo: jest.fn(),
      logWarning: jest.fn(),
    } as any;

    manager = new CustomCandidatesManager(mockConfigManager, mockErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateBaseUrl', () => {
    it('应当接受有效的 HTTPS URL', () => {
      const result = (manager as any).validateBaseUrl('https://api.example.com');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应当接受有效的 HTTP URL', () => {
      const result = (manager as any).validateBaseUrl('http://example.com');
      expect(result.valid).toBe(true);
    });

    it('应当拒绝空字符串', () => {
      const result = (manager as any).validateBaseUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不能为空');
    });

    it('应当拒绝无效的 URL 格式', () => {
      const result = (manager as any).validateBaseUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('URL 格式无效');
    });

    it('应当拒绝过长的 URL', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(500);
      const result = (manager as any).validateBaseUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('长度不能超过');
    });
  });

  describe('validateModelName', () => {
    it('应当接受有效的模型名称', () => {
      const result = (manager as any).validateModelName('gpt-4');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应当拒绝空字符串', () => {
      const result = (manager as any).validateModelName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不能为空');
    });

    it('应当拒绝过长的模型名称', () => {
      const longName = 'a'.repeat(201);
      const result = (manager as any).validateModelName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('长度不能超过');
    });
  });

  describe('saveCustomBaseUrl', () => {
    it('应当成功保存有效的 URL', async () => {
      mockConfigManager.getCustomBaseUrls.mockReturnValue([]);
      mockConfigManager.addCustomBaseUrl.mockResolvedValue(undefined);

      const result = await manager.saveCustomBaseUrl('https://api.example.com');

      expect(result.success).toBe(true);
      expect(result.added).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockConfigManager.addCustomBaseUrl).toHaveBeenCalled();
    });

    it('应当在验证失败时返回错误', async () => {
      const result = await manager.saveCustomBaseUrl('invalid-url');

      expect(result.success).toBe(false);
      expect(result.added).toBe(false);
      expect(result.error).toContain('URL 格式无效');
      expect(mockConfigManager.addCustomBaseUrl).not.toHaveBeenCalled();
    });

    it('应当在列表已满时返回错误', async () => {
      const fullList = Array(50).fill('url');
      mockConfigManager.getCustomBaseUrls.mockReturnValue(fullList);

      const result = await manager.saveCustomBaseUrl('https://api.example.com');

      expect(result.success).toBe(false);
      expect(result.added).toBe(false);
      expect(result.error).toContain('已达上限');
      expect(mockConfigManager.addCustomBaseUrl).not.toHaveBeenCalled();
    });

    it('应当跳过已存在的 URL', async () => {
      mockConfigManager.getCustomBaseUrls.mockReturnValue(['https://api.example.com']);

      const result = await manager.saveCustomBaseUrl('https://api.example.com');

      expect(result.success).toBe(true);
      expect(result.added).toBe(false);
      expect(mockConfigManager.addCustomBaseUrl).not.toHaveBeenCalled();
    });

    it('应当在保存失败后重试', async () => {
      mockConfigManager.getCustomBaseUrls.mockReturnValue([]);
      mockConfigManager.addCustomBaseUrl
        .mockRejectedValueOnce(new Error('临时错误'))
        .mockResolvedValueOnce(undefined);

      const result = await manager.saveCustomBaseUrl('https://api.example.com');

      expect(result.success).toBe(true);
      expect(result.retries).toBeGreaterThan(0);
      expect(mockConfigManager.addCustomBaseUrl).toHaveBeenCalledTimes(2);
    });
  });

  describe('saveCustomModelName', () => {
    it('应当成功保存有效的模型名称', async () => {
      mockConfigManager.getCustomModelNames.mockReturnValue([]);
      mockConfigManager.addCustomModelName.mockResolvedValue(undefined);

      const result = await manager.saveCustomModelName('gpt-4');

      expect(result.success).toBe(true);
      expect(result.added).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockConfigManager.addCustomModelName).toHaveBeenCalled();
    });

    it('应当在验证失败时返回错误', async () => {
      const result = await manager.saveCustomModelName('');

      expect(result.success).toBe(false);
      expect(result.added).toBe(false);
      expect(result.error).toContain('不能为空');
      expect(mockConfigManager.addCustomModelName).not.toHaveBeenCalled();
    });

    it('应当在列表已满时返回错误', async () => {
      const fullList = Array(50).fill('model');
      mockConfigManager.getCustomModelNames.mockReturnValue(fullList);

      const result = await manager.saveCustomModelName('gpt-4');

      expect(result.success).toBe(false);
      expect(result.added).toBe(false);
      expect(result.error).toContain('已达上限');
      expect(mockConfigManager.addCustomModelName).not.toHaveBeenCalled();
    });

    it('应当跳过已存在的模型名称', async () => {
      mockConfigManager.getCustomModelNames.mockReturnValue(['gpt-4']);

      const result = await manager.saveCustomModelName('gpt-4');

      expect(result.success).toBe(true);
      expect(result.added).toBe(false);
      expect(mockConfigManager.addCustomModelName).not.toHaveBeenCalled();
    });
  });

  describe('错误处理和日志记录', () => {
    it('应当记录验证错误', async () => {
      await manager.saveCustomBaseUrl('invalid-url');

      expect(mockErrorHandler.logWarning).toHaveBeenCalled();
    });

    it('应当记录保存错误', async () => {
      mockConfigManager.getCustomBaseUrls.mockReturnValue([]);
      mockConfigManager.addCustomBaseUrl.mockRejectedValue(new Error('保存失败'));

      await manager.saveCustomBaseUrl('https://api.example.com');

      expect(mockErrorHandler.logError).toHaveBeenCalled();
    });

    it('应当记录成功保存', async () => {
      mockConfigManager.getCustomBaseUrls.mockReturnValue([]);
      mockConfigManager.addCustomBaseUrl.mockResolvedValue(undefined);

      await manager.saveCustomBaseUrl('https://api.example.com');

      expect(mockErrorHandler.logInfo).toHaveBeenCalled();
    });
  });

  describe('边界情况和错误处理', () => {
    it('应当处理空字符串 URL', async () => {
      const result = await manager.saveCustomBaseUrl('');

      expect(result.success).toBe(false);
      expect(result.added).toBe(false);
      expect(result.error).toContain('不能为空');
    });

    it('应当处理纯空格 URL', async () => {
      const result = await manager.saveCustomBaseUrl('   ');

      expect(result.success).toBe(false);
      expect(result.added).toBe(false);
      expect(result.error).toContain('不能为空');
    });

    it('应当处理包含危险字符的 URL', async () => {
      const dangerousUrls = [
        'https://example.com/<script>',
        'https://example.com/"test"',
        "https://example.com/'test'",
        'https://example.com/`test`',
      ];

      for (const url of dangerousUrls) {
        const result = await manager.saveCustomBaseUrl(url);
        expect(result.success).toBe(false);
        expect(result.error).toContain('不允许的字符');
      }
    });

    it('应当处理非 HTTP/HTTPS 协议', async () => {
      const invalidUrls = ['ftp://example.com', 'file:///path/to/file', 'javascript:alert(1)'];

      for (const url of invalidUrls) {
        const result = await manager.saveCustomBaseUrl(url);
        expect(result.success).toBe(false);
      }
    });

    it('应当处理模型名称中的危险字符', async () => {
      const dangerousNames = [
        'model<script>',
        'model"test"',
        "model'test'",
        'model;rm -rf',
        'model&test',
        'model|test',
      ];

      for (const name of dangerousNames) {
        const result = await manager.saveCustomModelName(name);
        expect(result.success).toBe(false);
        expect(result.error).toContain('不允许的字符');
      }
    });

    it('应当处理超长模型名称', async () => {
      const longName = 'a'.repeat(101);
      const result = await manager.saveCustomModelName(longName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('长度不能超过');
    });

    it('应当在跳过验证时保存无效 URL', async () => {
      mockConfigManager.getCustomBaseUrls.mockReturnValue([]);
      mockConfigManager.addCustomBaseUrl.mockResolvedValue(undefined);

      const result = await manager.saveCustomBaseUrl('invalid-url', { skipValidation: true });

      expect(result.success).toBe(true);
      expect(result.added).toBe(true);
      expect(mockConfigManager.addCustomBaseUrl).toHaveBeenCalled();
    });

    it('应当使用自定义重试配置', async () => {
      mockConfigManager.getCustomBaseUrls.mockReturnValue([]);
      mockConfigManager.addCustomBaseUrl
        .mockRejectedValueOnce(new Error('错误1'))
        .mockRejectedValueOnce(new Error('错误2'))
        .mockResolvedValueOnce(undefined);

      const result = await manager.saveCustomBaseUrl('https://example.com', {
        maxRetries: 2,
        retryDelays: [10, 20],
      });

      expect(result.success).toBe(true);
      expect(result.retries).toBe(2);
      expect(mockConfigManager.addCustomBaseUrl).toHaveBeenCalledTimes(3);
    });

    it('应当在所有重试失败后返回错误', async () => {
      mockConfigManager.getCustomBaseUrls.mockReturnValue([]);
      mockConfigManager.addCustomBaseUrl.mockRejectedValue(new Error('持续失败'));

      const result = await manager.saveCustomBaseUrl('https://example.com', {
        maxRetries: 2,
        retryDelays: [10, 20],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('持续失败');
      expect(mockConfigManager.addCustomBaseUrl).toHaveBeenCalledTimes(3); // 初始 + 2 次重试
    });
  });

  describe('删除功能测试', () => {
    it('应当成功删除存在的 Base URL', async () => {
      mockConfigManager.removeCustomBaseUrl.mockResolvedValue(undefined);

      const result = await manager.removeCustomBaseUrl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.removed).toBe(true);
      expect(mockConfigManager.removeCustomBaseUrl).toHaveBeenCalledWith('https://example.com');
    });

    it('应当成功删除存在的模型名称', async () => {
      mockConfigManager.removeCustomModelName.mockResolvedValue(undefined);

      const result = await manager.removeCustomModelName('gpt-4');

      expect(result.success).toBe(true);
      expect(result.removed).toBe(true);
      expect(mockConfigManager.removeCustomModelName).toHaveBeenCalledWith('gpt-4');
    });

    it('应当处理删除 Base URL 时的错误', async () => {
      mockConfigManager.removeCustomBaseUrl.mockRejectedValue(new Error('删除失败'));

      const result = await manager.removeCustomBaseUrl('https://example.com');

      expect(result.success).toBe(false);
      expect(result.removed).toBe(false);
      expect(result.error).toContain('删除失败');
    });

    it('应当处理删除模型名称时的错误', async () => {
      mockConfigManager.removeCustomModelName.mockRejectedValue(new Error('删除失败'));

      const result = await manager.removeCustomModelName('gpt-4');

      expect(result.success).toBe(false);
      expect(result.removed).toBe(false);
      expect(result.error).toContain('删除失败');
    });
  });
});
