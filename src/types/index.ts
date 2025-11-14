import * as vscode from 'vscode';

/**
 * 插件配置接口
 */
export interface ExtensionConfig {
    apiEndpoint: string;
    apiKey: string;
    modelName: string;
    language: string;
    commitFormat: string;
    maxTokens: number;
    temperature: number;
}

/**
 * 完整配置接口（包含提供商）
 */
export interface FullConfig extends ExtensionConfig {
    provider: string;
}

/**
 * 配置摘要接口（用于显示）
 */
export interface ConfigSummary {
    provider: string;
    apiKeyMasked: string;
    baseUrl: string;
    modelName: string;
    isConfigured: boolean;
}

/**
 * Git变更状态
 */
export enum ChangeStatus {
    Added = 'A',
    Modified = 'M',
    Deleted = 'D',
    Renamed = 'R',
    Copied = 'C'
}

/**
 * Git变更接口
 */
export interface GitChange {
    path: string;
    status: ChangeStatus;
    diff: string;
    additions: number;
    deletions: number;
}

/**
 * 配置验证结果
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * LLM消息接口
 */
export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * LLM API请求接口
 */
export interface LLMRequest {
    model: string;
    messages: Message[];
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
}

/**
 * LLM API响应接口
 */
export interface LLMResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Choice[];
    usage?: Usage;
}

/**
 * LLM响应选择项
 */
export interface Choice {
    index: number;
    message: Message;
    finish_reason: string;
}

/**
 * Token使用统计
 */
export interface Usage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

/**
 * 提交操作类型
 */
export interface CommitAction {
    action: 'commit' | 'regenerate' | 'cancel';
    message?: string;
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
    ConfigurationError = 'ConfigurationError',
    GitError = 'GitError',
    APIError = 'APIError',
    NetworkError = 'NetworkError',
    UnknownError = 'UnknownError'
}

/**
 * Git API types
 */
export interface GitAPI {
    repositories: GitRepository[];
    getAPI(version: number): GitAPI;
}

export interface GitRepository {
    rootUri: vscode.Uri;
    state: {
        indexChanges: GitFileChange[];
        workingTreeChanges: GitFileChange[];
    };
    diff(uri: string): Promise<string>;
    show(ref: string, path: string): Promise<string>;
    commit(message: string): Promise<void>;
}

export interface GitFileChange {
    uri: vscode.Uri;
    status: number;
    originalUri: vscode.Uri;
}

export interface GitExtension {
    getAPI(version: number): GitAPI;
}
