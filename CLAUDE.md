## 技术栈

### 后端 (Rust)
- **Tauri 2** - 桌面应用框架
- **tokio 1** - 异步运行时
- **sqlx 0.7** - SQLite 数据库操作
- **serde 1** - 序列化/反序列化
- **serde_json 1** - JSON 解析
- **serde_yaml 0.9** - YAML 解析
- **toml 0.8** - TOML 解析
- **dotenvy 0.15** - .env 文件解析
- **sha2 0.10** - SHA256 哈希计算
- **hex 0.4** - 十六进制编码

### 前端 (TypeScript/React)
- **React 19.1.0** - UI 框架
- **TypeScript 5.8.3** - 类型系统
- **Vite 7.0.4** - 构建工具
- **Zustand 4.5.0** - 状态管理
- **Monaco Editor 0.45.0** - 代码编辑器
- **Tailwind CSS 3.4.1** - CSS 框架

### 构建工具
- **npm** - 包管理器
- **Tauri CLI 2** - Tauri 命令行工具
- **GitHub Actions** - CI/CD

## 目录结构

```
confManager/
├── .github/
│   └── workflows/
│       └── release.yml          # GitHub Actions 构建配置
├── src-tauri/                   # Rust 后端
│   ├── src/
│   │   ├── main.rs             # 入口文件
│   │   ├── lib.rs              # 库入口，注册模块和命令
│   │   ├── models.rs           # 数据模型定义
│   │   ├── db.rs               # SQLite 数据库操作
│   │   ├── file_system.rs      # 文件系统操作（路径验证、哈希计算）
│   │   ├── sanitizer.rs        # 配置文件脱敏引擎
│   │   ├── merger.rs           # 冲突检测逻辑
│   │   └── commands.rs         # Tauri 命令定义（13个命令）
│   ├── icons/                  # 应用图标
│   ├── capabilities/
│   │   └── default.json        # Tauri 权限配置
│   ├── Cargo.toml              # Rust 依赖配置
│   ├── tauri.conf.json         # Tauri 应用配置
│   └── build.rs                # 构建脚本
├── src/                        # React 前端
│   ├── components/
│   │   ├── ConfigList.tsx      # 配置列表组件
│   │   └── TabbedEditor.tsx    # 双视图编辑器（原始/脱敏）
│   ├── pages/
│   │   ├── Dashboard.tsx       # 主界面
│   │   └── WorkspacePicker.tsx # 工作区选择器
│   ├── stores/
│   │   └── configStore.ts      # Zustand 状态管理
│   ├── assets/                 # 静态资源
│   ├── App.tsx                 # 根组件
│   ├── App.css                 # 应用样式
│   ├── main.tsx                # 前端入口
│   ├── index.css               # 全局样式（Tailwind）
│   └── vite-env.d.ts           # Vite 类型定义
├── public/                     # 公共资源
├── package.json                # Node.js 依赖配置
├── tsconfig.json               # TypeScript 配置
├── tsconfig.node.json          # Node.js TypeScript 配置
├── vite.config.ts              # Vite 配置
├── tailwind.config.js          # Tailwind CSS 配置
├── postcss.config.js           # PostCSS 配置
├── icon-source.svg             # 图标源文件
├── ICON_GUIDE.md               # 图标生成指南
├── PLAN.MD                     # 项目规划文档
├── CLAUDE.md                   # 项目说明（本文件）
└── README.md                   # 项目说明
```

---

## 规则

1.  一切编码工作必须严格在项目根目录展开。
2.  编译和测试部分由用户负责。
4.  一切数据以代码为准，执行任务前要检查代码是否存在以及是否已经有内容。
5.  编码任务的每一步都必须告知用户做了什么以及为什么这么做。
6.  禁止输出任何文档除非用户要求。
7.  一切需要执行的命令应告诉用户，由用户来执行。