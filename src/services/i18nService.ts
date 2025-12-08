import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 语言资源接口
 */
interface LanguageResource {
  language: string;
  translations: Record<string, string>;
  loadedAt: Date;
}

/**
 * 国际化服务接口
 */
export interface Ii18nService {
  /**
   * 获取当前语言
   */
  getCurrentLanguage(): string;

  /**
   * 设置当前语言
   * @param language 语言代码（如 'zh-CN', 'en-US'）
   */
  setLanguage(language: string): void;

  /**
   * 翻译文本
   * @param key 翻译键
   * @param params 参数对象（用于插值）
   */
  t(key: string, params?: Record<string, string | number>): string;

  /**
   * 加载语言资源
   * @param language 语言代码
   */
  loadLanguageResources(language: string): Promise<void>;

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): string[];
}

/**
 * 国际化服务实现
 * 提供多语言支持功能
 */
export class i18nService implements Ii18nService {
  private currentLanguage: string;
  private resources: Map<string, LanguageResource>;
  private supportedLanguages: string[];
  private extensionPath: string;

  /**
   * 构造函数
   * @param extensionPath 扩展根目录路径
   */
  constructor(extensionPath: string) {
    this.extensionPath = extensionPath;
    this.resources = new Map();
    this.supportedLanguages = ['zh-CN', 'en-US'];

    // 默认使用 VSCode 的语言设置
    this.currentLanguage = this.detectVSCodeLanguage();
  }

  /**
   * 检测 VSCode 的语言设置
   * @returns 语言代码
   */
  private detectVSCodeLanguage(): string {
    // 在测试环境中，vscode.env 可能未定义
    const vscodeLanguage = vscode.env?.language || 'en';

    // 映射 VSCode 语言代码到我们支持的语言
    if (vscodeLanguage.startsWith('zh')) {
      return 'zh-CN';
    }

    // 默认使用英文
    return 'en-US';
  }

  /**
   * 获取当前语言
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * 设置当前语言
   * @param language 语言代码（如 'zh-CN', 'en-US'）
   */
  setLanguage(language: string): void {
    if (!this.supportedLanguages.includes(language)) {
      throw new Error(`不支持的语言: ${language}`);
    }

    this.currentLanguage = language;
  }

  /**
   * 翻译文本
   * @param key 翻译键
   * @param params 参数对象（用于插值）
   */
  t(key: string, params?: Record<string, string | number>): string {
    // 获取当前语言的资源
    const resource = this.resources.get(this.currentLanguage);

    if (!resource) {
      // 如果资源未加载，返回键本身
      return key;
    }

    // 获取翻译文本
    let translation = resource.translations[key];

    if (!translation) {
      // 如果翻译不存在，返回键本身
      return key;
    }

    // 如果有参数，进行插值替换
    if (params) {
      translation = this.interpolate(translation, params);
    }

    return translation;
  }

  /**
   * 插值替换
   * 将 {key} 格式的占位符替换为实际值
   * @param text 原始文本
   * @param params 参数对象
   * @returns 替换后的文本
   */
  private interpolate(text: string, params: Record<string, string | number>): string {
    let result = text;

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      // 转义特殊字符以避免正则表达式问题
      const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // 转义替换值中的特殊字符
      const escapedValue = String(value).replace(/\$/g, '$$$$');
      result = result.replace(new RegExp(escapedPlaceholder, 'g'), escapedValue);
    }

    return result;
  }

  /**
   * 加载语言资源
   * @param language 语言代码
   */
  async loadLanguageResources(language: string): Promise<void> {
    // 检查是否已加载
    if (this.resources.has(language)) {
      return;
    }

    // 构建语言文件路径
    const localesPath = path.join(this.extensionPath, 'src', 'locales', `${language}.json`);

    try {
      // 读取语言文件
      const fileContent = await fs.promises.readFile(localesPath, 'utf-8');
      const translations = JSON.parse(fileContent) as Record<string, string>;

      // 存储资源
      const resource: LanguageResource = {
        language,
        translations,
        loadedAt: new Date(),
      };

      this.resources.set(language, resource);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`加载语言资源失败: ${language}, 错误: ${errorMessage}`);
    }
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  /**
   * 预加载所有支持的语言资源
   */
  async preloadAllLanguages(): Promise<void> {
    const loadPromises = this.supportedLanguages.map((lang) =>
      this.loadLanguageResources(lang).catch((error) => {
        console.error(`预加载语言 ${lang} 失败:`, error);
      })
    );

    await Promise.all(loadPromises);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.resources.clear();
  }
}
