import { ProviderManager } from '../ProviderManager';

describe('ProviderManager', () => {
  let providerManager: ProviderManager;

  beforeEach(() => {
    providerManager = new ProviderManager();
  });

  describe('getProviders', () => {
    it('should return all predefined providers', () => {
      const providers = providerManager.getProviders();

      expect(providers).toHaveLength(4);
      expect(providers.map((p) => p.id)).toEqual(['openai', 'azure-openai', 'ollama', 'custom']);
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

    it('should return Azure OpenAI provider', () => {
      const provider = providerManager.getProviderById('azure-openai');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('azure-openai');
      expect(provider?.name).toBe('Azure OpenAI');
      expect(provider?.defaultBaseUrl).toContain('azure');
      expect(provider?.defaultModel).toBe('gpt-35-turbo');
      expect(provider?.description).toBe('Microsoft Azure OpenAI服务');
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

    it('should return custom provider', () => {
      const provider = providerManager.getProviderById('custom');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('custom');
      expect(provider?.name).toBe('其他');
      expect(provider?.defaultBaseUrl).toBe('');
      expect(provider?.defaultModel).toBe('');
      expect(provider?.description).toBe('自定义OpenAI兼容服务');
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

    it('should return default config for Azure OpenAI', () => {
      const config = providerManager.getDefaultConfig('azure-openai');

      expect(config.baseUrl).toContain('azure');
      expect(config.modelName).toBe('gpt-35-turbo');
    });

    it('should return default config for Ollama', () => {
      const config = providerManager.getDefaultConfig('ollama');

      expect(config).toEqual({
        baseUrl: 'http://localhost:11434/v1',
        modelName: 'llama2',
      });
    });

    it('should return empty config for custom provider', () => {
      const config = providerManager.getDefaultConfig('custom');

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
      const nonCustomProviders = providers.filter((p) => p.id !== 'custom');

      nonCustomProviders.forEach((provider) => {
        expect(provider.defaultBaseUrl).toBeTruthy();
        expect(provider.defaultBaseUrl.length).toBeGreaterThan(0);
      });
    });

    it('should have valid model names for non-custom providers', () => {
      const providers = providerManager.getProviders();
      const nonCustomProviders = providers.filter((p) => p.id !== 'custom');

      nonCustomProviders.forEach((provider) => {
        expect(provider.defaultModel).toBeTruthy();
        expect(provider.defaultModel.length).toBeGreaterThan(0);
      });
    });
  });
});
