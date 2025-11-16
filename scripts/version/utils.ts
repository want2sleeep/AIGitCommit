/**
 * 版本更新系统的工具函数
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 读取文件内容
 * @param filePath 文件路径
 * @returns 文件内容
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 写入文件内容
 * @param filePath 文件路径
 * @param content 文件内容
 */
export function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 检查文件是否存在
 * @param filePath 文件路径
 * @returns 是否存在
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * 创建目录（递归）
 * @param dirPath 目录路径
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 复制文件
 * @param src 源文件路径
 * @param dest 目标文件路径
 */
export function copyFile(src: string, dest: string): void {
  fs.copyFileSync(src, dest);
}

/**
 * 删除文件
 * @param filePath 文件路径
 */
export function deleteFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * 获取当前日期字符串（YYYY-MM-DD）
 * @returns 日期字符串
 */
export function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期
 * @param date 日期对象
 * @param format 格式字符串（默认 YYYY-MM-DD）
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return format.replace('YYYY', String(year)).replace('MM', month).replace('DD', day);
}

/**
 * 获取项目根目录
 * @returns 项目根目录路径
 */
export function getProjectRoot(): string {
  // 从编译后的 out/scripts/version/ 目录向上三级到达项目根目录
  return path.resolve(__dirname, '../../..');
}

/**
 * 解析 JSON 文件
 * @param filePath 文件路径
 * @returns 解析后的对象
 */
export function parseJsonFile<T>(filePath: string): T {
  const content = readFile(filePath);
  return JSON.parse(content) as T;
}

/**
 * 写入 JSON 文件（保持格式）
 * @param filePath 文件路径
 * @param data 数据对象
 * @param indent 缩进空格数（默认 2）
 */
export function writeJsonFile(filePath: string, data: unknown, indent: number = 2): void {
  const content = JSON.stringify(data, null, indent) + '\n';
  writeFile(filePath, content);
}

/**
 * 执行 shell 命令（同步）
 * @param command 命令
 * @param cwd 工作目录（可选）
 * @returns 命令输出
 */
export function execSync(command: string, cwd?: string): string {
  const { execSync: nodeExecSync } = require('child_process');
  return nodeExecSync(command, {
    cwd: cwd || getProjectRoot(),
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

/**
 * 执行 shell 命令（异步）
 * @param command 命令
 * @param cwd 工作目录（可选）
 * @returns Promise<命令输出>
 */
export async function exec(command: string, cwd?: string): Promise<string> {
  const { exec: nodeExec } = require('child_process');
  const { promisify } = require('util');
  const execPromise = promisify(nodeExec);

  const { stdout } = await execPromise(command, {
    cwd: cwd || getProjectRoot(),
    encoding: 'utf-8',
  });

  return stdout.trim();
}

/**
 * 检查命令是否可用
 * @param command 命令名
 * @returns 是否可用
 */
export function isCommandAvailable(command: string): boolean {
  try {
    execSync(`${command} --version`);
    return true;
  } catch {
    return false;
  }
}
