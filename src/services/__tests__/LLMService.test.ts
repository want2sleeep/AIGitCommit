import axios from 'axios';
import { LLMService } from '../LLMService';
import { ExtensionConfig, GitChange, ChangeStatus, LLMResponse } from '../../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LLMService', () => {
  let llmService: LLMService;
  let mockConfig: ExtensionConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    llmService = new LLMService();

    // Default mock configuration
    mockConfig = {
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: 'test-api-key',
      modelName: 'gpt-3.5-turbo',
      language: 'zh-CN',
      commitFormat: 'conventional',
      maxTokens: 500,
      temperature: 0.7,
    };

    // Mock axios.isAxiosError
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(false);
  });

  describe('generateCommitMessage', () => {
    const mockChanges: GitChange[] = [
      {
        path: '/test/file.ts',
        status: ChangeStatus.Modified,
        diff: '--- a/test/file.ts\n+++ b/test/file.ts\n-old line\n+new line',
        additions: 1,
        deletions: 1,
      },
    ];

    it('should generate commit message successfully', async () => {
      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'feat(test): update file logic',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await llmService.generateCommitMessage(mockChanges, mockConfig);

      expect(result).toBe('feat(test): update file logic');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should call API with correct endpoint and headers', async () => {
      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'fix: resolve issue',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await llmService.generateCommitMessage(mockChanges, mockConfig);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          messages: expect.any(Array),
          max_tokens: 500,
          temperature: 0.7,
          stream: false,
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
          timeout: 30000,
        })
      );
    });

    it('should append /chat/completions to endpoint if missing', async () => {
      mockConfig.apiEndpoint = 'https://api.openai.com/v1/';

      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'test message',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await llmService.generateCommitMessage(mockChanges, mockConfig);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should clean quotes from response', async () => {
      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '"feat: add new feature"',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await llmService.generateCommitMessage(mockChanges, mockConfig);

      expect(result).toBe('feat: add new feature');
    });

    it('should clean markdown code blocks from response', async () => {
      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '```\nfeat: add feature\n```',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await llmService.generateCommitMessage(mockChanges, mockConfig);

      expect(result).toBe('feat: add feature');
    });

    it('should throw error when response is empty', async () => {
      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '   ',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        '移除think标签后提交信息为空'
      );
    });

    it('should throw error when response has no choices', async () => {
      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        'API返回了无效的响应格式'
      );
    });
  });

  describe('prompt building', () => {
    it('should build prompt with system and user messages', async () => {
      const mockChanges: GitChange[] = [
        {
          path: '/test/file.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 1,
          deletions: 0,
        },
      ];

      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'test commit',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await llmService.generateCommitMessage(mockChanges, mockConfig);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs?.[1] as any;

      expect(requestBody.messages).toHaveLength(2);
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[1].role).toBe('user');
    });

    it('should include conventional commit format in system prompt', async () => {
      mockConfig.commitFormat = 'conventional';

      const mockChanges: GitChange[] = [
        {
          path: '/test/file.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 1,
          deletions: 0,
        },
      ];

      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'test',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await llmService.generateCommitMessage(mockChanges, mockConfig);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs?.[1] as any;
      const systemPrompt = requestBody.messages[0].content;

      expect(systemPrompt).toContain('约定式提交');
      expect(systemPrompt).toContain('feat');
      expect(systemPrompt).toContain('fix');
    });

    it('should use simple format when configured', async () => {
      mockConfig.commitFormat = 'simple';

      const mockChanges: GitChange[] = [
        {
          path: '/test/file.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 1,
          deletions: 0,
        },
      ];

      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'test',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await llmService.generateCommitMessage(mockChanges, mockConfig);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs?.[1] as any;
      const systemPrompt = requestBody.messages[0].content;

      expect(systemPrompt).toContain('简单清晰');
    });

    it('should use English language when configured', async () => {
      mockConfig.language = 'en-US';

      const mockChanges: GitChange[] = [
        {
          path: '/test/file.ts',
          status: ChangeStatus.Modified,
          diff: 'test diff',
          additions: 1,
          deletions: 0,
        },
      ];

      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'test',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await llmService.generateCommitMessage(mockChanges, mockConfig);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs?.[1] as any;
      const systemPrompt = requestBody.messages[0].content;

      expect(systemPrompt).toContain('English');
      expect(systemPrompt).toContain('professional Git commit message generator');
    });

    it('should format changes in user prompt', async () => {
      const mockChanges: GitChange[] = [
        {
          path: '/test/file1.ts',
          status: ChangeStatus.Added,
          diff: '+new content',
          additions: 1,
          deletions: 0,
        },
        {
          path: '/test/file2.ts',
          status: ChangeStatus.Modified,
          diff: '-old\n+new',
          additions: 1,
          deletions: 1,
        },
      ];

      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'test',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await llmService.generateCommitMessage(mockChanges, mockConfig);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs?.[1] as any;
      const userPrompt = requestBody.messages[1].content;

      expect(userPrompt).toContain('/test/file1.ts');
      expect(userPrompt).toContain('/test/file2.ts');
      expect(userPrompt).toContain('新增');
      expect(userPrompt).toContain('修改');
      expect(userPrompt).toContain('+1 -0');
      expect(userPrompt).toContain('+1 -1');
    });

    it('should truncate long diffs', async () => {
      const longDiff = 'a'.repeat(6000);
      const mockChanges: GitChange[] = [
        {
          path: '/test/file.ts',
          status: ChangeStatus.Modified,
          diff: longDiff,
          additions: 100,
          deletions: 50,
        },
      ];

      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'test',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await llmService.generateCommitMessage(mockChanges, mockConfig);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs?.[1] as any;
      const userPrompt = requestBody.messages[1].content;

      expect(userPrompt).toContain('diff已截断');
    });

    it('should limit total diff length', async () => {
      const mockChanges: GitChange[] = [];
      for (let i = 0; i < 10; i++) {
        mockChanges.push({
          path: `/test/file${i}.ts`,
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 10,
          deletions: 5,
        });
      }

      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'test',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await llmService.generateCommitMessage(mockChanges, mockConfig);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs?.[1] as any;
      const userPrompt = requestBody.messages[1].content;

      expect(userPrompt).toContain('更多变更已省略');
    });
  });

  describe('API error handling', () => {
    const mockChanges: GitChange[] = [
      {
        path: '/test/file.ts',
        status: ChangeStatus.Modified,
        diff: 'test diff',
        additions: 1,
        deletions: 0,
      },
    ];

    it('should throw error for 401 authentication failure', async () => {
      const error: any = {
        response: {
          status: 401,
          data: {},
        },
      };

      mockedAxios.post.mockRejectedValue(error);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        'API认证失败'
      );
    });

    it('should throw error for 403 access denied', async () => {
      const error: any = {
        response: {
          status: 403,
          data: {},
        },
      };

      mockedAxios.post.mockRejectedValue(error);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        'API访问被拒绝'
      );
    });

    it('should throw error for 404 model not found', async () => {
      const error: any = {
        response: {
          status: 404,
          data: {},
        },
      };

      mockedAxios.post.mockRejectedValue(error);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        '模型不存在'
      );
    });

    it('should throw error for 429 rate limit', async () => {
      const error: any = {
        response: {
          status: 429,
          data: {},
        },
      };

      mockedAxios.post.mockRejectedValue(error);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        'API请求频率超限'
      );
    });

    it('should throw error for 500 server error', async () => {
      const error: any = {
        response: {
          status: 500,
          data: {},
        },
      };

      mockedAxios.post.mockRejectedValue(error);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        'API服务器内部错误'
      );
    });

    it('should throw error for 502/503/504 service unavailable', async () => {
      const statuses = [502, 503, 504];

      for (const status of statuses) {
        jest.clearAllMocks();
        const error: any = {
          response: {
            status,
            data: {},
          },
        };

        mockedAxios.post.mockRejectedValue(error);
        (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

        await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
          'API服务暂时不可用'
        );
      }
    });

    it('should extract error message from API response', async () => {
      const error: any = {
        response: {
          status: 400,
          data: {
            error: {
              message: 'Invalid request format',
            },
          },
        },
      };

      mockedAxios.post.mockRejectedValue(error);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        'Invalid request format'
      );
    });

    it('should handle timeout errors', async () => {
      const error: any = {
        code: 'ETIMEDOUT',
        response: undefined,
        isAxiosError: true,
      };

      mockedAxios.post.mockRejectedValue(error);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        '请求超时'
      );
    });

    it('should handle connection refused errors', async () => {
      const error: any = {
        code: 'ECONNREFUSED',
        response: undefined,
        isAxiosError: true,
      };

      mockedAxios.post.mockRejectedValue(error);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        '连接被拒绝'
      );
    });

    it('should handle DNS resolution errors', async () => {
      const error: any = {
        code: 'ENOTFOUND',
        response: undefined,
        isAxiosError: true,
      };

      mockedAxios.post.mockRejectedValue(error);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        '无法连接到API服务器'
      );
    });
  });

  describe('retry logic', () => {
    const mockChanges: GitChange[] = [
      {
        path: '/test/file.ts',
        status: ChangeStatus.Modified,
        diff: 'test diff',
        additions: 1,
        deletions: 0,
      },
    ];

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry on 429 rate limit error', async () => {
      const error: any = {
        response: {
          status: 429,
          data: {},
        },
      };

      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'success after retry',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockRejectedValueOnce(error).mockResolvedValueOnce({ data: mockResponse });
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const promise = llmService.generateCommitMessage(mockChanges, mockConfig);

      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success after retry');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 server error', async () => {
      const error: any = {
        response: {
          status: 500,
          data: {},
        },
      };

      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'success after retry',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockRejectedValueOnce(error).mockResolvedValueOnce({ data: mockResponse });
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const promise = llmService.generateCommitMessage(mockChanges, mockConfig);

      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success after retry');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout error', async () => {
      const error: any = {
        code: 'ETIMEDOUT',
        response: undefined,
        isAxiosError: true,
      };

      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'success after retry',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockRejectedValueOnce(error).mockResolvedValueOnce({ data: mockResponse });
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const promise = llmService.generateCommitMessage(mockChanges, mockConfig);

      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success after retry');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 401 authentication error', async () => {
      const error: any = {
        response: {
          status: 401,
          data: {},
        },
      };

      mockedAxios.post.mockRejectedValue(error);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        'API认证失败'
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 404 model not found error', async () => {
      const error: any = {
        response: {
          status: 404,
          data: {},
        },
      };

      mockedAxios.post.mockRejectedValue(error);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      await expect(llmService.generateCommitMessage(mockChanges, mockConfig)).rejects.toThrow(
        '模型不存在'
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should retry up to 3 times with exponential backoff', async () => {
      const error: any = {
        response: {
          status: 500,
          data: {},
        },
      };

      mockedAxios.post.mockRejectedValue(error);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const promise = llmService.generateCommitMessage(mockChanges, mockConfig);

      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow('API服务器内部错误');
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should succeed on third retry', async () => {
      const error: any = {
        response: {
          status: 503,
          data: {},
        },
      };

      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'success on third try',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: mockResponse });
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const promise = llmService.generateCommitMessage(mockChanges, mockConfig);

      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success on third try');
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('commit message validation and optimization', () => {
    const mockChanges: GitChange[] = [
      {
        path: '/test/file.ts',
        status: ChangeStatus.Modified,
        diff: 'test diff',
        additions: 1,
        deletions: 0,
      },
    ];

    it('should truncate title longer than 72 characters', async () => {
      const longTitle = 'a'.repeat(80);
      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: longTitle,
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await llmService.generateCommitMessage(mockChanges, mockConfig);

      const lines = result.split('\n');
      expect(lines[0]?.length).toBeLessThanOrEqual(72);
    });

    it('should ensure blank line between title and description', async () => {
      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'feat: add feature\nThis is a description',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await llmService.generateCommitMessage(mockChanges, mockConfig);

      const lines = result.split('\n');
      expect(lines[1]).toBe('');
    });

    it('should fix conventional commit format spacing', async () => {
      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'feat(scope):missing space',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await llmService.generateCommitMessage(mockChanges, mockConfig);

      expect(result).toBe('feat(scope): missing space');
    });

    it('should preserve valid conventional commit format', async () => {
      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'fix(auth): resolve login issue',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await llmService.generateCommitMessage(mockChanges, mockConfig);

      expect(result).toBe('fix(auth): resolve login issue');
    });

    it('should handle multi-line commit messages', async () => {
      const mockResponse: LLMResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content:
                'feat: add new feature\n\nThis feature adds support for X.\nIt also includes Y.',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await llmService.generateCommitMessage(mockChanges, mockConfig);

      expect(result).toContain('feat: add new feature');
      expect(result).toContain('This feature adds support for X.');
    });
  });
});
