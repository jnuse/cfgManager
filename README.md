# Config Guardian

跨平台配置文件管理工具。管理多工作区配置，自动脱敏敏感信息，安全地分享你的配置文件。

## 功能

- **配置脱敏** — 自动识别密码、密钥、Token 等敏感字段并脱敏，支持手动/自动切换
- **双视图编辑** — 原始内容与脱敏结果分栏对比，滚动同步
- **多工作区** — 独立管理多个项目的配置文件
- **格式保留** — TOML 文件脱敏后保留注释和原始格式
- **冲突检测** — 基于 SHA256 的文件变更检测
- **自动保存** — 防抖 + 竞态保护
- **暗色模式**

## 支持格式

| 格式 | 脱敏 | 格式保留 |
|------|:----:|:--------:|
| TOML | Yes  | Yes      |
| YAML | Yes  | —        |
| JSON | Yes  | —        |
| .env | Yes  | —        |
| 其他 | —    | —        |

## 技术栈

**后端** — Rust / Tauri 2 / SQLite (sqlx) / tokio

**前端** — React 19 / TypeScript / Monaco Editor / Zustand / Tailwind CSS / Vite

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 生产构建
npm run tauri build
```

**环境要求：** Node.js >= 18, Rust >= 1.70, Tauri CLI 2.x

## 许可证

[GPL-3.0](LICENSE)
