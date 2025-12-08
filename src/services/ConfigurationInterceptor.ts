import * as vscode from 'vscode';
import { ConfigurationStatusChecker, ConfigurationStatus } from './ConfigurationStatusChecker';
import { IConfigurationManager } from '../types/interfaces';
import { ConfigurationCheckError, WizardOpenError } from '../errors';

/**
 * 配置拦截器
 * 拦截需要配置的操作，检查配置状态并决定是执行操作还是打开配置向导
 */
export class ConfigurationInterceptor {
  private isWizardOpen: boolean = false;
  private readonly statusChecker: ConfigurationStatusChecker;

  constructor(private configManager: IConfigurationManager) {
    this.statusChecker = new ConfigurationStatusChecker(configManager);
  }

  /**
   * 拦截操作并检查配置状态
   * @param operation - 要执行的操作
   * @returns 是否允许执行操作
   */
  async interceptOperation(operation: () => Promise<void>): Promise<boolean> {
    try {
      // 检查是否启用自动重定向
      const autoRedirect = this.isAutoRedirectEnabled();

      // 检查配置状态
      const status = await this.checkConfigurationStatus();

      if (status === ConfigurationStatus.NotConfigured) {
        if (autoRedirect) {
          // 未配置且启用自动重定向，打开配置向导
          await this.openConfigurationWizard();
        } else {
          // 未配置但禁用自动重定向，显示错误消息
          void vscode.window
            .showErrorMessage('扩展未配置。请先完成配置。', '打开配置')
            .then((selection) => {
              if (selection === '打开配置') {
                void vscode.commands.executeCommand('aigitcommit.configureSettings');
              }
            });
        }
        return false; // 不执行原始操作
      }

      // 已配置，执行原始操作
      await operation();
      return true;
    } catch {
      // 错误处理：尝试打开配置向导作为回退
      try {
        const autoRedirect = this.isAutoRedirectEnabled();
        if (autoRedirect) {
          await this.openConfigurationWizard();
        } else {
          await this.showManualConfigurationOption();
        }
      } catch {
        // 向导也打不开，显示错误并提供手动选项
        await this.showManualConfigurationOption();
      }

      return false;
    }
  }

  /**
   * 检查是否启用自动重定向
   * @returns 是否启用自动重定向
   */
  private isAutoRedirectEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('aigitcommit');
    return config.get<boolean>('autoRedirectToConfiguration', true);
  }

  /**
   * 检查配置是否完整
   * @returns 配置状态
   * @throws {ConfigurationCheckError} 当配置检查失败时
   */
  async checkConfigurationStatus(): Promise<ConfigurationStatus> {
    try {
      return await this.statusChecker.getStatus();
    } catch (error) {
      throw new ConfigurationCheckError(
        `配置状态检查失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 打开配置向导（首次使用模式）
   * @throws {WizardOpenError} 当配置向导打开失败时
   */
  async openConfigurationWizard(): Promise<void> {
    // 防止重复打开向导
    if (this.isWizardOpen) {
      return;
    }

    try {
      this.isWizardOpen = true;

      // 打开配置向导
      const success = await this.configManager.showConfigurationWizard();

      if (success) {
        // 配置成功，使缓存失效
        this.statusChecker.invalidateCache();
      }
    } catch (error) {
      throw new WizardOpenError(
        `无法打开配置向导: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    } finally {
      this.isWizardOpen = false;
    }
  }

  /**
   * 显示手动配置选项
   */
  private async showManualConfigurationOption(): Promise<void> {
    const selection = await vscode.window.showErrorMessage(
      '无法自动打开配置向导。请手动运行配置命令。',
      '打开配置'
    );
    if (selection === '打开配置') {
      await vscode.commands.executeCommand('aigitcommit.configureSettings');
    }
  }

  /**
   * 使配置缓存失效
   * 在配置修改后调用
   */
  invalidateCache(): void {
    this.statusChecker.invalidateCache();
  }
}
