import * as vscode from 'vscode';
import { FullConfig } from '../types';
import { IConfigurationManager } from '../types/interfaces';

/**
 * 配置预设接口
 */
export interface ConfigPreset {
  id: string;
  name: string;
  description: string;
  config: FullConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 配置预设管理器接口
 */
export interface IConfigPresetManager {
  /**
   * 获取所有预设
   */
  getPresets(): ConfigPreset[];

  /**
   * 获取指定预设
   * @param id 预设 ID
   */
  getPreset(id: string): ConfigPreset | undefined;

  /**
   * 创建预设
   * @param preset 预设对象
   */
  createPreset(preset: Omit<ConfigPreset, 'id'>): Promise<ConfigPreset>;

  /**
   * 更新预设
   * @param id 预设 ID
   * @param preset 预设对象
   */
  updatePreset(id: string, preset: Partial<ConfigPreset>): Promise<void>;

  /**
   * 删除预设
   * @param id 预设 ID
   */
  deletePreset(id: string): Promise<void>;

  /**
   * 应用预设
   * @param id 预设 ID
   */
  applyPreset(id: string): Promise<void>;

  /**
   * 从当前配置创建预设
   * @param name 预设名称
   */
  createPresetFromCurrent(name: string): Promise<ConfigPreset>;
}

/**
 * 配置预设管理器服务
 * 负责管理配置预设的 CRUD 操作和应用
 */
export class ConfigPresetManager implements IConfigPresetManager {
  private static readonly STORAGE_KEY = 'aigitcommit.configPresets';
  private presets: Map<string, ConfigPreset> = new Map();

  constructor(
    private context: vscode.ExtensionContext,
    private configManager: IConfigurationManager
  ) {
    this.loadPresets();
  }

  /**
   * 从存储加载预设
   */
  private loadPresets(): void {
    const stored = this.context.globalState.get<Record<string, ConfigPreset>>(
      ConfigPresetManager.STORAGE_KEY,
      {}
    );

    this.presets.clear();
    Object.entries(stored).forEach(([id, preset]) => {
      // 转换日期字符串为 Date 对象
      this.presets.set(id, {
        ...preset,
        createdAt: new Date(preset.createdAt),
        updatedAt: new Date(preset.updatedAt),
      });
    });
  }

  /**
   * 保存预设到存储
   */
  private async savePresets(): Promise<void> {
    const toStore: Record<string, ConfigPreset> = {};
    this.presets.forEach((preset, id) => {
      toStore[id] = preset;
    });
    await this.context.globalState.update(ConfigPresetManager.STORAGE_KEY, toStore);
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取所有预设
   */
  getPresets(): ConfigPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * 获取指定预设
   * @param id 预设 ID
   */
  getPreset(id: string): ConfigPreset | undefined {
    return this.presets.get(id);
  }

  /**
   * 创建预设
   * @param preset 预设对象
   */
  async createPreset(preset: Omit<ConfigPreset, 'id'>): Promise<ConfigPreset> {
    const id = this.generateId();
    const now = new Date();

    const newPreset: ConfigPreset = {
      id,
      name: preset.name,
      description: preset.description,
      config: preset.config,
      createdAt: now,
      updatedAt: now,
    };

    this.presets.set(id, newPreset);
    await this.savePresets();

    return newPreset;
  }

  /**
   * 更新预设
   * @param id 预设 ID
   * @param preset 预设对象
   */
  async updatePreset(id: string, preset: Partial<ConfigPreset>): Promise<void> {
    const existing = this.presets.get(id);
    if (!existing) {
      throw new Error(`配置预设不存在: ${id}`);
    }

    const updated: ConfigPreset = {
      ...existing,
      ...preset,
      id, // 确保 ID 不被修改
      updatedAt: new Date(),
      createdAt: existing.createdAt, // 保持创建时间不变
    };

    this.presets.set(id, updated);
    await this.savePresets();
  }

  /**
   * 删除预设
   * @param id 预设 ID
   */
  async deletePreset(id: string): Promise<void> {
    if (!this.presets.has(id)) {
      throw new Error(`配置预设不存在: ${id}`);
    }

    this.presets.delete(id);
    await this.savePresets();
  }

  /**
   * 应用预设
   * @param id 预设 ID
   */
  async applyPreset(id: string): Promise<void> {
    const preset = this.presets.get(id);
    if (!preset) {
      throw new Error(`配置预设不存在: ${id}`);
    }

    // 应用配置
    await this.configManager.saveFullConfig(preset.config);
  }

  /**
   * 从当前配置创建预设
   * @param name 预设名称
   */
  async createPresetFromCurrent(name: string): Promise<ConfigPreset> {
    // 获取当前配置
    const currentConfig = await this.configManager.getFullConfig();

    // 创建预设
    return this.createPreset({
      name,
      description: `基于当前配置创建于 ${new Date().toLocaleString()}`,
      config: currentConfig,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
