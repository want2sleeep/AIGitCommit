/**
 * SmartDiffFilter 属性测试
 * 使用 fast-check 进行属性测试，验证智能 Diff 过滤器的正确性属性
 *
 * **Feature: smart-diff-filter**
 */

import * as fc from 'fast-check';
import { SmartDiffFilter, PromptBuilder, FileInfo } from '../SmartDiffFilter';
import { GitChange, ChangeStatus, ExtensionConfig } from '../../types';
import { ILLMService } from '../../types/interfaces';

describe('SmartDiffFilter 属性测试', () => {
  // 创建模拟的 LLM 服务
  const createMockLLMService = (): ILLMService => ({
    generateCommitMessage: jest.fn().mockResolvedValue('["file1.ts", "file2.ts"]'),
  });

  // 创建测试配置
  const createTestConfig = (): ExtensionConfig => ({
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: 'test-key',
    modelName: 'gpt-4o-mini',
    language: 'zh-CN',
    commitFormat: 'conventional',
    maxTokens: 4000,
    temperature: 0.7,
  });

  // 生成随机的 GitChange
  const gitChangeArbitrary = fc.record({
    path: fc.string({ minLength: 1, maxLength: 50 }).map((s) => `src/${s}.ts`),
    status: fc.constantFrom(
      ChangeStatus.Added,
      ChangeStatus.Modified,
      ChangeStatus.Deleted,
      ChangeStatus.Renamed,
      ChangeStatus.Copied
    ),
    diff: fc.string({ minLength: 10, maxLength: 200 }),
    additions: fc.integer({ min: 0, max: 100 }),
    deletions: fc.integer({ min: 0, max: 100 }),
  });

  /**
   * **Feature: smart-diff-filter, Property 1: 数据转换完整性**
   *
   * 对于任意 GitChange 列表，构建的 FileInfo 列表应当包含所有文件的 path 和 status，
   * 但不包含 diff 字段。
   *
   * **验证: 需求 1.1, 3.1**
   */
  describe('属性 1: 数据转换完整性', () => {
    it('buildFileList 应当只包含 path 和 status，不包含 diff', () => {
      fc.assert(
        fc.property(fc.array(gitChangeArbitrary, { minLength: 1, maxLength: 10 }), (changes) => {
          const llmService = createMockLLMService();
          const config = createTestConfig();
          const filter = new SmartDiffFilter(llmService, config);

          const fileList = filter.buildFileList(changes);

          // 验证数量一致
          if (fileList.length !== changes.length) {
            return false;
          }

          // 验证每个 FileInfo 只包含 path 和 status
          return fileList.every((fileInfo, index) => {
            const change = changes[index];
            if (!change) {
              return false;
            }

            // 验证 path 一致
            const pathMatches = fileInfo.path === change.path;

            // 验证 status 是字符串（已转换）
            const statusIsString = typeof fileInfo.status === 'string';

            // 验证不包含 diff（通过检查对象键）
            const noDiff = !('diff' in fileInfo);

            return pathMatches && statusIsString && noDiff;
          });
        }),
        { numRuns: 100 }
      );
    });

    it('convertStatus 应当将所有已知状态转换为字符串', () => {
      const llmService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(llmService, config);

      const statuses = [
        ChangeStatus.Added,
        ChangeStatus.Modified,
        ChangeStatus.Deleted,
        ChangeStatus.Renamed,
        ChangeStatus.Copied,
      ];

      const changes = statuses.map((status, index) => ({
        path: `file${index}.ts`,
        status,
        diff: 'test',
        additions: 0,
        deletions: 0,
      }));

      const fileList = filter.buildFileList(changes);

      // 所有状态都应当被转换为字符串
      expect(fileList.every((f) => typeof f.status === 'string')).toBe(true);

      // 验证具体的转换
      expect(fileList[0]?.status).toBe('Added');
      expect(fileList[1]?.status).toBe('Modified');
      expect(fileList[2]?.status).toBe('Deleted');
      expect(fileList[3]?.status).toBe('Renamed');
      expect(fileList[4]?.status).toBe('Copied');
    });
  });

  /**
   * **Feature: smart-diff-filter, Property 5: 过滤结果子集性**
   *
   * 对于任意过滤后的 GitChange 列表，其中的每个文件路径都应当存在于原始列表中。
   *
   * **验证: 需求 1.5, 4.5**
   */
  describe('属性 5: 过滤结果子集性', () => {
    it('过滤后的文件都应当在原始列表中', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gitChangeArbitrary, { minLength: 3, maxLength: 10 }),
          async (changes) => {
            // 创建一个模拟服务，返回部分文件
            const mockLLMService: ILLMService = {
              generateCommitMessage: jest
                .fn()
                .mockResolvedValue(
                  JSON.stringify(changes.slice(0, Math.ceil(changes.length / 2)).map((c) => c.path))
                ),
            };

            const config = createTestConfig();
            const filter = new SmartDiffFilter(mockLLMService, config);

            const result = await filter.filterChanges(changes);

            // 验证过滤后的每个文件都在原始列表中
            const originalPaths = new Set(changes.map((c) => c.path));
            return result.filteredChanges.every((change) => originalPaths.has(change.path));
          }
        ),
        { numRuns: 50 }
      );
    });

    it('过滤后的文件数量不应超过原始数量', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gitChangeArbitrary, { minLength: 3, maxLength: 10 }),
          async (changes) => {
            const mockLLMService: ILLMService = {
              generateCommitMessage: jest
                .fn()
                .mockResolvedValue(JSON.stringify(changes.map((c) => c.path))),
            };

            const config = createTestConfig();
            const filter = new SmartDiffFilter(mockLLMService, config);

            const result = await filter.filterChanges(changes);

            return result.filteredChanges.length <= changes.length;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: smart-diff-filter, Property 6: 小文件列表跳过**
   *
   * 对于任意文件数量少于配置阈值（默认 3）的 GitChange 列表，
   * 过滤函数应当直接返回原始列表，不调用 AI。
   *
   * **验证: 需求 3.3**
   */
  describe('属性 6: 小文件列表跳过', () => {
    it('少于 3 个文件时应当跳过过滤', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gitChangeArbitrary, { minLength: 0, maxLength: 2 }),
          async (changes) => {
            const mockLLMService: ILLMService = {
              generateCommitMessage: jest.fn(),
            };

            const config = createTestConfig();
            const filter = new SmartDiffFilter(mockLLMService, config);

            const result = await filter.filterChanges(changes);

            // 验证返回原始列表
            const returnsOriginal = result.filteredChanges.length === changes.length;

            // 验证未调用 AI
            const mockFn = mockLLMService.generateCommitMessage as jest.Mock;
            const aiNotCalled = mockFn.mock.calls.length === 0;

            // 验证统计信息
            const statsCorrect =
              !result.stats.filtered &&
              result.stats.skipReason !== undefined &&
              result.stats.totalFiles === changes.length &&
              result.stats.coreFiles === changes.length;

            return returnsOriginal && aiNotCalled && statsCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('shouldSkipFiltering 应当正确判断', () => {
      fc.assert(
        fc.property(fc.array(gitChangeArbitrary, { minLength: 0, maxLength: 10 }), (changes) => {
          const llmService = createMockLLMService();
          const config = createTestConfig();
          const filter = new SmartDiffFilter(llmService, config);

          const shouldSkip = filter.shouldSkipFiltering(changes);

          // 少于 3 个文件应当跳过
          return shouldSkip === changes.length < 3;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: smart-diff-filter, Property 15: 超大文件列表跳过**
   *
   * 对于任意文件数量超过配置的最大限制（默认 500）的 GitChange 列表，
   * 过滤函数应当直接返回原始列表，不调用 AI。
   *
   * **验证: 需求 11.1**
   */
  describe('属性 15: 超大文件列表跳过', () => {
    it('超过 500 个文件时应当跳过过滤', async () => {
      // 生成 501 个文件
      const changes: GitChange[] = Array.from({ length: 501 }, (_, i) => ({
        path: `file${i}.ts`,
        status: ChangeStatus.Modified,
        diff: 'test',
        additions: 1,
        deletions: 0,
      }));

      const mockLLMService: ILLMService = {
        generateCommitMessage: jest.fn(),
      };

      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 验证返回原始列表
      expect(result.filteredChanges.length).toBe(changes.length);

      // 验证未调用 AI
      expect(mockLLMService.generateCommitMessage).not.toHaveBeenCalled();

      // 验证统计信息
      expect(result.stats.filtered).toBe(false);
      expect(result.stats.skipReason).toContain('Too many files');
      expect(result.stats.totalFiles).toBe(501);
      expect(result.stats.coreFiles).toBe(501);
    });

    it('exceedsMaxFileListSize 应当正确判断', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1000 }), (count) => {
          const changes: GitChange[] = Array.from({ length: count }, (_, i) => ({
            path: `file${i}.ts`,
            status: ChangeStatus.Modified,
            diff: 'test',
            additions: 1,
            deletions: 0,
          }));

          const llmService = createMockLLMService();
          const config = createTestConfig();
          const filter = new SmartDiffFilter(llmService, config);

          const exceeds = filter.exceedsMaxFileListSize(changes);

          // 超过 500 个文件应当返回 true
          return exceeds === changes.length > 500;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: smart-diff-filter, Property 3: Prompt 关键词包含**
   *
   * 对于任意生成的 System Prompt，应当包含关键词"Tech Lead"、"核心逻辑"、
   * "lockfiles"、"构建产物"。
   *
   * **验证: 需求 1.3, 9.1, 9.2, 9.3**
   */
  describe('属性 3: Prompt 关键词包含', () => {
    it('buildSystemPrompt 应当包含必要的关键词', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const promptBuilder = new PromptBuilder();
          const systemPrompt = promptBuilder.buildSystemPrompt();

          // 验证包含角色定义
          const hasTechLead = systemPrompt.includes('Tech Lead');

          // 验证包含核心逻辑相关词汇
          const hasCoreLogic = systemPrompt.includes('核心逻辑');

          // 验证包含杂音文件类型
          const hasLockfiles =
            systemPrompt.includes('Lockfiles') || systemPrompt.includes('lockfiles');
          const hasBuildArtifacts = systemPrompt.includes('构建产物');

          // 验证包含输出要求
          const hasJsonRequirement = systemPrompt.includes('JSON');

          return (
            hasTechLead && hasCoreLogic && hasLockfiles && hasBuildArtifacts && hasJsonRequirement
          );
        }),
        { numRuns: 100 }
      );
    });

    it('buildSystemPrompt 应当列举常见的杂音文件类型', () => {
      const promptBuilder = new PromptBuilder();
      const systemPrompt = promptBuilder.buildSystemPrompt();

      // 验证包含各种杂音文件类型
      const noiseFileTypes = [
        'package-lock.json',
        'pnpm-lock.yaml',
        'dist/',
        'build/',
        '*.generated.ts',
        '__snapshots__/',
        '*.min.js',
        '.vscode/',
        '*.tmp',
      ];

      const allTypesIncluded = noiseFileTypes.every((type) => systemPrompt.includes(type));
      expect(allTypesIncluded).toBe(true);
    });

    it('buildSystemPrompt 应当列举核心逻辑文件类型', () => {
      const promptBuilder = new PromptBuilder();
      const systemPrompt = promptBuilder.buildSystemPrompt();

      // 验证包含核心文件类型
      const coreFileTypes = ['*.ts', '*.js', 'package.json', 'README.md', '*.test.ts', '*.css'];

      const allTypesIncluded = coreFileTypes.every((type) => systemPrompt.includes(type));
      expect(allTypesIncluded).toBe(true);
    });

    it('buildUserPrompt 应当包含文件列表的 JSON 表示', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              // 使用更合理的路径生成器，避免特殊字符
              path: fc.stringMatching(/^[a-zA-Z0-9_\-./]+$/),
              status: fc.constantFrom('Added', 'Modified', 'Deleted', 'Renamed', 'Copied'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (fileList: FileInfo[]) => {
            const promptBuilder = new PromptBuilder();
            const userPrompt = promptBuilder.buildUserPrompt(fileList);

            // 验证包含输出格式说明
            const hasFormatInstruction = userPrompt.includes('JSON 字符串数组');

            // 验证包含 JSON 结构
            const hasJsonStructure = userPrompt.includes('[{') && userPrompt.includes('}]');

            // 验证包含 path 和 status 字段
            const hasPathField = userPrompt.includes('"path"');
            const hasStatusField = userPrompt.includes('"status"');

            return hasFormatInstruction && hasJsonStructure && hasPathField && hasStatusField;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('buildUserPrompt 应当提供示例格式', () => {
      const promptBuilder = new PromptBuilder();
      const fileList: FileInfo[] = [{ path: 'test.ts', status: 'Modified' }];
      const userPrompt = promptBuilder.buildUserPrompt(fileList);

      // 验证包含示例格式
      const hasExampleFormat = userPrompt.includes('["file1.ts", "file2.js"]');
      expect(hasExampleFormat).toBe(true);
    });
  });

  /**
   * **Feature: smart-diff-filter, Property 16: 本地模型检测**
   *
   * 对于任意配置为本地服务商（Ollama、LM Studio、LocalAI）的扩展配置，
   * 模型选择器应当返回主模型而非轻量级模型。
   *
   * **验证: 需求 13.1**
   */
  describe('属性 16: 本地模型检测', () => {
    it('本地服务商应当返回主模型', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ollama', 'lm-studio', 'lm studio', 'localai', 'local-ai', 'custom'),
          fc.string({ minLength: 5, maxLength: 20 }),
          (provider, modelName) => {
            const { ModelSelector } = require('../SmartDiffFilter');
            const selector = new ModelSelector();

            const config: ExtensionConfig = {
              apiEndpoint: `http://localhost:11434/${provider}/v1`,
              apiKey: 'not-needed',
              modelName,
              language: 'zh-CN',
              commitFormat: 'conventional',
              maxTokens: 4000,
              temperature: 0.7,
            };

            const selectedModel = selector.selectFilterModel(config);

            // 本地服务商应当返回主模型
            return selectedModel === modelName;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isLocalProvider 应当正确识别本地服务商', () => {
      const { ModelSelector } = require('../SmartDiffFilter');
      const selector = new ModelSelector();

      const localProviders = [
        'http://localhost:11434/ollama/v1',
        'http://127.0.0.1:1234/lm-studio/v1',
        'http://localhost:8080/localai/v1',
        'http://localhost:5000/custom/v1',
      ];

      localProviders.forEach((endpoint) => {
        const config: ExtensionConfig = {
          apiEndpoint: endpoint,
          apiKey: 'test',
          modelName: 'test-model',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 4000,
          temperature: 0.7,
        };

        expect(selector.isLocalProvider(config)).toBe(true);
      });
    });

    it('isLocalProvider 应当拒绝云端服务商', () => {
      const { ModelSelector } = require('../SmartDiffFilter');
      const selector = new ModelSelector();

      const cloudProviders = [
        'https://api.openai.com/v1',
        'https://generativelanguage.googleapis.com/v1',
        'https://api.anthropic.com/v1',
        'https://dashscope.aliyuncs.com/api/v1',
      ];

      cloudProviders.forEach((endpoint) => {
        const config: ExtensionConfig = {
          apiEndpoint: endpoint,
          apiKey: 'test',
          modelName: 'test-model',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 4000,
          temperature: 0.7,
        };

        expect(selector.isLocalProvider(config)).toBe(false);
      });
    });
  });

  /**
   * **Feature: smart-diff-filter, Property 17: 云端模型轻量化**
   *
   * 对于任意配置为云端服务商（OpenAI、Anthropic、Google）的扩展配置，
   * 模型选择器应当优先返回对应的轻量级模型。
   *
   * **验证: 需求 13.2**
   */
  describe('属性 17: 云端模型轻量化', () => {
    it('OpenAI 服务商应当返回 gpt-4o-mini', () => {
      const { ModelSelector } = require('../SmartDiffFilter');
      const selector = new ModelSelector();

      const config: ExtensionConfig = {
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        modelName: 'gpt-4o',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 4000,
        temperature: 0.7,
      };

      const selectedModel = selector.selectFilterModel(config);
      expect(selectedModel).toBe('gpt-4o-mini');
    });

    it('Google/Gemini 服务商应当返回 gemini-1.5-flash', () => {
      const { ModelSelector } = require('../SmartDiffFilter');
      const selector = new ModelSelector();

      const endpoints = [
        'https://generativelanguage.googleapis.com/v1',
        'https://api.google.com/gemini/v1',
      ];

      endpoints.forEach((endpoint) => {
        const config: ExtensionConfig = {
          apiEndpoint: endpoint,
          apiKey: 'test-key',
          modelName: 'gemini-1.5-pro',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 4000,
          temperature: 0.7,
        };

        const selectedModel = selector.selectFilterModel(config);
        expect(selectedModel).toBe('gemini-1.5-flash');
      });
    });

    it('Anthropic 服务商应当返回 claude-3-haiku', () => {
      const { ModelSelector } = require('../SmartDiffFilter');
      const selector = new ModelSelector();

      const config: ExtensionConfig = {
        apiEndpoint: 'https://api.anthropic.com/v1',
        apiKey: 'sk-ant-test',
        modelName: 'claude-3-opus',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 4000,
        temperature: 0.7,
      };

      const selectedModel = selector.selectFilterModel(config);
      expect(selectedModel).toBe('claude-3-haiku');
    });

    it('Qwen/Tongyi 服务商应当返回 qwen-turbo', () => {
      const { ModelSelector } = require('../SmartDiffFilter');
      const selector = new ModelSelector();

      const endpoints = ['https://dashscope.aliyuncs.com/api/v1', 'https://api.tongyi.com/v1'];

      endpoints.forEach((endpoint) => {
        const config: ExtensionConfig = {
          apiEndpoint: endpoint,
          apiKey: 'test-key',
          modelName: 'qwen-max',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 4000,
          temperature: 0.7,
        };

        const selectedModel = selector.selectFilterModel(config);
        expect(selectedModel).toBe('qwen-turbo');
      });
    });

    it('未知云端服务商应当回退到主模型', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['https'] }),
          fc.string({ minLength: 5, maxLength: 20 }),
          (endpoint, modelName) => {
            // 确保不是已知的本地或云端服务商
            const lowerEndpoint = endpoint.toLowerCase();
            if (
              lowerEndpoint.includes('ollama') ||
              lowerEndpoint.includes('lm-studio') ||
              lowerEndpoint.includes('localai') ||
              lowerEndpoint.includes('openai') ||
              lowerEndpoint.includes('gemini') ||
              lowerEndpoint.includes('google') ||
              lowerEndpoint.includes('anthropic') ||
              lowerEndpoint.includes('claude') ||
              lowerEndpoint.includes('qwen') ||
              lowerEndpoint.includes('tongyi')
            ) {
              return true; // 跳过已知服务商
            }

            const { ModelSelector } = require('../SmartDiffFilter');
            const selector = new ModelSelector();

            const config: ExtensionConfig = {
              apiEndpoint: endpoint,
              apiKey: 'test-key',
              modelName,
              language: 'zh-CN',
              commitFormat: 'conventional',
              maxTokens: 4000,
              temperature: 0.7,
            };

            const selectedModel = selector.selectFilterModel(config);

            // 未知服务商应当回退到主模型
            return selectedModel === modelName;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('用户配置的 filterModel 应当优先使用', () => {
      fc.assert(
        fc.property(
          fc.webUrl(),
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.string({ minLength: 5, maxLength: 20 }),
          (endpoint, modelName, filterModel) => {
            const { ModelSelector } = require('../SmartDiffFilter');
            const selector = new ModelSelector();

            const config = {
              apiEndpoint: endpoint,
              apiKey: 'test-key',
              modelName,
              language: 'zh-CN',
              commitFormat: 'conventional',
              maxTokens: 4000,
              temperature: 0.7,
              filterModel, // 用户配置的过滤专用模型
            } as ExtensionConfig & { filterModel: string };

            const selectedModel = selector.selectFilterModel(config);

            // 应当优先使用用户配置的 filterModel
            return selectedModel === filterModel;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: smart-diff-filter, Property 7: 超时容错**
   *
   * 对于任意超时异常，过滤函数应当捕获异常并返回原始列表，不抛出异常。
   *
   * **验证: 需求 4.1, 4.6**
   */
  describe('属性 7: 超时容错', () => {
    it('超时时应当返回原始列表', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gitChangeArbitrary, { minLength: 3, maxLength: 10 }),
          async (changes) => {
            // 创建一个会超时的模拟服务
            const mockLLMService: ILLMService = {
              generateCommitMessage: jest.fn().mockImplementation(() => {
                return new Promise((resolve) => {
                  setTimeout(() => resolve('["file1.ts"]'), 12000); // 超过 10 秒超时
                });
              }),
            };

            const config = createTestConfig();
            const filter = new SmartDiffFilter(mockLLMService, config);

            const result = await filter.filterChanges(changes);

            // 验证返回原始列表
            const returnsOriginal = result.filteredChanges.length === changes.length;

            // 验证未过滤
            const notFiltered = !result.stats.filtered;

            // 验证有跳过原因
            const hasSkipReason =
              result.stats.skipReason !== undefined && result.stats.skipReason.includes('failed');

            return returnsOriginal && notFiltered && hasSkipReason;
          }
        ),
        { numRuns: 5, timeout: 60000 } // 减少运行次数，增加超时
      );
    }, 70000); // Jest 超时设置为 70 秒

    it('超时错误不应当抛出异常', async () => {
      const changes: GitChange[] = Array.from({ length: 5 }, (_, i) => ({
        path: `file${i}.ts`,
        status: ChangeStatus.Modified,
        diff: 'test',
        additions: 1,
        deletions: 0,
      }));

      const mockLLMService: ILLMService = {
        generateCommitMessage: jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => resolve('["file1.ts"]'), 15000);
          });
        }),
      };

      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      // 不应当抛出异常
      await expect(filter.filterChanges(changes)).resolves.toBeDefined();
    }, 30000); // Jest 超时设置为 30 秒
  });

  /**
   * **Feature: smart-diff-filter, Property 8: JSON 解析容错**
   *
   * 对于任意无效的 JSON 字符串，解析失败时应当捕获异常并返回原始列表，不抛出异常。
   *
   * **验证: 需求 4.2, 4.6**
   */
  describe('属性 8: JSON 解析容错', () => {
    it('JSON 解析失败时应当返回原始列表', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gitChangeArbitrary, { minLength: 3, maxLength: 10 }),
          fc.constantFrom('not json', '{"key": "value"}', '[1, 2, 3]', 'invalid json {', ''),
          async (changes, invalidJson) => {
            const mockLLMService: ILLMService = {
              generateCommitMessage: jest.fn().mockResolvedValue(invalidJson),
            };

            const config = createTestConfig();
            const filter = new SmartDiffFilter(mockLLMService, config);

            const result = await filter.filterChanges(changes);

            // 验证返回原始列表
            const returnsOriginal = result.filteredChanges.length === changes.length;

            // 验证未过滤
            const notFiltered = !result.stats.filtered;

            // 验证有跳过原因
            const hasSkipReason =
              result.stats.skipReason !== undefined && result.stats.skipReason.includes('failed');

            return returnsOriginal && notFiltered && hasSkipReason;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('JSON 解析错误不应当抛出异常', async () => {
      const changes: GitChange[] = Array.from({ length: 5 }, (_, i) => ({
        path: `file${i}.ts`,
        status: ChangeStatus.Modified,
        diff: 'test',
        additions: 1,
        deletions: 0,
      }));

      const invalidJsonResponses = ['not json', '{"key": "value"}', '[1, 2, 3]', 'invalid', ''];

      for (const invalidJson of invalidJsonResponses) {
        const mockLLMService: ILLMService = {
          generateCommitMessage: jest.fn().mockResolvedValue(invalidJson),
        };

        const config = createTestConfig();
        const filter = new SmartDiffFilter(mockLLMService, config);

        // 不应当抛出异常
        await expect(filter.filterChanges(changes)).resolves.toBeDefined();
      }
    });
  });

  /**
   * **Feature: smart-diff-filter, Property 9: 空列表保护**
   *
   * 对于任意 AI 返回的空数组，过滤函数应当返回原始列表，不返回空列表。
   *
   * **验证: 需求 4.4**
   */
  describe('属性 9: 空列表保护', () => {
    it('AI 返回空列表时应当返回原始列表', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gitChangeArbitrary, { minLength: 3, maxLength: 10 }),
          async (changes) => {
            const mockLLMService: ILLMService = {
              generateCommitMessage: jest.fn().mockResolvedValue('[]'),
            };

            const config = createTestConfig();
            const filter = new SmartDiffFilter(mockLLMService, config);

            const result = await filter.filterChanges(changes);

            // 验证返回原始列表
            const returnsOriginal = result.filteredChanges.length === changes.length;

            // 验证未过滤
            const notFiltered = !result.stats.filtered;

            // 验证有跳过原因
            const hasSkipReason =
              result.stats.skipReason !== undefined &&
              (result.stats.skipReason.includes('empty') ||
                result.stats.skipReason.includes('invalid'));

            return returnsOriginal && notFiltered && hasSkipReason;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('空列表保护应当防止返回空结果', async () => {
      const changes: GitChange[] = Array.from({ length: 5 }, (_, i) => ({
        path: `file${i}.ts`,
        status: ChangeStatus.Modified,
        diff: 'test',
        additions: 1,
        deletions: 0,
      }));

      const mockLLMService: ILLMService = {
        generateCommitMessage: jest.fn().mockResolvedValue('[]'),
      };

      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 结果不应当为空
      expect(result.filteredChanges.length).toBeGreaterThan(0);
      expect(result.filteredChanges.length).toBe(changes.length);
    });
  });

  /**
   * **Feature: smart-diff-filter, Property 10: 无效路径过滤**
   *
   * 对于任意 AI 返回的文件路径列表，如果包含不在原始列表中的路径，这些路径应当被忽略。
   *
   * **验证: 需求 4.5**
   */
  describe('属性 10: 无效路径过滤', () => {
    it('无效路径应当被过滤掉', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gitChangeArbitrary, { minLength: 3, maxLength: 10 }),
          fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          async (changes, invalidPaths) => {
            // 构造包含有效和无效路径的响应
            const validPaths = changes.slice(0, 2).map((c) => c.path);
            const allPaths = [...validPaths, ...invalidPaths];
            const response = JSON.stringify(allPaths);

            const mockLLMService: ILLMService = {
              generateCommitMessage: jest.fn().mockResolvedValue(response),
            };

            const config = createTestConfig();
            const filter = new SmartDiffFilter(mockLLMService, config);

            const result = await filter.filterChanges(changes);

            // 验证结果只包含有效路径
            const originalPaths = new Set(changes.map((c) => c.path));
            const allResultPathsValid = result.filteredChanges.every((change) =>
              originalPaths.has(change.path)
            );

            return allResultPathsValid;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('全部无效路径时应当返回原始列表', async () => {
      const changes: GitChange[] = Array.from({ length: 5 }, (_, i) => ({
        path: `file${i}.ts`,
        status: ChangeStatus.Modified,
        diff: 'test',
        additions: 1,
        deletions: 0,
      }));

      // 返回完全不存在的路径
      const invalidPaths = ['invalid1.ts', 'invalid2.ts', 'invalid3.ts'];
      const mockLLMService: ILLMService = {
        generateCommitMessage: jest.fn().mockResolvedValue(JSON.stringify(invalidPaths)),
      };

      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 应当返回原始列表
      expect(result.filteredChanges.length).toBe(changes.length);
      expect(result.stats.filtered).toBe(false);
      expect(result.stats.skipReason).toContain('empty');
    });
  });

  /**
   * **Feature: smart-diff-filter, Property 11: 错误不抛出**
   *
   * 对于任意错误情况（超时、解析失败、空列表等），过滤函数应当返回原始列表，不抛出异常。
   *
   * **验证: 需求 4.6**
   */
  describe('属性 11: 错误不抛出', () => {
    it('所有错误情况都不应当抛出异常', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gitChangeArbitrary, { minLength: 3, maxLength: 10 }),
          fc.constantFrom(
            // 各种错误情况
            { type: 'timeout', delay: 12000 },
            { type: 'invalid-json', response: 'not json' },
            { type: 'empty-array', response: '[]' },
            { type: 'non-array', response: '{"key": "value"}' },
            { type: 'network-error', error: new Error('Network error') }
          ),
          async (changes, errorCase) => {
            let mockLLMService: ILLMService;

            if (errorCase.type === 'timeout') {
              mockLLMService = {
                generateCommitMessage: jest.fn().mockImplementation(() => {
                  return new Promise((resolve) => {
                    setTimeout(() => resolve('[]'), errorCase.delay);
                  });
                }),
              };
            } else if (errorCase.type === 'network-error') {
              mockLLMService = {
                generateCommitMessage: jest.fn().mockRejectedValue(errorCase.error),
              };
            } else {
              mockLLMService = {
                generateCommitMessage: jest.fn().mockResolvedValue(errorCase.response),
              };
            }

            const config = createTestConfig();
            const filter = new SmartDiffFilter(mockLLMService, config);

            // 不应当抛出异常
            const result = await filter.filterChanges(changes);

            // 应当返回有效结果
            const hasValidResult = result !== undefined && result.filteredChanges !== undefined;

            // 应当返回原始列表或其子集
            const returnsValidList = result.filteredChanges.length <= changes.length;

            return hasValidResult && returnsValidList;
          }
        ),
        { numRuns: 10, timeout: 60000 }
      );
    }, 70000);

    it('filterChanges 永远不应当抛出异常', async () => {
      const changes: GitChange[] = Array.from({ length: 5 }, (_, i) => ({
        path: `file${i}.ts`,
        status: ChangeStatus.Modified,
        diff: 'test',
        additions: 1,
        deletions: 0,
      }));

      // 测试各种错误情况
      const errorCases = [
        // 超时
        {
          service: {
            generateCommitMessage: jest.fn().mockImplementation(() => {
              return new Promise((resolve) => {
                setTimeout(() => resolve('[]'), 12000);
              });
            }),
          },
        },
        // 网络错误
        {
          service: {
            generateCommitMessage: jest.fn().mockRejectedValue(new Error('Network error')),
          },
        },
        // 无效 JSON
        {
          service: {
            generateCommitMessage: jest.fn().mockResolvedValue('invalid json'),
          },
        },
        // 空数组
        {
          service: {
            generateCommitMessage: jest.fn().mockResolvedValue('[]'),
          },
        },
      ];

      for (const errorCase of errorCases) {
        const config = createTestConfig();
        const filter = new SmartDiffFilter(errorCase.service, config);

        // 不应当抛出异常
        await expect(filter.filterChanges(changes)).resolves.toBeDefined();
      }
    }, 70000);
  });

  /**
   * **Feature: smart-diff-filter, Property 12: 边界情况 - 空列表**
   *
   * 对于任意空的 GitChange 列表，过滤函数应当直接返回空列表。
   *
   * **验证: 需求 10.1**
   */
  describe('属性 12: 边界情况 - 空列表', () => {
    it('空列表应当直接返回空列表', async () => {
      const mockLLMService: ILLMService = {
        generateCommitMessage: jest.fn(),
      };

      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges([]);

      // 验证返回空列表
      expect(result.filteredChanges).toEqual([]);
      expect(result.filteredChanges.length).toBe(0);

      // 验证未调用 AI
      expect(mockLLMService.generateCommitMessage).not.toHaveBeenCalled();

      // 验证统计信息
      expect(result.stats.filtered).toBe(false);
      expect(result.stats.totalFiles).toBe(0);
      expect(result.stats.coreFiles).toBe(0);
      expect(result.stats.ignoredFiles).toBe(0);
      expect(result.stats.skipReason).toContain('Empty');
    });

    it('空列表处理应当是确定性的', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant([]), async (emptyArray) => {
          const changes: GitChange[] = [...emptyArray]; // 转换为可变数组
          const mockLLMService: ILLMService = {
            generateCommitMessage: jest.fn(),
          };

          const config = createTestConfig();
          const filter = new SmartDiffFilter(mockLLMService, config);

          const result = await filter.filterChanges(changes);

          // 验证返回空列表
          const returnsEmpty = result.filteredChanges.length === 0;

          // 验证未调用 AI
          const mockFn = mockLLMService.generateCommitMessage as jest.Mock;
          const aiNotCalled = mockFn.mock.calls.length === 0;

          // 验证统计信息正确
          const statsCorrect =
            !result.stats.filtered &&
            result.stats.totalFiles === 0 &&
            result.stats.coreFiles === 0 &&
            result.stats.ignoredFiles === 0;

          return returnsEmpty && aiNotCalled && statsCorrect;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: smart-diff-filter, Property 13: 边界情况 - 单文件**
   *
   * 对于任意只包含 1 个文件的 GitChange 列表，过滤函数应当直接返回该文件。
   *
   * **验证: 需求 10.2**
   */
  describe('属性 13: 边界情况 - 单文件', () => {
    it('单文件应当直接返回该文件', async () => {
      await fc.assert(
        fc.asyncProperty(gitChangeArbitrary, async (change) => {
          const mockLLMService: ILLMService = {
            generateCommitMessage: jest.fn(),
          };

          const config = createTestConfig();
          const filter = new SmartDiffFilter(mockLLMService, config);

          const result = await filter.filterChanges([change]);

          // 验证返回原始文件
          const returnsSameFile =
            result.filteredChanges.length === 1 && result.filteredChanges[0]?.path === change.path;

          // 验证未调用 AI
          const mockFn = mockLLMService.generateCommitMessage as jest.Mock;
          const aiNotCalled = mockFn.mock.calls.length === 0;

          // 验证统计信息
          const statsCorrect =
            !result.stats.filtered &&
            result.stats.totalFiles === 1 &&
            result.stats.coreFiles === 1 &&
            result.stats.ignoredFiles === 0 &&
            result.stats.skipReason !== undefined;

          return returnsSameFile && aiNotCalled && statsCorrect;
        }),
        { numRuns: 100 }
      );
    });

    it('单文件处理不应当调用 AI', async () => {
      const change: GitChange = {
        path: 'test.ts',
        status: ChangeStatus.Modified,
        diff: 'test diff',
        additions: 5,
        deletions: 2,
      };

      const mockLLMService: ILLMService = {
        generateCommitMessage: jest.fn(),
      };

      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      await filter.filterChanges([change]);

      // 验证未调用 AI
      expect(mockLLMService.generateCommitMessage).not.toHaveBeenCalled();
    });
  });

  /**
   * **Feature: smart-diff-filter, Property 14: 边界情况 - 双文件**
   *
   * 对于任意只包含 2 个文件的 GitChange 列表，过滤函数应当直接返回这 2 个文件。
   *
   * **验证: 需求 10.3**
   */
  describe('属性 14: 边界情况 - 双文件', () => {
    it('双文件应当直接返回这 2 个文件', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(gitChangeArbitrary, gitChangeArbitrary),
          async ([change1, change2]) => {
            const mockLLMService: ILLMService = {
              generateCommitMessage: jest.fn(),
            };

            const config = createTestConfig();
            const filter = new SmartDiffFilter(mockLLMService, config);

            const result = await filter.filterChanges([change1, change2]);

            // 验证返回原始 2 个文件
            const returnsBothFiles =
              result.filteredChanges.length === 2 &&
              result.filteredChanges[0]?.path === change1.path &&
              result.filteredChanges[1]?.path === change2.path;

            // 验证未调用 AI
            const mockFn = mockLLMService.generateCommitMessage as jest.Mock;
            const aiNotCalled = mockFn.mock.calls.length === 0;

            // 验证统计信息
            const statsCorrect =
              !result.stats.filtered &&
              result.stats.totalFiles === 2 &&
              result.stats.coreFiles === 2 &&
              result.stats.ignoredFiles === 0 &&
              result.stats.skipReason !== undefined;

            return returnsBothFiles && aiNotCalled && statsCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('双文件处理不应当调用 AI', async () => {
      const changes: GitChange[] = [
        {
          path: 'file1.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff 1',
          additions: 5,
          deletions: 2,
        },
        {
          path: 'file2.ts',
          status: ChangeStatus.Added,
          diff: 'test diff 2',
          additions: 10,
          deletions: 0,
        },
      ];

      const mockLLMService: ILLMService = {
        generateCommitMessage: jest.fn(),
      };

      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      await filter.filterChanges(changes);

      // 验证未调用 AI
      expect(mockLLMService.generateCommitMessage).not.toHaveBeenCalled();
    });

    it('双文件边界应当与 shouldSkipFiltering 一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(gitChangeArbitrary, gitChangeArbitrary),
          async ([change1, change2]) => {
            const mockLLMService: ILLMService = {
              generateCommitMessage: jest.fn(),
            };

            const config = createTestConfig();
            const filter = new SmartDiffFilter(mockLLMService, config);

            const changes = [change1, change2];

            // shouldSkipFiltering 应当返回 true（因为 < 3）
            const shouldSkip = filter.shouldSkipFiltering(changes);

            // filterChanges 应当跳过过滤
            const result = await filter.filterChanges(changes);

            return shouldSkip && !result.stats.filtered;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 额外测试：JSON 清理和解析
   */
  describe('JSON 清理和解析', () => {
    it('cleanJsonOutput 应当移除 Markdown 代码块标记', () => {
      const llmService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(llmService, config);

      const testCases = [
        { input: '```json\n["file1.ts"]\n```', expected: '["file1.ts"]' },
        { input: '```\n["file1.ts"]\n```', expected: '["file1.ts"]' },
        { input: '["file1.ts"]', expected: '["file1.ts"]' },
        { input: '  ```json\n["file1.ts"]\n```  ', expected: '["file1.ts"]' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(filter.cleanJsonOutput(input)).toBe(expected);
      });
    });

    it('parseFilterResult 应当正确解析 JSON 数组', () => {
      const llmService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(llmService, config);

      const validInputs = ['["file1.ts", "file2.ts"]', '```json\n["file1.ts"]\n```', '[]'];

      validInputs.forEach((input) => {
        const result = filter.parseFilterResult(input);
        expect(Array.isArray(result)).toBe(true);
        expect(result.every((item) => typeof item === 'string')).toBe(true);
      });
    });

    it('parseFilterResult 应当拒绝无效的 JSON', () => {
      const llmService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(llmService, config);

      const invalidInputs = [
        'not json',
        '{"key": "value"}', // 对象而非数组
        '[1, 2, 3]', // 数字数组而非字符串数组
        '',
      ];

      invalidInputs.forEach((input) => {
        expect(() => filter.parseFilterResult(input)).toThrow();
      });
    });
  });
});
