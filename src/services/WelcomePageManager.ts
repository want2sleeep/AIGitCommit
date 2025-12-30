import * as vscode from 'vscode';
import type { ServiceContainer } from './ServiceContainer';
import { ServiceKeys } from './ServiceContainer';

/**
 * 欢迎页面管理器
 * 负责显示首次用户欢迎页面
 */
export class WelcomePageManager {
  private panel: vscode.WebviewPanel | undefined;
  private readonly WELCOME_SHOWN_KEY = 'aigitcommit.welcomeShown';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly serviceContainer: ServiceContainer
  ) {}

  /**
   * 检查是否应该显示欢迎页面
   */
  shouldShowWelcome(): boolean {
    return !this.context.globalState.get<boolean>(this.WELCOME_SHOWN_KEY, false);
  }

  /**
   * 显示欢迎页面
   */
  showWelcome(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'aigitcommitWelcome',
      'Welcome to AI Git Commit',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.webview.html = this.getWelcomeContent();

    this.panel.webview.onDidReceiveMessage(
      async (message: { type: string }) => {
        switch (message.type) {
          case 'startConfiguration':
            await this.startConfiguration();
            break;
          case 'closeWelcome':
            await this.markWelcomeShown();
            this.panel?.dispose();
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );

    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * 标记欢迎页面已显示
   */
  async markWelcomeShown(): Promise<void> {
    await this.context.globalState.update(this.WELCOME_SHOWN_KEY, true);
  }

  /**
   * 开始配置向导
   */
  private async startConfiguration(): Promise<void> {
    await this.markWelcomeShown();
    this.panel?.dispose();

    const configPanelManager = this.serviceContainer.resolve<{
      showPanel: () => Promise<void>;
    }>(ServiceKeys.ConfigurationPanelManager);
    await configPanelManager.showPanel();
  }

  /**
   * 获取欢迎页面内容
   */
  private getWelcomeContent(): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to AI Git Commit</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 40px;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            font-size: 2.5em;
            margin-bottom: 20px;
        }
        h2 {
            color: var(--vscode-textLink-foreground);
            font-size: 1.8em;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        p {
            margin-bottom: 15px;
        }
        .feature-list {
            list-style: none;
            padding: 0;
        }
        .feature-list li {
            padding: 10px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .feature-list li:before {
            content: "✓ ";
            color: var(--vscode-terminal-ansiGreen);
            font-weight: bold;
            margin-right: 10px;
        }
        .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1.1em;
            margin-right: 10px;
            margin-top: 20px;
        }
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .highlight {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textLink-foreground);
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 欢迎使用 AI Git Commit</h1>
        
        <p>感谢您安装 AI Git Commit！这是一个强大的 VSCode 扩展，使用 AI 技术帮助您生成高质量的 Git 提交信息。</p>
        
        <h2>✨ 主要特性</h2>
        <ul class="feature-list">
            <li>智能分析代码变更，自动生成提交信息</li>
            <li>支持多种 LLM 提供商（OpenAI、Azure OpenAI、Ollama、自定义 API）</li>
            <li>支持 Conventional Commits 格式</li>
            <li>多语言支持（中文和英文）</li>
            <li>安全的 API 密钥存储</li>
            <li>模板管理和历史记录</li>
        </ul>
        
        <div class="highlight">
            <strong>💡 提示：</strong> 在开始使用之前，您需要配置 API 提供商和密钥。点击下方按钮开始配置。
        </div>
        
        <h2>🚀 快速开始</h2>
        <p>1. 点击"开始配置"按钮设置您的 API 提供商</p>
        <p>2. 在 Git 仓库中进行代码修改</p>
        <p>3. 使用快捷键 <code>Ctrl+Shift+G C</code> 或命令面板生成提交信息</p>
        
        <button class="button" onclick="startConfiguration()">开始配置</button>
        <button class="button secondary" onclick="closeWelcome()">稍后配置</button>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function startConfiguration() {
            vscode.postMessage({ type: 'startConfiguration' });
        }
        
        function closeWelcome() {
            vscode.postMessage({ type: 'closeWelcome' });
        }
    </script>
</body>
</html>
    `;
  }
}
