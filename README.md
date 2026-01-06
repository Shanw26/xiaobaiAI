# 小白AI

<div align="center">

**基于 Claude Agent SDK 的 AI 助手客户端，简单、强大、易用**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/Shanw26/xiaobaiAI)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/Shanw26/xiaobaiAI)

</div>

## ✨ 功能特性

### 🎯 核心功能
- **智能对话** - 支持 Claude 3.5 和智谱 GLM 等多个模型
- **流式响应** - 实时显示 AI 回复，提供流畅体验
- **对话管理** - 自动保存对话历史，支持新建/删除对话
- **Markdown 渲染** - 完美支持 Markdown 格式和代码高亮

### 🛠️ 高级功能
- **文件操作** - AI 可以创建、读取、列出文件
- **记忆系统** - 自动学习用户偏好，提供个性化服务
- **多模型支持** - 灵活切换不同的 AI 模型
- **图片上传** - 支持上传图片进行对话
- **对话导出** - 将对话导出为 Markdown 文件

### 📱 跨平台支持
- Windows (x64, ARM64)
- macOS (Intel, Apple Silicon)
- Linux (AppImage, deb, rpm)

## 🚀 快速开始

### 下载安装

访问 [Releases](https://github.com/Shanw26/xiaobaiAI/releases) 页面下载适合你系统的安装包：

- **Windows**: `小白AI Setup 2.0.0.exe`
- **macOS**: `小白AI-2.0.0.dmg`
- **Linux**: `小白AI-2.0.0.AppImage`

### 首次配置

1. 启动应用后，点击右下角悬浮球（👋）完善个人信息
2. 在设置中配置 API Key：
   - **Claude (Anthropic)**: 需要 [API Key](https://console.anthropic.com)
   - **智谱 GLM**: 需要 [API Key](https://open.bigmodel.cn)
3. 选择模型（推荐 Claude 3.5 Sonnet 或 GLM-4.7）
4. 开始对话！

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

### 开发运行

```bash
# 克隆仓库
git clone https://github.com/Shanw26/xiaobaiAI.git
cd xiaobaiAI

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 构建

```bash
# 构建前端
npm run build

# 打包应用
npm run dist        # 当前平台
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist:linux  # Linux
```

## 📝 更新日志

### v2.0.0 (2026-01-06) - 重大版本更新
- ✨ 版本检查机制，大版本自动清空数据
- ✨ 新用户悬浮球引导
- ✨ 文件名英文化（user-info.md, memory.md）
- 🎨 优化用户体验，使用标准数据目录
- 🐛 修复 EPIPE 错误
- 🐛 修复 Token 统计功能

### v1.8.2
- 🐛 修复输入框高度闪烁问题
- 🐛 修复 Token 统计显示为 0 的问题
- ✨ 新增工作目录迁移功能
- 🎨 设置页面全面优化

### v1.0.0
- 🎉 首次发布

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

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
