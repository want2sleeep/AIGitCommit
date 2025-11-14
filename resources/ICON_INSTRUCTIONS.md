# 图标生成说明

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

## 注意事项

- 确保图标在小尺寸下仍然清晰可辨
- 避免使用过多细节，保持简洁
- 确保图标在浅色和深色主题下都好看
- 遵循 VSCode 的视觉设计规范
