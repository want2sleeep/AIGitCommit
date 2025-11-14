# 约定式提交（Conventional Commits）格式指南

本文档详细说明了约定式提交格式的规范和最佳实践。

## 什么是约定式提交？

约定式提交（Conventional Commits）是一种用于给提交信息增加人机可读含义的规范。它提供了一组简单规则来创建清晰的提交历史，使得编写自动化工具变得更容易。

## 基本格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 组成部分

1. **type**（类型）：必需，说明提交的类别
2. **scope**（范围）：可选，说明提交影响的范围
3. **subject**（主题）：必需，简短描述
4. **body**（正文）：可选，详细描述
5. **footer**（页脚）：可选，备注信息

---

## Type（类型）

### 标准类型

#### feat（功能）
新增功能或特性。

**示例：**
```
feat(auth): 添加用户登录功能
feat: 支持深色模式
feat(api): 添加用户信息查询接口
```

#### fix（修复）
修复 bug。

**示例：**
```
fix(login): 修复登录页面验证码不显示的问题
fix: 解决内存泄漏问题
fix(api): 修复用户数据查询返回错误的问题
```

#### docs（文档）
仅文档更改。

**示例：**
```
docs: 更新 README 安装说明
docs(api): 添加 API 使用示例
docs: 修正配置文件中的拼写错误
```

#### style（格式）
不影响代码含义的更改（空格、格式化、缺少分号等）。

**示例：**
```
style: 格式化代码，统一缩进
style(css): 调整按钮样式
style: 移除多余的空行
```

#### refactor（重构）
既不修复 bug 也不添加功能的代码更改。

**示例：**
```
refactor(auth): 重构用户认证逻辑
refactor: 提取公共方法到工具类
refactor(database): 优化数据库查询结构
```

#### perf（性能）
提高性能的代码更改。

**示例：**
```
perf(api): 优化用户列表查询性能
perf: 使用缓存减少数据库查询
perf(render): 优化页面渲染速度
```

#### test（测试）
添加缺失的测试或更正现有测试。

**示例：**
```
test(auth): 添加登录功能单元测试
test: 增加边界条件测试用例
test(api): 修复用户接口测试失败的问题
```

#### build（构建）
影响构建系统或外部依赖的更改（示例范围：gulp、broccoli、npm）。

**示例：**
```
build: 升级 webpack 到 5.0
build(deps): 更新依赖包版本
build: 添加生产环境构建配置
```

#### ci（持续集成）
对 CI 配置文件和脚本的更改（示例范围：Travis、Circle、BrowserStack、SauceLabs）。

**示例：**
```
ci: 添加 GitHub Actions 工作流
ci(travis): 更新 Travis CI 配置
ci: 修复部署脚本错误
```

#### chore（杂务）
其他不修改 src 或测试文件的更改。

**示例：**
```
chore: 更新 .gitignore
chore(release): 发布 v1.0.0
chore: 清理无用的依赖
```

#### revert（回滚）
回滚之前的提交。

**示例：**
```
revert: 回滚 "feat: 添加用户登录功能"
revert(api): 撤销 API 接口变更
```

---

## Scope（范围）

范围是可选的，用于说明提交影响的范围。

### 常见范围示例

#### 按模块
```
feat(auth): 添加登录功能
fix(payment): 修复支付流程错误
docs(api): 更新 API 文档
```

#### 按组件
```
feat(button): 添加按钮悬停效果
fix(modal): 修复模态框关闭问题
style(navbar): 调整导航栏样式
```

#### 按文件或目录
```
refactor(utils): 重构工具函数
test(services): 添加服务层测试
build(webpack): 更新 webpack 配置
```

#### 按功能领域
```
feat(user-management): 添加用户管理功能
fix(data-sync): 修复数据同步问题
perf(search): 优化搜索性能
```

### 多个范围

如果变更影响多个范围，可以使用逗号分隔：

```
feat(auth,api): 添加用户认证和 API 接口
fix(ui,ux): 修复界面和交互问题
```

或者使用更通用的范围：

```
feat(core): 添加核心功能
refactor(app): 重构应用结构
```

---

## Subject（主题）

主题是对变更的简短描述。

### 规则

1. **使用祈使句**：如"添加"而不是"已添加"或"添加了"
2. **首字母小写**：除非是专有名词
3. **结尾不加句号**
4. **不超过 50 个字符**（中文）或 72 个字符（英文）

### 好的示例

```
feat: 添加用户登录功能
fix: 修复内存泄漏问题
docs: 更新安装文档
refactor: 简化配置逻辑
```

### 不好的示例

```
feat: 添加了用户登录功能。（使用了过去时，添加了句号）
fix: Fix memory leak（首字母大写）
docs: 更新了 README 文件，添加了安装说明，修正了一些拼写错误（太长，包含多个变更）
```

---

## Body（正文）

正文是可选的，用于提供更详细的变更说明。

### 何时使用正文

- 变更比较复杂，需要详细说明
- 需要解释变更的原因
- 需要说明变更的影响
- 需要提供额外的上下文

### 格式规则

1. 与主题之间空一行
2. 每行不超过 72 个字符
3. 可以使用多个段落
4. 可以使用列表

### 示例

```
feat(auth): 添加 OAuth2 登录支持

实现了 Google 和 GitHub 的 OAuth2 登录集成。
用户现在可以使用第三方账号快速登录，无需注册新账号。

主要变更：
- 添加 OAuth2 客户端配置
- 实现授权回调处理
- 添加用户账号关联逻辑
- 更新登录页面 UI

这个功能提高了用户体验，降低了注册门槛。
```

---

## Footer（页脚）

页脚是可选的，用于引用 Issue、说明破坏性变更等。

### Breaking Changes（破坏性变更）

如果提交包含破坏性变更，必须在页脚中说明。

**格式：**
```
BREAKING CHANGE: <description>
```

**示例：**
```
feat(api): 重构用户 API 接口

将用户 API 从 REST 迁移到 GraphQL。

BREAKING CHANGE: 所有用户相关的 REST API 端点已被移除。
请使用新的 GraphQL API。迁移指南：https://example.com/migration
```

### Issue 引用

引用相关的 Issue 或 Pull Request。

**格式：**
```
Closes #123
Fixes #456
Refs #789
```

**示例：**
```
fix(login): 修复登录验证码不显示的问题

修复了在某些浏览器中验证码图片无法加载的问题。
通过调整图片加载策略解决了兼容性问题。

Closes #123
Fixes #456
```

### 多个 Footer

可以包含多个 Footer 信息：

```
feat(payment): 添加支付宝支付支持

实现了支付宝扫码支付和 H5 支付。

BREAKING CHANGE: 支付接口参数格式已变更，请参考新的 API 文档。
Closes #234
Refs #567
```

---

## 完整示例

### 示例 1：简单的功能添加

```
feat(user): 添加用户头像上传功能
```

### 示例 2：带正文的 Bug 修复

```
fix(api): 修复用户数据查询的并发问题

修复了在高并发情况下用户数据查询可能返回错误结果的问题。
通过添加适当的锁机制确保数据一致性。

Closes #789
```

### 示例 3：带破坏性变更的重构

```
refactor(auth)!: 重构认证系统架构

将认证系统从基于 Session 的方式迁移到基于 JWT 的方式。
这个变更提高了系统的可扩展性和安全性。

主要变更：
- 移除 Session 管理模块
- 实现 JWT token 生成和验证
- 更新所有认证相关的 API
- 添加 token 刷新机制

BREAKING CHANGE: 所有客户端需要更新认证逻辑，
使用新的 JWT token 方式。旧的 Session 认证将不再支持。
迁移指南：https://example.com/auth-migration

Closes #456
Refs #123, #234
```

### 示例 4：性能优化

```
perf(database): 优化用户列表查询性能

通过添加数据库索引和优化查询语句，将用户列表查询时间从 2s 降低到 200ms。

优化内容：
- 在 user_id 和 created_at 字段添加索引
- 使用分页查询替代全量查询
- 添加查询结果缓存

性能提升：90%
```

### 示例 5：文档更新

```
docs(readme): 完善安装和配置说明

添加了详细的安装步骤和配置示例。
包括常见问题解答和故障排除指南。
```

---

## 最佳实践

### 1. 原子提交

每个提交应该是一个逻辑上的独立变更。

**好的做法：**
```
feat(auth): 添加登录功能
feat(auth): 添加注册功能
feat(auth): 添加密码重置功能
```

**不好的做法：**
```
feat(auth): 添加登录、注册和密码重置功能
```

### 2. 清晰的描述

主题应该清楚地说明做了什么。

**好的做法：**
```
fix(api): 修复用户查询接口返回 null 的问题
```

**不好的做法：**
```
fix: 修复 bug
fix: 更新代码
```

### 3. 使用正确的类型

选择最准确的类型。

**好的做法：**
```
perf(search): 优化搜索算法
```

**不好的做法：**
```
feat(search): 优化搜索算法（应该用 perf）
```

### 4. 适当的范围

使用有意义的范围。

**好的做法：**
```
feat(user-profile): 添加个人资料编辑功能
```

**不好的做法：**
```
feat(src/components/user/profile/edit): 添加编辑功能（范围太具体）
```

### 5. 及时提交

完成一个逻辑单元就提交，不要积累太多变更。

---

## 工具支持

### Commitizen

使用 Commitizen 工具辅助生成规范的提交信息：

```bash
npm install -g commitizen
commitizen init cz-conventional-changelog --save-dev --save-exact
```

使用：
```bash
git cz
```

### Commitlint

使用 Commitlint 验证提交信息格式：

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

配置 `.commitlintrc.json`：
```json
{
  "extends": ["@commitlint/config-conventional"]
}
```

### Husky

使用 Husky 在提交前自动验证：

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

---

## 常见问题

### Q: 一个提交包含多个类型的变更怎么办？

A: 尽量拆分成多个提交。如果确实需要在一个提交中包含多个变更，选择最主要的类型。

### Q: scope 应该多详细？

A: 根据项目大小决定。小项目可以使用模块名，大项目可以使用更具体的组件名。

### Q: 什么时候需要写 body？

A: 当主题无法完整表达变更内容时，或者需要解释变更原因时。

### Q: 如何处理紧急修复？

A: 使用 `fix` 类型，可以在 scope 中添加 `hotfix`：
```
fix(hotfix): 修复生产环境严重 bug
```

### Q: 中文项目应该用中文还是英文？

A: 根据团队习惯。建议 type 和 scope 使用英文，subject 和 body 使用中文。

---

## 参考资源

- [Conventional Commits 官方规范](https://www.conventionalcommits.org/)
- [Angular 提交信息规范](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
- [Semantic Versioning](https://semver.org/)

---

## 总结

约定式提交格式的优势：

1. **自动化**：可以自动生成 CHANGELOG
2. **语义化**：清晰的提交历史
3. **可读性**：易于理解和查找
4. **协作**：团队统一的提交规范
5. **版本管理**：支持语义化版本控制

遵循约定式提交规范，可以让项目的提交历史更加清晰和有价值！
