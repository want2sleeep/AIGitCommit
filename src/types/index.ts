import * as vscode from 'vscode';

/**
 * 插件配置接口
 * 定义了AI Git Commit扩展的核心配置项
 *
 * @property apiEndpoint - LLM API的端点URL（如：https://api.openai.com/v1）
 * @property apiKey - API访问密钥，存储在VSCode SecretStorage中
 * @property modelName - 使用的LLM模型名称（如：gpt-3.5-turbo）
 * @property language - 生成提交信息的语言（zh-CN或en-US）
 * @property commitFormat - 提交信息格式（conventional或simple）
 * @property maxTokens - API请求的最大token数
 * @property temperature - LLM生成的温度参数（0-2之间）
 * @property chunkModel - 可选，用于Map阶段的专用轻量级模型
 */
export interface ExtensionConfig {
  apiEndpoint: string;
  apiKey: string;
  modelName: string;
  language: string;
  commitFormat: string;
  maxTokens: number;
  temperature: number;
  chunkModel?: string;
}

/**
 * 完整配置接口（包含提供商）
 * 扩展了ExtensionConfig，添加了提供商信息
 *
 * @property provider - API提供商ID（openai, azure-openai, ollama, custom）
 */
export interface FullConfig extends ExtensionConfig {
  provider: string;
}

/**
 * 配置摘要接口（用于显示）
 * 用于在状态栏tooltip中显示配置信息的简化版本
 *
 * @property provider - API提供商ID
 * @property apiKeyMasked - 脱敏后的API密钥（仅显示首尾几位）
 * @property baseUrl - API端点URL
 * @property modelName - 模型名称
 * @property isConfigured - 配置是否完整有效
 */
export interface ConfigSummary {
  provider: string;
  apiKeyMasked: string;
  baseUrl: string;
  modelName: string;
  isConfigured: boolean;
}

/**
 * Git变更状态枚举
 * 表示文件在Git中的变更类型
 *
 * @enum {string}
 */
export enum ChangeStatus {
  /** 新增文件 */
  Added = 'A',
  /** 修改文件 */
  Modified = 'M',
  /** 删除文件 */
  Deleted = 'D',
  /** 重命名文件 */
  Renamed = 'R',
  /** 复制文件 */
  Copied = 'C',
}

/**
 * Git变更接口
 * 表示单个文件的Git变更信息
 *
 * @property path - 文件路径
 * @property status - 变更状态（新增、修改、删除等）
 * @property diff - 文件的diff内容
 * @property additions - 新增的行数
 * @property deletions - 删除的行数
 */
export interface GitChange {
  path: string;
  status: ChangeStatus;
  diff: string;
  additions: number;
  deletions: number;
}

/**
 * 配置验证结果接口
 * 表示配置验证的结果
 *
 * @property valid - 配置是否有效
 * @property errors - 验证错误消息列表
 * @property confirmations - 验证通过时的确认信息列表（可选）
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  confirmations?: string[];
}

/**
 * LLM消息接口
 * 表示与LLM交互的单条消息
 *
 * @property role - 消息角色（system: 系统提示, user: 用户输入, assistant: AI回复）
 * @property content - 消息内容
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM API请求接口
 * 符合OpenAI Chat Completions API格式
 *
 * @property model - 使用的模型名称
 * @property messages - 对话消息数组
 * @property max_tokens - 可选，生成的最大token数
 * @property temperature - 可选，生成的随机性（0-2）
 * @property stream - 可选，是否使用流式响应
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
 * 符合OpenAI Chat Completions API响应格式
 *
 * @property id - 响应的唯一标识符
 * @property object - 对象类型（通常为'chat.completion'）
 * @property created - 创建时间戳
 * @property model - 使用的模型名称
 * @property choices - 生成的选择项数组
 * @property usage - 可选，token使用统计
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
 * LLM响应选择项接口
 * 表示API返回的单个生成结果
 *
 * @property index - 选择项索引
 * @property message - 生成的消息
 * @property finish_reason - 完成原因（stop, length, content_filter等）
 */
export interface Choice {
  index: number;
  message: Message;
  finish_reason: string;
}

/**
 * Token使用统计接口
 * 记录API调用的token消耗情况
 *
 * @property prompt_tokens - 提示词使用的token数
 * @property completion_tokens - 生成内容使用的token数
 * @property total_tokens - 总token数
 */
export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Gemini API请求接口
 * 符合Google Gemini API格式
 *
 * @property contents - 对话内容数组
 * @property generationConfig - 可选，生成配置
 */
export interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: GeminiGenerationConfig;
}

/**
 * Gemini内容接口
 * 表示Gemini API中的单条消息内容
 *
 * @property role - 消息角色（user或model）
 * @property parts - 消息部分数组
 */
export interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}

/**
 * Gemini消息部分接口
 * 表示消息的文本部分
 *
 * @property text - 文本内容
 */
export interface GeminiPart {
  text: string;
}

/**
 * Gemini生成配置接口
 * 控制Gemini API的生成行为
 *
 * @property temperature - 可选，生成的随机性（0-2）
 * @property maxOutputTokens - 可选，生成的最大token数
 */
export interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Gemini API响应接口
 * 符合Google Gemini API响应格式
 *
 * @property candidates - 生成的候选项数组
 * @property promptFeedback - 可选，提示词反馈信息
 */
export interface GeminiResponse {
  candidates: GeminiCandidate[];
  promptFeedback?: GeminiPromptFeedback;
}

/**
 * Gemini候选项接口
 * 表示API返回的单个生成结果
 *
 * @property content - 生成的内容
 * @property finishReason - 完成原因
 * @property index - 候选项索引
 * @property safetyRatings - 可选，安全评级
 */
export interface GeminiCandidate {
  content: GeminiContent;
  finishReason: string;
  index: number;
  safetyRatings?: GeminiSafetyRating[];
}

/**
 * Gemini安全评级接口
 * 表示内容的安全评级
 *
 * @property category - 安全类别
 * @property probability - 概率等级
 */
export interface GeminiSafetyRating {
  category: string;
  probability: string;
}

/**
 * Gemini提示词反馈接口
 * 提供关于提示词的反馈信息
 *
 * @property safetyRatings - 可选，安全评级数组
 */
export interface GeminiPromptFeedback {
  safetyRatings?: GeminiSafetyRating[];
}

/**
 * 错误类型枚举
 * 用于分类和处理不同类型的错误
 *
 * @enum {string}
 */
export enum ErrorType {
  /** 配置相关错误（API密钥、端点等） */
  ConfigurationError = 'ConfigurationError',
  /** Git操作相关错误（仓库、提交等） */
  GitError = 'GitError',
  /** API调用相关错误（认证、限流等） */
  APIError = 'APIError',
  /** 网络连接相关错误（超时、连接失败等） */
  NetworkError = 'NetworkError',
  /** 未知类型错误 */
  UnknownError = 'UnknownError',
}

/**
 * Git API接口
 * VSCode Git扩展提供的API接口
 *
 * @property repositories - Git仓库列表
 * @property getAPI - 获取指定版本的Git API
 */
export interface GitAPI {
  repositories: GitRepository[];
  getAPI(version: number): GitAPI;
}

export interface InputBox {
  value: string;
}

/**
 * Git仓库接口
 * 表示单个Git仓库及其操作方法
 *
 * @property rootUri - 仓库根目录URI
 * @property inputBox - SCM输入框
 * @property state - 仓库状态，包含暂存区和工作区的变更
 * @property diff - 获取文件diff的方法
 * @property show - 显示指定引用和路径的文件内容
 * @property commit - 执行提交操作
 */
export interface GitRepository {
  rootUri: vscode.Uri;
  inputBox: InputBox;
  state: {
    indexChanges: GitFileChange[];
    workingTreeChanges: GitFileChange[];
  };
  diff(uri: string): Promise<string>;
  show(ref: string, path: string): Promise<string>;
  commit(message: string): Promise<void>;
}

/**
 * Git文件变更接口
 * 表示Git中单个文件的变更信息
 *
 * @property uri - 文件URI
 * @property status - 变更状态码（VSCode Git API定义的数字状态码）
 * @property originalUri - 原始文件URI（用于重命名等操作）
 */
export interface GitFileChange {
  uri: vscode.Uri;
  status: number;
  originalUri: vscode.Uri;
}

/**
 * Git扩展接口
 * VSCode Git扩展的导出接口
 *
 * @property getAPI - 获取指定版本的Git API
 */
export interface GitExtension {
  getAPI(version: number): GitAPI;
}

// 导出服务接口
export * from './interfaces';
