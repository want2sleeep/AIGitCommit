import * as vscode from 'vscode';

/**
 * 模板接口
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 模板管理器接口
 */
export interface ITemplateManager {
  /**
   * 获取所有模板
   */
  getTemplates(): Template[];

  /**
   * 获取指定模板
   * @param id 模板 ID
   */
  getTemplate(id: string): Template | undefined;

  /**
   * 创建模板
   * @param template 模板对象
   */
  createTemplate(template: Omit<Template, 'id'>): Promise<Template>;

  /**
   * 更新模板
   * @param id 模板 ID
   * @param template 模板对象
   */
  updateTemplate(id: string, template: Partial<Template>): Promise<void>;

  /**
   * 删除模板
   * @param id 模板 ID
   */
  deleteTemplate(id: string): Promise<void>;

  /**
   * 应用模板
   * @param id 模板 ID
   * @param variables 变量对象
   */
  applyTemplate(id: string, variables: Record<string, string>): string;
}

/**
 * 模板管理器服务
 * 负责管理提交信息模板的 CRUD 操作和变量替换
 */
export class TemplateManager implements ITemplateManager {
  private static readonly STORAGE_KEY = 'aigitcommit.templates';
  private templates: Map<string, Template> = new Map();

  constructor(private context: vscode.ExtensionContext) {
    this.loadTemplates();
  }

  /**
   * 从存储加载模板
   */
  private loadTemplates(): void {
    const stored = this.context.globalState.get<Record<string, Template>>(
      TemplateManager.STORAGE_KEY,
      {}
    );

    this.templates.clear();
    Object.entries(stored).forEach(([id, template]) => {
      // 转换日期字符串为 Date 对象
      this.templates.set(id, {
        ...template,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt),
      });
    });
  }

  /**
   * 保存模板到存储
   */
  private async saveTemplates(): Promise<void> {
    const toStore: Record<string, Template> = {};
    this.templates.forEach((template, id) => {
      toStore[id] = template;
    });
    await this.context.globalState.update(TemplateManager.STORAGE_KEY, toStore);
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 提取模板中的变量
   * 变量格式: {{variableName}}
   */
  private extractVariables(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        variables.add(match[1]);
      }
    }

    return Array.from(variables);
  }

  /**
   * 获取所有模板
   */
  getTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * 获取指定模板
   * @param id 模板 ID
   */
  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  /**
   * 创建模板
   * @param template 模板对象
   */
  async createTemplate(template: Omit<Template, 'id'>): Promise<Template> {
    const id = this.generateId();
    const now = new Date();

    // 自动提取变量
    const variables = this.extractVariables(template.content);

    const newTemplate: Template = {
      id,
      name: template.name,
      description: template.description,
      content: template.content,
      variables,
      createdAt: now,
      updatedAt: now,
    };

    this.templates.set(id, newTemplate);
    await this.saveTemplates();

    return newTemplate;
  }

  /**
   * 更新模板
   * @param id 模板 ID
   * @param template 模板对象
   */
  async updateTemplate(id: string, template: Partial<Template>): Promise<void> {
    const existing = this.templates.get(id);
    if (!existing) {
      throw new Error(`模板不存在: ${id}`);
    }

    const updatedContent = template.content ?? existing.content;
    const variables = this.extractVariables(updatedContent);

    const updated: Template = {
      ...existing,
      ...template,
      id, // 确保 ID 不被修改
      content: updatedContent,
      variables,
      updatedAt: new Date(),
      createdAt: existing.createdAt, // 保持创建时间不变
    };

    this.templates.set(id, updated);
    await this.saveTemplates();
  }

  /**
   * 删除模板
   * @param id 模板 ID
   */
  async deleteTemplate(id: string): Promise<void> {
    if (!this.templates.has(id)) {
      throw new Error(`模板不存在: ${id}`);
    }

    this.templates.delete(id);
    await this.saveTemplates();
  }

  /**
   * 应用模板
   * @param id 模板 ID
   * @param variables 变量对象
   */
  applyTemplate(id: string, variables: Record<string, string>): string {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`模板不存在: ${id}`);
    }

    let result = template.content;

    // 替换所有变量
    template.variables.forEach((variable) => {
      const value = variables[variable] || '';
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      // 使用函数形式的 replace 来避免特殊字符问题
      result = result.replace(regex, () => value);
    });

    return result;
  }
}
