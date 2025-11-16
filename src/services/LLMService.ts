import axios, { AxiosError } from 'axios';
import {
  ExtensionConfig,
  GitChange,
  LLMRequest,
  LLMResponse,
  Message,
  GeminiRequest,
  GeminiResponse,
} from '../types';
import { APIError, NetworkError } from '../errors';
import { API_CONSTANTS, GIT_CONSTANTS } from '../constants';
import { sleep } from '../utils/retry';
import { isError, isAPIError, isNetworkError } from '../utils/typeGuards';

/**
 * LLM服务类
 * 负责调用OpenAI兼容API和Gemini API生成提交信息
 */
export class LLMService {
  /**
   * 检测是否为Gemini提供商
   * @param config 插件配置
   * @returns 是否为Gemini提供商
   */
  private isGeminiProvider(config: ExtensionConfig): boolean {
    return (
      config.apiEndpoint.includes('generativelanguage.googleapis.com') ||
      config.modelName.startsWith('gemini')
    );
  }

  /**
   * 构建Gemini API端点
   * @param config 插件配置
   * @returns Gemini API端点URL
   */
  private buildGeminiEndpoint(config: ExtensionConfig): string {
    const baseUrl = config.apiEndpoint.replace(/\/$/, '');
    const model = config.modelName;
    return `${baseUrl}/models/${model}:generateContent?key=${config.apiKey}`;
  }

  /**
   * 构建Gemini请求
   * 将OpenAI格式的messages转换为Gemini格式
   * @param messages 消息数组
   * @param config 插件配置
   * @returns Gemini请求对象
   */
  private buildGeminiRequest(messages: Message[], config: ExtensionConfig): GeminiRequest {
    // Gemini不支持system role，需要将system消息合并到user消息中
    let combinedText = '';

    for (const message of messages) {
      if (message.role === 'system') {
        combinedText += `${message.content}\n\n`;
      } else if (message.role === 'user') {
        combinedText += message.content;
      }
    }

    return {
      contents: [
        {
          role: 'user',
          parts: [{ text: combinedText }],
        },
      ],
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    };
  }

  /**
   * 解析Gemini响应
   * 从Gemini响应中提取生成的文本
   * @param response Gemini响应对象
   * @returns 生成的文本内容
   */
  private parseGeminiResponse(response: GeminiResponse): string {
    if (!response.candidates || response.candidates.length === 0) {
      throw new APIError('Gemini API返回了无效的响应格式：缺少candidates数组', undefined, response);
    }

    const firstCandidate = response.candidates[0];
    if (!firstCandidate) {
      throw new APIError('Gemini API响应中没有候选项：candidates数组为空', undefined, response);
    }

    const content = firstCandidate.content;
    if (!content || !content.parts || content.parts.length === 0) {
      throw new APIError('Gemini API响应中没有生成的内容：content.parts为空', undefined, response);
    }

    const text = content.parts[0]?.text;
    if (!text) {
      throw new APIError('Gemini API响应中没有文本内容：parts[0].text为空', undefined, response);
    }

    return text;
  }
  /**
   * 生成提交信息
   * @param changes Git变更列表
   * @param config 插件配置
   * @returns 生成的提交信息
   */
  async generateCommitMessage(changes: GitChange[], config: ExtensionConfig): Promise<string> {
    const prompt = this.buildPrompt(changes, config);
    const commitMessage = await this.callAPI(prompt, config);
    return this.parseCommitMessage(commitMessage);
  }

  /**
   * 构建提示词
   * @param changes Git变更列表
   * @param config 插件配置
   * @returns 消息数组
   */
  private buildPrompt(changes: GitChange[], config: ExtensionConfig): Message[] {
    const systemPrompt = this.buildSystemPrompt(config);
    const userPrompt = this.buildUserPrompt(changes);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  /**
   * 构建系统提示词
   * @param config 插件配置
   * @returns 系统提示词
   */
  private buildSystemPrompt(config: ExtensionConfig): string {
    const language = config.language === 'zh-CN' ? '中文' : 'English';
    const formatInstructions =
      config.commitFormat === 'conventional'
        ? this.getConventionalCommitInstructions(config.language)
        : this.getSimpleCommitInstructions(config.language);

    if (config.language === 'zh-CN') {
      return `你是一个专业的Git提交信息生成助手。
请根据提供的代码变更内容，生成简洁、专业、符合规范的提交信息。

要求：
${formatInstructions}
- 提交标题不超过72个字符，强烈建议在50个字符以内
- 标题应该清晰描述"做了什么"，使用祈使语气
- 如果变更涉及多个方面或较复杂，必须提供详细描述
- 详细描述应该说明"为什么"和"如何"实现的
- 标题和详细描述之间用一个空行分隔
- 使用${language}
- 直接返回提交信息，不需要额外解释、引号包裹或markdown格式
- 不要使用<think>标签或展示思考过程
- 不要包含任何XML标签或特殊标记
- 关注代码的实际功能变化，而不是文件名或路径`;
    } else {
      return `You are a professional Git commit message generator.
Generate concise, professional, and standards-compliant commit messages based on the provided code changes.

Requirements:
${formatInstructions}
- Commit title should not exceed 72 characters, strongly recommended within 50 characters
- Title should clearly describe "what was done" using imperative mood
- If changes involve multiple aspects or are complex, provide a detailed description
- Detailed description should explain "why" and "how" it was implemented
- Separate title and detailed description with a blank line
- Use ${language}
- Return the commit message directly without additional explanations, quote wrapping, or markdown formatting
- Do not use <think> tags or show thinking process
- Do not include any XML tags or special markers
- Focus on actual functional changes in the code, not file names or paths`;
    }
  }

  /**
   * 获取约定式提交格式说明
   * @param language 语言
   * @returns 格式说明
   */
  private getConventionalCommitInstructions(language: string): string {
    if (language === 'zh-CN') {
      return `- 严格使用约定式提交格式（Conventional Commits）
- 格式：<type>(<scope>): <subject>
- scope是可选的，但建议添加以明确变更范围
- type和冒号之间不要有空格，冒号后必须有一个空格
- 常用类型及使用场景：
  * feat: 新增功能或特性
  * fix: 修复bug或问题
  * docs: 仅文档变更（README、注释等）
  * style: 代码格式调整，不影响代码逻辑（空格、格式化、缺少分号等）
  * refactor: 代码重构，既不修复bug也不添加功能
  * perf: 性能优化
  * test: 添加或修改测试代码
  * build: 影响构建系统或外部依赖的变更（webpack、npm、gulp等）
  * ci: CI配置文件和脚本的变更（Travis、Circle、GitHub Actions等）
  * chore: 其他不修改src或test文件的变更（更新依赖、配置文件等）
  * revert: 回退之前的提交
- 示例：feat(auth): 添加用户登录功能`;
    } else {
      return `- Strictly use Conventional Commits format
- Format: <type>(<scope>): <subject>
- scope is optional but recommended to clarify the change scope
- No space between type and colon, must have one space after colon
- Common types and usage scenarios:
  * feat: New feature or functionality
  * fix: Bug fix or issue resolution
  * docs: Documentation only changes (README, comments, etc.)
  * style: Code style changes that don't affect logic (whitespace, formatting, missing semicolons, etc.)
  * refactor: Code refactoring that neither fixes bugs nor adds features
  * perf: Performance improvements
  * test: Adding or modifying test code
  * build: Changes affecting build system or external dependencies (webpack, npm, gulp, etc.)
  * ci: CI configuration files and scripts changes (Travis, Circle, GitHub Actions, etc.)
  * chore: Other changes that don't modify src or test files (update dependencies, config files, etc.)
  * revert: Revert a previous commit
- Example: feat(auth): add user login functionality`;
    }
  }

  /**
   * 获取简单提交格式说明
   * @param language 语言
   * @returns 格式说明
   */
  private getSimpleCommitInstructions(language: string): string {
    if (language === 'zh-CN') {
      return `- 使用简单清晰的描述
- 以动词开头，说明做了什么
- 保持简洁明了`;
    } else {
      return `- Use simple and clear descriptions
- Start with a verb, explain what was done
- Keep it concise and clear`;
    }
  }

  /**
   * 构建用户提示词
   * @param changes Git变更列表
   * @returns 用户提示词
   */
  private buildUserPrompt(changes: GitChange[]): string {
    const changesText = this.formatChanges(changes);

    return `请为以下代码变更生成提交信息：

${changesText}

请直接返回提交信息，不需要额外解释。`;
  }

  /**
   * 格式化变更信息
   * @param changes Git变更列表
   * @returns 格式化后的变更文本
   */
  private formatChanges(changes: GitChange[]): string {
    let totalLength = 0;
    const formattedChanges: string[] = [];

    for (const change of changes) {
      if (totalLength >= GIT_CONSTANTS.MAX_DIFF_LENGTH) {
        formattedChanges.push('\n... (更多变更已省略)');
        break;
      }

      let diff = change.diff;

      // 限制单个文件的diff长度
      if (diff.length > GIT_CONSTANTS.MAX_FILE_DIFF_LINES) {
        diff = diff.substring(0, GIT_CONSTANTS.MAX_FILE_DIFF_LINES) + '\n... (diff已截断)';
      }

      const statusText = this.getStatusText(change.status);
      const changeInfo = `
文件: ${change.path}
状态: ${statusText}
变更: +${change.additions} -${change.deletions}

${diff}
---`;

      formattedChanges.push(changeInfo);
      totalLength += changeInfo.length;
    }

    return formattedChanges.join('\n');
  }

  /**
   * 获取状态文本
   * @param status 变更状态
   * @returns 状态文本
   */
  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      A: '新增',
      M: '修改',
      D: '删除',
      R: '重命名',
      C: '复制',
    };
    return statusMap[status] || status;
  }

  /**
   * 调用OpenAI兼容API
   * @param messages 消息数组
   * @param config 插件配置
   * @returns API响应的提交信息
   */
  private async callAPI(messages: Message[], config: ExtensionConfig): Promise<string> {
    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt < API_CONSTANTS.MAX_RETRIES; attempt++) {
      try {
        // 如果不是第一次尝试，等待一段时间（指数退避）
        if (attempt > 0) {
          const delay = API_CONSTANTS.INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          await sleep(delay);
          retryCount++;
        }

        const response = await this.makeAPIRequest(messages, config);

        return response;
      } catch (error) {
        lastError = isError(error) ? error : new Error(String(error));

        // 判断是否应该重试
        if (!this.shouldRetry(error, attempt)) {
          throw this.handleAPIError(error, config, retryCount);
        }
      }
    }

    // 所有重试都失败
    throw this.handleAPIError(lastError, config, retryCount);
  }

  /**
   * 执行API请求
   * @param messages 消息数组
   * @param config 插件配置
   * @returns API响应的提交信息
   */
  private async makeAPIRequest(messages: Message[], config: ExtensionConfig): Promise<string> {
    // 检测是否为Gemini提供商
    if (this.isGeminiProvider(config)) {
      return await this.makeGeminiRequest(messages, config);
    }

    return await this.makeOpenAIRequest(messages, config);
  }

  /**
   * 执行OpenAI兼容API请求
   * @param messages 消息数组
   * @param config 插件配置
   * @returns API响应的提交信息
   */
  private async makeOpenAIRequest(messages: Message[], config: ExtensionConfig): Promise<string> {
    const requestBody: LLMRequest = {
      model: config.modelName,
      messages: messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: false,
    };

    const endpoint = config.apiEndpoint.endsWith('/chat/completions')
      ? config.apiEndpoint
      : `${config.apiEndpoint.replace(/\/$/, '')}/chat/completions`;

    try {
      const response = await axios.post<LLMResponse>(endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        timeout: API_CONSTANTS.REQUEST_TIMEOUT,
      });

      return this.parseOpenAIResponse(response.data, response.status);
    } catch (error) {
      return this.handleRequestError(error, config);
    }
  }

  /**
   * 执行Gemini API请求
   * @param messages 消息数组
   * @param config 插件配置
   * @returns API响应的提交信息
   */
  private async makeGeminiRequest(messages: Message[], config: ExtensionConfig): Promise<string> {
    const requestBody = this.buildGeminiRequest(messages, config);
    const endpoint = this.buildGeminiEndpoint(config);

    try {
      const response = await axios.post<GeminiResponse>(endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: API_CONSTANTS.REQUEST_TIMEOUT,
      });

      return this.parseGeminiResponse(response.data);
    } catch (error) {
      return this.handleRequestError(error, config);
    }
  }

  /**
   * 解析OpenAI响应
   * @param data 响应数据
   * @param status HTTP状态码
   * @returns 生成的文本内容
   */
  private parseOpenAIResponse(data: LLMResponse, status: number): string {
    if (!data || !data.choices || data.choices.length === 0) {
      throw new APIError('API返回了无效的响应格式：缺少choices数组', status, data);
    }

    const firstChoice = data.choices[0];
    if (!firstChoice) {
      throw new APIError('API响应中没有选项：choices数组为空', status, data);
    }

    const message = firstChoice.message;
    if (!message || !message.content) {
      throw new APIError('API响应中没有生成的内容：message.content为空', status, data);
    }

    return message.content;
  }

  /**
   * 处理请求错误
   * @param error 错误对象
   * @param config 插件配置
   * @returns 永远不返回，总是抛出错误
   */
  private handleRequestError(error: unknown, config: ExtensionConfig): never {
    // 如果已经是我们的自定义错误，直接抛出
    if (error instanceof APIError || error instanceof NetworkError) {
      throw error;
    }

    // 否则，包装为适当的错误类型
    if (axios.isAxiosError(error)) {
      throw this.wrapAxiosError(error, config);
    }

    // 其他未知错误
    throw new APIError(
      `API请求失败: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      error
    );
  }

  /**
   * 从响应数据中提取Record类型
   * @param data 响应数据
   * @returns Record对象或undefined
   */
  private extractResponseData(data: unknown): Record<string, unknown> | undefined {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    return undefined;
  }

  /**
   * 从响应数据中提取错误消息
   * @param responseData 响应数据
   * @returns 错误消息字符串
   */
  private extractErrorMessage(responseData: Record<string, unknown> | undefined): string {
    if (!responseData || typeof responseData !== 'object') {
      return '';
    }

    if ('error' in responseData) {
      const errorObj = responseData['error'];
      if (errorObj && typeof errorObj === 'object' && 'message' in errorObj) {
        const message = (errorObj as Record<string, unknown>)['message'];
        if (typeof message === 'string') {
          return message;
        }
      }
    }

    return '';
  }

  // 可重试的HTTP状态码
  private readonly retryableStatusCodes = new Set([429, 500, 502, 503, 504]);

  // 可重试的错误码
  private readonly retryableErrorCodes = new Set([
    'ECONNABORTED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
  ]);

  /**
   * 判断是否应该重试
   * @param error 错误对象
   * @param attempt 当前尝试次数
   * @returns 是否应该重试
   */
  private shouldRetry(error: unknown, attempt: number): boolean {
    // 已达到最大重试次数
    if (attempt >= API_CONSTANTS.MAX_RETRIES - 1) {
      return false;
    }

    // 检查自定义错误类型
    if (isAPIError(error) || isNetworkError(error)) {
      return error.recoverable;
    }

    // 检查axios错误
    if (axios.isAxiosError(error)) {
      return this.isRetryableAxiosError(error as AxiosError);
    }

    // 其他类型的错误，默认不重试
    return false;
  }

  /**
   * 检查是否为可重试的Axios错误
   * @param error Axios错误对象
   * @returns 是否可重试
   */
  private isRetryableAxiosError(error: AxiosError): boolean {
    const status = error.response?.status;
    if (status && this.retryableStatusCodes.has(status)) {
      return true;
    }

    const errorCode = error.code;
    if (errorCode && this.retryableErrorCodes.has(errorCode)) {
      return true;
    }

    return false;
  }

  /**
   * 包装Axios错误为自定义错误类型
   * @param error Axios错误对象
   * @param config 插件配置（用于提供上下文）
   * @returns 自定义错误对象
   */
  private wrapAxiosError(error: AxiosError, config: ExtensionConfig): APIError | NetworkError {
    if (!error.response) {
      return this.createNetworkError(error, config);
    }

    const status = error.response.status;
    const responseData = this.extractResponseData(error.response.data);
    const apiErrorMessage = this.extractErrorMessage(responseData);

    return this.createAPIError(status, apiErrorMessage, responseData, config);
  }

  /**
   * 创建网络错误
   * @param error Axios错误对象
   * @param config 插件配置
   * @returns NetworkError对象
   */
  private createNetworkError(error: AxiosError, config: ExtensionConfig): NetworkError {
    const errorCode = error.code;

    const networkErrorMap: Record<string, string> = {
      ECONNABORTED: `请求超时（${API_CONSTANTS.REQUEST_TIMEOUT}ms）：请检查网络连接或稍后再试`,
      ETIMEDOUT: `请求超时（${API_CONSTANTS.REQUEST_TIMEOUT}ms）：请检查网络连接或稍后再试`,
      ENOTFOUND: `无法连接到API服务器：请检查API端点配置 (${config.apiEndpoint})`,
      ECONNREFUSED: `连接被拒绝：请检查API端点是否正确 (${config.apiEndpoint})`,
    };

    const message =
      networkErrorMap[errorCode || ''] || `网络错误 (${errorCode || 'UNKNOWN'}): ${error.message}`;

    return new NetworkError(message, error);
  }

  // API错误消息模板
  private readonly apiErrorTemplates: Record<number, string> = {
    401: 'API认证失败：请检查API密钥是否正确',
    403: 'API访问被拒绝：请检查API密钥权限',
    404: '模型不存在：请检查模型名称是否正确',
    429: 'API请求频率超限：请稍后再试',
    500: 'API服务器内部错误：请稍后再试',
    502: 'API服务暂时不可用：请稍后再试',
    503: 'API服务暂时不可用：请稍后再试',
    504: 'API服务暂时不可用：请稍后再试',
  };

  /**
   * 创建API错误
   * @param status HTTP状态码
   * @param apiErrorMessage API返回的错误消息
   * @param responseData 响应数据
   * @param config 插件配置
   * @returns APIError对象
   */
  private createAPIError(
    status: number,
    apiErrorMessage: string,
    responseData: Record<string, unknown> | undefined,
    config: ExtensionConfig
  ): APIError {
    const message = this.formatAPIErrorMessage(status, apiErrorMessage, config);
    return new APIError(message, status, responseData);
  }

  /**
   * 格式化API错误消息
   * @param status HTTP状态码
   * @param apiErrorMessage API返回的错误消息
   * @param config 插件配置
   * @returns 格式化的错误消息
   */
  private formatAPIErrorMessage(
    status: number,
    apiErrorMessage: string,
    config: ExtensionConfig
  ): string {
    const template = this.apiErrorTemplates[status];

    if (!template) {
      return apiErrorMessage || `API请求失败 (状态码: ${status})`;
    }

    // 为404错误添加模型名称
    let message = template;
    if (status === 404) {
      message += ` (${config.modelName})`;
    }

    // 添加API返回的错误消息
    if (apiErrorMessage) {
      message += status === 404 ? ` - ${apiErrorMessage}` : ` (${apiErrorMessage})`;
    }

    return message;
  }

  /**
   * 处理API错误，添加重试上下文信息
   * @param error 错误对象
   * @param config 插件配置
   * @param retryCount 已重试次数
   * @returns 格式化的错误对象
   */
  private handleAPIError(
    error: unknown,
    config: ExtensionConfig,
    retryCount: number
  ): APIError | NetworkError {
    // 如果已经是自定义错误，添加重试信息
    if (isAPIError(error) || isNetworkError(error)) {
      const retryInfo = retryCount > 0 ? ` (已重试 ${retryCount} 次)` : '';
      const enhancedMessage = `${error.message}${retryInfo}`;

      if (isAPIError(error)) {
        return new APIError(enhancedMessage, error.statusCode, error.response);
      } else {
        return new NetworkError(enhancedMessage, error.cause);
      }
    }

    // 如果是Axios错误，包装它
    if (axios.isAxiosError(error)) {
      const wrappedError = this.wrapAxiosError(error, config);
      const retryInfo = retryCount > 0 ? ` (已重试 ${retryCount} 次)` : '';
      const enhancedMessage = `${wrappedError.message}${retryInfo}`;

      if (wrappedError instanceof APIError) {
        return new APIError(enhancedMessage, wrappedError.statusCode, wrappedError.response);
      } else {
        return new NetworkError(enhancedMessage, wrappedError.cause);
      }
    }

    // 其他未知错误，包装为APIError
    const errorMessage = error instanceof Error ? error.message : String(error);
    const retryInfo = retryCount > 0 ? ` (已重试 ${retryCount} 次)` : '';
    return new APIError(`未知错误: ${errorMessage}${retryInfo}`, undefined, error);
  }

  /**
   * 移除think标签及其内容
   * @param text 原始文本
   * @returns 移除think标签后的文本
   */
  private removeThinkTags(text: string): string {
    // 快速检测：如果不包含think标签，直接返回
    if (!text.includes('<think>') && !text.includes('<THINK>')) {
      return text;
    }

    // 使用正则表达式移除所有<think>...</think>块（支持多行和不区分大小写）
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // 移除可能残留的单独think标签
    cleaned = cleaned.replace(/<\/?think>/gi, '');

    // 清理移除后产生的多余空白行（连续的空行合并为一个）
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

    // 去除首尾空白
    return cleaned.trim();
  }

  /**
   * 解析提交信息
   * 清理和验证生成的提交信息
   * @param message 原始提交信息
   * @returns 清理后的提交信息
   */
  private parseCommitMessage(message: string): string {
    // 1. 首先移除think标签
    let cleaned = this.removeThinkTags(message);

    // 2. 验证内容不为空（在移除think标签后）
    if (!cleaned || cleaned.trim().length === 0) {
      throw new Error('移除think标签后提交信息为空，请重新生成');
    }

    // 3. 继续现有的清理逻辑
    // 移除可能的引号包裹
    cleaned = cleaned.trim();
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    // 移除markdown代码块标记
    cleaned = cleaned.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');

    // 再次验证（在所有清理后）
    if (!cleaned) {
      throw new Error('生成的提交信息为空');
    }

    // 4. 验证和优化提交信息
    cleaned = this.validateAndOptimizeCommitMessage(cleaned);

    return cleaned;
  }

  /**
   * 验证和优化提交信息
   * @param message 提交信息
   * @returns 优化后的提交信息
   */
  private validateAndOptimizeCommitMessage(message: string): string {
    const lines = message.split('\n');
    const firstLine = lines[0];
    if (!firstLine) {
      return message;
    }
    const title = firstLine.trim();

    // 验证标题长度
    if (title.length > 72) {
      // 如果标题过长，尝试截断到72字符
      const truncated = title.substring(0, 72);
      lines[0] = truncated;

      // 如果有详细描述，保留；否则添加截断提示
      if (lines.length === 1) {
        lines.push('');
        lines.push('(标题已自动截断)');
      }
    }

    // 确保标题和描述之间有空行
    if (lines.length > 1 && lines[1] !== '') {
      lines.splice(1, 0, '');
    }

    // 验证约定式提交格式（如果使用）
    const conventionalPattern =
      /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+?\))?:\s*.+/;
    if (conventionalPattern.test(title)) {
      // 确保type后面有冒号和空格
      const fixedTitle = title.replace(
        /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+?\))?:(\S)/,
        '$1$2: $3'
      );
      lines[0] = fixedTitle;
    }

    return lines.join('\n').trim();
  }
}
