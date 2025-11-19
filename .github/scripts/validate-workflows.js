#!/usr/bin/env node

/**
 * 工作流配置验证脚本
 * 验证 GitHub Actions 工作流中引用的所有脚本命令是否在 package.json 中定义
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 读取 package.json
function readPackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  try {
    const content = fs.readFileSync(packagePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(`❌ 无法读取 package.json: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 读取工作流文件
function readWorkflowFile(filename) {
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', filename);
  try {
    return fs.readFileSync(workflowPath, 'utf8');
  } catch (error) {
    log(`❌ 无法读取工作流文件 ${filename}: ${error.message}`, 'red');
    return null;
  }
}

// 从工作流内容中提取脚本命令
function extractScriptCommands(workflowContent) {
  const commands = new Set();
  
  // 匹配 pnpm run <script> 或 pnpm exec <command>
  const pnpmRunPattern = /pnpm\s+run\s+([a-z:_-]+)/gi;
  const matches = workflowContent.matchAll(pnpmRunPattern);
  
  for (const match of matches) {
    commands.add(match[1]);
  }
  
  return Array.from(commands);
}

// 验证脚本命令
function validateScripts(workflowName, commands, packageScripts) {
  log(`\n📋 验证 ${workflowName}:`, 'cyan');
  
  let allValid = true;
  const results = [];
  
  for (const command of commands) {
    if (packageScripts[command]) {
      log(`  ✅ ${command}: ${packageScripts[command]}`, 'green');
      results.push({ command, status: 'ok', definition: packageScripts[command] });
    } else {
      log(`  ❌ ${command}: 未在 package.json 中定义`, 'red');
      results.push({ command, status: 'missing' });
      allValid = false;
    }
  }
  
  return { allValid, results };
}

// 验证 YAML 基本语法
function validateYamlSyntax(workflowName, content) {
  log(`\n🔍 验证 ${workflowName} YAML 语法:`, 'cyan');
  
  // 基本的 YAML 语法检查
  const issues = [];
  
  // 检查缩进一致性（简单检查）
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检查 tab 字符
    if (line.includes('\t')) {
      issues.push(`第 ${i + 1} 行: 包含 Tab 字符，YAML 应使用空格缩进`);
    }
  }
  
  if (issues.length === 0) {
    log('  ✅ 未发现明显的语法问题', 'green');
    return true;
  } else {
    issues.forEach(issue => log(`  ⚠️  ${issue}`, 'yellow'));
    return false;
  }
}

// 主函数
function main() {
  log('='.repeat(60), 'blue');
  log('GitHub Actions 工作流配置验证', 'blue');
  log('='.repeat(60), 'blue');
  
  // 读取 package.json
  const packageJson = readPackageJson();
  const packageScripts = packageJson.scripts || {};
  
  log(`\n📦 package.json 中定义的脚本数量: ${Object.keys(packageScripts).length}`, 'cyan');
  
  // 验证工作流文件
  const workflows = [
    { name: 'publish.yml', file: 'publish.yml' },
    { name: 'ci.yml', file: 'ci.yml' },
  ];
  
  let allWorkflowsValid = true;
  const summary = [];
  
  for (const workflow of workflows) {
    const content = readWorkflowFile(workflow.file);
    if (!content) {
      allWorkflowsValid = false;
      continue;
    }
    
    // 验证 YAML 语法
    const yamlValid = validateYamlSyntax(workflow.name, content);
    
    // 提取并验证脚本命令
    const commands = extractScriptCommands(content);
    log(`\n  发现 ${commands.length} 个脚本命令引用`, 'cyan');
    
    const validation = validateScripts(workflow.name, commands, packageScripts);
    
    summary.push({
      workflow: workflow.name,
      yamlValid,
      scriptsValid: validation.allValid,
      commands: validation.results,
    });
    
    if (!validation.allValid || !yamlValid) {
      allWorkflowsValid = false;
    }
  }
  
  // 输出总结
  log('\n' + '='.repeat(60), 'blue');
  log('验证总结', 'blue');
  log('='.repeat(60), 'blue');
  
  for (const item of summary) {
    log(`\n${item.workflow}:`, 'cyan');
    log(`  YAML 语法: ${item.yamlValid ? '✅ 通过' : '❌ 失败'}`, item.yamlValid ? 'green' : 'red');
    log(`  脚本验证: ${item.scriptsValid ? '✅ 通过' : '❌ 失败'}`, item.scriptsValid ? 'green' : 'red');
    log(`  命令数量: ${item.commands.length}`);
    
    const missing = item.commands.filter(c => c.status === 'missing');
    if (missing.length > 0) {
      log(`  ⚠️  缺失的命令: ${missing.map(c => c.command).join(', ')}`, 'yellow');
    }
  }
  
  log('\n' + '='.repeat(60), 'blue');
  
  if (allWorkflowsValid) {
    log('✅ 所有工作流配置验证通过！', 'green');
    process.exit(0);
  } else {
    log('❌ 工作流配置验证失败，请修复上述问题', 'red');
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  readPackageJson,
  extractScriptCommands,
  validateScripts,
  validateYamlSyntax,
};