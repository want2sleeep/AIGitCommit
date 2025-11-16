import { ProviderManager } from '../ProviderManager';

describe('ProviderManager', () => {
  let providerManager: ProviderManager;

  beforeEach(() => {
    providerManager = new ProviderManager();
  });

  describe('getProviders', () => {
    it('should return all predefined providers', () => {
      const providers = providerManager.getProviders();

      expect(providers).toHaveLength(6);
      expect(providers.map((p) => p.id)).toEqual([
        'openai',
        'qwen',
        'ollama',
        'vllm',
        'gemini',
        'openai-compatible',
      ]);
    });

    it('should return a copy of providers array', () => {
      const providers1 = providerManager.getProviders();
      const providers2 = providerManager.getProviders();

      expect(providers1).not.toBe(providers2);
      expect(providers1).toEqual(providers2);
    });

    it('should return providers with all required fields', () => {
      const providers = providerManager.getProviders();

      providers.forEach((provider) => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('defaultBaseUrl');
        expect(provider).toHaveProperty('defaultModel');
        expect(provider).toHaveProperty('description');
      });
    });
  });

  describe('getProviderById', () => {
    it('should return OpenAI provider', () => {
      const provider = providerManager.getProviderById('openai');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('openai');
      expect(provider?.name).toBe('OpenAI');
      expect(provider?.defaultBaseUrl).toBe('https://api.openai.com/v1');
      expect(provider?.defaultModel).toBe('gpt-3.5-turbo');
      expect(provider?.description).toBe('OpenAI官方API服务');
    });

    it('should return Qwen provider', () => {
      const provider = providerManager.getProviderById('qwen');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('qwen');
      expect(provider?.name).toBe('Qwen');
      expect(provider?.defaultBaseUrl).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');
      expect(provider?.defaultModel).toBe('qwen-turbo');
      expect(provider?.description).toBe('阿里云通义千问API服务');
    });

    it('should return Ollama provider', () => {
      const provider = providerManager.getProviderById('ollama');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('ollama');
      expect(provider?.name).toBe('Ollama');
      expect(provider?.defaultBaseUrl).toBe('http://localhost:11434/v1');
      expect(provider?.defaultModel).toBe('llama2');
      expect(provider?.description).toBe('本地Ollama服务');
    });

    it('should return vLLM provider', () => {
      const provider = providerManager.getProviderById('vllm');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('vllm');
      expect(provider?.name).toBe('vLLM');
      expect(provider?.defaultBaseUrl).toBe('http://localhost:8000/v1');
      expect(provider?.defaultModel).toBe('meta-llama/Llama-2-7b-chat-hf');
      expect(provider?.description).toBe('本地vLLM服务');
    });

    it('should return Gemini provider', () => {
      const provider = providerManager.getProviderById('gemini');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('gemini');
      expect(provider?.name).toBe('Google Gemini');
      expect(provider?.defaultBaseUrl).toBe('https://generativelanguage.googleapis.com/v1beta');
      expect(provider?.defaultModel).toBe('gemini-1.5-flash');
      expect(provider?.description).toBe('Google Gemini API服务');
    });

    it('should return openai-compatible provider', () => {
      const provider = providerManager.getProviderById('openai-compatible');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('openai-compatible');
      expect(provider?.name).toBe('OpenAI Compatible');
      expect(provider?.defaultBaseUrl).toBe('');
      expect(provider?.defaultModel).toBe('');
      expect(provider?.description).toBe('Custom OpenAI-compatible API service');
    });

    it('should return undefined for non-existent provider', () => {
      const provider = providerManager.getProviderById('non-existent');

      expect(provider).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const provider = providerManager.getProviderById('');

      expect(provider).toBeUndefined();
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default config for OpenAI', () => {
      const config = providerManager.getDefaultConfig('openai');

      expect(config).toEqual({
        baseUrl: 'https://api.openai.com/v1',
        modelName: 'gpt-3.5-turbo',
      });
    });

    it('should return default config for Qwen', () => {
      const config = providerManager.getDefaultConfig('qwen');

      expect(config).toEqual({
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        modelName: 'qwen-turbo',
      });
    });

    it('should return default config for Ollama', () => {
      const config = providerManager.getDefaultConfig('ollama');

      expect(config).toEqual({
        baseUrl: 'http://localhost:11434/v1',
        modelName: 'llama2',
      });
    });

    it('should return default config for vLLM', () => {
      const config = providerManager.getDefaultConfig('vllm');

      expect(config).toEqual({
        baseUrl: 'http://localhost:8000/v1',
        modelName: 'meta-llama/Llama-2-7b-chat-hf',
      });
    });

    it('should return default config for Gemini', () => {
      const config = providerManager.getDefaultConfig('gemini');

      expect(config).toEqual({
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        modelName: 'gemini-1.5-flash',
      });
    });

    it('should return empty config for openai-compatible provider', () => {
      const config = providerManager.getDefaultConfig('openai-compatible');

      expect(config).toEqual({
        baseUrl: '',
        modelName: '',
      });
    });

    it('should return empty config for non-existent provider', () => {
      const config = providerManager.getDefaultConfig('non-existent');

      expect(config).toEqual({
        baseUrl: '',
        modelName: '',
      });
    });

    it('should return empty config for empty string', () => {
      const config = providerManager.getDefaultConfig('');

      expect(config).toEqual({
        baseUrl: '',
        modelName: '',
      });
    });
  });

  describe('Provider data integrity', () => {
    it('should have unique provider IDs', () => {
      const providers = providerManager.getProviders();
      const ids = providers.map((p) => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have non-empty names for all providers', () => {
      const providers = providerManager.getProviders();

      providers.forEach((provider) => {
        expect(provider.name).toBeTruthy();
        expect(provider.name.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty descriptions for all providers', () => {
      const providers = providerManager.getProviders();

      providers.forEach((provider) => {
        expect(provider.description).toBeTruthy();
        expect(provider.description.length).toBeGreaterThan(0);
      });
    });

    it('should have valid URLs for non-custom providers', () => {
      const providers = providerManager.getProviders();
      const nonCustomProviders = providers.filter((p) => p.id !== 'openai-compatible');

      nonCustomProviders.forEach((provider) => {
        expect(provider.defaultBaseUrl).toBeTruthy();
        expect(provider.defaultBaseUrl.length).toBeGreaterThan(0);
      });
    });

    it('should have valid model names for non-custom providers', () => {
      const providers = providerManager.getProviders();
      const nonCustomProviders = providers.filter((p) => p.id !== 'openai-compatible');

      nonCustomProviders.forEach((provider) => {
        expect(provider.defaultModel).toBeTruthy();
        expect(provider.defaultModel.length).toBeGreaterThan(0);
      });
    });
  });
});
