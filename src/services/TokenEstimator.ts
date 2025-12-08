/**
 * Token 估算器服务
 * 负责估算文本的 token 数量并判断是否需要拆分处理
 *
 * 使用基于字符的估算算法，对不同类型的字符采用不同的估算系数：
 * - 英文和代码：平均每 4 个字符约等于 1 个 token
 * - 中文字符：平均每 1.5 个字符约等于 1 个 token
 */

import { LARGE_DIFF_CONSTANTS, MODEL_TOKEN_LIMITS } from '../constants';
import { ITokenEstimator, LargeDiffConfig } from '../types/interfaces';

/**
 * Token 估算器实现类
 */
export class TokenEstimator implements ITokenEstimator {
  private config: LargeDiffConfig;
  private modelName: string;

  /**
   * 创建 TokenEstimator 实例
   * @param modelName 当前使用的模型名称
   * @param config 大型 Diff 处理配置
   */
  constructor(modelName: string, config: LargeDiffConfig) {
    this.modelName = modelName;
    this.config = config;
  }

  /**
   * 估算文本的 token 数量
   * 使用基于字符的估算算法，区分中文和非中文字符
   *
   * @param text 待估算的文本
   * @returns 估算的 token 数量
   */
  estimate(text: string): number {
    if (!text || text.length === 0) {
      return 0;
    }

    // 统计中文字符数量（包括中文标点）
    const chineseCharRegex = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g;
    const chineseMatches = text.match(chineseCharRegex);
    const chineseCharCount = chineseMatches ? chineseMatches.length : 0;

    // 非中文字符数量
    const nonChineseCharCount = text.length - chineseCharCount;

    // 分别计算 token 数量
    const chineseTokens = Math.ceil(
      chineseCharCount / LARGE_DIFF_CONSTANTS.CHINESE_CHARS_PER_TOKEN
    );
    const nonChineseTokens = Math.ceil(nonChineseCharCount / LARGE_DIFF_CONSTANTS.CHARS_PER_TOKEN);

    return chineseTokens + nonChineseTokens;
  }

  /**
   * 获取当前模型的有效 token 限制
   * 有效限制 = 原始限制 * 安全边界百分比
   *
   * @returns 有效限制（已应用安全边界）
   */
  getEffectiveLimit(): number {
    const rawLimit = this.getRawLimit();
    const safetyMargin = this.config.safetyMarginPercent / 100;
    return Math.floor(rawLimit * safetyMargin);
  }

  /**
   * 判断文本是否需要拆分
   * 当估算的 token 数量超过有效限制时返回 true
   *
   * @param text 待检查的文本
   * @returns 是否需要拆分
   */
  needsSplit(text: string): boolean {
    const estimatedTokens = this.estimate(text);
    const effectiveLimit = this.getEffectiveLimit();
    return estimatedTokens > effectiveLimit;
  }

  /**
   * 获取模型的原始 token 限制
   * 优先使用预设表中的值，未知模型返回默认值
   *
   * @param modelName 模型名称
   * @returns 原始限制
   */
  getModelLimit(modelName: string): number {
    // 尝试精确匹配
    if (MODEL_TOKEN_LIMITS[modelName]) {
      return MODEL_TOKEN_LIMITS[modelName];
    }

    // 尝试模糊匹配（处理模型名称变体）
    const normalizedName = modelName.toLowerCase();
    for (const [key, value] of Object.entries(MODEL_TOKEN_LIMITS)) {
      if (
        normalizedName.includes(key.toLowerCase()) ||
        key.toLowerCase().includes(normalizedName)
      ) {
        return value;
      }
    }

    // 未知模型返回默认值
    return LARGE_DIFF_CONSTANTS.DEFAULT_TOKEN_LIMIT;
  }

  /**
   * 获取原始 token 限制
   * 优先使用用户自定义限制，否则使用模型自动检测
   *
   * @returns 原始限制
   */
  private getRawLimit(): number {
    // 如果用户设置了自定义限制（大于 0），优先使用
    if (this.config.customTokenLimit && this.config.customTokenLimit > 0) {
      return this.config.customTokenLimit;
    }

    // 否则使用模型自动检测
    return this.getModelLimit(this.modelName);
  }

  /**
   * 更新配置
   * @param config 新的配置
   */
  updateConfig(config: LargeDiffConfig): void {
    this.config = config;
  }

  /**
   * 更新模型名称
   * @param modelName 新的模型名称
   */
  updateModelName(modelName: string): void {
    this.modelName = modelName;
  }

  /**
   * 获取当前配置信息（用于调试和显示）
   * @returns 配置信息对象
   */
  getConfigInfo(): {
    modelName: string;
    rawLimit: number;
    effectiveLimit: number;
    safetyMarginPercent: number;
    isCustomLimit: boolean;
  } {
    return {
      modelName: this.modelName,
      rawLimit: this.getRawLimit(),
      effectiveLimit: this.getEffectiveLimit(),
      safetyMarginPercent: this.config.safetyMarginPercent,
      isCustomLimit: !!(this.config.customTokenLimit && this.config.customTokenLimit > 0),
    };
  }
}
