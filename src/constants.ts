/**
 * 命令标识符常量
 * 定义了扩展注册的所有VSCode命令ID
 * 使用常量而不是字符串字面量可以避免拼写错误并提供类型安全
 */
export const COMMANDS = {
  /** 生成AI提交信息命令 - 主要功能命令，分析暂存区变更并生成提交信息 */
  GENERATE_MESSAGE: 'aigitcommit.generateMessage',

  /** 配置AI Git Commit命令 - 打开配置面板，允许用户配置API设置 */
  CONFIGURE_SETTINGS: 'aigitcommit.configureSettings',

  /** 测试API连接命令 - 测试当前配置的API连接是否正常 */
  TEST_CONNECTION: 'aigitcommit.testConnection',
} as const;

/**
 * 命令标识符类型
 * 从COMMANDS对象提取的类型，确保类型安全
 */
export type CommandId = (typeof COMMANDS)[keyof typeof COMMANDS];

/**
 * API相关常量
 * 定义了与LLM API交互相关的配置参数
 * 这些值经过测试和调优，在性能和可靠性之间取得平衡
 */
export const API_CONSTANTS = {
  /**
   * API请求超时时间（毫秒）
   * 设置为30秒以适应大多数LLM API的响应时间
   * 对于复杂的提交信息生成，可能需要较长时间
   */
  REQUEST_TIMEOUT: 30000,

  /**
   * 最大重试次数
   * 设置为3次以处理临时性网络问题和API限流
   * 使用指数退避策略避免过度重试
   */
  MAX_RETRIES: 3,

  /**
   * 初始重试延迟（毫秒）
   * 第一次重试前等待1秒，后续重试使用指数退避
   * 这有助于避免在API限流时立即重试
   */
  INITIAL_RETRY_DELAY: 1000,

  /**
   * 默认最大token数
   * 500 tokens足以生成详细的提交信息
   * 同时控制API成本和响应时间
   */
  MAX_TOKENS_DEFAULT: 500,

  /**
   * 默认温度参数
   * 0.7提供了创造性和一致性的良好平衡
   * 较低的值会产生更确定性的输出
   */
  TEMPERATURE_DEFAULT: 0.7,
} as const;

/**
 * Git相关常量
 * 定义了处理Git变更时的限制参数
 * 这些限制确保扩展能够处理大型变更集而不会导致性能问题或API限制
 */
export const GIT_CONSTANTS = {
  /**
   * 最大diff长度（字符数）
   * 限制为20000字符以避免超出LLM的上下文窗口
   * 超出此限制的diff会被截断，但仍保留足够信息用于生成提交信息
   */
  MAX_DIFF_LENGTH: 20000,

  /**
   * 单个文件最大diff行数
   * 限制为5000行以处理大型文件变更
   * 对于自动生成的文件（如lock文件），会进一步简化处理
   */
  MAX_FILE_DIFF_LINES: 5000,

  /**
   * 最大文件大小（字节）
   * 限制为100KB以避免处理过大的文件
   * 超过此大小的文件会被标记为"文件过大"而不读取其内容
   */
  MAX_FILE_SIZE: 100 * 1024,
} as const;

/**
 * 配置相关常量
 * 定义了配置管理相关的键名和参数
 */
export const CONFIG_CONSTANTS = {
  /**
   * 配置节名称
   * VSCode settings.json中的配置节前缀
   * 所有扩展配置都在此节下（如：aigitcommit.apiEndpoint）
   */
  SECTION: 'aigitcommit',

  /**
   * API密钥的密钥存储键
   * 用于VSCode SecretStorage的键名
   * API密钥存储在SecretStorage中而不是settings.json中以提高安全性
   */
  SECRET_KEY_API_KEY: 'aigitcommit.apiKey',

  /**
   * 配置缓存TTL（毫秒）
   * 配置摘要缓存5秒以减少频繁读取配置的开销
   * 这是一个性能优化措施，在配置变更和性能之间取得平衡
   */
  CACHE_TTL: 5000,
} as const;

/**
 * LLM提供商枚举
 * 定义了支持的LLM服务提供商
 * 扩展支持任何OpenAI兼容的API
 *
 * @enum {string}
 */
export enum Provider {
  /** OpenAI官方API服务 - 使用OpenAI的GPT模型 */
  OpenAI = 'openai',

  /** Qwen通义千问服务 - 阿里云通义千问API */
  Qwen = 'qwen',

  /** Ollama本地服务 - 在本地运行的开源LLM */
  Ollama = 'ollama',

  /** vLLM本地服务 - 高性能LLM推理引擎 */
  VLLM = 'vllm',

  /** OpenAI Compatible 提供商 - 任何其他OpenAI兼容的API服务 */
  OpenAICompatible = 'openai-compatible',
}

/**
 * 语言枚举
 * 定义了生成提交信息支持的语言
 * 影响系统提示词和生成的提交信息语言
 *
 * @enum {string}
 */
export enum Language {
  /** 中文（简体） - 使用中文生成提交信息 */
  Chinese = 'zh-CN',

  /** 英文（美国） - 使用英文生成提交信息 */
  English = 'en-US',
}

/**
 * 提交信息格式枚举
 * 定义了提交信息的格式规范
 *
 * @enum {string}
 */
export enum CommitFormat {
  /**
   * 约定式提交格式（Conventional Commits）
   * 格式：<type>(<scope>): <subject>
   * 例如：feat(auth): add user login functionality
   */
  Conventional = 'conventional',

  /**
   * 简单格式
   * 使用简单清晰的描述，不强制特定格式
   * 适合不需要严格规范的项目
   */
  Simple = 'simple',
}

/**
 * 大型 Diff 处理相关常量
 * 定义了处理超出 LLM 上下文窗口限制的大型提交时使用的配置参数
 */
export const LARGE_DIFF_CONSTANTS = {
  /**
   * 默认安全边界百分比
   * 使用模型上下文窗口的 85% 作为有效限制
   * 预留 15% 空间给系统提示词和响应
   */
  DEFAULT_SAFETY_MARGIN_PERCENT: 85,

  /**
   * 默认最大并发 API 请求数
   * 限制为 5 个并发请求以避免 API 限流
   */
  DEFAULT_MAX_CONCURRENT_REQUESTS: 5,

  /**
   * 未知模型的默认 Token 限制
   * 使用保守的 4096 tokens 作为默认值
   */
  DEFAULT_TOKEN_LIMIT: 4096,

  /**
   * 最大重试次数
   * 单个 chunk 处理失败时最多重试 3 次
   */
  MAX_CHUNK_RETRIES: 3,

  /**
   * 初始重试延迟（毫秒）
   * 第一次重试前等待 1 秒，后续使用指数退避
   */
  INITIAL_CHUNK_RETRY_DELAY: 1000,

  /**
   * Token 估算系数
   * 基于字符的 token 估算：平均每 4 个字符约等于 1 个 token
   * 这是一个保守估计，适用于大多数英文和代码内容
   */
  CHARS_PER_TOKEN: 4,

  /**
   * 中文字符 Token 估算系数
   * 中文字符通常每个字符约等于 1-2 个 token
   */
  CHINESE_CHARS_PER_TOKEN: 1.5,
} as const;

/**
 * 模型 Token 限制预设表
 * 定义了常见 LLM 模型的上下文窗口大小
 * 用于自动检测模型限制，避免用户手动配置
 */
export const MODEL_TOKEN_LIMITS: Record<string, number> = {
  // OpenAI 模型
  'gpt-3.5-turbo': 4096,
  'gpt-3.5-turbo-16k': 16385,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-turbo': 128000,
  'gpt-4-turbo-preview': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4.1': 1000000,
  'gpt-4.1-mini': 1000000,
  'gpt-4.1-nano': 1000000,

  // Anthropic Claude 模型
  'claude-3-opus': 200000,
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku': 200000,
  'claude-3-haiku-20240307': 200000,
  'claude-3.5-sonnet': 200000,
  'claude-3.5-sonnet-20240620': 200000,
  'claude-3.5-haiku': 200000,

  // Google Gemini 模型
  'gemini-pro': 32000,
  'gemini-1.0-pro': 32000,
  'gemini-1.5-pro': 1000000,
  'gemini-1.5-flash': 1000000,
  'gemini-2.0-flash': 1000000,

  // 阿里云通义千问模型
  'qwen-turbo': 8000,
  'qwen-plus': 32000,
  'qwen-max': 32000,
  'qwen-max-longcontext': 30000,
  'qwen2-72b-instruct': 32000,
  'qwen2.5-72b-instruct': 32000,

  // DeepSeek 模型
  'deepseek-chat': 64000,
  'deepseek-coder': 64000,

  // 其他常见模型
  'llama-3-70b': 8192,
  'llama-3.1-70b': 128000,
  'llama-3.1-405b': 128000,
  'mistral-large': 32000,
  'mixtral-8x7b': 32000,
} as const;

/**
 * Diff 拆分级别枚举
 * 定义了 diff 内容的拆分粒度
 *
 * @enum {string}
 */
export enum DiffSplitLevel {
  /** 文件级拆分 - 按文件边界拆分 */
  File = 'file',

  /** Hunk 级拆分 - 按代码块边界拆分 */
  Hunk = 'hunk',

  /** 行级拆分 - 按行组拆分（最细粒度） */
  Line = 'line',
}
