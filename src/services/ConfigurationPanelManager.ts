import * as vscode from 'vscode';
import { ConfigurationManager } from './ConfigurationManager';
import { ProviderManager } from './ProviderManager';
import { CustomCandidatesManager } from './CustomCandidatesManager';

/**
 * 预设 Base URL 候选项
 * 包含主流 OpenAI Compatible 服务提供商的 API 端点
 */
const PRESET_BASE_URLS = [
  { label: 'OpenRouter', value: 'https://openrouter.ai/api/v1' },
  { label: 'Together AI', value: 'https://api.together.xyz/v1' },
  { label: 'Groq', value: 'https://api.groq.com/openai/v1' },
  { label: 'Perplexity', value: 'https://api.perplexity.ai' },
  { label: 'DeepSeek', value: 'https://api.deepseek.com/v1' },
];

/**
 * 预设模型名称候选项
 * 包含常用的 LLM 模型名称
 */
const PRESET_MODEL_NAMES = [
  'gpt-3.5-turbo',
  'gpt-4',
  'gpt-4-turbo',
  'claude-3-opus',
  'claude-3-sonnet',
  'llama-3-70b',
];

/**
 * Webview消息接口
 * 定义了Webview和Extension之间通信的消息格式
 *
 * @property command - 消息命令类型
 * @property data - 可选的消息数据，根据命令类型不同而不同
 */
interface WebviewMessage {
  command: 'load' | 'save' | 'validate' | 'providerChanged';
  data?:
    | ConfigurationData
    | { provider: string }
    | { provider: string; currentBaseUrl: string; currentModelName: string };
}

/**
 * 配置数据接口
 * 定义了配置面板中用户可编辑的配置项
 *
 * @property provider - API提供商ID
 * @property apiKey - API密钥
 * @property baseUrl - API端点URL
 * @property modelName - 模型名称
 */
interface ConfigurationData {
  provider: string;
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

/**
 * 验证结果接口
 * 定义了配置验证的结果格式
 *
 * @property valid - 配置是否有效
 * @property errors - 验证错误列表，每个错误包含字段名和错误消息
 */
interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}

/**
 * 配置面板管理器
 * 负责管理Webview配置面板的生命周期和消息通信
 */
export class ConfigurationPanelManager {
  private static instance: ConfigurationPanelManager | undefined;
  private panel: vscode.WebviewPanel | undefined;

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly configManager: ConfigurationManager,
    private readonly providerManager: ProviderManager,
    private readonly candidatesManager: CustomCandidatesManager
  ) {}

  /**
   * 获取ConfigurationPanelManager实例（单例模式）
   * 确保整个扩展生命周期中只有一个配置面板管理器实例
   *
   * @param context - VSCode扩展上下文
   * @param configManager - 配置管理器实例
   * @param providerManager - 提供商管理器实例
   * @param candidatesManager - 自定义候选项管理器实例
   * @returns ConfigurationPanelManager的单例实例
   */
  static getInstance(
    context: vscode.ExtensionContext,
    configManager: ConfigurationManager,
    providerManager: ProviderManager,
    candidatesManager: CustomCandidatesManager
  ): ConfigurationPanelManager {
    if (!ConfigurationPanelManager.instance) {
      ConfigurationPanelManager.instance = new ConfigurationPanelManager(
        context,
        configManager,
        providerManager,
        candidatesManager
      );
    }
    return ConfigurationPanelManager.instance;
  }

  /**
   * 生成 Base URL 输入控件 HTML
   * 根据提供商类型生成下拉选择框或文本输入框
   * @param provider 提供商 ID
   * @param currentValue 当前值
   * @param customCandidates 自定义候选项列表
   * @returns HTML 字符串
   */
  private generateBaseUrlInput(
    provider: string,
    currentValue: string,
    customCandidates: string[]
  ): string {
    if (provider === 'openai-compatible') {
      // 生成下拉选择框
      const presetOptions = PRESET_BASE_URLS.map(
        (preset) =>
          `<option value="${preset.value}" ${currentValue === preset.value ? 'selected' : ''}>${preset.label} (${preset.value})</option>`
      ).join('');

      const customOptions = customCandidates
        .map(
          (url) =>
            `<option value="${url}" ${currentValue === url ? 'selected' : ''}>${url}</option>`
        )
        .join('');

      const addNewOption = `<option value="__add_new__" class="add-new-option">➕ 新增</option>`;

      return `<select id="base-url" class="form-control" required>
                ${presetOptions}
                ${customOptions}
                ${addNewOption}
              </select>`;
    } else {
      // 生成文本输入框
      return `<input type="url" id="base-url" class="form-control" value="${currentValue}" required>`;
    }
  }

  /**
   * 生成模型名称输入控件 HTML
   * 根据提供商类型生成下拉选择框或文本输入框
   * @param provider 提供商 ID
   * @param currentValue 当前值
   * @param customCandidates 自定义候选项列表
   * @returns HTML 字符串
   */
  private generateModelNameInput(
    provider: string,
    currentValue: string,
    customCandidates: string[]
  ): string {
    if (provider === 'openai-compatible') {
      // 生成下拉选择框
      const presetOptions = PRESET_MODEL_NAMES.map(
        (model) =>
          `<option value="${model}" ${currentValue === model ? 'selected' : ''}>${model}</option>`
      ).join('');

      const customOptions = customCandidates
        .map(
          (model) =>
            `<option value="${model}" ${currentValue === model ? 'selected' : ''}>${model}</option>`
        )
        .join('');

      const addNewOption = `<option value="__add_new__" class="add-new-option">➕ 新增</option>`;

      return `<select id="model-name" class="form-control" required>
                ${presetOptions}
                ${customOptions}
                ${addNewOption}
              </select>`;
    } else {
      // 生成文本输入框
      return `<input type="text" id="model-name" class="form-control" value="${currentValue}" required>`;
    }
  }

  /**
   * 显示配置面板
   * 如果面板已存在则将其显示到前台，否则创建新的Webview面板
   * 面板支持用户配置API提供商、密钥、端点和模型等信息
   */
  async showPanel(): Promise<void> {
    // 如果面板已存在，则显示它
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    // 创建新的Webview面板
    this.panel = vscode.window.createWebviewPanel(
      'aigitcommitConfig',
      'AI Git Commit 配置',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      }
    );

    // 设置Webview内容（异步加载自定义候选项）
    this.panel.webview.html = await this.getWebviewContent(this.panel.webview);

    // 处理来自Webview的消息
    this.panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        await this.handleMessage(message);
      },
      undefined,
      this.context.subscriptions
    );

    // 面板关闭时清理资源
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      undefined,
      this.context.subscriptions
    );

    // 加载当前配置
    void this.loadCurrentConfig();
  }

  /**
   * 处理来自Webview的消息
   * 根据消息命令类型执行相应的操作：
   * - load: 加载当前配置到Webview
   * - save: 保存用户修改的配置
   * - validate: 验证配置的有效性
   * - providerChanged: 提供商变更时更新默认配置
   *
   * @param message - 来自Webview的消息对象
   */
  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.command) {
      case 'load': {
        await this.loadCurrentConfig();
        break;
      }

      case 'save': {
        if (message.data && 'provider' in message.data && 'apiKey' in message.data) {
          await this.saveConfig(message.data);
        }
        break;
      }

      case 'validate': {
        if (message.data && 'provider' in message.data && 'apiKey' in message.data) {
          const validationResult = this.validateConfig(message.data);
          void this.panel?.webview.postMessage({
            command: 'validationResult',
            data: validationResult,
          });
        }
        break;
      }

      case 'providerChanged': {
        if (message.data && 'provider' in message.data) {
          const providerId = (message.data as { provider: string }).provider;
          const defaultConfig = this.providerManager.getDefaultConfig(providerId);

          // 如果切换到 openai-compatible，需要生成新的输入控件 HTML
          if (providerId === 'openai-compatible') {
            const customBaseUrls = this.configManager.getCustomBaseUrls();
            const customModelNames = this.configManager.getCustomModelNames();

            // 获取当前值（如果有的话）
            const currentData = message.data as {
              provider: string;
              currentBaseUrl?: string;
              currentModelName?: string;
            };
            const currentBaseUrl = currentData.currentBaseUrl || defaultConfig.baseUrl || '';
            const currentModelName = currentData.currentModelName || defaultConfig.modelName || '';

            // 生成新的输入控件 HTML
            const baseUrlInput = this.generateBaseUrlInput(
              providerId,
              currentBaseUrl,
              customBaseUrls
            );
            const modelNameInput = this.generateModelNameInput(
              providerId,
              currentModelName,
              customModelNames
            );

            void this.panel?.webview.postMessage({
              command: 'updateInputControls',
              data: {
                baseUrlHtml: baseUrlInput,
                modelNameHtml: modelNameInput,
                baseUrl: currentBaseUrl,
                modelName: currentModelName,
              },
            });
          } else {
            // 切换到其他提供商，使用默认配置
            void this.panel?.webview.postMessage({
              command: 'updateDefaults',
              data: defaultConfig,
            });
          }
        }
        break;
      }
    }
  }

  /**
   * 加载当前配置到Webview
   * 从ConfigurationManager读取完整配置并发送到Webview进行显示
   * 如果加载失败，会向用户显示错误消息
   */
  private async loadCurrentConfig(): Promise<void> {
    try {
      const fullConfig = await this.configManager.getFullConfig();

      const configData: ConfigurationData = {
        provider: fullConfig.provider,
        apiKey: fullConfig.apiKey,
        baseUrl: fullConfig.apiEndpoint,
        modelName: fullConfig.modelName,
      };

      void this.panel?.webview.postMessage({
        command: 'loadConfig',
        data: configData,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`加载配置失败: ${errorMessage}`);
    }
  }

  /**
   * 保存配置
   * 验证配置有效性后，将配置保存到VSCode设置和SecretStorage
   * 如果是 openai-compatible 提供商，还会保存自定义候选项
   * 保存结果会通过消息发送回Webview，并显示相应的成功或错误提示
   *
   * @param config - 要保存的配置数据
   */
  private async saveConfig(config: ConfigurationData): Promise<void> {
    try {
      // 验证配置
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        void this.panel?.webview.postMessage({
          command: 'saveResult',
          data: {
            success: false,
            errors: validation.errors,
          },
        });
        return;
      }

      // 获取当前完整配置
      const currentConfig = await this.configManager.getFullConfig();

      // 更新配置
      await this.configManager.saveFullConfig({
        ...currentConfig,
        provider: config.provider,
        apiKey: config.apiKey,
        apiEndpoint: config.baseUrl,
        modelName: config.modelName,
      });

      // 如果是 openai-compatible 提供商，保存自定义候选项
      if (config.provider === 'openai-compatible') {
        // 检查 Base URL 是否为新的自定义值
        const customBaseUrls = this.configManager.getCustomBaseUrls();
        const isPresetBaseUrl = PRESET_BASE_URLS.some((preset) => preset.value === config.baseUrl);
        const isExistingCustomBaseUrl = customBaseUrls.includes(config.baseUrl);

        if (!isPresetBaseUrl && !isExistingCustomBaseUrl && config.baseUrl.trim() !== '') {
          const baseUrlResult = await this.candidatesManager.saveCustomBaseUrl(config.baseUrl);
          if (!baseUrlResult.success && baseUrlResult.error) {
            void vscode.window.showWarningMessage(
              `配置已保存，但自定义 Base URL 保存失败: ${baseUrlResult.error}`
            );
          }
        }

        // 检查模型名称是否为新的自定义值
        const customModelNames = this.configManager.getCustomModelNames();
        const isPresetModelName = PRESET_MODEL_NAMES.includes(config.modelName);
        const isExistingCustomModelName = customModelNames.includes(config.modelName);

        if (!isPresetModelName && !isExistingCustomModelName && config.modelName.trim() !== '') {
          const modelNameResult = await this.candidatesManager.saveCustomModelName(
            config.modelName
          );
          if (!modelNameResult.success && modelNameResult.error) {
            void vscode.window.showWarningMessage(
              `配置已保存，但自定义模型名称保存失败: ${modelNameResult.error}`
            );
          }
        }
      }

      // 发送成功消息
      void this.panel?.webview.postMessage({
        command: 'saveResult',
        data: {
          success: true,
          message: '配置已成功保存',
        },
      });

      void vscode.window.showInformationMessage('配置已成功保存');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorMessage = `保存配置失败: ${errorMsg}`;
      void this.panel?.webview.postMessage({
        command: 'saveResult',
        data: {
          success: false,
          errors: [{ field: 'general', message: errorMessage }],
        },
      });
      void vscode.window.showErrorMessage(errorMessage);
    }
  }

  /**
   * 验证配置
   * 检查配置的各个字段是否符合要求：
   * - API密钥不能为空
   * - Base URL不能为空且必须是有效的HTTP/HTTPS URL
   * - 模型名称不能为空
   *
   * @param config - 要验证的配置数据
   * @returns 验证结果，包含是否有效和错误列表
   */
  private validateConfig(config: ConfigurationData): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    // 验证API密钥
    if (!config.apiKey || config.apiKey.trim() === '') {
      errors.push({
        field: 'apiKey',
        message: 'API密钥不能为空',
      });
    }

    // 验证Base URL
    if (!config.baseUrl || config.baseUrl.trim() === '') {
      errors.push({
        field: 'baseUrl',
        message: 'Base URL不能为空',
      });
    } else if (!this.isValidUrl(config.baseUrl)) {
      errors.push({
        field: 'baseUrl',
        message: 'Base URL格式无效，必须是有效的URL',
      });
    }

    // 验证模型名称
    if (!config.modelName || config.modelName.trim() === '') {
      errors.push({
        field: 'modelName',
        message: '模型名称不能为空',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证URL格式
   * 检查字符串是否为有效的HTTP或HTTPS URL
   *
   * @param url - 要验证的URL字符串
   * @returns 如果是有效的HTTP/HTTPS URL返回true，否则返回false
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 获取Webview HTML内容
   * 生成配置面板的完整HTML，包括：
   * - 提供商选择器
   * - API密钥输入框（密码类型）
   * - Base URL输入框（根据提供商类型动态生成）
   * - 模型名称输入框（根据提供商类型动态生成）
   * - 保存和取消按钮
   * - 表单验证和错误显示逻辑
   *
   * @param webview - VSCode Webview实例
   * @returns 完整的HTML字符串
   */
  private async getWebviewContent(webview: vscode.Webview): Promise<string> {
    const nonce = this.getNonce();
    const providers = this.providerManager.getProviders();

    // 获取当前配置和自定义候选项
    const fullConfig = await this.configManager.getFullConfig();
    const customBaseUrls = this.configManager.getCustomBaseUrls();
    const customModelNames = this.configManager.getCustomModelNames();

    // 生成输入控件 HTML
    const baseUrlInput = this.generateBaseUrlInput(
      fullConfig.provider,
      fullConfig.apiEndpoint,
      customBaseUrls
    );
    const modelNameInput = this.generateModelNameInput(
      fullConfig.provider,
      fullConfig.modelName,
      customModelNames
    );

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>AI Git Commit 配置</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
        }

        h1 {
            color: var(--vscode-foreground);
            font-size: 24px;
            margin-bottom: 24px;
            font-weight: 600;
        }

        .form-group {
            margin-bottom: 20px;
            display: block;
        }

        label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }

        .required::after {
            content: " *";
            color: var(--vscode-errorForeground);
        }

        input, select {
            width: 100%;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            box-sizing: border-box;
            display: block !important;
        }

        input:focus, select:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }

        /* 确保password类型输入框始终可见 */
        input[type="password"] {
            display: block !important;
            visibility: visible !important;
        }

        .form-text {
            display: block;
            margin-top: 4px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .form-actions {
            display: flex;
            gap: 10px;
            margin-top: 24px;
        }

        button {
            padding: 8px 16px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: 500;
        }

        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .message {
            margin-top: 16px;
            padding: 12px;
            border-radius: 2px;
            display: none;
        }

        .message.error {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
            display: block;
        }

        .message.success {
            background-color: var(--vscode-inputValidation-infoBackground);
            border: 1px solid var(--vscode-inputValidation-infoBorder);
            color: var(--vscode-foreground);
            display: block;
        }

        .error-text {
            color: var(--vscode-errorForeground);
            font-size: 12px;
            margin-top: 4px;
            display: none;
        }

        .error-text.show {
            display: block;
        }

        .input-error {
            border-color: var(--vscode-inputValidation-errorBorder) !important;
        }

        /* 下拉选择框样式 */
        select {
            max-height: 300px;
            overflow-y: auto;
        }

        /* "新增"选项特殊样式 */
        .add-new-option {
            border-top: 1px solid var(--vscode-input-border);
            margin-top: 4px;
            padding-top: 4px;
            font-weight: 500;
            color: var(--vscode-textLink-foreground);
        }

        /* 输入控件容器样式 */
        #base-url-container,
        #model-name-container {
            position: relative;
        }

        /* 确保下拉选择框在对话框内正确显示 */
        select option {
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
        }

        /* 键盘导航支持 */
        select:focus option:checked,
        select:focus option:hover {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>AI Git Commit 配置</h1>
        
        <form id="config-form">
            <div class="form-group">
                <label for="provider-selector" class="required">API提供商</label>
                <select id="provider-selector" class="form-control" required>
                    ${providers.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
                <small class="form-text">选择您的LLM服务提供商</small>
                <span class="error-text" id="provider-error"></span>
            </div>
            
            <div class="form-group">
                <label for="api-key" class="required">API密钥</label>
                <input type="password" id="api-key" class="form-control" required>
                <small class="form-text">您的API密钥将安全存储</small>
                <span class="error-text" id="apiKey-error"></span>
            </div>
            
            <div class="form-group">
                <label for="base-url" class="required">Base URL</label>
                <div id="base-url-container">
                    ${baseUrlInput}
                </div>
                <small class="form-text">API端点地址</small>
                <span class="error-text" id="baseUrl-error"></span>
            </div>
            
            <div class="form-group">
                <label for="model-name" class="required">模型名称</label>
                <div id="model-name-container">
                    ${modelNameInput}
                </div>
                <small class="form-text">使用的模型名称</small>
                <span class="error-text" id="modelName-error"></span>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-primary">保存</button>
                <button type="button" class="btn-secondary" id="cancel-btn">取消</button>
            </div>
            
            <div id="validation-message" class="message"></div>
        </form>
    </div>
    
    <script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();
            
            const form = document.getElementById('config-form');
            const providerSelector = document.getElementById('provider-selector');
            const apiKeyInput = document.getElementById('api-key');
            const baseUrlContainer = document.getElementById('base-url-container');
            const modelNameContainer = document.getElementById('model-name-container');
            const cancelBtn = document.getElementById('cancel-btn');
            const messageDiv = document.getElementById('validation-message');

            // 获取当前输入元素的辅助函数
            function getBaseUrlInput() {
                return document.getElementById('base-url');
            }

            function getModelNameInput() {
                return document.getElementById('model-name');
            }

            // 处理"新增"选项的函数
            function handleAddNew(selectElement, container, inputType) {
                if (selectElement.value === '__add_new__') {
                    // 创建新的文本输入框
                    const input = document.createElement('input');
                    input.type = inputType;
                    input.id = selectElement.id;
                    input.className = 'form-control';
                    input.value = '';
                    input.required = true;

                    // 替换下拉选择框为文本输入框
                    container.innerHTML = '';
                    container.appendChild(input);
                    
                    // 自动获得焦点
                    input.focus();
                } else {
                    // 选择了预设或自定义候选项，值已自动更新
                    // 不需要额外处理，select 元素的 value 已经是选中的值
                }
            }

            // 为 Base URL 下拉选择框添加事件监听器
            function attachBaseUrlListener() {
                const baseUrlInput = getBaseUrlInput();
                if (baseUrlInput && baseUrlInput.tagName === 'SELECT') {
                    baseUrlInput.addEventListener('change', (e) => {
                        handleAddNew(e.target, baseUrlContainer, 'url');
                    });
                }
            }

            // 为模型名称下拉选择框添加事件监听器
            function attachModelNameListener() {
                const modelNameInput = getModelNameInput();
                if (modelNameInput && modelNameInput.tagName === 'SELECT') {
                    modelNameInput.addEventListener('change', (e) => {
                        handleAddNew(e.target, modelNameContainer, 'text');
                    });
                }
            }

            // 初始化事件监听器
            attachBaseUrlListener();
            attachModelNameListener();

            // 清除错误提示
            function clearErrors() {
                document.querySelectorAll('.error-text').forEach(el => {
                    el.classList.remove('show');
                    el.textContent = '';
                });
                document.querySelectorAll('.input-error').forEach(el => {
                    el.classList.remove('input-error');
                });
                messageDiv.className = 'message';
                messageDiv.textContent = '';
            }

            // 显示错误
            function showErrors(errors) {
                clearErrors();
                errors.forEach(error => {
                    const errorEl = document.getElementById(error.field + '-error');
                    const inputEl = document.getElementById(error.field === 'baseUrl' ? 'base-url' : 
                                                           error.field === 'apiKey' ? 'api-key' :
                                                           error.field === 'modelName' ? 'model-name' : 
                                                           error.field);
                    if (errorEl) {
                        errorEl.textContent = error.message;
                        errorEl.classList.add('show');
                    }
                    if (inputEl) {
                        inputEl.classList.add('input-error');
                    }
                });
            }

            // 监听来自Extension的消息
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.command) {
                    case 'loadConfig':
                        providerSelector.value = message.data.provider || 'openai';
                        apiKeyInput.value = message.data.apiKey || '';
                        // 显式设置API密钥输入框可见和可编辑
                        apiKeyInput.style.display = 'block';
                        apiKeyInput.disabled = false;
                        
                        // 更新 Base URL 和模型名称的值
                        const baseUrlInput = getBaseUrlInput();
                        const modelNameInput = getModelNameInput();
                        if (baseUrlInput) {
                            baseUrlInput.value = message.data.baseUrl || '';
                        }
                        if (modelNameInput) {
                            modelNameInput.value = message.data.modelName || '';
                        }
                        
                        // 重新附加事件监听器
                        attachBaseUrlListener();
                        attachModelNameListener();
                        break;
                    
                    case 'updateDefaults':
                        // 提供商变更时，只更新Base URL和模型名称
                        // 不清空或隐藏API密钥输入框
                        const baseUrlInputUpdate = getBaseUrlInput();
                        const modelNameInputUpdate = getModelNameInput();
                        
                        if (message.data.baseUrl && baseUrlInputUpdate) {
                            baseUrlInputUpdate.value = message.data.baseUrl;
                        }
                        if (message.data.modelName && modelNameInputUpdate) {
                            modelNameInputUpdate.value = message.data.modelName;
                        }
                        // 确保API密钥输入框保持可见
                        apiKeyInput.style.display = 'block';
                        apiKeyInput.disabled = false;
                        
                        // 重新附加事件监听器
                        attachBaseUrlListener();
                        attachModelNameListener();
                        break;
                    
                    case 'updateInputControls':
                        // 切换到 openai-compatible 时，更新输入控件为下拉选择框
                        if (message.data.baseUrlHtml) {
                            baseUrlContainer.innerHTML = message.data.baseUrlHtml;
                        }
                        if (message.data.modelNameHtml) {
                            modelNameContainer.innerHTML = message.data.modelNameHtml;
                        }
                        
                        // 确保API密钥输入框保持可见
                        apiKeyInput.style.display = 'block';
                        apiKeyInput.disabled = false;
                        
                        // 重新附加事件监听器
                        attachBaseUrlListener();
                        attachModelNameListener();
                        break;
                    
                    case 'saveResult':
                        if (message.data.success) {
                            messageDiv.className = 'message success';
                            messageDiv.textContent = message.data.message || '配置已成功保存';
                            clearErrors();
                        } else {
                            messageDiv.className = 'message error';
                            messageDiv.textContent = '保存失败，请检查以下错误：';
                            if (message.data.errors) {
                                showErrors(message.data.errors);
                            }
                        }
                        break;
                    
                    case 'validationResult':
                        if (!message.data.valid) {
                            showErrors(message.data.errors);
                        } else {
                            clearErrors();
                        }
                        break;
                }
            });

            // 提供商变更处理
            providerSelector.addEventListener('change', (e) => {
                // 获取当前值以便在切换时保留
                const baseUrlInput = getBaseUrlInput();
                const modelNameInput = getModelNameInput();
                
                vscode.postMessage({
                    command: 'providerChanged',
                    data: { 
                        provider: e.target.value,
                        currentBaseUrl: baseUrlInput ? baseUrlInput.value : '',
                        currentModelName: modelNameInput ? modelNameInput.value : ''
                    }
                });
                // 确保API密钥输入框在提供商变更时保持可见
                apiKeyInput.style.display = 'block';
                apiKeyInput.disabled = false;
            });

            // 表单提交
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                clearErrors();
                
                const baseUrlInput = getBaseUrlInput();
                const modelNameInput = getModelNameInput();
                
                const config = {
                    provider: providerSelector.value,
                    apiKey: apiKeyInput.value,
                    baseUrl: baseUrlInput ? baseUrlInput.value : '',
                    modelName: modelNameInput ? modelNameInput.value : ''
                };
                
                vscode.postMessage({ 
                    command: 'save', 
                    data: config 
                });
            });

            // 取消按钮
            cancelBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'cancel' });
            });

            // 请求加载配置
            vscode.postMessage({ command: 'load' });
        })();
    </script>
</body>
</html>`;
  }

  /**
   * 生成随机nonce用于CSP（Content Security Policy）
   * 用于Webview的内容安全策略，允许内联脚本执行
   *
   * @returns 32位随机字符串
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 释放资源
   * 关闭并清理Webview面板，释放相关资源
   * 应在扩展停用时调用
   */
  dispose(): void {
    this.panel?.dispose();
    this.panel = undefined;
  }
}
