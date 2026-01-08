# 小白AI - 打包分发指南

## 打包说明

### 前置要求

- Node.js 18+
- npm 或 yarn
- 根据目标平台的不同，需要相应的开发环境

### macOS 打包

```bash
# 构建并打包为 macOS 应用（生成 .dmg 和 .zip）
npm run dist:mac
```

**输出文件**：`release/小白AI-{version}.dmg` 和 `小白AI-{version}-mac.zip`

**支持架构**：
- x64 (Intel 芯片)
- arm64 (Apple Silicon M1/M2/M3)

**分发**：
- `.dmg` 文件可直接拖拽安装
- `.zip` 文件解压后得到 `.app` 文件夹

### Windows 打包

```bash
# 构建并打包为 Windows 应用（生成 .exe 安装包和便携版）
npm run dist:win
```

**输出文件**：
- `release/小白AI Setup {version}.exe` - 安装程序
- `release/小白AI {version}.exe` - 便携版（无需安装）

**支持架构**：
- x64 (64位 Intel/AMD)
- arm64 (Windows on ARM)

**分发**：
- 安装程序：双击安装，会在桌面和开始菜单创建快捷方式
- 便携版：直接运行，无需安装

### Linux 打包

```bash
# 构建并打包为 Linux 应用（生成 AppImage, deb, rpm）
npm run dist:linux
```

**输出文件**：
- `release/小白AI-{version}.AppImage` - 通用格式
- `release/小白AI_{version}_amd64.deb` - Debian/Ubuntu
- `release/小白AI-{version}.rpm` - Fedora/RedHat

**分发**：
- AppImage：添加执行权限后直接运行 `chmod +x 小白AI-*.AppImage`
- deb：`sudo dpkg -i 小白AI_*.deb`
- rpm：`sudo rpm -i 小白AI-*.rpm`

### 打包所有平台

```bash
# 打包当前平台
npm run dist

# 仅构建不打包（用于测试）
npm run pack
```

## 用户首次使用说明

### Windows 用户

1. 下载 `小白AI Setup x.x.x.exe`
2. 双击运行安装程序
3. 选择安装目录（默认：`C:\Users\用户名\AppData\Local\Programs\小白AI`）
4. 完成安装后，从桌面或开始菜单启动

### macOS 用户

1. 下载 `小白AI-x.x.x.dmg`
2. 双击打开 DMG 文件
3. 将"小白AI"拖拽到"应用程序"文件夹
4. 在启动台中找到并打开"小白AI"
5. 如果提示"无法打开因为来自身份不明的开发者"：
   - 右键点击应用 → "打开" → "打开"
   - 或在"系统设置" → "隐私与安全性"中允许

### Linux 用户

**AppImage 版本**：
```bash
chmod +x 小白AI-x.x.x.AppImage
./小白AI-x.x.x.AppImage
```

**Debian/Ubuntu**：
```bash
sudo dpkg -i 小白AI_x.x.x_amd64.deb
# 如果有依赖问题，运行：
sudo apt-get install -f
```

**Fedora/RedHat**：
```bash
sudo rpm -i 小白AI-x.x.x.rpm
```

## 配置说明

### 首次启动

应用首次启动时，会自动打开设置窗口，需要配置：

1. **API Key**：选择模型提供商并输入 API Key
   - **Claude (Anthropic)**：需要从 https://console.anthropic.com 获取
   - **智谱 GLM**：需要从 https://open.bigmodel.cn 获取

2. **模型选择**：根据需要选择模型
   - Claude 3.5 Sonnet / Haiku / Opus
   - GLM-4.7 / 4.5 Air / 4.5 Flash

3. **工作目录**（可选）：AI 创建文件的默认目录

### 配置文件位置

- **Windows**：`C:\Users\用户名\AppData\Roaming\lusun-ai\config.json`
- **macOS**：`~/Library/Application Support/lusun-ai/config.json`
- **Linux**：`~/.config/lusun-ai/config.json`

### 对话历史位置

- **Windows**：`C:\Users\用户名\AppData\Roaming\lusun-ai\conversations.json`
- **macOS**：`~/Library/Application Support/lusun-ai/conversations.json`
- **Linux**：`~/.config/lusun-ai/conversations.json`

## 分发检查清单

### 打包前

- [ ] 确认版本号已更新（package.json 和 Sidebar.jsx 中的版本号一致）
- [ ] 测试所有核心功能正常
- [ ] 确认没有开发相关的调试代码
- [ ] 检查 API Key 不会在打包中泄露

### 打包后

- [ ] 在干净的虚拟机/测试机上测试安装包
- [ ] 验证首次启动流程
- [ ] 测试配置保存功能
- [ ] 测试对话历史保存
- [ ] 验证文件操作功能

## 常见问题

### Q: macOS 打包后无法打开

A: 需要代码签名。如果没有开发者账号，用户需要：
1. 右键点击应用 → "打开"
2. 或在终端运行：`sudo spctl --master-disable`（不推荐）

### Q: Windows 杀毒软件报毒

A: Electron 应用有时会被误报。建议：
1. 使用代码签名（需要 EV 代码签名证书）
2. 提供用户信任的下载源
3. 在 GitHub 等平台发布

### Q: Linux AppImage 无法运行

A: 确保：
1. 已添加执行权限：`chmod +x 小白AI.AppImage`
2. 系统已安装 FUSE：`sudo apt-get install fuse` (Ubuntu/Debian)

### Q: 如何减小安装包大小

A:
1. 移除不必要的依赖
2. 使用 `electron-builder` 的 compression 选项
3. 仅打包目标平台的架构

## 版本发布

### 1. 更新版本号

```bash
# package.json
"version": "1.3.0"

# src/components/Sidebar.jsx
<span className="logo-version">v1.3.0</span>
```

### 2. 构建 Release

```bash
npm run dist:mac  # macOS
npm run dist:win  # Windows
npm run dist:linux  # Linux
```

### 3. 上传到分发平台

- GitHub Releases
- 官网下载页面
- 其他软件分发平台

## 技术支持

- 项目地址：[GitHub Repository]
- 问题反馈：[GitHub Issues]
- 使用文档：[README.md]
