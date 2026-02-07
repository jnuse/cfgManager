### **项目规划文档：配置守护者 (Config Guardian)**

#### **1. 项目概述**

*   **项目名称：** 配置守护者 (Config Guardian)
*   **一句话简介：** 一款基于 Tauri v2 的桌面应用，用于安全、便捷地管理、编辑和部署各类配置文件。
*   **核心价值：**
    1.  **集中管理：** 将散落在各处的配置文件统一管理，告别“我的密码在哪来着？”的烦恼。
    2.  **安全部署：** 提供灵活的双模脱敏功能，确保分享或部署到生产环境的配置文件不包含敏感信息。
    3.  **高效编辑：** 内置支持语法高亮的专业代码编辑器，提供清晰的原始/脱敏双视图编辑体验。
*   **目标用户：** 开发者、运维工程师、系统管理员、任何需要频繁与配置文件打交道的人。
*   **目标平台：** Windows (首要)，后续可轻松扩展到 macOS 和 Linux。

#### **2. 核心功能拆解**

1.  **工作区与配置库 (Workspace & Config Library)**
    *   **工作区为根：** 应用引入“工作区”概念，用户首先设定一个本地目录作为工作区。所有配置文件都将相对于此工作区进行管理。
    *   **添加配置：** 用户添加新配置时，需提供一个自定义“名称”和文件相对于工作区的“相对路径”。
    *   **内容存储：** 添加后，工具会读取文件内容，并将其作为“原始内容”保存在本地数据库中。
    *   **列表展示：** 以列表形式展示所有已管理的配置，显示名称、相对路径等信息。
    *   **管理条目：** 用户可以删除或修改一个配置项的元数据。

2.  **文件同步与合并 (File Synchronization & Merging)**
    *   **变更检测：** 当用户在应用内选中一个配置项时，工具会通过比对文件哈希或最后修改时间，自动检测其源文件是否在外部被修改。
    *   **冲突处理：** 如果检测到外部变更，应用将提示用户，并提供一个三方合并（Three-way Merge）视图，类似于 `git merge` 冲突解决界面。用户可以在此视图中清晰地看到数据库中的版本、外部文件的版本以及合并结果，并手动解决冲突，最终决定要保存的内容。

3.  **双视图编辑器 (Tabbed Editor)**
    *   **视图分离：** 当用户选择一个配置后，编辑区会以标签页（Tabs）形式提供两个视图：
        *   **“原始”视图：** 用于查看和编辑配置文件的原始、完整内容 (`original_content`)。
        *   **“脱敏”视图：** 用于管理该配置的脱敏版本。
    *   **语法高亮：** 两个视图均会根据文件类型（如 `.json`, `.yaml`）自动应用语法高亮。

4.  **脱敏引擎与策略 (Sanitization Engine)**
    *   这是一个双模系统，为用户提供最大的灵活性。
    *   **模式一：自动结构化脱敏 (Automated Structured Sanitization)**
        *   **适用对象：** 可被程序解析的结构化文件，如 `JSON`, `YAML`, `TOML`, `.env`。
        *   **工作方式：** 工具将执行**递归遍历**，保留所有键 (key) 和文件结构。对于值 (value)，则采用**类型保持**策略进行替换，生成脱敏文本。
            *   **递归策略：** 对于嵌套的对象或数组，会深入其内部，逐一替换值，而不是替换整个对象。
            *   **类型保持：** `string` -> `***`, `number` -> `0`, `boolean` -> `false`, `null` -> `null`。
    *   **模式二：手动指定脱敏内容 (Manual Override)**
        *   **适用对象：** 任何配置文件，特别是格式复杂或无法自动解析的文件。
        *   **工作方式：** 用户可以在“脱敏”视图中直接编辑或粘贴一份已经脱敏好的内容。这份内容将被独立保存为该配置的“手动脱敏版” (`sanitized_content`)。

5.  **部署与写入 (Deployment)**
    *   **直接写入 (Direct Write)：** 将“原始”视图中的最新内容，完整地写回到该配置对应的“相对路径”所指向的文件。
    *   **脱敏写入 (Sanitized Write)：** 执行此操作时，程序将遵循以下逻辑：
        1.  **优先使用手动版：** 检查是否存在“手动脱敏版”。如果存在，则直接将该版本内容写入文件。
        2.  **回退到自动版：** 如果不存在手动版，则触发“自动结构化脱敏”流程。
        3.  **错误处理：** 在自动脱敏过程中，如果因文件内容语法错误（如 JSON 格式不正确）导致解析失败，操作将被终止，并向用户弹出明确的错误提示。
        4.  **写入文件：** 成功生成脱敏内容后，将其写入文件。如果文件格式不支持自动脱敏，则向用户发出提示。

#### **3. 技术架构与选型**

*   **核心框架：** **Tauri v2** (Rust 后端 + Web 前端)
*   **前端技术栈：**
    *   **构建工具：** **Vite**
    *   **UI 框架：** **React**
    *   **UI 组件库：** **Shadcn/ui** (用于构建界面，特别是 Tabs 组件)
    *   **状态管理：** **Zustand**
    *   **代码编辑器：** **Monaco Editor**
    *   **CSS 方案：** **Tailwind CSS**
*   **后端技术栈 (Rust Crates)：**
    *   **核心：** `tauri`
    *   **异步运行时：** `tokio`
    *   **数据库：** `sqlx` + `sqlite`
    *   **序列化/反序列化：** `serde`
    *   **配置文件解析：**
        *   `serde_json` (for .json)
        *   `serde_yaml` (for .yaml)
        *   `toml` (for .toml)
        *   `dotenvy` (for .env)
*   **核心数据模型 (数据库表 `configs`)：**
    *   `id` (INTEGER, PRIMARY KEY): 唯一标识符。
    *   `name` (TEXT): 用户自定义的配置名称。
    *   `path` (TEXT): 配置文件相对于工作区的**相对路径**。
    *   `original_content` (TEXT): 存储文件的原始、完整内容。
    *   `sanitized_content` (TEXT, NULLABLE): 存储用户手动提供的脱敏内容。若为 `NULL`，则表示应使用自动脱敏。

#### **4. 模块拆分与实现思路**

*   **Rust 后端 (`src-tauri/src`)**
    *   **`main.rs`:** 程序入口，注册 Tauri 指令和状态。
    *   **`db.rs`:** 封装所有 `sqlx` 数据库操作，与 `configs` 表交互。
    *   **`models.rs`:** 定义与数据库表对应的 `Config` 结构体。
    *   **`commands.rs`:** 定义暴露给前端的核心指令：
        *   `add_config(workspace_root, name, relative_path)`
        *   `get_all_configs(workspace_root)`
        *   `check_file_status(id)` -> 返回文件是否在外部被修改
        *   `get_config_for_merge(id)` -> 返回 `{ db_content, disk_content }`
        *   `resolve_conflict(id, merged_content)`
        *   `update_original_content(id, content)`
        *   `update_sanitized_content(id, content)`
        *   `write_to_file_direct(id)`
        *   `write_to_file_sanitized(id)`
    *   **`sanitizer.rs`:** 实现“自动结构化脱敏”逻辑，根据文件类型调用不同解析器进行处理，并包含健壮的错误处理。
    *   **`file_system.rs`:** 封装安全的文件读写操作，处理相对路径和工作区。
    *   **`merger.rs`:** 实现三方合并逻辑。

*   **React 前端 (`src`)**
    *   **`components/TabbedEditor.jsx`:** 核心编辑组件，内部使用 Shadcn/ui 的 `Tabs` 和两个 `Monaco Editor` 实例。
    *   **`components/ConfigList.jsx`:** 左侧的配置列表组件，增加文件状态指示器（如一个点表示已修改）。
    *   **`components/MergeView.jsx`:** 用于解决冲突的三方合并视图组件。
    *   **`pages/Dashboard.jsx`:** 应用主页面，整合 `ConfigList` 和 `TabbedEditor`。
    *   **`pages/WorkspacePicker.jsx`:** 应用启动时，用于选择工作区目录的页面。
    *   **`stores/configStore.js`:** 使用 Zustand 管理全局状态，包括工作区路径、配置列表、当前选中的配置等。


#### **5. 潜在挑战与对策**

*   **挑战：** **三方合并（Three-way Merge）UI 实现。**
    *   **对策：** 集成一个成熟的 Diff/Merge 库（如 `diff-match-patch` 或基于 Monaco Editor 的 Diff 视图），为用户提供清晰、直观的冲突解决界面。
*   **挑战：** Monaco Editor 集成与打包体积。
    *   **对策：** 使用 `vite-plugin-monaco-editor` 简化集成，并配置按需加载，减小最终包体积。
*   **挑战：** 文件系统权限与工作区。
    *   **对策：** 使用 Tauri 的 `dialog` API 让用户主动选择工作区目录，并利用 `tauri-plugin-fs-scope` 将文件系统权限严格限制在该目录内，提升安全性。
*   **挑战：** 状态管理复杂性。
    *   **对策：** 借助 Zustand 保持状态逻辑清晰，为每个异步操作（如加载、保存、合并）定义明确的状态（如 `loading`, `error`）。
