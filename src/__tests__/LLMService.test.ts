import { LLMService } from '../services/LLMService';
import { ExtensionConfig, GitChange, ChangeStatus } from '../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * LLMService单元测试
 * 重点测试think标签移除功能和响应解析
 */
describe('LLMService', () => {
  let llmService: LLMService;
  let mockConfig: ExtensionConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    llmService = new LLMService();

    // 默认配置
    mockConfig = {
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: 'test-api-key',
      modelName: 'gpt-3.5-turbo',
      language: 'zh-CN',
      commitFormat: 'conventional',
      maxTokens: 500,
      temperature: 0.7,
    };
  });

  describe('Normal Response Handling (Task 4.1)', () => {
    it('should handle normal response without think tags', async () => {
      const normalMessage = 'feat(auth): add user login';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: normalMessage,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/auth.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 10,
          deletions: 2,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      expect(result).toBe(normalMessage);
    });

    it('should preserve existing functionality for normal responses', async () => {
      const messageWithQuotes = '"feat(test): add feature"';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageWithQuotes,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/test.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 5,
          deletions: 1,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      expect(result).toBe('feat(test): add feature');
    });

    it('should handle markdown code blocks in normal responses', async () => {
      const messageWithMarkdown = '```\nfeat(api): add endpoint\n```';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageWithMarkdown,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/api.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 15,
          deletions: 3,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      expect(result).toBe('feat(api): add endpoint');
    });

    it('should handle multi-line commit messages without think tags', async () => {
      const multiLineMessage =
        'feat(config): enhance configuration panel\n\nAdd new settings for API configuration\nImprove UI layout';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: multiLineMessage,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/config.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 20,
          deletions: 5,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      expect(result).toContain('feat(config): enhance configuration panel');
      expect(result).toContain('Add new settings for API configuration');
    });

    it('should not affect performance for responses without think tags', async () => {
      const normalMessage = 'fix(bug): resolve issue';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: normalMessage,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/bug.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 3,
          deletions: 2,
        },
      ];

      const startTime = Date.now();
      const result = await llmService.generateCommitMessage(changes, mockConfig);
      const endTime = Date.now();

      expect(result).toBe(normalMessage);
      // Processing should be very fast (< 100ms for unit test)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Think Tag Removal (Task 4.2)', () => {
    it('should remove single think tag block', async () => {
      const messageWithThinkTag = '<think>分析代码变更...</think>feat(auth): add user login';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageWithThinkTag,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/auth.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 10,
          deletions: 2,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      expect(result).toBe('feat(auth): add user login');
      expect(result).not.toContain('<think>');
      expect(result).not.toContain('</think>');
    });

    it('should remove multiple think tag blocks', async () => {
      const messageWithMultipleThinkTags =
        '<think>第一部分思考</think>feat(auth): add user login\n\n<think>第二部分思考</think>Add JWT authentication';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageWithMultipleThinkTags,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/auth.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 20,
          deletions: 5,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      expect(result).toContain('feat(auth): add user login');
      expect(result).toContain('Add JWT authentication');
      expect(result).not.toContain('<think>');
      expect(result).not.toContain('</think>');
      expect(result).not.toContain('第一部分思考');
      expect(result).not.toContain('第二部分思考');
    });

    it('should remove think tags with multiline content', async () => {
      const messageWithMultilineThink = `<think>
我需要分析这个代码变更
涉及多个方面
需要仔细考虑
</think>
feat(config): enhance configuration panel`;

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageWithMultilineThink,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/config.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 15,
          deletions: 3,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      expect(result).toBe('feat(config): enhance configuration panel');
      expect(result).not.toContain('<think>');
      expect(result).not.toContain('我需要分析');
    });

    it('should handle irregular think tags (case insensitive)', async () => {
      const messageWithIrregularTags =
        '<THINK>大写标签</THINK>feat: add feature\n<Think>混合大小写</Think>more content';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageWithIrregularTags,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/feature.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 8,
          deletions: 1,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      expect(result).toContain('feat: add feature');
      expect(result).toContain('more content');
      expect(result).not.toContain('<THINK>');
      expect(result).not.toContain('<Think>');
      expect(result).not.toContain('大写标签');
      expect(result).not.toContain('混合大小写');
    });

    it('should handle think tags mixed with quotes and markdown', async () => {
      const messageWithMixedFormats = '<think>分析中...</think>"```\nfeat: add feature\n```"';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageWithMixedFormats,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/feature.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 12,
          deletions: 4,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      expect(result).toBe('feat: add feature');
      expect(result).not.toContain('<think>');
      expect(result).not.toContain('```');
      expect(result).not.toContain('"');
    });

    it('should clean up extra whitespace after removing think tags', async () => {
      const messageWithExtraWhitespace =
        '<think>思考内容</think>\n\n\n\nfeat: add feature\n\n\n\nmore details';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageWithExtraWhitespace,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/feature.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 10,
          deletions: 2,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      expect(result).toContain('feat: add feature');
      expect(result).toContain('more details');
      // Should not have more than 2 consecutive newlines
      expect(result).not.toMatch(/\n\n\n/);
    });

    it('should handle think tags at different positions', async () => {
      const messageWithTagsAtEnd =
        'feat: add feature\n\nDetailed description<think>后续思考</think>';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageWithTagsAtEnd,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/feature.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 7,
          deletions: 1,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      expect(result).toContain('feat: add feature');
      expect(result).toContain('Detailed description');
      expect(result).not.toContain('<think>');
      expect(result).not.toContain('后续思考');
    });

    it('should handle nested or malformed think tags', async () => {
      const messageWithMalformedTags =
        '<think>外层<think>内层</think>外层</think>feat: add feature';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageWithMalformedTags,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/feature.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 5,
          deletions: 1,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      // Note: nested tags may leave some text due to non-greedy matching
      // The important thing is that all <think> tags are removed
      expect(result).not.toContain('<think>');
      expect(result).not.toContain('</think>');
      expect(result).toContain('feat: add feature');
    });
  });

  describe('Error Handling (Task 4.3)', () => {
    it('should throw error when content is empty after removing think tags', async () => {
      const messageOnlyThinkTags = '<think>只有思考内容，没有实际提交信息</think>';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageOnlyThinkTags,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/test.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 5,
          deletions: 1,
        },
      ];

      await expect(llmService.generateCommitMessage(changes, mockConfig)).rejects.toThrow(
        '移除think标签后提交信息为空，请重新生成'
      );
    });

    it('should throw error when only whitespace remains after removing think tags', async () => {
      const messageOnlyWhitespace = '<think>思考内容</think>   \n\n   \t  ';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageOnlyWhitespace,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/test.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 3,
          deletions: 1,
        },
      ];

      await expect(llmService.generateCommitMessage(changes, mockConfig)).rejects.toThrow(
        '移除think标签后提交信息为空，请重新生成'
      );
    });

    it('should provide friendly error message for empty content', async () => {
      const messageEmpty = '<think>完整的思考过程</think>';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageEmpty,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/test.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 8,
          deletions: 2,
        },
      ];

      try {
        await llmService.generateCommitMessage(changes, mockConfig);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('移除think标签后提交信息为空');
        expect((error as Error).message).toContain('请重新生成');
      }
    });

    it('should handle multiple think tags resulting in empty content', async () => {
      const messageMultipleThinkOnly =
        '<think>第一段思考</think>\n\n<think>第二段思考</think>\n<think>第三段思考</think>';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageMultipleThinkOnly,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/test.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 10,
          deletions: 3,
        },
      ];

      await expect(llmService.generateCommitMessage(changes, mockConfig)).rejects.toThrow(
        '移除think标签后提交信息为空，请重新生成'
      );
    });

    it('should not throw error when valid content exists after removing think tags', async () => {
      const messageWithValidContent = '<think>思考过程</think>feat: valid commit message';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageWithValidContent,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/test.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 5,
          deletions: 1,
        },
      ];

      const result = await llmService.generateCommitMessage(changes, mockConfig);
      expect(result).toBe('feat: valid commit message');
    });

    it('should handle edge case with only think tags and newlines', async () => {
      const messageEdgeCase = '\n\n<think>思考</think>\n\n\n<think>更多思考</think>\n\n';

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: messageEdgeCase,
              },
            },
          ],
        },
      });

      const changes: GitChange[] = [
        {
          path: 'src/test.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 2,
          deletions: 1,
        },
      ];

      await expect(llmService.generateCommitMessage(changes, mockConfig)).rejects.toThrow(
        '移除think标签后提交信息为空，请重新生成'
      );
    });
  });
});
