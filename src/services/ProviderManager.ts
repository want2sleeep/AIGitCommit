/**
 * API提供商配置接口
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
    id: 'azure-openai',
    name: 'Azure OpenAI',
    defaultBaseUrl: 'https://<your-resource>.openai.azure.com/openai/deployments/<your-deployment>',
    defaultModel: 'gpt-35-turbo',
    description: 'Microsoft Azure OpenAI服务',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama2',
    description: '本地Ollama服务',
  },
  {
    id: 'custom',
    name: '其他',
    defaultBaseUrl: '',
    defaultModel: '',
    description: '自定义OpenAI兼容服务',
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
