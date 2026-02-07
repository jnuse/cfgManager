# 图标生成指南

## 方法 1: 使用 Tauri 图标生成工具（推荐）

```bash
# 使用 npx 直接执行（无需全局安装）
npx @tauri-apps/cli icon icon-source.svg

# 或者使用项目的 tauri 命令
pnpm tauri icon icon-source.svg
```

这个命令会自动生成：
- `src-tauri/icons/32x32.png`
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/128x128@2x.png`
- `src-tauri/icons/icon.icns` (macOS)
- `src-tauri/icons/icon.ico` (Windows)

## 方法 2: 在线工具

如果上述命令不工作，可以使用在线工具：

1. 访问 https://www.icoconverter.com/ 或 https://convertio.co/
2. 上传 `icon-source.svg`
3. 转换为以下格式：
   - PNG: 32x32, 128x128, 256x256
   - ICO: Windows 图标
   - ICNS: macOS 图标

## 方法 3: 使用 ImageMagick

```bash
# 安装 ImageMagick
# Windows: choco install imagemagick
# macOS: brew install imagemagick

# 生成 PNG
magick icon-source.svg -resize 32x32 src-tauri/icons/32x32.png
magick icon-source.svg -resize 128x128 src-tauri/icons/128x128.png
magick icon-source.svg -resize 256x256 src-tauri/icons/128x128@2x.png

# 生成 ICO (Windows)
magick icon-source.svg -define icon:auto-resize=256,128,64,48,32,16 src-tauri/icons/icon.ico
```

## 图标设计说明

当前图标设计包含：
- 蓝色背景：代表专业和安全
- 盾牌形状：代表保护和安全
- 文档图标：代表配置文件
- 锁图标：代表加密和脱敏功能

你可以根据需要修改 `icon-source.svg` 中的颜色和形状。
