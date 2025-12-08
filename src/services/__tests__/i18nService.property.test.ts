/**
 * i18nService 属性测试
 * 使用 fast-check 进行属性测试，验证国际化服务的通用属性
 *
 * Feature: project-optimization-recommendations
 * Property 8: 语言切换一致性
 * Property 9: 翻译键完整性
 */

import * as fc from 'fast-check';
import { i18nService } from '../i18nService';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('i18nService 属性测试', () => {
  let tempDir: string;
  let extensionPath: string;

  beforeEach(async () => {
    // 创建临时目录用于测试
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'i18n-test-'));
    extensionPath = tempDir;

    // 创建 locales 目录
    const localesDir = path.join(extensionPath, 'src', 'locales');
    await fs.promises.mkdir(localesDir, { recursive: true });

    // 创建测试用的语言文件
    const zhCNTranslations = {
      'common.ok': '确定',
      'common.cancel': '取消',
      'common.save': '保存',
      'error.network': '网络错误',
      'error.timeout': '请求超时',
      'message.welcome': '欢迎使用 {appName}',
      'message.greeting': '你好，{name}！',
    };

    const enUSTranslations = {
      'common.ok': 'OK',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'error.network': 'Network Error',
      'error.timeout': 'Request Timeout',
      'message.welcome': 'Welcome to {appName}',
      'message.greeting': 'Hello, {name}!',
    };

    await fs.promises.writeFile(
      path.join(localesDir, 'zh-CN.json'),
      JSON.stringify(zhCNTranslations, null, 2)
    );

    await fs.promises.writeFile(
      path.join(localesDir, 'en-US.json'),
      JSON.stringify(enUSTranslations, null, 2)
    );
  });

  afterEach(async () => {
    // 清理临时目录
    if (tempDir) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * 属性 8: 语言切换一致性
   * 对于任何支持的语言，切换语言后所有 UI 文本应当使用对应语言显示
   * 验证需求: 5.1
   */
  it('属性 8: 切换语言后所有文本应当使用对应语言', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom('zh-CN', 'en-US'), async (language) => {
        const service = new i18nService(extensionPath);

        // 加载语言资源
        await service.loadLanguageResources(language);

        // 设置语言
        service.setLanguage(language);

        // 验证当前语言
        expect(service.getCurrentLanguage()).toBe(language);

        // 验证翻译使用正确的语言
        const okText = service.t('common.ok');
        const cancelText = service.t('common.cancel');

        if (language === 'zh-CN') {
          // 中文应当包含中文字符
          expect(okText).toBe('确定');
          expect(cancelText).toBe('取消');
        } else {
          // 英文应当是英文文本
          expect(okText).toBe('OK');
          expect(cancelText).toBe('Cancel');
        }

        service.dispose();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 属性 9: 翻译键完整性
   * 对于任何 UI 文本，应当存在对应的翻译键，不应出现未翻译的文本
   * 验证需求: 5.1, 5.3, 5.4
   */
  it('属性 9: 所有已知的翻译键都应当有对应的翻译', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('zh-CN', 'en-US'),
        fc.constantFrom(
          'common.ok',
          'common.cancel',
          'common.save',
          'error.network',
          'error.timeout'
        ),
        async (language, key) => {
          const service = new i18nService(extensionPath);

          // 加载语言资源
          await service.loadLanguageResources(language);
          service.setLanguage(language);

          // 翻译应当返回非空字符串，且不等于键本身
          const translation = service.t(key);

          expect(translation).toBeTruthy();
          expect(translation).not.toBe(key);
          expect(translation.length).toBeGreaterThan(0);

          service.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 未知键应当返回键本身
   * 对于任何未定义的翻译键，应当返回键本身作为降级处理
   */
  it('属性: 未知键应当返回键本身', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('zh-CN', 'en-US'),
        fc.string({ minLength: 1 }).filter(
          (s) =>
            !s.startsWith('common.') &&
            !s.startsWith('error.') &&
            !s.startsWith('message.') &&
            // 过滤掉 Object 原型上的属性名
            s !== 'constructor' &&
            s !== 'toString' &&
            s !== 'valueOf' &&
            s !== 'hasOwnProperty' &&
            s !== '__proto__'
        ),
        async (language, unknownKey) => {
          const service = new i18nService(extensionPath);

          await service.loadLanguageResources(language);
          service.setLanguage(language);

          const translation = service.t(unknownKey);

          // 未知键应当返回键本身
          expect(translation).toBe(unknownKey);

          service.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 插值替换应当正确工作
   * 对于任何包含占位符的翻译，插值应当正确替换参数
   */
  it('属性: 插值替换应当正确工作', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('zh-CN', 'en-US'),
        fc.string({ minLength: 1 }),
        async (language, appName) => {
          const service = new i18nService(extensionPath);

          await service.loadLanguageResources(language);
          service.setLanguage(language);

          const translation = service.t('message.welcome', { appName });

          // 翻译应当包含替换后的参数
          expect(translation).toContain(appName);
          // 不应当包含占位符
          expect(translation).not.toContain('{appName}');

          service.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 多个参数的插值应当都被替换
   * 对于包含多个占位符的翻译，所有参数都应当被正确替换
   */
  it('属性: 多个参数的插值应当都被替换', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('zh-CN', 'en-US'),
        fc.string({ minLength: 1 }),
        async (language, name) => {
          const service = new i18nService(extensionPath);

          await service.loadLanguageResources(language);
          service.setLanguage(language);

          const translation = service.t('message.greeting', { name });

          // 翻译应当包含替换后的参数
          expect(translation).toContain(name);
          // 不应当包含占位符
          expect(translation).not.toContain('{name}');

          service.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 语言切换应当立即生效
   * 对于任何语言切换操作，后续的翻译应当立即使用新语言
   */
  it('属性: 语言切换应当立即生效', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('zh-CN', 'en-US'),
        fc.constantFrom('zh-CN', 'en-US'),
        async (lang1, lang2) => {
          const service = new i18nService(extensionPath);

          // 加载两种语言的资源
          await service.loadLanguageResources(lang1);
          await service.loadLanguageResources(lang2);

          // 设置第一种语言
          service.setLanguage(lang1);
          const translation1 = service.t('common.ok');

          // 切换到第二种语言
          service.setLanguage(lang2);
          const translation2 = service.t('common.ok');

          // 如果两种语言不同，翻译应当不同
          if (lang1 !== lang2) {
            expect(translation1).not.toBe(translation2);
          } else {
            expect(translation1).toBe(translation2);
          }

          service.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 获取支持的语言列表应当包含所有支持的语言
   * 支持的语言列表应当包含 zh-CN 和 en-US
   */
  it('属性: 获取支持的语言列表应当包含所有支持的语言', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const service = new i18nService(extensionPath);

        const supportedLanguages = service.getSupportedLanguages();

        expect(supportedLanguages).toContain('zh-CN');
        expect(supportedLanguages).toContain('en-US');
        expect(supportedLanguages.length).toBeGreaterThanOrEqual(2);

        service.dispose();
      }),
      { numRuns: 10 }
    );
  });

  /**
   * 属性: 设置不支持的语言应当抛出错误
   * 对于任何不在支持列表中的语言，设置时应当抛出错误
   */
  it('属性: 设置不支持的语言应当抛出错误', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s !== 'zh-CN' && s !== 'en-US'),
        async (unsupportedLanguage) => {
          const service = new i18nService(extensionPath);

          expect(() => {
            service.setLanguage(unsupportedLanguage);
          }).toThrow();

          service.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 相同语言的多次加载应当是幂等的
   * 对于任何语言，多次加载应当不影响翻译结果
   */
  it('属性: 相同语言的多次加载应当是幂等的', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom('zh-CN', 'en-US'), async (language) => {
        const service = new i18nService(extensionPath);

        // 第一次加载
        await service.loadLanguageResources(language);
        service.setLanguage(language);
        const translation1 = service.t('common.ok');

        // 第二次加载
        await service.loadLanguageResources(language);
        const translation2 = service.t('common.ok');

        // 翻译结果应当相同
        expect(translation1).toBe(translation2);

        service.dispose();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * 属性: 未加载资源时翻译应当返回键本身
   * 对于任何未加载资源的语言，翻译应当返回键本身
   */
  it('属性: 未加载资源时翻译应当返回键本身', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('zh-CN', 'en-US'),
        fc.constantFrom('common.ok', 'common.cancel'),
        async (language, key) => {
          const service = new i18nService(extensionPath);

          // 不加载资源，直接设置语言
          service.setLanguage(language);

          const translation = service.t(key);

          // 未加载资源时应当返回键本身
          expect(translation).toBe(key);

          service.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });
});
