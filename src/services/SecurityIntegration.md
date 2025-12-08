# 安全功能集成指南

本文档说明如何将安全服务集成到 LLMService 中。

## 集成步骤

### 1. 在 LLMService 构造函数中注入安全服务

```typescript
export class LLMService {
  constructor(
    private readonly sslValidator?: SSLValidator,
    private readonly proxyConfigManager?: ProxyConfigManager,
    private readonly sanitizer?: SensitiveDataSanitizer
  ) {}
}
```

### 2. 在 makeOpenAIRequest 中集成代理和 SSL 验证

```typescript
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

  // 验证 SSL 证书
  if (this.sslValidator && endpoint.startsWith('https://')) {
    const validation = await this.sslValidator.validateCertificate(endpoint);
    if (!validation.valid) {
      throw new NetworkError(`SSL 证书验证失败: ${validation.error}`);
    }
  }

  try {
    const axiosConfig: any = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      timeout: API_CONSTANTS.REQUEST_TIMEOUT,
    };

    // 添加代理配置
    if (this.proxyConfigManager) {
      const proxyConfig = this.proxyConfigManager.getAxiosProxyConfig();
      if (proxyConfig) {
        axiosConfig.proxy = proxyConfig;
      }

      // 添加自定义 CA
      const httpsAgent = this.proxyConfigManager.getHttpsAgent();
      if (httpsAgent) {
        axiosConfig.httpsAgent = httpsAgent;
      }
    }

    const response = await axios.post<LLMResponse>(endpoint, requestBody, axiosConfig);

    return this.parseOpenAIResponse(response.data, response.status);
  } catch (error) {
    // 脱敏错误信息
    if (this.sanitizer && error instanceof Error) {
      error.message = this.sanitizer.sanitize(error.message);
    }
    return this.handleRequestError(error, config);
  }
}
```

### 3. 在错误处理中使用脱敏器

```typescript
private handleRequestError(error: unknown, config: ExtensionConfig): never {
  // 脱敏错误信息
  if (this.sanitizer) {
    if (error instanceof Error) {
      error.message = this.sanitizer.sanitize(error.message);
    }
  }

  // 现有的错误处理逻辑...
  if (error instanceof APIError || error instanceof NetworkError) {
    throw error;
  }

  if (axios.isAxiosError(error)) {
    throw this.wrapAxiosError(error, config);
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new APIError(`未知错误: ${errorMessage}`, undefined, error);
}
```

### 4. 在日志记录中使用脱敏器

```typescript
private logError(message: string, error: unknown): void {
  let logMessage = message;
  
  if (this.sanitizer) {
    logMessage = this.sanitizer.sanitize(logMessage);
    if (error instanceof Error) {
      error.message = this.sanitizer.sanitize(error.message);
    }
  }
  
  console.error(logMessage, error);
}
```

## API 密钥存储

API 密钥已经通过 VSCode 的 SecretStorage 进行加密存储，这在 ConfigurationManager 中实现：

```typescript
// 在 ConfigurationManager 中
async saveApiKey(apiKey: string): Promise<void> {
  await this.context.secrets.store('aigitcommit.apiKey', apiKey);
}

async getApiKey(): Promise<string | undefined> {
  return await this.context.secrets.get('aigitcommit.apiKey');
}
```

这确保了 API 密钥不会以明文形式存储在配置文件中。

## 使用示例

```typescript
// 在 ServiceContainer 中注册服务
const sslValidator = new SSLValidator();
const proxyConfigManager = new ProxyConfigManager(context);
const sanitizer = new SensitiveDataSanitizer();

const llmService = new LLMService(sslValidator, proxyConfigManager, sanitizer);
```

## 注意事项

1. **向后兼容**: 所有安全服务都是可选的，不会破坏现有功能
2. **性能影响**: SSL 验证会增加少量延迟，但提高了安全性
3. **代理配置**: 代理配置存储在 globalState 中，不会暴露敏感信息
4. **日志脱敏**: 确保所有日志输出都经过脱敏处理
