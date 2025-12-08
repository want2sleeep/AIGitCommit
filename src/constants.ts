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
