import * as vscode from 'vscode';

/**
 * 历史记录条目接口
 */
export interface HistoryEntry {
  id: string;
  commitMessage: string;
  changes: string;
  provider: string;
  model: string;
  timestamp: Date;
  success: boolean;
}

/**
 * 历史记录过滤条件接口
 */
export interface HistoryFilter {
  provider?: string;
  model?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
}

/**
 * 历史记录统计信息接口
 */
export interface HistoryStatistics {
  totalEntries: number;
  successfulEntries: number;
  failedEntries: number;
  mostUsedProvider: string;
  mostUsedModel: string;
  averageMessageLength: number;
}

/**
 * 历史记录管理器接口
 */
export interface IHistoryManager {
  /**
   * 添加历史记录
   * @param entry 历史记录项
   */
  addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void>;

  /**
   * 获取历史记录
   * @param filter 过滤条件
   * @param limit 限制数量
   */
  getHistory(filter?: HistoryFilter, limit?: number): HistoryEntry[];

  /**
   * 删除历史记录
   * @param id 记录 ID
   */
  deleteEntry(id: string): Promise<void>;

  /**
   * 清空历史记录
   */
  clearHistory(): Promise<void>;

  /**
   * 获取统计信息
   */
  getStatistics(): HistoryStatistics;

  /**
   * 导出历史记录
   */
  exportHistory(): string;
}

/**
 * 历史记录管理器服务
 * 负责管理提交信息生成的历史记录
 */
export class HistoryManager implements IHistoryManager {
  private static readonly STORAGE_KEY = 'aigitcommit.history';
  private static readonly MAX_ENTRIES = 1000; // 最大保存条目数
  private entries: HistoryEntry[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.loadHistory();
  }

  /**
   * 从存储加载历史记录
   */
  private loadHistory(): void {
    const stored = this.context.globalState.get<HistoryEntry[]>(HistoryManager.STORAGE_KEY, []);

    // 转换日期字符串为 Date 对象
    this.entries = stored.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    }));
  }

  /**
   * 保存历史记录到存储
   */
  private async saveHistory(): Promise<void> {
    // 限制历史记录数量
    if (this.entries.length > HistoryManager.MAX_ENTRIES) {
      this.entries = this.entries.slice(-HistoryManager.MAX_ENTRIES);
    }

    await this.context.globalState.update(HistoryManager.STORAGE_KEY, this.entries);
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `history_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 添加历史记录
   * @param entry 历史记录项
   */
  async addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void> {
    const newEntry: HistoryEntry = {
      id: this.generateId(),
      ...entry,
      timestamp: new Date(),
    };

    this.entries.push(newEntry);
    await this.saveHistory();
  }

  /**
   * 获取历史记录
   * @param filter 过滤条件
   * @param limit 限制数量
   */
  getHistory(filter?: HistoryFilter, limit?: number): HistoryEntry[] {
    let filtered = [...this.entries];

    // 应用过滤条件
    if (filter) {
      if (filter.provider) {
        filtered = filtered.filter((entry) => entry.provider === filter.provider);
      }

      if (filter.model) {
        filtered = filtered.filter((entry) => entry.model === filter.model);
      }

      if (filter.startDate) {
        filtered = filtered.filter((entry) => entry.timestamp >= filter.startDate!);
      }

      if (filter.endDate) {
        filtered = filtered.filter((entry) => entry.timestamp <= filter.endDate!);
      }

      if (filter.success !== undefined) {
        filtered = filtered.filter((entry) => entry.success === filter.success);
      }
    }

    // 按时间倒序排列（最新的在前）
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 应用数量限制
    if (limit !== undefined && limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  /**
   * 删除历史记录
   * @param id 记录 ID
   */
  async deleteEntry(id: string): Promise<void> {
    const index = this.entries.findIndex((entry) => entry.id === id);
    if (index === -1) {
      throw new Error(`历史记录不存在: ${id}`);
    }

    this.entries.splice(index, 1);
    await this.saveHistory();
  }

  /**
   * 清空历史记录
   */
  async clearHistory(): Promise<void> {
    this.entries = [];
    await this.saveHistory();
  }

  /**
   * 获取统计信息
   */
  getStatistics(): HistoryStatistics {
    if (this.entries.length === 0) {
      return {
        totalEntries: 0,
        successfulEntries: 0,
        failedEntries: 0,
        mostUsedProvider: '',
        mostUsedModel: '',
        averageMessageLength: 0,
      };
    }

    const successfulEntries = this.entries.filter((entry) => entry.success).length;
    const failedEntries = this.entries.length - successfulEntries;

    // 统计提供商使用频率
    const providerCounts = new Map<string, number>();
    this.entries.forEach((entry) => {
      const count = providerCounts.get(entry.provider) || 0;
      providerCounts.set(entry.provider, count + 1);
    });

    const mostUsedProvider =
      Array.from(providerCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    // 统计模型使用频率
    const modelCounts = new Map<string, number>();
    this.entries.forEach((entry) => {
      const count = modelCounts.get(entry.model) || 0;
      modelCounts.set(entry.model, count + 1);
    });

    const mostUsedModel =
      Array.from(modelCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    // 计算平均提交信息长度
    const totalLength = this.entries.reduce((sum, entry) => sum + entry.commitMessage.length, 0);
    const averageMessageLength = Math.round(totalLength / this.entries.length);

    return {
      totalEntries: this.entries.length,
      successfulEntries,
      failedEntries,
      mostUsedProvider,
      mostUsedModel,
      averageMessageLength,
    };
  }

  /**
   * 导出历史记录
   */
  exportHistory(): string {
    return JSON.stringify(this.entries, null, 2);
  }
}
