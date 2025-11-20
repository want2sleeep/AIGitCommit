/**
 * API提供商配置接口
 * 定义了每个LLM服务提供商的基本配置信息
 *
 * @property id - 提供商的唯一标识符
 * @property defaultBaseUrl - 提供商的默认API端点URL
 * @property defaultModel - 提供商的默认模型名称
 * @property description - 提供商的描述信息
 */
export interface ProviderConfig {
  id: string;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  description: string;
}

/**
 * 预定义的API提供商配置
 */
const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-3.5-turbo',
    description: 'OpenAI官方API服务',
  },
  {
    id: 'qwen',
    name: 'Qwen',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo',
    description: '阿里云通义千问API服务',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama2',
    description: '本地Ollama服务',
  },
  {
    id: 'vllm',
    name: 'vLLM',
    defaultBaseUrl: 'http://localhost:8000/v1',
    defaultModel: 'meta-llama/Llama-2-7b-chat-hf',
    description: '本地vLLM服务',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-1.5-flash',
    description: 'Google Gemini API服务',
  },
  {
    id: 'openai-compatible',
    name: 'OpenAI Compatible',
    defaultBaseUrl: '',
    defaultModel: '',
    description: 'Custom OpenAI-compatible API service',
  },
];

/**
 * API提供商管理器
 * 负责管理预定义的API提供商配置
 */
export class ProviderManager {
  /**
   * 获取所有提供商
   * @returns 所有预定义的提供商配置数组
   */
  getProviders(): ProviderConfig[] {
    return [...PROVIDERS];
  }

  /**
   * 根据ID获取提供商配置
   * @param id 提供商ID
   * @returns 提供商配置，如果未找到则返回undefined
   */
  getProviderById(id: string): ProviderConfig | undefined {
    return PROVIDERS.find((provider) => provider.id === id);
  }

  /**
   * 获取提供商的默认配置
   * @param providerId 提供商ID
   * @returns 包含默认Base URL和模型名称的配置对象
   */
  getDefaultConfig(providerId: string): { baseUrl: string; modelName: string } {
    const provider = this.getProviderById(providerId);

    if (!provider) {
      return {
        baseUrl: '',
        modelName: '',
      };
    }

    return {
      baseUrl: provider.defaultBaseUrl,
      modelName: provider.defaultModel,
    };
  }
}
