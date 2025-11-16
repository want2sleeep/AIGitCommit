#!/usr/bin/env node

/**
 * 版本更新 CLI 入口
 */

// 使用编译后的文件
const { VersionCLI } = require('../out/scripts/version/VersionCLI');

const cli = new VersionCLI();

// 解析命令行参数
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  cli.showHelp();
  process.exit(0);
}

if (command === '--current' || command === 'current') {
  cli.showCurrentVersion();
  process.exit(0);
}

// 验证版本类型
const validTypes = ['major', 'minor', 'patch'];
if (!validTypes.includes(command)) {
  console.error(`❌ 无效的版本类型: ${command}`);
  console.error(`有效的类型: ${validTypes.join(', ')}`);
  console.error('\n运行 pnpm run version:help 查看帮助');
  process.exit(1);
}

// 执行版本更新
cli.run(command).catch((error) => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
