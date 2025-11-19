# 图标生成说明

本文档说明如何为 AI Git Commit 扩展创建符合 VSCode 市场要求的图标。

## 图标要求

VSCode 市场要求的图标规格：
- **尺寸**: 128x128 像素
- **格式**: PNG
- **背景**: 可以是透明或有颜色
- **文件大小**: 建议 < 50KB

## 从 SVG 转换为 PNG

我们已经创建了 `resources/icon.svg` 文件。你需要将其转换为 PNG 格式。

### 方法 1: 使用在线工具

1. 访问 https://cloudconvert.com/svg-to-png
2. 上传 `resources/icon.svg`
3. 设置输出尺寸为 128x128
4. 下载转换后的 PNG 文件
5. 保存为 `resources/icon.png`

### 方法 2: 使用 Inkscape（推荐）

```bash
# 安装 Inkscape
# Windows: 从 https://inkscape.org/ 下载安装
# Mac: brew install inkscape
# Linux: sudo apt-get install inkscape

# 转换命令
inkscape resources/icon.svg --export-type=png --export-filename=resources/icon.png --export-width=128 --export-height=128
```

### 方法 3: 使用 ImageMagick

```bash
# 安装 ImageMagick
# Windows: 从 https://imagemagick.org/ 下载安装
# Mac: brew install imagemagick
# Linux: sudo apt-get install imagemagick

# 转换命令
convert -background none -resize 128x128 resources/icon.svg resources/icon.png
```

### 方法 4: 使用 Node.js (sharp)

```bash
# 安装依赖
npm install sharp

# 创建转换脚本
node -e "const sharp = require('sharp'); sharp('resources/icon.svg').resize(128, 128).png().toFile('resources/icon.png');"
```

## 图标设计说明

当前图标设计包含：

1. **渐变背景**: 紫色渐变圆形背景（#667eea 到 #764ba2）
2. **Git 分支图标**: 左侧白色的 Git 分支结构
3. **AI 星光图标**: 右侧金色的 AI 星光效果
4. **COMMIT 文字**: 底部白色气泡中的 "COMMIT" 文字

这个设计传达了：
- Git 版本控制（分支图标）
- AI 智能（星光效果）
- 提交信息（COMMIT 文字）

## 可选：创建不同尺寸的图标

如果需要在不同场景使用不同尺寸的图标：

```bash
# 16x16 (用于状态栏)
convert -background none -resize 16x16 resources/icon.svg resources/icon-16.png

# 32x32 (用于菜单)
convert -background none -resize 32x32 resources/icon.svg resources/icon-32.png

# 64x64 (用于设置)
convert -background none -resize 64x64 resources/icon.svg resources/icon-64.png

# 128x128 (用于市场)
convert -background none -resize 128x128 resources/icon.svg resources/icon.png

# 256x256 (高清版本)
convert -background none -resize 256x256 resources/icon.svg resources/icon-256.png
```

## 验证图标

转换完成后，请验证：

1. ✅ 文件大小 < 50KB
2. ✅ 尺寸正确 (128x128)
3. ✅ 图标清晰，没有模糊
4. ✅ 颜色正确，没有失真
5. ✅ 在浅色和深色背景下都清晰可见

## 在 package.json 中引用

转换完成后，在 `package.json` 中添加：

```json
{
  "icon": "resources/icon.png"
}
```

## 设计原则

### 1. 简洁性
- 避免过多细节
- 保持设计简洁
- 确保小尺寸下清晰可辨

### 2. 识别性
- 图标应该能快速识别
- 与其他扩展有明显区别
- 传达扩展的核心功能

### 3. 一致性
- 符合 VSCode 设计语言
- 与市场其他图标风格协调
- 保持品牌一致性

### 4. 可访问性
- 在不同主题下都清晰
- 考虑色盲用户
- 确保对比度足够

## 颜色建议

### 主色调
- **紫色**: #667eea (主色)
- **深紫色**: #764ba2 (渐变)
- **白色**: #ffffff (文字和图标)
- **金色**: #ffd700 (星光效果)

### 主题适配
- **浅色主题**: 使用深色背景
- **深色主题**: 确保足够对比度
- **高对比度**: 考虑特殊需求

## 文件组织

```
resources/
├── icon.svg                    # 矢量原图
├── icon.png                    # 128x128 PNG (市场用)
├── icon-16.png                 # 16x16 (状态栏)
├── icon-32.png                 # 32x32 (菜单)
├── icon-64.png                 # 64x64 (设置)
└── icon-256.png                # 256x256 (高清)
```

## 优化技巧

### 1. 文件大小优化
- 使用适当的压缩级别
- 移除不必要的元数据
- 优化颜色深度

### 2. 质量优化
- 使用矢量源文件
- 避免多次转换
- 检查不同缩放级别

### 3. 兼容性优化
- 测试不同操作系统
- 验证不同 VSCode 版本
- 确保主题兼容性

## 常见问题

### Q: 图标在深色主题下不清晰？

A: 增加对比度，使用更亮的颜色，或为深色主题创建变体。

### Q: 文件大小过大？

A: 减少颜色数量，增加压缩，简化设计元素。

### Q: 小尺寸下模糊？

A: 确保使用矢量源文件，避免位图缩放，简化细节。

### Q: 透明背景显示异常？

A: 检查 PNG 格式设置，确保使用 Alpha 通道。

## 更新流程

当需要更新图标时：

1. **修改 SVG 源文件**
2. **验证设计效果**
3. **转换为各尺寸 PNG**
4. **测试在不同环境下的显示**
5. **更新 package.json 引用**
6. **提交变更**

## 参考资源

- [VSCode 扩展图标指南](https://code.visualstudio.com/api/references/extension-manifest#icon)
- [Favicon 生成工具](https://favicon.io/)
- [SVG 转 PNG 工具](https://cloudconvert.com/svg-to-png)
- [图标设计灵感](https://www.flaticon.com/)

---

**相关文档**: [截图制作](screenshots.md) | [返回资源文档](../README.md) | [发布检查清单](../development/release-checklist.md)