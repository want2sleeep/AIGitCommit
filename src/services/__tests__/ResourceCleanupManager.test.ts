/**
 * ResourceCleanupManager 单元测试
 * 测试资源清理管理器的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { ResourceCleanupManager } from '../ResourceCleanupManager';

describe('ResourceCleanupManager', () => {
  let manager: ResourceCleanupManager;

  beforeEach(() => {
    manager = new ResourceCleanupManager();
  });

  describe('资源注册', () => {
    it('应当能够注册资源', () => {
      manager.register('resource1', async () => {});
      expect(manager.getRegisteredKeys()).toContain('resource1');
    });

    it('应当能够注册多个资源', () => {
      manager.register('resource1', async () => {});
      manager.register('resource2', async () => {});
      manager.register('resource3', async () => {});
      expect(manager.getResourceCount()).toBe(3);
    });

    it('应当拒绝重复注册相同键', () => {
      manager.register('resource1', async () => {});
      expect(() => manager.register('resource1', async () => {})).toThrow(
        'Resource with key "resource1" is already registered'
      );
    });
  });

  describe('资源清理', () => {
    it('应当能够清理单个资源', async () => {
      let cleaned = false;
      manager.register('resource1', async () => {
        cleaned = true;
      });

      await manager.cleanup('resource1');
      expect(cleaned).toBe(true);
      expect(manager.getRegisteredKeys()).not.toContain('resource1');
    });

    it('应当能够清理所有资源', async () => {
      const cleanedKeys: string[] = [];
      manager.register('resource1', async () => {
        cleanedKeys.push('resource1');
      });
      manager.register('resource2', async () => {
        cleanedKeys.push('resource2');
      });

      await manager.cleanupAll();
      expect(cleanedKeys).toContain('resource1');
      expect(cleanedKeys).toContain('resource2');
      expect(manager.getResourceCount()).toBe(0);
    });

    it('应当拒绝清理未注册的资源', async () => {
      await expect(manager.cleanup('nonexistent')).rejects.toThrow(
        'Resource with key "nonexistent" is not registered'
      );
    });

    it('应当支持同步清理函数', async () => {
      let cleaned = false;
      manager.register('resource1', () => {
        cleaned = true;
      });

      await manager.cleanup('resource1');
      expect(cleaned).toBe(true);
    });
  });

  describe('取消注册', () => {
    it('应当能够取消注册资源', () => {
      manager.register('resource1', async () => {});
      manager.unregister('resource1');
      expect(manager.getRegisteredKeys()).not.toContain('resource1');
    });

    it('应当拒绝取消注册未注册的资源', () => {
      expect(() => manager.unregister('nonexistent')).toThrow(
        'Resource with key "nonexistent" is not registered'
      );
    });

    it('取消注册不应调用清理函数', () => {
      let cleaned = false;
      manager.register('resource1', async () => {
        cleaned = true;
      });
      manager.unregister('resource1');
      expect(cleaned).toBe(false);
    });
  });

  describe('清理日志', () => {
    it('应当记录成功的清理', async () => {
      manager.register('resource1', async () => {});
      await manager.cleanup('resource1');

      const log = manager.getCleanupLog();
      expect(log.length).toBe(1);
      expect(log[0]?.key).toBe('resource1');
      expect(log[0]?.success).toBe(true);
      expect(log[0]?.error).toBeUndefined();
    });

    it('应当记录失败的清理', async () => {
      manager.register('resource1', async () => {
        throw new Error('Cleanup failed');
      });

      await expect(manager.cleanup('resource1')).rejects.toThrow('Cleanup failed');

      const log = manager.getCleanupLog();
      expect(log.length).toBe(1);
      expect(log[0]?.key).toBe('resource1');
      expect(log[0]?.success).toBe(false);
      expect(log[0]?.error).toBe('Cleanup failed');
    });

    it('应当能够清空日志', async () => {
      manager.register('resource1', async () => {});
      await manager.cleanup('resource1');
      manager.clearLog();

      expect(manager.getCleanupLog().length).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应当在清理失败后仍然移除资源', async () => {
      manager.register('resource1', async () => {
        throw new Error('Cleanup failed');
      });

      await expect(manager.cleanup('resource1')).rejects.toThrow();
      expect(manager.getRegisteredKeys()).not.toContain('resource1');
    });

    it('应当在 cleanupAll 中聚合错误', async () => {
      manager.register('resource1', async () => {
        throw new Error('Error 1');
      });
      manager.register('resource2', async () => {
        throw new Error('Error 2');
      });

      await expect(manager.cleanupAll()).rejects.toThrow('Failed to cleanup 2 resource(s)');
    });

    it('应当在部分失败时继续清理其他资源', async () => {
      const cleanedKeys: string[] = [];
      manager.register('resource1', async () => {
        cleanedKeys.push('resource1');
      });
      manager.register('resource2', async () => {
        throw new Error('Error');
      });
      manager.register('resource3', async () => {
        cleanedKeys.push('resource3');
      });

      await expect(manager.cleanupAll()).rejects.toThrow();
      expect(cleanedKeys).toContain('resource1');
      expect(cleanedKeys).toContain('resource3');
      expect(manager.getResourceCount()).toBe(0);
    });
  });

  describe('并发清理', () => {
    it('应当并行清理多个资源', async () => {
      const startTimes: number[] = [];
      const endTimes: number[] = [];

      manager.register('resource1', async () => {
        startTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 50));
        endTimes.push(Date.now());
      });
      manager.register('resource2', async () => {
        startTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 50));
        endTimes.push(Date.now());
      });

      const start = Date.now();
      await manager.cleanupAll();
      const duration = Date.now() - start;

      // 如果是并行执行，总时间应该接近 50ms 而不是 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
