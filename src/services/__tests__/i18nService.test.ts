/**
 * i18nService 单元测试
 * 测试国际化服务的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { i18nService } from '../i18nService';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs 模块
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

// Mock vscode 模块
jest.mock('vscode', () => ({
  env: {
    language: 'en',
  },
}));

describe('i18nService', () => {
  let service: i18nService;
  const mockExtensionPath = '/mock/extension/path';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new i18nService(mockExtensionPath);
  });

  afterEach(() => {
    service.dispose();
  });

  describe('语言检测和设置', () => {
    it('应当默认使用英文', () => {
      expect(service.getCurrentLanguage()).toBe('en-US');
    });

    it('应当能够设置语言', () => {
      service.setLanguage('zh-CN');
      expect(service.getCurrentLanguage()).toBe('zh-CN');
    });

    it('应当拒绝不支持的语言', () => {
      expect(() => service.setLanguage('fr-FR')).toThrow('不支持的语言: fr-FR');
    });

    it('应当返回支持的语言列表', () => {
      const languages = service.getSupportedLanguages();
      expect(languages).toContain('zh-CN');
      expect(languages).toContain('en-US');
    });
  });

  describe('翻译功能', () => {
    beforeEach(async () => {
      // Mock 语言文件内容
      const mockTranslations = {
        hello: '你好',
        welcome: '欢迎, {name}!',
        count: '共 {count} 项',
        multiple: '{a} 和 {b}',
      };

      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTranslations));

      service.setLanguage('zh-CN');
      await service.loadLanguageResources('zh-CN');
    });

    it('应当返回翻译后的文本', () => {
      expect(service.t('hello')).toBe('你好');
    });

    it('应当支持参数插值', () => {
      expect(service.t('welcome', { name: '张三' })).toBe('欢迎, 张三!');
    });

    it('应当支持数字参数', () => {
      expect(service.t('count', { count: 42 })).toBe('共 42 项');
    });

    it('应当支持多个参数', () => {
      expect(service.t('multiple', { a: 'A', b: 'B' })).toBe('A 和 B');
    });

    it('应当对不存在的键返回键本身', () => {
      expect(service.t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('应当在资源未加载时返回键本身', () => {
      const newService = new i18nService(mockExtensionPath);
      expect(newService.t('hello')).toBe('hello');
      newService.dispose();
    });
  });

  describe('资源加载', () => {
    it('应当能够加载语言资源', async () => {
      const mockTranslations = { test: 'Test' };
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTranslations));

      await service.loadLanguageResources('en-US');

      expect(fs.promises.readFile).toHaveBeenCalledWith(
        path.join(mockExtensionPath, 'src', 'locales', 'en-US.json'),
        'utf-8'
      );
    });

    it('应当不重复加载已加载的资源', async () => {
      const mockTranslations = { test: 'Test' };
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTranslations));

      await service.loadLanguageResources('en-US');
      await service.loadLanguageResources('en-US');

      expect(fs.promises.readFile).toHaveBeenCalledTimes(1);
    });

    it('应当在加载失败时抛出错误', async () => {
      (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(service.loadLanguageResources('en-US')).rejects.toThrow(
        '加载语言资源失败: en-US'
      );
    });
  });

  describe('预加载', () => {
    it('应当能够预加载所有语言', async () => {
      const mockTranslations = { test: 'Test' };
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTranslations));

      await service.preloadAllLanguages();

      expect(fs.promises.readFile).toHaveBeenCalledTimes(2);
    });

    it('应当在部分加载失败时继续加载其他语言', async () => {
      (fs.promises.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify({ test: 'Test' }))
        .mockRejectedValueOnce(new Error('File not found'));

      // 不应抛出错误
      await expect(service.preloadAllLanguages()).resolves.not.toThrow();
    });
  });

  describe('资源清理', () => {
    it('应当能够清理资源', async () => {
      const mockTranslations = { test: 'Test' };
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTranslations));

      await service.loadLanguageResources('en-US');
      service.dispose();

      // 清理后翻译应返回键本身
      expect(service.t('test')).toBe('test');
    });
  });
});
