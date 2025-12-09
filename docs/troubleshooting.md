# 故障排查指南

本文档提供了 AI Git Commit 扩展的常见问题和解决方案。

## 📋 目录

- [连接问题](#连接问题)
- [配置问题](#配置问题)
- [生成问题](#生成问题)
- [性能问题](#性能问题)
- [智能过滤问题](#智能过滤问题)
- [错误代码参考](#错误代码参考)
- [日志和诊断](#日志和诊断)

## 连接问题

### API 连接失败

**症状**：无法连接到 AI 服务，显示网络错误。

**可能原因**：
1. 网络连接不稳定
2. API 端点配置错误
3. 防火墙或代理阻止连接
4. API 服务暂时不可用

**解决方案**：

1. **检查网络连接**
   ```bash
   # 测试网络连接
   ping api.openai.com
   
   # 测试 API 端点
   curl -I https://api.openai.com/v1/models
   ```

2. **验证 API 端点**
   - 打开 VSCode 设置
   - 搜索 "aigitcommit.apiEndpoint"
   - 确认端点 URL 正确

3. **配置代理**
   ```json
   {
     "aigitcommit.proxy": "http://proxy.example.com:8080"
   }
   ```

4. **检查防火墙设置**
   - 确保 VSCode 可以访问外部网络
   - 添加 API 域名到白名单

### SSL 证书错误

**症状**：显示 SSL/TLS 证书验证失败。

**解决方案**：

1. **更新系统证书**
   ```bash
   # Windows
   certutil -generateSSTFromWU roots.sst
   
   # macOS
   security find-certificate -a -p /System/Library/Keychains/SystemRootCertificates.keychain
   
   # Linux
   sudo update-ca-certificates
   ```

2. **配置自定义 CA 证书**（企业环境）
   - 联系 IT 部门获取企业 CA 证书
   - 配置 Node.js 使用自定义证书

### 超时错误

**症状**：请求超时，长时间无响应。

**解决方案**：

1. **增加超时时间**
   ```json
   {
     "aigitcommit.timeout": 60000
   }
   ```

2. **使用更快的模型**
   - 切换到响应更快的模型（如 `gpt-3.5-turbo`）

3. **检查网络延迟**
   - 使用更近的 API 端点
   - 考虑使用本地模型（Ollama）

## 配置问题

### API 密钥无效

**症状**：显示 401 Unauthorized 错误。

**解决方案**：

1. **重新配置 API 密钥**
   - 按 `Ctrl+Shift+P`
   - 输入 "配置 AI Git Commit"
   - 重新输入 API 密钥

2. **验证 API 密钥**
   ```bash
   # OpenAI
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

3. **检查密钥权限**
   - 确认 API 密钥有正确的权限
   - 检查密钥是否过期

### 模型不存在

**症状**：显示模型未找到错误。

**解决方案**：

1. **检查模型名称**
   - 确认模型名称拼写正确
   - 查看提供商支持的模型列表

2. **更新模型配置**
   ```json
   {
     "aigitcommit.modelName": "gpt-3.5-turbo"
   }
   ```

3. **Ollama 用户**
   ```bash
   # 查看已安装的模型
   ollama list
   
   # 下载所需模型
   ollama pull codellama
   ```

### 配置不生效

**症状**：修改配置后没有效果。

**解决方案**：

1. **重启 VSCode**
   - 完全关闭 VSCode
   - 重新打开

2. **检查配置范围**
   - 确认配置在正确的范围（用户/工作区）
   - 检查是否有冲突的配置

3. **清除缓存**
   - 按 `Ctrl+Shift+P`
   - 输入 "Developer: Reload Window"

## 生成问题

### 生成的提交信息质量差

**症状**：生成的提交信息不准确或不相关。

**解决方案**：

1. **使用更强大的模型**
   ```json
   {
     "aigitcommit.modelName": "gpt-4-turbo-preview"
   }
   ```

2. **调整温度参数**
   ```json
   {
     "aigitcommit.temperature": 0.5
   }
   ```

3. **自定义提示词**
   ```json
   {
     "aigitcommit.customPrompt": "你是一个专业的代码审查员..."
   }
   ```

4. **确保有足够的上下文**
   - 暂存更多相关文件
   - 避免一次性提交过多变更

### 生成速度慢

**症状**：生成提交信息需要很长时间。

**解决方案**：

1. **使用更快的模型**
   - `gpt-3.5-turbo` 比 `gpt-4` 更快
   - `gemini-1.5-flash` 响应迅速

2. **减少 token 数量**
   ```json
   {
     "aigitcommit.maxTokens": 300
   }
   ```

3. **使用本地模型**
   - 配置 Ollama 本地服务
   - 避免网络延迟

### 生成失败

**症状**：生成过程中出错。

**解决方案**：

1. **检查暂存区**
   ```bash
   git status
   git diff --cached
   ```

2. **确保有变更**
   - 至少暂存一个文件
   - 检查变更是否为空

3. **查看错误日志**
   - 打开输出面板
   - 选择 "AI Git Commit" 通道

## 性能问题

### 扩展启动慢

**症状**：VSCode 启动时扩展加载缓慢。

**解决方案**：

1. **检查其他扩展**
   - 禁用不必要的扩展
   - 使用扩展性能分析器

2. **清理缓存**
   ```bash
   # 清理 VSCode 缓存
   rm -rf ~/.vscode/CachedExtensions
   ```

### 内存占用高

**症状**：扩展占用大量内存。

**解决方案**：

1. **重启扩展**
   - 按 `Ctrl+Shift+P`
   - 输入 "Developer: Reload Window"

2. **检查大文件**
   - 避免暂存过大的文件
   - 分批提交变更

## 智能过滤问题

### 智能过滤未生效

**症状**：所有文件都被处理，没有看到过滤效果。

**可能原因**：
1. 智能过滤功能未启用
2. 文件数量不在阈值范围内（< 3 或 > 500）
3. AI 调用失败或超时
4. 配置错误

**解决方案**：

1. **检查功能是否启用**
   ```json
   {
     "aigitcommit.enableSmartFilter": true
   }
   ```

2. **检查文件数量**
   ```bash
   # 查看暂存的文件数量
   git diff --cached --name-only | wc -l
   ```
   - 确保文件数量在 3-500 之间
   - 少于 3 个文件会自动跳过过滤
   - 超过 500 个文件会自动跳过过滤

3. **查看过滤统计**
   - 打开输出面板（`Ctrl+Shift+U`）
   - 选择 "AI Git Commit" 通道
   - 查找过滤相关的日志信息

4. **检查配置**
   ```json
   {
     "aigitcommit.enableSmartFilter": true,
     "aigitcommit.minFilesThreshold": 3,
     "aigitcommit.maxFileListSize": 500,
     "aigitcommit.showFilterStats": true
   }
   ```

### 过滤速度慢

**症状**：智能过滤耗时过长（超过 10 秒）。

**可能原因**：
1. 网络延迟
2. AI 模型响应慢
3. 文件数量过多
4. 超时设置过长

**解决方案**：

1. **使用本地模型**
   ```json
   {
     "aigitcommit.provider": "ollama",
     "aigitcommit.apiEndpoint": "http://localhost:11434/v1",
     "aigitcommit.filterTimeout": 5000
   }
   ```

2. **增加超时时间**（如果网络慢）
   ```json
   {
     "aigitcommit.filterTimeout": 20000
   }
   ```

3. **降低最大文件数**
   ```json
   {
     "aigitcommit.maxFileListSize": 300
   }
   ```

4. **检查网络连接**
   ```bash
   # 测试 API 连接速度
   curl -w "@curl-format.txt" -o /dev/null -s https://api.openai.com/v1/models
   ```

### 过滤结果不准确

**症状**：重要文件被过滤掉，或杂音文件未被过滤。

**可能原因**：
1. AI 模型判断错误
2. 文件类型不在常见列表中
3. 文件命名不规范
4. 模型选择不当

**解决方案**：

1. **查看过滤详情**
   - 打开输出面板
   - 查看哪些文件被过滤
   - 分析过滤原因

2. **临时禁用过滤**
   ```json
   {
     "aigitcommit.enableSmartFilter": false
   }
   ```

3. **尝试不同的模型**
   ```json
   {
     // 使用更强大的模型
     "aigitcommit.filterModel": "gpt-4"
   }
   ```

4. **提交反馈**
   - 记录被错误过滤的文件
   - 在 GitHub 提交 Issue
   - 帮助改进过滤算法

### 过滤超时

**症状**：显示"Smart Filter timeout"错误。

**可能原因**：
1. 网络不稳定
2. 超时设置过短
3. 文件数量过多
4. API 服务响应慢

**解决方案**：

1. **增加超时时间**
   ```json
   {
     "aigitcommit.filterTimeout": 20000
   }
   ```

2. **降低文件数量限制**
   ```json
   {
     "aigitcommit.maxFileListSize": 300
   }
   ```

3. **检查网络状态**
   ```bash
   # 测试网络延迟
   ping api.openai.com
   
   # 测试 API 响应时间
   time curl https://api.openai.com/v1/models
   ```

4. **使用本地模型**
   - 配置 Ollama 避免网络延迟
   - 本地模型响应更快

### 过滤统计不显示

**症状**：状态栏或输出面板没有显示过滤统计信息。

**可能原因**：
1. 统计显示功能未启用
2. 过滤被跳过（文件数量不在范围内）
3. 过滤失败

**解决方案**：

1. **启用统计显示**
   ```json
   {
     "aigitcommit.showFilterStats": true
   }
   ```

2. **检查日志级别**
   ```json
   {
     "aigitcommit.logLevel": "info"
   }
   ```

3. **查看输出面板**
   - 打开输出面板（`Ctrl+Shift+U`）
   - 选择 "AI Git Commit" 通道
   - 查找过滤相关的日志

### 过滤导致错误

**症状**：启用智能过滤后，生成提交信息失败。

**可能原因**：
1. 过滤模型配置错误
2. API 密钥权限不足
3. 过滤返回空列表
4. 网络或服务问题

**解决方案**：

1. **检查过滤模型配置**
   ```json
   {
     // 留空使用自动选择
     "aigitcommit.filterModel": ""
   }
   ```

2. **查看详细错误**
   - 打开输出面板
   - 查看完整的错误堆栈
   - 记录错误代码

3. **临时禁用过滤**
   ```json
   {
     "aigitcommit.enableSmartFilter": false
   }
   ```

4. **测试 API 连接**
   ```bash
   # 测试主模型
   curl https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"test"}]}'
   ```

### 调试智能过滤

**启用详细日志**：

```json
{
  "aigitcommit.logLevel": "debug",
  "aigitcommit.showFilterStats": true
}
```

**查看过滤流程**：

1. 打开输出面板
2. 查找以下日志：
   ```
   [Smart Filter] Starting file analysis...
   [Smart Filter] Total files: 25
   [Smart Filter] Sending to AI: gpt-4o-mini
   [Smart Filter] AI response received in 1.2s
   [Smart Filter] Core files (3): src/index.ts, src/utils.ts, README.md
   [Smart Filter] Ignored files (22): package-lock.json, dist/*, ...
   ```

**常见日志消息**：

| 日志消息 | 含义 | 处理方式 |
|---------|------|----------|
| `Skipped (only X files)` | 文件太少，跳过过滤 | 正常，无需处理 |
| `Skipped (X+ files, too large)` | 文件太多，跳过过滤 | 正常，或调整 maxFileListSize |
| `Smart Filter timeout` | 过滤超时 | 增加 filterTimeout 或使用本地模型 |
| `JSON parse failed` | 解析失败 | 检查 AI 响应格式 |
| `Empty result, using original list` | AI 返回空列表 | 正常回退，无需处理 |
| `Invalid paths filtered` | 过滤无效路径 | 正常，AI 返回了不存在的文件 |

**性能分析**：

```json
{
  "aigitcommit.enablePerformanceMonitoring": true
}
```

查看过滤性能指标：
- 过滤耗时
- Token 节省比例
- 过滤成功率
- 平均文件数

## 错误代码参考

| 错误代码 | 描述 | 解决方案 |
|---------|------|----------|
| `ERR_NETWORK` | 网络连接失败 | 检查网络连接和代理设置 |
| `ERR_AUTH` | 认证失败 | 重新配置 API 密钥 |
| `ERR_MODEL` | 模型不可用 | 检查模型名称或切换模型 |
| `ERR_RATE_LIMIT` | 达到速率限制 | 等待后重试或升级账户 |
| `ERR_TIMEOUT` | 请求超时 | 增加超时时间或使用更快的模型 |
| `ERR_CONFIG` | 配置错误 | 检查配置项是否正确 |
| `ERR_GIT` | Git 操作失败 | 确保在 Git 仓库中且有暂存变更 |
| `ERR_PARSE` | 响应解析失败 | 检查 API 响应格式 |
| `ERR_FILTER_TIMEOUT` | 智能过滤超时 | 增加 filterTimeout 或使用本地模型 |
| `ERR_FILTER_PARSE` | 过滤结果解析失败 | 检查过滤模型配置 |
| `ERR_FILTER_EMPTY` | 过滤返回空列表 | 自动回退到原始列表，无需处理 |

## 日志和诊断

### 查看扩展日志

1. **打开输出面板**
   - 按 `Ctrl+Shift+U`
   - 或菜单：查看 → 输出

2. **选择日志通道**
   - 在下拉菜单中选择 "AI Git Commit"

3. **导出日志**
   - 复制日志内容
   - 保存到文件以便分析

### 启用详细日志

```json
{
  "aigitcommit.logLevel": "debug"
}
```

### 诊断命令

```bash
# 检查 Git 状态
git status

# 查看暂存的变更
git diff --cached

# 检查 Git 配置
git config --list

# 测试 API 连接
curl -v https://api.openai.com/v1/models
```

### 收集诊断信息

报告问题时，请提供以下信息：

1. **环境信息**
   - VSCode 版本
   - 扩展版本
   - 操作系统
   - Node.js 版本

2. **配置信息**
   - API 提供商
   - 模型名称
   - 相关配置（不包含 API 密钥）

3. **错误信息**
   - 完整的错误消息
   - 错误堆栈（如果有）
   - 扩展日志

4. **复现步骤**
   - 详细的操作步骤
   - 预期行为
   - 实际行为

## 获取帮助

如果以上方案无法解决您的问题：

1. **查看文档**
   - [快速开始指南](guides/quick-start.md)
   - [配置指南](configuration/README.md)

2. **搜索 Issues**
   - 访问 [GitHub Issues](https://github.com/want2sleeep/AIGitCommit/issues)
   - 搜索类似问题

3. **提交 Issue**
   - 使用 Issue 模板
   - 提供完整的诊断信息

4. **联系维护者**
   - 邮箱：victorhuang.hy@gmail.com

---

**相关文档**: [快速开始](guides/quick-start.md) | [配置指南](configuration/README.md) | [贡献指南](../CONTRIBUTING.md)
