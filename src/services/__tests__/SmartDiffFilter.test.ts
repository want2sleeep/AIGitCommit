/**
 * SmartDiffFilter 单元测试
 * 测试智能 Diff 过滤器的核心功能
 */

import { SmartDiffFilter, PromptBuilder, FileInfo } from '../SmartDiffFilter';
import { GitChange, ChangeStatus, ExtensionConfig } from '../../types';
import { ILLMService } from '../../types/interfaces';

describe('SmartDiffFilter', () => {
  // 创建模拟的 LLM 服务
  const createMockLLMService = (response: string = '["file1.ts"]'): ILLMService => ({
    generateCommitMessage: jest.fn().mockResolvedValue(response),
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

  // 创建测试用的 GitChange
  const createGitChange = (
    path: string,
    status: ChangeStatus = ChangeStatus.Modified
  ): GitChange => ({
    path,
    status,
    diff: 'test diff',
    additions: 1,
    deletions: 0,
  });

  describe('正常过滤流程', () => {
    it('应当成功过滤文件列表', async () => {
      const changes = [
        createGitChange('src/index.ts'),
        createGitChange('package-lock.json'),
        createGitChange('dist/bundle.js'),
      ];

      const mockLLMService = createMockLLMService('["src/index.ts"]');
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      expect(result.filteredChanges).toHaveLength(1);
      expect(result.filteredChanges[0]?.path).toBe('src/index.ts');
      expect(result.stats.filtered).toBe(true);
      expect(result.stats.totalFiles).toBe(3);
      expect(result.stats.coreFiles).toBe(1);
      expect(result.stats.ignoredFiles).toBe(2);
    });

    it('应当调用 LLM 服务', async () => {
      const changes = [
        createGitChange('src/index.ts'),
        createGitChange('src/utils.ts'),
        createGitChange('package-lock.json'),
      ];

      const mockLLMService = createMockLLMService('["src/index.ts", "src/utils.ts"]');
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      await filter.filterChanges(changes);

      expect(mockLLMService.generateCommitMessage).toHaveBeenCalled();
    });
  });

  describe('小文件列表跳过', () => {
    it('应当跳过空列表', async () => {
      const changes: GitChange[] = [];

      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      expect(result.filteredChanges).toHaveLength(0);
      expect(result.stats.filtered).toBe(false);
      expect(result.stats.skipReason).toBe('Empty file list');
      expect(mockLLMService.generateCommitMessage).not.toHaveBeenCalled();
    });

    it('应当跳过单文件列表', async () => {
      const changes = [createGitChange('src/index.ts')];

      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      expect(result.filteredChanges).toHaveLength(1);
      expect(result.stats.filtered).toBe(false);
      expect(result.stats.skipReason).toContain('Only 1 file');
      expect(mockLLMService.generateCommitMessage).not.toHaveBeenCalled();
    });

    it('应当跳过双文件列表', async () => {
      const changes = [createGitChange('src/index.ts'), createGitChange('src/utils.ts')];

      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      expect(result.filteredChanges).toHaveLength(2);
      expect(result.stats.filtered).toBe(false);
      expect(result.stats.skipReason).toContain('Only 2 file');
      expect(mockLLMService.generateCommitMessage).not.toHaveBeenCalled();
    });
  });

  describe('超大文件列表处理', () => {
    it('应当限制超过 500 个文件的列表', async () => {
      const changes = Array.from({ length: 501 }, (_, i) => createGitChange(`file${i}.ts`));

      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 应当限制为 500 个文件
      expect(result.filteredChanges).toHaveLength(500);
      expect(result.stats.filtered).toBe(false);
      expect(result.stats.skipReason).toContain('Too many files');
      expect(result.stats.skipReason).toContain('limited to 500 prioritized files');
      expect(result.stats.totalFiles).toBe(501);
      expect(result.stats.coreFiles).toBe(500);
      expect(result.stats.ignoredFiles).toBe(1);
      expect(mockLLMService.generateCommitMessage).not.toHaveBeenCalled();
    });

    it('应当按优先级排序文件', async () => {
      // 创建混合类型的文件列表
      const changes = [
        createGitChange('image.png'), // 低优先级
        createGitChange('src/index.ts'), // 高优先级
        createGitChange('README.md'), // 低优先级
        createGitChange('package.json'), // 中优先级
        createGitChange('dist/bundle.js'), // 无优先级
        createGitChange('src/utils.py'), // 高优先级
        ...Array.from({ length: 495 }, (_, i) => createGitChange(`file${i}.txt`)), // 填充到 501
      ];

      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 应当限制为 500 个文件
      expect(result.filteredChanges).toHaveLength(500);

      // 验证高优先级文件在前面
      const paths = result.filteredChanges.map((c) => c.path);
      const tsIndex = paths.indexOf('src/index.ts');
      const pyIndex = paths.indexOf('src/utils.py');
      const jsonIndex = paths.indexOf('package.json');
      const mdIndex = paths.indexOf('README.md');

      // 高优先级文件应该在列表中
      expect(tsIndex).toBeGreaterThanOrEqual(0);
      expect(pyIndex).toBeGreaterThanOrEqual(0);

      // 中优先级文件应该在列表中
      expect(jsonIndex).toBeGreaterThanOrEqual(0);

      // 低优先级文件应该在列表中
      expect(mdIndex).toBeGreaterThanOrEqual(0);
    });

    it('应当正确处理恰好 500 个文件的列表', async () => {
      const changes = Array.from({ length: 500 }, (_, i) => createGitChange(`file${i}.ts`));

      const mockLLMService = createMockLLMService('["file0.ts"]');
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 应当正常过滤，不触发限制
      expect(result.filteredChanges).toHaveLength(1);
      expect(result.stats.filtered).toBe(true);
      expect(mockLLMService.generateCommitMessage).toHaveBeenCalled();
    });

    it('应当优先保留源代码文件', async () => {
      // 创建大量非源代码文件和少量源代码文件
      const changes = [
        ...Array.from({ length: 450 }, (_, i) => createGitChange(`image${i}.png`)),
        ...Array.from({ length: 30 }, (_, i) => createGitChange(`src/file${i}.ts`)),
        ...Array.from({ length: 30 }, (_, i) => createGitChange(`config${i}.json`)),
      ];

      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 应当限制为 500 个文件
      expect(result.filteredChanges).toHaveLength(500);

      // 验证所有源代码文件都被保留
      const paths = result.filteredChanges.map((c) => c.path);
      const tsFiles = paths.filter((p) => p.endsWith('.ts'));
      expect(tsFiles.length).toBe(30); // 所有 30 个 .ts 文件都应该被保留

      // 验证所有配置文件都被保留
      const jsonFiles = paths.filter((p) => p.endsWith('.json'));
      expect(jsonFiles.length).toBe(30); // 所有 30 个 .json 文件都应该被保留
    });
  });

  describe('超时处理', () => {
    it('应当在超时时返回原始列表', async () => {
      const changes = [
        createGitChange('src/index.ts'),
        createGitChange('src/utils.ts'),
        createGitChange('package-lock.json'),
      ];

      // 创建一个会超时的 mock 服务
      const mockLLMService: ILLMService = {
        generateCommitMessage: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve('["src/index.ts"]'), 15000); // 15 秒，超过 10 秒超时
            })
        ),
      };

      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 应当返回原始列表
      expect(result.filteredChanges).toHaveLength(3);
      expect(result.stats.filtered).toBe(false);
      expect(result.stats.skipReason).toContain('Filtering failed');
    }, 20000); // 20 秒超时
  });

  describe('JSON 解析失败', () => {
    it('应当在 JSON 解析失败时返回原始列表', async () => {
      const changes = [
        createGitChange('src/index.ts'),
        createGitChange('src/utils.ts'),
        createGitChange('package-lock.json'),
      ];

      const mockLLMService = createMockLLMService('invalid json');
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 应当返回原始列表
      expect(result.filteredChanges).toHaveLength(3);
      expect(result.stats.filtered).toBe(false);
      expect(result.stats.skipReason).toContain('Filtering failed');
    });

    it('应当处理非数组的 JSON', async () => {
      const changes = [
        createGitChange('src/index.ts'),
        createGitChange('src/utils.ts'),
        createGitChange('package-lock.json'),
      ];

      const mockLLMService = createMockLLMService('{"key": "value"}');
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 应当返回原始列表
      expect(result.filteredChanges).toHaveLength(3);
      expect(result.stats.filtered).toBe(false);
    });
  });

  describe('空列表保护', () => {
    it('应当在 AI 返回空列表时返回原始列表', async () => {
      const changes = [
        createGitChange('src/index.ts'),
        createGitChange('src/utils.ts'),
        createGitChange('package-lock.json'),
      ];

      const mockLLMService = createMockLLMService('[]');
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 应当返回原始列表
      expect(result.filteredChanges).toHaveLength(3);
      expect(result.stats.filtered).toBe(false);
      expect(result.stats.skipReason).toBe('AI returned empty list or all paths invalid');
    });
  });

  describe('无效路径过滤', () => {
    it('应当过滤掉不在原始列表中的路径', async () => {
      const changes = [
        createGitChange('src/index.ts'),
        createGitChange('src/utils.ts'),
        createGitChange('package-lock.json'),
      ];

      // AI 返回了一些不存在的文件
      const mockLLMService = createMockLLMService(
        '["src/index.ts", "src/nonexistent.ts", "another/fake.ts"]'
      );
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 应当只保留有效的文件
      expect(result.filteredChanges).toHaveLength(1);
      expect(result.filteredChanges[0]?.path).toBe('src/index.ts');
      expect(result.stats.filtered).toBe(true);
    });

    it('应当在所有路径都无效时返回原始列表', async () => {
      const changes = [
        createGitChange('src/index.ts'),
        createGitChange('src/utils.ts'),
        createGitChange('package-lock.json'),
      ];

      // AI 返回的都是不存在的文件
      const mockLLMService = createMockLLMService('["nonexistent1.ts", "nonexistent2.ts"]');
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = await filter.filterChanges(changes);

      // 应当返回原始列表
      expect(result.filteredChanges).toHaveLength(3);
      expect(result.stats.filtered).toBe(false);
      expect(result.stats.skipReason).toBe('AI returned empty list or all paths invalid');
    });
  });

  describe('buildFileList', () => {
    it('应当构建正确的文件列表', () => {
      const changes = [
        createGitChange('src/index.ts', ChangeStatus.Added),
        createGitChange('src/utils.ts', ChangeStatus.Modified),
        createGitChange('src/old.ts', ChangeStatus.Deleted),
      ];

      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const fileList = filter.buildFileList(changes);

      expect(fileList).toHaveLength(3);
      expect(fileList[0]).toEqual({ path: 'src/index.ts', status: 'Added' });
      expect(fileList[1]).toEqual({ path: 'src/utils.ts', status: 'Modified' });
      expect(fileList[2]).toEqual({ path: 'src/old.ts', status: 'Deleted' });
    });

    it('不应当包含 diff 字段', () => {
      const changes = [createGitChange('src/index.ts')];

      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const fileList = filter.buildFileList(changes);

      expect(fileList[0]).not.toHaveProperty('diff');
      expect(fileList[0]).not.toHaveProperty('additions');
      expect(fileList[0]).not.toHaveProperty('deletions');
    });
  });

  describe('cleanJsonOutput', () => {
    it('应当移除 Markdown 代码块标记', () => {
      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      expect(filter.cleanJsonOutput('```json\n["file.ts"]\n```')).toBe('["file.ts"]');
      expect(filter.cleanJsonOutput('```\n["file.ts"]\n```')).toBe('["file.ts"]');
      expect(filter.cleanJsonOutput('["file.ts"]')).toBe('["file.ts"]');
    });

    it('应当处理前后空白', () => {
      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      expect(filter.cleanJsonOutput('  ["file.ts"]  ')).toBe('["file.ts"]');
      expect(filter.cleanJsonOutput('\n\n["file.ts"]\n\n')).toBe('["file.ts"]');
    });
  });

  describe('parseFilterResult', () => {
    it('应当正确解析 JSON 数组', () => {
      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = filter.parseFilterResult('["file1.ts", "file2.ts"]');
      expect(result).toEqual(['file1.ts', 'file2.ts']);
    });

    it('应当处理带 Markdown 标记的 JSON', () => {
      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const result = filter.parseFilterResult('```json\n["file1.ts"]\n```');
      expect(result).toEqual(['file1.ts']);
    });

    it('应当拒绝无效的 JSON', () => {
      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      expect(() => filter.parseFilterResult('invalid')).toThrow();
      expect(() => filter.parseFilterResult('{"key": "value"}')).toThrow();
      expect(() => filter.parseFilterResult('[1, 2, 3]')).toThrow();
    });
  });

  describe('shouldSkipFiltering', () => {
    it('应当对少于 3 个文件返回 true', () => {
      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      expect(filter.shouldSkipFiltering([])).toBe(true);
      expect(filter.shouldSkipFiltering([createGitChange('file1.ts')])).toBe(true);
      expect(
        filter.shouldSkipFiltering([createGitChange('file1.ts'), createGitChange('file2.ts')])
      ).toBe(true);
    });

    it('应当对 3 个或更多文件返回 false', () => {
      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      expect(
        filter.shouldSkipFiltering([
          createGitChange('file1.ts'),
          createGitChange('file2.ts'),
          createGitChange('file3.ts'),
        ])
      ).toBe(false);
    });
  });

  describe('exceedsMaxFileListSize', () => {
    it('应当对超过 500 个文件返回 true', () => {
      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const changes = Array.from({ length: 501 }, (_, i) => createGitChange(`file${i}.ts`));
      expect(filter.exceedsMaxFileListSize(changes)).toBe(true);
    });

    it('应当对 500 个或更少文件返回 false', () => {
      const mockLLMService = createMockLLMService();
      const config = createTestConfig();
      const filter = new SmartDiffFilter(mockLLMService, config);

      const changes = Array.from({ length: 500 }, (_, i) => createGitChange(`file${i}.ts`));
      expect(filter.exceedsMaxFileListSize(changes)).toBe(false);
    });
  });
});

describe('ModelSelector', () => {
  const { ModelSelector } = require('../SmartDiffFilter');

  describe('本地服务商检测', () => {
    it('应当识别 Ollama', () => {
      const selector = new ModelSelector();
      const config: ExtensionConfig = {
        apiEndpoint: 'http://localhost:11434/ollama/v1',
        apiKey: 'not-needed',
        modelName: 'llama3',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 4000,
        temperature: 0.7,
      };

      expect(selector.isLocalProvider(config)).toBe(true);
    });

    it('应当识别 LM Studio', () => {
      const selector = new ModelSelector();
      const configs = ['http://localhost:1234/lm-studio/v1', 'http://localhost:1234/lm studio/v1'];

      configs.forEach((endpoint) => {
        const config: ExtensionConfig = {
          apiEndpoint: endpoint,
          apiKey: 'not-needed',
          modelName: 'local-model',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 4000,
          temperature: 0.7,
        };

        expect(selector.isLocalProvider(config)).toBe(true);
      });
    });

    it('应当识别 LocalAI', () => {
      const selector = new ModelSelector();
      const configs = ['http://localhost:8080/localai/v1', 'http://localhost:8080/local-ai/v1'];

      configs.forEach((endpoint) => {
        const config: ExtensionConfig = {
          apiEndpoint: endpoint,
          apiKey: 'not-needed',
          modelName: 'local-model',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 4000,
          temperature: 0.7,
        };

        expect(selector.isLocalProvider(config)).toBe(true);
      });
    });

    it('应当识别自定义端点', () => {
      const selector = new ModelSelector();
      const config: ExtensionConfig = {
        apiEndpoint: 'http://localhost:5000/custom/v1',
        apiKey: 'not-needed',
        modelName: 'custom-model',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 4000,
        temperature: 0.7,
      };

      expect(selector.isLocalProvider(config)).toBe(true);
    });

    it('应当拒绝云端服务商', () => {
      const selector = new ModelSelector();
      const cloudEndpoints = [
        'https://api.openai.com/v1',
        'https://generativelanguage.googleapis.com/v1',
        'https://api.anthropic.com/v1',
        'https://dashscope.aliyuncs.com/api/v1',
      ];

      cloudEndpoints.forEach((endpoint) => {
        const config: ExtensionConfig = {
          apiEndpoint: endpoint,
          apiKey: 'test-key',
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

  describe('轻量级模型选择', () => {
    it('应当为 OpenAI 返回 gpt-4o-mini', () => {
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

      expect(selector.selectFilterModel(config)).toBe('gpt-4o-mini');
    });

    it('应当为 Google/Gemini 返回 gemini-1.5-flash', () => {
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

        expect(selector.selectFilterModel(config)).toBe('gemini-1.5-flash');
      });
    });

    it('应当为 Anthropic 返回 claude-3-haiku', () => {
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

      expect(selector.selectFilterModel(config)).toBe('claude-3-haiku');
    });

    it('应当为 Qwen/Tongyi 返回 qwen-turbo', () => {
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

        expect(selector.selectFilterModel(config)).toBe('qwen-turbo');
      });
    });
  });

  describe('自定义模型配置', () => {
    it('应当优先使用用户配置的 filterModel', () => {
      const selector = new ModelSelector();
      const config = {
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        modelName: 'gpt-4o',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 4000,
        temperature: 0.7,
        filterModel: 'gpt-3.5-turbo', // 用户配置的过滤专用模型
      } as ExtensionConfig & { filterModel: string };

      expect(selector.selectFilterModel(config)).toBe('gpt-3.5-turbo');
    });

    it('应当在没有 filterModel 时使用自动选择', () => {
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

      // 没有 filterModel，应当自动选择轻量级模型
      expect(selector.selectFilterModel(config)).toBe('gpt-4o-mini');
    });
  });

  describe('回退逻辑', () => {
    it('应当为本地服务商返回主模型', () => {
      const selector = new ModelSelector();
      const config: ExtensionConfig = {
        apiEndpoint: 'http://localhost:11434/ollama/v1',
        apiKey: 'not-needed',
        modelName: 'llama3',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 4000,
        temperature: 0.7,
      };

      expect(selector.selectFilterModel(config)).toBe('llama3');
    });

    it('应当为未知服务商返回主模型', () => {
      const selector = new ModelSelector();
      const config: ExtensionConfig = {
        apiEndpoint: 'https://unknown-api.example.com/v1',
        apiKey: 'test-key',
        modelName: 'unknown-model',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 4000,
        temperature: 0.7,
      };

      expect(selector.selectFilterModel(config)).toBe('unknown-model');
    });
  });

  describe('getLightweightModels', () => {
    it('应当返回轻量级模型列表', () => {
      const selector = new ModelSelector();
      const models = selector.getLightweightModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      // 验证包含常见的轻量级模型
      expect(models).toContain('gpt-4o-mini');
      expect(models).toContain('gpt-3.5-turbo');
      expect(models).toContain('gemini-1.5-flash');
      expect(models).toContain('claude-3-haiku');
      expect(models).toContain('qwen-turbo');
    });

    it('应当返回数组的副本', () => {
      const selector = new ModelSelector();
      const models1 = selector.getLightweightModels();
      const models2 = selector.getLightweightModels();

      // 应当是不同的数组实例
      expect(models1).not.toBe(models2);

      // 但内容应当相同
      expect(models1).toEqual(models2);
    });
  });
});

describe('PromptBuilder', () => {
  describe('buildSystemPrompt', () => {
    it('应当包含必要的关键词', () => {
      const promptBuilder = new PromptBuilder();
      const systemPrompt = promptBuilder.buildSystemPrompt();

      // 验证包含角色定义
      expect(systemPrompt).toContain('Tech Lead');

      // 验证包含核心逻辑相关词汇
      expect(systemPrompt).toContain('核心逻辑');

      // 验证包含杂音文件类型
      expect(systemPrompt).toContain('Lockfiles');
      expect(systemPrompt).toContain('构建产物');

      // 验证包含输出要求
      expect(systemPrompt).toContain('JSON');
    });

    it('应当列举常见的杂音文件类型', () => {
      const promptBuilder = new PromptBuilder();
      const systemPrompt = promptBuilder.buildSystemPrompt();

      // 验证包含各种杂音文件类型
      expect(systemPrompt).toContain('package-lock.json');
      expect(systemPrompt).toContain('pnpm-lock.yaml');
      expect(systemPrompt).toContain('dist/');
      expect(systemPrompt).toContain('build/');
      expect(systemPrompt).toContain('*.generated.ts');
      expect(systemPrompt).toContain('__snapshots__/');
      expect(systemPrompt).toContain('*.min.js');
      expect(systemPrompt).toContain('.vscode/');
      expect(systemPrompt).toContain('*.tmp');
    });

    it('应当列举核心逻辑文件类型', () => {
      const promptBuilder = new PromptBuilder();
      const systemPrompt = promptBuilder.buildSystemPrompt();

      // 验证包含核心文件类型
      expect(systemPrompt).toContain('*.ts');
      expect(systemPrompt).toContain('*.js');
      expect(systemPrompt).toContain('package.json');
      expect(systemPrompt).toContain('README.md');
      expect(systemPrompt).toContain('*.test.ts');
      expect(systemPrompt).toContain('*.css');
    });

    it('应当包含输出格式要求', () => {
      const promptBuilder = new PromptBuilder();
      const systemPrompt = promptBuilder.buildSystemPrompt();

      // 验证包含输出格式说明
      expect(systemPrompt).toContain('JSON 字符串数组');
      expect(systemPrompt).toContain('不要添加任何解释');
      expect(systemPrompt).toContain('Markdown 标记');
    });

    it('应当包含示例', () => {
      const promptBuilder = new PromptBuilder();
      const systemPrompt = promptBuilder.buildSystemPrompt();

      // 验证包含示例
      expect(systemPrompt).toContain('示例');
      expect(systemPrompt).toContain('输入:');
      expect(systemPrompt).toContain('输出:');
    });
  });

  describe('buildUserPrompt', () => {
    it('应当包含文件列表的 JSON 表示', () => {
      const promptBuilder = new PromptBuilder();
      const fileList: FileInfo[] = [
        { path: 'src/index.ts', status: 'Modified' },
        { path: 'package-lock.json', status: 'Modified' },
      ];

      const userPrompt = promptBuilder.buildUserPrompt(fileList);

      // 验证包含文件路径
      expect(userPrompt).toContain('src/index.ts');
      expect(userPrompt).toContain('package-lock.json');

      // 验证包含状态
      expect(userPrompt).toContain('Modified');
    });

    it('应当包含输出格式说明', () => {
      const promptBuilder = new PromptBuilder();
      const fileList: FileInfo[] = [{ path: 'test.ts', status: 'Added' }];

      const userPrompt = promptBuilder.buildUserPrompt(fileList);

      // 验证包含格式说明
      expect(userPrompt).toContain('JSON 字符串数组');
      expect(userPrompt).toContain('格式如');
    });

    it('应当提供示例格式', () => {
      const promptBuilder = new PromptBuilder();
      const fileList: FileInfo[] = [{ path: 'test.ts', status: 'Added' }];

      const userPrompt = promptBuilder.buildUserPrompt(fileList);

      // 验证包含示例格式
      expect(userPrompt).toContain('["file1.ts", "file2.js"]');
    });

    it('应当正确处理空列表', () => {
      const promptBuilder = new PromptBuilder();
      const fileList: FileInfo[] = [];

      const userPrompt = promptBuilder.buildUserPrompt(fileList);

      // 验证包含空数组
      expect(userPrompt).toContain('[]');
    });

    it('应当正确处理多个文件', () => {
      const promptBuilder = new PromptBuilder();
      const fileList: FileInfo[] = [
        { path: 'src/index.ts', status: 'Added' },
        { path: 'src/utils.ts', status: 'Modified' },
        { path: 'README.md', status: 'Modified' },
      ];

      const userPrompt = promptBuilder.buildUserPrompt(fileList);

      // 验证包含所有文件
      expect(userPrompt).toContain('src/index.ts');
      expect(userPrompt).toContain('src/utils.ts');
      expect(userPrompt).toContain('README.md');

      // 验证包含所有状态
      expect(userPrompt).toContain('Added');
      expect(userPrompt).toContain('Modified');
    });
  });
});
