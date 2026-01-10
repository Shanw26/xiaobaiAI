# 小白AI

<div align="center">

**操作系统级的 AI 助手客户端，简单、强大、易用**

[![Version](https://img.shields.io/badge/version-2.20.5-blue.svg)](https://github.com/Shanw26/xiaobaiAI)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey.svg)](https://github.com/Shanw26/xiaobaiAI)

</div>

## ✨ 功能特性

### 🎯 核心功能
- **手机号登录** - 无需密码，验证码快速登录（基于 Supabase）
- **智能对话** - 支持 Claude 3.5 和智谱 GLM 等多个模型
- **流式响应** - 实时显示 AI 回复，提供流畅体验
- **对话管理** - 自动保存对话历史到云端，支持新建/删除对话
- **Markdown 渲染** - 完美支持 Markdown 格式和代码高亮

### 🛠️ 高级功能
- **文件操作** - AI 可以直接操作系统文件，创建、读取、列出文件
- **记忆系统** - 自动学习用户偏好，提供个性化服务
- **多模型支持** - 灵活切换不同的 AI 模型
- **图片上传** - 支持上传图片进行对话
- **对话导出** - 将对话导出为 Markdown 文件
- **云端同步** - API Key 和对话记录云端加密存储

### 📱 跨平台支持
- Windows (x64)
- macOS (Intel, Apple Silicon)

## 🚀 快速开始

### 下载安装

**macOS (Intel)**:
[下载 DMG (144 MB)](https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/mac/小白AI-2.20.2.dmg)

**macOS (Apple Silicon M1/M2/M3)**:
[下载 DMG (137 MB)](https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/mac/小白AI-2.20.2-arm64.dmg)

**Windows**:
[下载安装包 (待上传)](https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/win/小白AI%20Setup%202.20.2.exe)

### 首次配置

1. **启动应用** - 双击安装包，拖拽到应用程序文件夹
2. **手机号登录** - 输入手机号，获取验证码登录（无需密码）
3. **配置 API Key** - 在设置中配置 API Key：
   - **Claude (Anthropic)**: 获取 [API Key](https://console.anthropic.com)
   - **智谱 GLM**: 获取 [API Key](https://open.bigmodel.cn)
4. **选择模型** - 推荐使用 Claude 3.5 Sonnet 或 GLM-4
5. **开始对话** - 享受 AI 助手带来的便利！

## 💡 使用技巧

### 基础对话

```
你好，请介绍一下你自己
```

### 代码相关

```
帮我写一个 Python 函数，计算斐波那契数列
```

### 文件操作

```
请在 Downloads 文件夹创建一个 hello.txt 文件，内容是 "Hello World"
```

```
列出当前目录的所有文件
```

### 复杂任务

```
创建一个项目文件夹结构：
- my-project/
  - src/
  - docs/
  - README.md

并在 README.md 中写入项目介绍
```

## 🎨 功能说明

### Markdown 支持

小白AI 完美支持 Markdown 渲染：

- ✅ 标题 (h1-h4)
- ✅ 列表（有序、无序）
- ✅ 代码块（带语法高亮）
- ✅ 表格
- ✅ 链接
- ✅ 引用块
- ✅ 分隔线

### 记忆系统

小白AI 会自动记录：
- ✅ 对话历史（用于上下文理解）
- ✅ 用户偏好和习惯
- ✅ 常用操作模式
- ✅ 个人信息设置

### 文件操作能力

AI 可以执行以下文件操作：

| 工具 | 说明 | 示例 |
|------|------|------|
| write_file | 创建文件 | "创建 test.txt 文件" |
| read_file | 读取文件 | "读取 config.json" |
| list_directory | 列出目录 | "列出当前目录文件" |
| create_directory | 创建目录 | "创建 my-project 文件夹" |

**数据存储位置**: `~/Library/Application Support/xiaobai-ai/` (macOS)

## ⚙️ 配置说明

### 配置文件位置

- **Windows**: `%APPDATA%\xiaobai-ai\config.json`
- **macOS**: `~/Library/Application Support/xiaobai-ai/config.json`
- **Linux**: `~/.config/xiaobai-ai/config.json`

### 配置项

```json
{
  "provider": "zhipu",           // 模型提供商: anthropic 或 zhipu
  "apiKey": "your-api-key",      // API Key
  "model": "glm-4.7",           // 模型 ID
  "globalPromptPath": "",       // 全局提示文件路径（可选）
  "memoryPath": ""              // 记忆文件路径（自动管理）
}
```

## 🛠️ 开发说明

### 环境要求

- Node.js 18+
- npm 9+
- Supabase 账号（用于手机号登录和云端存储）

### 环境变量配置

1. **复制环境变量模板**：
```bash
cp .env.example .env
```

2. **配置 `.env` 文件**：
```bash
# Supabase 配置（必需）
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Apple Developer 配置（macOS 打包必需）
APPLE_ID=your-apple-id@example.com
APPLE_ID_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=your-team-id

# 阿里云 OSS 配置（上传到 OSS 必需）
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket-name
```

3. **获取配置信息**：
   - Supabase: https://supabase.com/dashboard
   - Apple Developer: https://appleid.apple.com
   - 阿里云 OSS: https://ram.console.aliyun.com

4. **换电脑后快速配置**（从 GitHub 克隆）：

如果你换电脑后从 GitHub 克隆代码，可以使用自动化脚本快速配置：

```bash
# 1. 克隆代码
git clone https://github.com/Shanw26/xiaobaiAI.git
cd 小白AI

# 2. 安装依赖
npm install

# 3. 使用自动化脚本生成 .env 文件（推荐）⭐
# 需要先确保同步空间的 key.md 文件已同步
node scripts/setup-env-from-key.js

# 4. 启动开发服务器
npm run dev
```

**脚本说明**：
- 自动从 `key.md` 读取所有密钥
- 自动生成 `.env` 文件
- `key.md` 位置：`/Downloads/同步空间/Claude code/key.md`

**手动配置（备用方案）**：
```bash
# 如果自动脚本不可用，可以手动配置
cp .env.example .env
# 根据 key.md 中的密钥手动填写 .env 文件
```

### 开发运行

```bash
# 克隆仓库
git clone https://github.com/Shanw26/xiaobaiAI.git
cd xiaobaiAI

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入真实的配置信息

# 启动开发服务器
npm run dev
```

### 构建和打包

详细打包说明请参考：[BUILD.md](docs/BUILD.md)

```bash
# 构建前端
npm run build

# 打包应用
npm run dist:mac:notarized    # macOS（含签名和公证）
npm run dist:win             # Windows
```

**打包策略**：
- macOS：本地打包（需要 Apple Developer 证书）
- Windows：使用 GitHub Actions CI/CD（自动构建）

## 📝 更新日志

### v2.20.5 (2026-01-10) - Windows 网络和样式优化
- 🐛 修复 Windows 上 "Failed to fetch" 网络请求失败问题
- 🎨 优化 Windows 弹窗样式，完全符合 Fluent Design 规范
- ✨ 实现平台样式隔离（Mac/Windows 互不影响）
- 🔧 增强错误日志，提供更详细的调试信息
- 📱 修复所有弹窗组件的平台类名应用

### v2.20.4 (2026-01-10) - Windows 截图修复
- 🐛 修复 Windows 平台截图功能失效问题
- 🔧 修复 PowerShell Add-Type 重复加载错误

### v2.20.3 (2026-01-10) - 启动速度优化
- ⚡ 优化应用启动流程，立即显示主界面
- 🚀 Supabase 配置后台异步加载
- ✅ 提升用户体验（启动速度提升 500ms-2s）

### v2.20.2 (2026-01-09) - 开源版本
- 🎉 准备开源，完善安全检查
- ✨ 添加 `.env.example` 环境变量模板
- 📚 完善文档（安全检查报告、用户介绍、构建文档）
- 🔐 安全增强：Pre-commit hook 防止敏感信息泄露
- 🐛 修复版本号同步问题

### v2.20.1 (2026-01-08) - 打包规范更新
- 📦 更新打包策略：macOS 本地打包，Windows CI/CD
- 🎨 优化 GitHub Actions 工作流
- 📚 完善 BUILD.md 构建文档

### v2.20.0 (2026-01-07) - 安全增强
- 🔒 API Key 云端加密存储（AES-256-GCM）
- 🔐 每用户独立加密密钥（PBKDF2）
- ✨ 完整的安全审计和迁移脚本
- 🐛 修复本地数据库安全问题

### v2.11.6 (2026-01-06) - 登录优化
- ✨ 手机号验证码登录（基于 Supabase）
- 🎨 优化登录流程和错误处理
- 🐛 修复登录状态管理问题

### v2.0.0 (2026-01-05) - 重大版本更新
- ✨ 版本检查机制，大版本自动清空数据
- ✨ 新用户悬浮球引导
- ✨ 文件名英文化（user-info.md, memory.md）
- 🎨 优化用户体验，使用标准数据目录
- 🐛 修复 EPIPE 错误
- 🐛 修复 Token 统计功能

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开源协议

本项目基于 [MIT License](LICENSE) 开源。

### 项目结构

```
小白AI/
├── electron/           # Electron 主进程代码
├── src/               # 前端源代码（React）
├── public/            # 静态资源
├── docs/              # 项目文档
│   ├── BUILD.md       # 构建和打包文档
│   └── ...
├── scripts/           # 构建和发布脚本
├── supabase/          # Supabase 数据库迁移脚本
├── .env.example       # 环境变量模板
└── README.md          # 项目说明
```

### 安全

- ✅ API Key 云端加密存储（AES-256-GCM）
- ✅ Pre-commit hook 防止敏感信息泄露
- ✅ 完整的安全审计报告：[开源安全检查报告-v2.20.2.md](开源安全检查报告-v2.20.2.md)

如发现安全问题，请直接提交 [Private Advisory](https://github.com/Shanw26/xiaobaiAI/security/advisories)。

## 📄 许可证

[MIT License](LICENSE)

## 🙏 致谢

- [Anthropic](https://www.anthropic.com) - Claude API
- [智谱AI](https://open.bigmodel.cn) - GLM API
- [Electron](https://www.electronjs.org) - 跨平台桌面应用框架
- [React](https://react.dev) - UI 框架
- [Vite](https://vitejs.dev) - 构建工具

## 📮 联系方式

- 作者：晓力
- GitHub：[@Shanw26](https://github.com/Shanw26)
- 项目：https://github.com/Shanw26/xiaobaiAI

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star！**

Made with ❤️ by 晓力

</div>
