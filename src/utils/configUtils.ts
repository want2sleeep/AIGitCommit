import * as vscode from 'vscode';

/**
 * 配置工具函数
 * 提供简化的配置访问和更新功能
 */

const CONFIG_SECTION = 'aigitcommit';

/**
 * 获取配置值
 * @param key 配置键
 * @param defaultValue 默认值
 * @returns 配置值
 */
export function getConfigValue<T>(key: string, defaultValue: T): T {
  try {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return config.get<T>(key, defaultValue);
  } catch {
    return defaultValue;
  }
}

/**
 * 更新配置值
 * @param key 配置键
 * @param value 配置值
 * @param target 配置目标
 * @returns Promise
 */
export async function updateConfigValue<T>(
  key: string,
  value: T,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
): Promise<void> {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  await config.update(key, value, target);
}

/**
 * 获取配置数组
 * @param key 配置键
 * @returns 配置数组
 */
export function getConfigArray<T>(key: string): T[] {
  return getConfigValue<T[]>(key, []);
}

/**
 * 向配置数组添加唯一项
 * @param key 配置键
 * @param item 要添加的项
 * @param target 配置目标
 * @returns 是否成功添加
 */
export async function addToConfigArray<T>(
  key: string,
  item: T,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
): Promise<boolean> {
  const array = getConfigArray<T>(key);

  // 去重检查
  if (array.includes(item)) {
    return false;
  }

  array.push(item);
  await updateConfigValue(key, array, target);
  return true;
}

/**
 * 从配置数组移除项
 * @param key 配置键
 * @param item 要移除的项
 * @param target 配置目标
 * @returns 是否成功移除
 */
export async function removeFromConfigArray<T>(
  key: string,
  item: T,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
): Promise<boolean> {
  const array = getConfigArray<T>(key);
  const filteredArray = array.filter((i) => i !== item);

  // 如果数组没有变化，说明项不存在
  if (filteredArray.length === array.length) {
    return false;
  }

  await updateConfigValue(key, filteredArray, target);
  return true;
}

/**
 * 检查配置键是否存在
 * @param key 配置键
 * @returns 是否存在
 */
export function hasConfigValue(key: string): boolean {
  try {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const value = config.get(key);
    return value !== undefined;
  } catch {
    return false;
  }
}

/**
 * 获取所有配置
 * @returns 配置对象
 */
export function getAllConfig(): Record<string, unknown> {
  try {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return config as unknown as Record<string, unknown>;
  } catch {
    return {};
  }
}
