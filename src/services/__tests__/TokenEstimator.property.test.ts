/**
 * TokenEstimator 属性测试
 * 使用 fast-check 进行属性测试，验证 Token 估算器的正确性属性
 *
 * **Feature: large-diff-handling**
 */

import * as fc from 'fast-check';
import { TokenEstimator } from '../TokenEstimator';
import { LargeDiffConfig } from '../../types/interfaces';

describe('TokenEstimator 属性测试', () => {
  // 默认测试配置
  const defaultConfig: LargeDiffConfig = {
    enableMapReduce: true,
    safetyMarginPercent: 85,
    maxConcurrentRequests: 5,
  };

  /**
   * **Feature: large-diff-handling, Property 1: Token 估算正比性**
   *
   * 对于任意非空文本，TokenEstimator 估算的 token 数量应当是正数，
   * 且与文本长度成正比关系（在合理误差范围内）。
   *
   * **验证: 需求 1.1**
   */
  describe('属性 1: Token 估算正比性', () => {
    it('对于任意非空文本，估算的 token 数量应当是正数', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (text) => {
          const estimator = new TokenEstimator('gpt-4', defaultConfig);
          const tokens = estimator.estimate(text);
          return tokens > 0;
        }),
        { numRuns: 100 }
      );
    });

    it('空文本应当返回 0 个 token', () => {
      const estimator = new TokenEstimator('gpt-4', defaultConfig);
      expect(estimator.estimate('')).toBe(0);
    });

    it('文本长度增加时，token 数量应当增加或保持不变', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (text1, text2) => {
            const estimator = new TokenEstimator('gpt-4', defaultConfig);
            const tokens1 = estimator.estimate(text1);
            const tokensCombined = estimator.estimate(text1 + text2);
            // 合并后的 token 数应当大于等于单独的 token 数
            return tokensCombined >= tokens1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('token 数量应当与文本长度成正比（在合理范围内）', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 10, maxLength: 1000 }), (text) => {
          const estimator = new TokenEstimator('gpt-4', defaultConfig);
          const tokens = estimator.estimate(text);
          // token 数量应当在 [length/10, length] 范围内（考虑中英文混合）
          return tokens >= text.length / 10 && tokens <= text.length;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: large-diff-handling, Property 2: 有效限制计算**
   *
   * 对于任意模型限制值和安全边界百分比，有效限制应当等于
   * `模型限制 * 安全边界百分比`。
   *
   * **验证: 需求 1.2**
   */
  describe('属性 2: 有效限制计算', () => {
    it('有效限制应当等于原始限制乘以安全边界百分比', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 100 }), // 安全边界百分比
          fc.integer({ min: 1000, max: 200000 }), // 自定义 token 限制
          (safetyMargin, customLimit) => {
            const config: LargeDiffConfig = {
              enableMapReduce: true,
              safetyMarginPercent: safetyMargin,
              maxConcurrentRequests: 5,
              customTokenLimit: customLimit,
            };
            const estimator = new TokenEstimator('gpt-4', config);
            const effectiveLimit = estimator.getEffectiveLimit();
            const expectedLimit = Math.floor(customLimit * (safetyMargin / 100));
            return effectiveLimit === expectedLimit;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('有效限制应当小于等于原始限制', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 100 }),
          fc.integer({ min: 1000, max: 200000 }),
          (safetyMargin, customLimit) => {
            const config: LargeDiffConfig = {
              enableMapReduce: true,
              safetyMarginPercent: safetyMargin,
              maxConcurrentRequests: 5,
              customTokenLimit: customLimit,
            };
            const estimator = new TokenEstimator('gpt-4', config);
            const effectiveLimit = estimator.getEffectiveLimit();
            return effectiveLimit <= customLimit;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('安全边界为 100% 时，有效限制应当等于原始限制', () => {
      const config: LargeDiffConfig = {
        enableMapReduce: true,
        safetyMarginPercent: 100,
        maxConcurrentRequests: 5,
        customTokenLimit: 8192,
      };
      const estimator = new TokenEstimator('gpt-4', config);
      expect(estimator.getEffectiveLimit()).toBe(8192);
    });
  });

  /**
   * **Feature: large-diff-handling, Property 3: 拆分判断一致性**
   *
   * 对于任意 diff 内容，当且仅当其估算 token 数超过有效限制时，
   * `needsSplit` 应返回 `true`。
   *
   * **验证: 需求 1.3**
   */
  describe('属性 3: 拆分判断一致性', () => {
    it('needsSplit 应当与 token 估算和有效限制的比较结果一致', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 5000 }),
          fc.integer({ min: 100, max: 10000 }), // 自定义限制
          (text, customLimit) => {
            const config: LargeDiffConfig = {
              enableMapReduce: true,
              safetyMarginPercent: 85,
              maxConcurrentRequests: 5,
              customTokenLimit: customLimit,
            };
            const estimator = new TokenEstimator('gpt-4', config);
            const tokens = estimator.estimate(text);
            const effectiveLimit = estimator.getEffectiveLimit();
            const needsSplit = estimator.needsSplit(text);

            // needsSplit 应当与 tokens > effectiveLimit 一致
            return needsSplit === tokens > effectiveLimit;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('空文本不应当需要拆分', () => {
      const estimator = new TokenEstimator('gpt-4', defaultConfig);
      expect(estimator.needsSplit('')).toBe(false);
    });

    it('超过有效限制的文本应当需要拆分', () => {
      const config: LargeDiffConfig = {
        enableMapReduce: true,
        safetyMarginPercent: 85,
        maxConcurrentRequests: 5,
        customTokenLimit: 100, // 设置很小的限制
      };
      const estimator = new TokenEstimator('gpt-4', config);
      // 生成一个足够长的文本
      const longText = 'a'.repeat(1000);
      expect(estimator.needsSplit(longText)).toBe(true);
    });

    it('未超过有效限制的文本不应当需要拆分', () => {
      const config: LargeDiffConfig = {
        enableMapReduce: true,
        safetyMarginPercent: 85,
        maxConcurrentRequests: 5,
        customTokenLimit: 100000, // 设置很大的限制
      };
      const estimator = new TokenEstimator('gpt-4', config);
      const shortText = 'hello world';
      expect(estimator.needsSplit(shortText)).toBe(false);
    });
  });
});

describe('TokenEstimator 模型限制属性测试', () => {
  const defaultConfig: LargeDiffConfig = {
    enableMapReduce: true,
    safetyMarginPercent: 85,
    maxConcurrentRequests: 5,
  };

  /**
   * **Feature: large-diff-handling, Property 16: 已知模型限制正确性**
   *
   * 对于任意已知模型名称（如 gpt-4、claude-3-sonnet），
   * 系统应当返回预设的正确 token 限制。
   *
   * **验证: 需求 9.1**
   */
  describe('属性 16: 已知模型限制正确性', () => {
    const knownModels: Array<{ name: string; expectedLimit: number }> = [
      { name: 'gpt-3.5-turbo', expectedLimit: 4096 },
      { name: 'gpt-4', expectedLimit: 8192 },
      { name: 'gpt-4-turbo', expectedLimit: 128000 },
      { name: 'gpt-4o', expectedLimit: 128000 },
      { name: 'claude-3-opus', expectedLimit: 200000 },
      { name: 'claude-3-sonnet', expectedLimit: 200000 },
      { name: 'gemini-pro', expectedLimit: 32000 },
      { name: 'qwen-turbo', expectedLimit: 8000 },
      { name: 'qwen-max', expectedLimit: 32000 },
    ];

    it.each(knownModels)(
      '已知模型 $name 应当返回正确的限制 $expectedLimit',
      ({ name, expectedLimit }) => {
        const estimator = new TokenEstimator(name, defaultConfig);
        expect(estimator.getModelLimit(name)).toBe(expectedLimit);
      }
    );

    it('对于任意已知模型，返回的限制应当是正数', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'gpt-3.5-turbo',
            'gpt-4',
            'gpt-4-turbo',
            'claude-3-opus',
            'gemini-pro',
            'qwen-turbo'
          ),
          (modelName) => {
            const estimator = new TokenEstimator(modelName, defaultConfig);
            const limit = estimator.getModelLimit(modelName);
            return limit > 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: large-diff-handling, Property 17: 未知模型默认值**
   *
   * 对于任意未知模型名称，系统应当返回保守的默认限制（4096 tokens）。
   *
   * **验证: 需求 9.2**
   */
  describe('属性 17: 未知模型默认值', () => {
    it('未知模型应当返回默认限制 4096', () => {
      // 使用明确的未知模型名称前缀，避免模糊匹配到已知模型
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 50 }).map((s) => `unknown-model-${s}`),
          (unknownModel) => {
            const estimator = new TokenEstimator(unknownModel, defaultConfig);
            const limit = estimator.getModelLimit(unknownModel);
            return limit === 4096;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('随机字符串模型名应当返回默认限制', () => {
      const estimator = new TokenEstimator('random-model-xyz', defaultConfig);
      expect(estimator.getModelLimit('random-model-xyz')).toBe(4096);
    });
  });

  /**
   * **Feature: large-diff-handling, Property 15: 配置优先级**
   *
   * 对于任意用户设置的自定义 token 限制，
   * 系统应当使用自定义值而非自动检测值。
   *
   * **验证: 需求 8.1, 9.3**
   */
  describe('属性 15: 配置优先级', () => {
    it('自定义限制应当覆盖模型自动检测的限制', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 500000 }), // 自定义限制
          fc.constantFrom('gpt-4', 'claude-3-opus', 'gemini-pro'), // 已知模型
          (customLimit, modelName) => {
            const config: LargeDiffConfig = {
              enableMapReduce: true,
              safetyMarginPercent: 100, // 使用 100% 以便直接比较
              maxConcurrentRequests: 5,
              customTokenLimit: customLimit,
            };
            const estimator = new TokenEstimator(modelName, config);
            const effectiveLimit = estimator.getEffectiveLimit();
            // 有效限制应当等于自定义限制（因为安全边界是 100%）
            return effectiveLimit === customLimit;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('自定义限制为 0 时应当使用模型自动检测', () => {
      const config: LargeDiffConfig = {
        enableMapReduce: true,
        safetyMarginPercent: 100,
        maxConcurrentRequests: 5,
        customTokenLimit: 0,
      };
      const estimator = new TokenEstimator('gpt-4', config);
      // gpt-4 的限制是 8192
      expect(estimator.getEffectiveLimit()).toBe(8192);
    });

    it('未设置自定义限制时应当使用模型自动检测', () => {
      const config: LargeDiffConfig = {
        enableMapReduce: true,
        safetyMarginPercent: 100,
        maxConcurrentRequests: 5,
      };
      const estimator = new TokenEstimator('gpt-4', config);
      expect(estimator.getEffectiveLimit()).toBe(8192);
    });

    it('getConfigInfo 应当正确报告是否使用自定义限制', () => {
      const configWithCustom: LargeDiffConfig = {
        enableMapReduce: true,
        safetyMarginPercent: 85,
        maxConcurrentRequests: 5,
        customTokenLimit: 10000,
      };
      const configWithoutCustom: LargeDiffConfig = {
        enableMapReduce: true,
        safetyMarginPercent: 85,
        maxConcurrentRequests: 5,
      };

      const estimatorWithCustom = new TokenEstimator('gpt-4', configWithCustom);
      const estimatorWithoutCustom = new TokenEstimator('gpt-4', configWithoutCustom);

      expect(estimatorWithCustom.getConfigInfo().isCustomLimit).toBe(true);
      expect(estimatorWithoutCustom.getConfigInfo().isCustomLimit).toBe(false);
    });
  });
});
