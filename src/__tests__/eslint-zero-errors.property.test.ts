/**
 * ESLint 零错误属性测试
 * Feature: project-optimization-recommendations, Property 19: ESLint 零错误
 * 验证需求: 3.1
 */

import { execSync } from 'child_process';

describe('属性 19: ESLint 零错误', () => {
  it('运行 ESLint 应当无错误和警告', () => {
    try {
      // 运行 ESLint
      const output = execSync('pnpm run lint', {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      // 检查输出中是否包含错误或警告
      expect(output).not.toMatch(/✖ \d+ problems? \(\d+ errors?/);
      expect(output).not.toMatch(/\d+ errors?/);
      expect(output).not.toMatch(/\d+ warnings?/);
    } catch (error) {
      // 如果 ESLint 返回非零退出码，测试失败
      const err = error as { stdout?: string; stderr?: string; status?: number };
      throw new Error(
        `ESLint 检查失败:\n退出码: ${err.status}\n输出: ${err.stdout || ''}\n错误: ${err.stderr || ''}`
      );
    }
  });

  it('ESLint 应当成功退出（退出码为 0）', () => {
    try {
      execSync('pnpm run lint', {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      // 如果没有抛出错误，说明退出码为 0
      expect(true).toBe(true);
    } catch (error) {
      const err = error as { status?: number };
      fail(`ESLint 返回非零退出码: ${err.status}`);
    }
  });
});
