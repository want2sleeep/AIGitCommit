import * as vscode from 'vscode';
import { GitChange } from '../types';

/**
 * 提交信息预览管理器
 * 负责显示提交信息预览界面，支持编辑和一键复制功能
 */
export class CommitMessagePreviewManager {
  private panel: vscode.WebviewPanel | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * 显示提交信息预览面板
   * @param commitMessage 生成的提交信息
   * @param changes Git变更列表
   * @returns Promise，resolve时返回用户编辑后的提交信息，reject时表示用户取消
   */
  async showPreview(commitMessage: string, changes: GitChange[]): Promise<string> {
    return new Promise((resolve, reject) => {
      // 如果面板已存在，先关闭
      if (this.panel) {
        this.panel.dispose();
      }

      // 创建新的webview面板
      this.panel = vscode.window.createWebviewPanel(
        'commitMessagePreview',
        '提交信息预览',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      // 设置webview内容
      this.panel.webview.html = this.getWebviewContent(commitMessage, changes);

      // 处理来自webview的消息
      this.panel.webview.onDidReceiveMessage(
        (message: { command: string; text?: string }) => {
          switch (message.command) {
            case 'confirm':
              // 用户确认使用编辑后的提交信息
              if (message.text) {
                resolve(message.text);
              }
              this.panel?.dispose();
              break;
            case 'cancel':
              // 用户取消
              reject(new Error('用户取消了提交信息预览'));
              this.panel?.dispose();
              break;
            case 'copy':
              // 复制到剪贴板
              if (message.text) {
                void vscode.env.clipboard.writeText(message.text);
                void vscode.window.showInformationMessage('✅ 提交信息已复制到剪贴板');
              }
              break;
          }
        },
        undefined,
        this.context.subscriptions
      );

      // 面板关闭时拒绝Promise
      this.panel.onDidDispose(
        () => {
          this.panel = undefined;
          reject(new Error('预览面板已关闭'));
        },
        undefined,
        this.context.subscriptions
      );
    });
  }

  /**
   * 生成webview的HTML内容
   * @param commitMessage 提交信息
   * @param changes Git变更列表
   * @returns HTML字符串
   */
  private getWebviewContent(commitMessage: string, changes: GitChange[]): string {
    // 格式化变更信息
    const changesHtml = changes
      .map((change) => {
        const statusIcon = this.getStatusIcon(change.status);
        return `<div class="change-item">
          <span class="status-icon">${statusIcon}</span>
          <span class="file-path">${this.escapeHtml(change.path)}</span>
        </div>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>提交信息预览</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
      line-height: 1.6;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      color: var(--vscode-foreground);
    }

    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 10px;
      color: var(--vscode-foreground);
    }

    .changes-list {
      background-color: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 15px;
      max-height: 200px;
      overflow-y: auto;
    }

    .change-item {
      display: flex;
      align-items: center;
      padding: 5px 0;
      font-family: var(--vscode-editor-font-family);
      font-size: 13px;
    }

    .status-icon {
      margin-right: 10px;
      font-weight: bold;
      min-width: 20px;
    }

    .file-path {
      color: var(--vscode-foreground);
    }

    textarea {
      width: 100%;
      min-height: 200px;
      padding: 15px;
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      color: var(--vscode-input-foreground);
      background-color: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      resize: vertical;
      line-height: 1.5;
    }

    textarea:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .button-group {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    button {
      padding: 10px 20px;
      font-size: 14px;
      font-family: var(--vscode-font-family);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    button:hover {
      opacity: 0.8;
    }

    button:active {
      opacity: 0.6;
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

    .btn-cancel {
      background-color: transparent;
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-input-border);
    }

    .hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 10px;
    }

    .status-modified { color: #f0ad4e; }
    .status-added { color: #5cb85c; }
    .status-deleted { color: #d9534f; }
    .status-renamed { color: #5bc0de; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 提交信息预览</h1>

    <div class="section">
      <div class="section-title">变更文件 (${changes.length})</div>
      <div class="changes-list">
        ${changesHtml}
      </div>
    </div>

    <div class="section">
      <div class="section-title">提交信息</div>
      <textarea id="commitMessage" spellcheck="false">${this.escapeHtml(commitMessage)}</textarea>
      <div class="hint">💡 您可以直接编辑上方的提交信息</div>
    </div>

    <div class="button-group">
      <button class="btn-primary" id="confirmBtn">✅ 确认并填充到 Git</button>
      <button class="btn-secondary" id="copyBtn">📋 复制到剪贴板</button>
      <button class="btn-cancel" id="cancelBtn">❌ 取消</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const textarea = document.getElementById('commitMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const copyBtn = document.getElementById('copyBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // 确认按钮
    confirmBtn.addEventListener('click', () => {
      vscode.postMessage({
        command: 'confirm',
        text: textarea.value
      });
    });

    // 复制按钮
    copyBtn.addEventListener('click', () => {
      vscode.postMessage({
        command: 'copy',
        text: textarea.value
      });
    });

    // 取消按钮
    cancelBtn.addEventListener('click', () => {
      vscode.postMessage({
        command: 'cancel'
      });
    });

    // 快捷键支持
    textarea.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Enter 确认
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        confirmBtn.click();
      }
      // Escape 取消
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelBtn.click();
      }
    });

    // 自动聚焦到文本框末尾
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  </script>
</body>
</html>`;
  }

  /**
   * 获取文件状态图标
   * @param status 文件状态
   * @returns 状态图标
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'M':
        return '<span class="status-modified">M</span>';
      case 'A':
        return '<span class="status-added">A</span>';
      case 'D':
        return '<span class="status-deleted">D</span>';
      case 'R':
        return '<span class="status-renamed">R</span>';
      default:
        return `<span>${status}</span>`;
    }
  }

  /**
   * 转义HTML特殊字符
   * @param text 原始文本
   * @returns 转义后的文本
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.panel) {
      this.panel.dispose();
    }
  }
}
