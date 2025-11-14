# Azure OpenAI 配置示例

本文档提供了使用 Azure OpenAI Service 的配置示例。

## 前置要求

1. 拥有 Azure 订阅
2. 已创建 Azure OpenAI 资源
3. 已部署模型（如 gpt-35-turbo 或 gpt-4）

## 配置步骤

### 1. 获取 Azure OpenAI 信息

在 Azure Portal 中：
1. 打开您的 Azure OpenAI 资源
2. 进入 "Keys and Endpoint" 页面
3. 记录以下信息：
   - Endpoint（端点）
   - Key（密钥）
   - Deployment Name（部署名称）

### 2. 配置插件

打开 VSCode 设置并配置以下参数：

## 配置参数

### API 端点
Azure OpenAI 的端点格式：
```
https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-name}
```

示例：
```
https://my-openai-resource.openai.azure.com/openai/deployments/gpt-35-turbo
```

**注意**：
- 将 `{your-resource-name}` 替换为您的资源名称
- 将 `{deployment-name}` 替换为您的部署名称
- 端点需要包含完整的部署路径

### API 密钥
- 使用 Azure Portal 中的 Key 1 或 Key 2
- 通过命令 `Git: 配置AI Git Commit` 安全存储
- 或在首次使用时通过配置向导输入

### 模型名称
使用您在 Azure 中部署的模型名称，例如：
```
gpt-35-turbo
```
或
```
gpt-4
```

**注意**：模型名称必须与您在 Azure 中的部署名称匹配

## 完整配置示例

### 示例 1：使用 GPT-3.5 Turbo

```json
{
  "aigitcommit.apiEndpoint": "https://my-openai-resource.openai.azure.com/openai/deployments/gpt-35-turbo",
  "aigitcommit.modelName": "gpt-35-turbo",
  "aigitcommit.language": "zh-CN",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 500,
  "aigitcommit.temperature": 0.7
}
```

### 示例 2：使用 GPT-4

```json
{
  "aigitcommit.apiEndpoint": "https://my-openai-resource.openai.azure.com/openai/deployments/gpt-4",
  "aigitcommit.modelName": "gpt-4",
  "aigitcommit.language": "en-US",
  "aigitcommit.commitFormat": "conventional",
  "aigitcommit.maxTokens": 800,
  "aigitcommit.temperature": 0.7
}
```

## API 版本说明

Azure OpenAI 使用 API 版本参数。本插件默认使用兼容的 API 版本。如果需要指定特定版本，可以在端点 URL 中添加：

```
https://my-openai-resource.openai.azure.com/openai/deployments/gpt-35-turbo?api-version=2023-12-01-preview
```

## 注意事项

1. **端点格式**：Azure OpenAI 的端点格式与 OpenAI 官方不同，需要包含部署名称
2. **模型名称**：使用您在 Azure 中实际部署的名称，不是 OpenAI 的原始模型名
3. **区域限制**：确保您的 Azure 资源在支持 OpenAI 的区域
4. **配额管理**：注意 Azure OpenAI 的配额限制
5. **网络访问**：确保网络可以访问您的 Azure OpenAI 端点

## 故障排除

### 401 Unauthorized
- 检查 API 密钥是否正确
- 确认密钥未过期或被撤销

### 404 Not Found
- 检查端点 URL 是否正确
- 确认部署名称是否匹配
- 验证资源名称是否正确

### 429 Too Many Requests
- 您已达到配额限制
- 在 Azure Portal 中检查配额使用情况
- 考虑增加配额或等待配额重置

### DeploymentNotFound
- 确认模型已在 Azure 中成功部署
- 检查部署名称是否与配置中的名称一致

## 优势

- **数据隐私**：数据保留在您的 Azure 订阅中
- **企业级支持**：享受 Azure 的 SLA 和支持
- **合规性**：符合企业合规要求
- **网络控制**：可以配置私有端点和网络规则
