# 小白AI

<div align="center">

**基于 Claude Agent SDK 的智能 AI 助手**

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](https://github.com/your-username/lusun-ai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/your-username/lusun-ai)

</div>

## ✨ 功能特性

### 🎯 核心功能
- **智能对话** - 支持 Claude 3.5 和智谱 GLM 等多个模型
- **流式响应** - 实时显示 AI 回复，提供流畅体验
- **对话管理** - 自动保存对话历史，支持新建/删除对话
- **Markdown 渲染** - 完美支持 Markdown 格式和代码高亮

### 🛠️ 高级功能
- **文件操作** - AI 可以创建、读取、列出文件
- **多模型支持** - 灵活切换不同的 AI 模型
- **图片上传** - 支持上传图片进行对话
- **对话导出** - 将对话导出为 Markdown 文件

### 📱 跨平台支持
- Windows (x64, ARM64)
- macOS (Intel, Apple Silicon)
- Linux (AppImage, deb, rpm)

## 🚀 快速开始

### 下载安装

访问 [Releases](https://github.com/your-username/lusun-ai/releases) 页面下载适合你系统的安装包：

- **Windows**: `小白AI Setup x.x.x.exe`
- **macOS**: `小白AI-x.x.x.dmg`
- **Linux**: `小白AI-x.x.x.AppImage`

详细安装说明请查看 [BUILD.md](BUILD.md)

### 首次配置

1. 启动应用后，点击设置按钮
2. 选择模型提供商：
   - **Claude (Anthropic)**: 需要 [API Key](https://console.anthropic.com)
   - **智谱 GLM**: 需要 [API Key](https://open.bigmodel.cn)
3. 输入 API Key 并保存
4. 选择模型（推荐 Claude 3.5 Sonnet 或 GLM-4.7）
5. 开始对话！

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

### 文件操作能力

AI 可以执行以下文件操作：

| 工具 | 说明 | 示例 |
|------|------|------|
| write_file | 创建文件 | "创建 test.txt 文件" |
| read_file | 读取文件 | "读取 config.json" |
| list_directory | 列出目录 | "列出当前目录文件" |
| create_directory | 创建目录 | "创建 my-project 文件夹" |

**默认工作目录**: `~/Downloads`

## ⚙️ 配置说明

### 配置文件位置

- **Windows**: `%APPDATA%\lusun-ai\config.json`
- **macOS**: `~/Library/Application Support/lusun-ai/config.json`
- **Linux**: `~/.config/lusun-ai/config.json`

### 配置项

```json
{
  "modelProvider": "anthropic",  // 模型提供商: anthropic 或 zhipu
  "apiKey": "sk-ant-xxxxx",      // API Key
  "model": "claude-3-5-sonnet-20241022",  // 模型 ID
  "workDirectory": "/Users/xxx/Downloads"  // 工作目录
}
```

## 🛠️ 开发说明

如果你想自己编译开发，请查看 [BUILD.md](BUILD.md) 获取详细的打包说明。

### 环境要求

- Node.js 18+
- npm 9+

### 开发运行

```bash
# 克隆仓库
git clone https://github.com/your-username/lusun-ai.git
cd lusun-ai

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

### v1.3.0 (2025-01-05)
- ✨ 新增文件操作工具（write_file, read_file, list_directory, create_directory）
- ✨ 支持 Markdown 渲染和代码语法高亮
- 🐛 修复对话历史保存问题
- 🐛 修复 Agent 初始化逻辑

### v1.2.0
- ✨ 新增 Markdown 渲染支持
- ✨ 新增代码语法高亮
- 🎨 优化 UI 样式

### v1.1.4
- 🐛 修复文件系统访问问题
- 🐛 修复渲染进程中的 require 错误

### v1.0.0
- 🎉 首次发布

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

## 🙏 致谢

- [Anthropic](https://www.anthropic.com) - Claude API
- [Electron](https://www.electronjs.org) - 跨平台桌面应用框架
- [React](https://react.dev) - UI 框架
- [Vite](https://vitejs.dev) - 构建工具

## 📮 联系方式

- 作者：芦笋
- 邮箱：your-email@example.com
- GitHub：[@your-username](https://github.com/your-username)

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star！**

Made with ❤️ by 芦笋

</div>
