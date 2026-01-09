# 小白AI - 打包分发指南

> **说明**: 本文档定义小白AI的完整打包、签名、公证和发布流程
> **适用对象**: 所有参与打包发布的开发者和AI助手
> **更新频率**: 每次打包流程变更后立即更新

---

## 🎯 打包策略

### 平台分工

| 平台 | 打包方式 | 负责方 | 原因 |
|------|---------|--------|------|
| **macOS** | 本地打包 | 开发者（晓力） | 需要 Apple Developer 证书和公证 |
| **Windows** | GitHub CI/CD | GitHub Actions | 无需本地 Windows 环境，自动化 |
| **Linux** | 按需打包 | 开发者或 CI/CD | 用户量少，按需打包 |

### macOS 打包（本地）

**优势**：
- ✅ 完整的签名和公证流程
- ✅ 可以立即测试和验证
- ✅ 无需等待 CI/CD

**命令**：
```bash
# 打包 + 签名 + 公证（推荐）
npm run dist:mac:notarized
```

### Windows 打包（GitHub CI/CD）

**优势**：
- ✅ 无需本地 Windows 环境
- ✅ 自动化构建流程
- ✅ 构建日志可追溯
- ✅ 自动上传到 GitHub Artifacts

**触发方式**：
1. **推送 Git Tag**（推荐）
   ```bash
   # 创建并推送 tag
   git tag -a v2.20.1 -m "版本 v2.20.1"
   git push origin v2.20.1
   ```

2. **手动触发**
   - 访问：https://github.com/Shanw26/xiaobaiAI/actions
   - 选择 "Build Windows" workflow
   - 点击 "Run workflow"

**下载构建产物**：
- 访问：https://github.com/Shanw26/xiaobaiAI/actions/workflows/build.yml
- 点击最新的构建任务
- 在 "Artifacts" 区域下载 `windows-installer`

---

## 📋 目录

1. [打包策略](#-打包策略)
2. [前置要求](#前置要求)
3. [版本号同步检查](#版本号同步检查-⭐)
4. [macOS 打包流程（本地）](#macos-打包流程本地-含签名公证)
5. [Windows 打包流程（GitHub CI/CD）](#windows-打包流程github-cicd)
6. [Linux 打包流程](#linux-打包流程)
7. [阿里云 OSS 上传](#阿里云-oss-上传)
8. [安全检查流程](#安全检查流程-)
9. [打包前检查清单](#打包前检查清单)
10. [打包后验证步骤](#打包后验证步骤)
11. [常见问题排查](#常见问题排查-️)
12. [用户使用指南](#用户使用指南)

---

## 前置要求

### 环境准备

**通用要求**：
- Node.js 18+ (LTS)
- npm 或 yarn
- Git

**macOS 打包要求**：
- Xcode Command Line Tools
- Apple Developer 账号
- 证书：Developer ID Application (666P8DEX39)
- Apple ID 和 App Specific Password

**Windows 打包要求**：
- Windows 10/11 操作系统
- （可选）EV 代码签名证书

**Linux 打包要求**：
- Ubuntu 20.04+ 或 Debian 11+
- dpkg、rpm 构建工具

### 环境变量配置

创建项目根目录的 `.env` 文件：

```bash
# Apple 凭证（macOS 打包必需）
APPLE_ID=your-apple-id@example.com
APPLE_ID_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=666P8DEX39

# Supabase 配置
VITE_SUPABASE_URL=https://cnszooaxwxatezodbbxq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_VwrPo1L5FuCwCYwmveIZoQ_KqEr8oLe

# 阿里云 OSS 配置（上传到 OSS 必需）
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=xiaobai-ai
```

⚠️ **安全提示**: `.env` 文件已在 `.gitignore` 中，不会提交到 Git

---

## 版本号同步检查 ⭐

### 必须同步更新的位置

打包前必须确保以下 4 个位置的版本号完全一致：

```bash
# 1. package.json
"version": "2.20.1"

# 2. electron/main.js
const APP_VERSION = '2.20.1';

# 3. src/config.js
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '2.20.1';

# 4. vite.config.js (环境变量注入)
'process.env.VITE_APP_VERSION': JSON.stringify(pkg.version || '2.20.1')
```

### 版本号检查命令

```bash
# 快速检查版本号是否一致
grep "\"version\"" package.json
grep "APP_VERSION" electron/main.js
grep "APP_VERSION" src/config.js
grep "VITE_APP_VERSION" vite.config.js
```

### 版本号规则 (语义化版本)

- **主版本 (Major)**: 重大架构变更，不兼容的修改 (例: 2.0.0 → 3.0.0)
- **次版本 (Minor)**: 新功能，向后兼容 (例: 2.6.3 → 2.7.0)
- **修订号 (Patch)**: Bug 修复、小的改进 (例: 2.6.3 → 2.6.4)

---

## macOS 打包流程（本地）含签名公证

### 方式一：标准打包命令（推荐）

```bash
# ✅ 推荐：打包 + 签名 + 公证（一键完成）
npm run dist:mac:notarized
```

**执行流程**：
1. 自动加载 `.env` 中的 Apple 凭证
2. 清理旧的构建文件
3. 运行 Vite 构建（`npm run build`）
4. 执行 electron-builder 打包
5. 自动代码签名（Developer ID Application）
6. 自动提交公证到 Apple
7. 等待公证完成（约 30-60 秒）
8. 生成最终的 DMG 文件

**输出文件**：
- `release/小白AI-2.20.1-arm64.dmg` (Apple Silicon M1/M2/M3)
- `release/小白AI-2.20.1.dmg` (Intel x64)

**验证签名**：
```bash
# 检查签名状态
spctl -a -v -t execute /path/to/小白AI.app

# 预期输出：
# 小白AI.app: accepted
# source=Notarized Developer ID
# origin=Developer ID Application: Beijing Principle Technology Co., Ltd. (666P8DEX39)
```

### 方式二：手动打包（不推荐）

```bash
# ❌ 不推荐：不会公证
npm run dist:mac
```

⚠️ **警告**: 未公证的应用在 macOS 11+ 上会弹出安全警告，用户需要手动允许

### 签名配置说明

**证书信息**：
- **证书名称**: Developer ID Application: Beijing Principle Technology Co., Ltd.
- **Team ID**: 666P8DEX39
- **有效期**: 2025-09-25 ~ 2026-09-25

**配置位置** (`package.json`):
```json
{
  "build": {
    "mac": {
      "identity": "666P8DEX39",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ]
    },
    "afterPack": "scripts/afterPack.js",
    "afterSign": "scripts/notarize.js"
  }
}
```

**权限配置** (`build/entitlements.mac.plist`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
</dict>
</plist>
```

### 打包脚本说明

**主脚本**: `scripts/package-mac.js`

```javascript
// 功能：
// 1. 加载 .env 文件
// 2. 设置环境变量（APPLE_ID, APPLE_ID_PASSWORD 等）
// 3. 清理旧构建（rm -rf release dist）
// 4. 运行 Vite 构建
// 5. 执行 electron-builder 打包
// 6. 等待公证完成
```

**签名脚本**: `scripts/afterPack.js`
- 对 app.asar 内的所有二进制文件进行签名

**公证脚本**: `scripts/notarize.js`
- 使用 @electron/notarize 提交公证
- 自动等待公证完成（超时时间：10 分钟）

### 常见错误处理

**错误 1**: `APPLE_APP_SPECIFIC_PASSWORD env var needs to be set`

**原因**: 环境变量未正确加载

**解决方案**:
```bash
# 检查 .env 文件是否存在
ls -la .env

# 检查环境变量是否正确
cat .env | grep APPLE

# 使用专用脚本（推荐）
npm run dist:mac:notarized
```

**错误 2**: `Your Apple ID account is not signed in`

**原因**: Apple 凭证过期或无效

**解决方案**:
1. 访问 https://appleid.apple.com
2. 生成新的 App Specific Password
3. 更新 `.env` 文件中的 `APPLE_ID_PASSWORD`

**错误 3**: `The specified item could not be found in the keychain`

**原因**: 证书未安装或已过期

**解决方案**:
```bash
# 检查已安装的证书
security find-identity -v -p codesigning

# 预期输出应包含：
# 1) 666P8DEX39 "Developer ID Application: Beijing Principle Technology Co., Ltd."
```

---

## Windows 打包流程（GitHub CI/CD）

### 方式一：GitHub Actions 自动打包（推荐）⭐

**配置文件**: `.github/workflows/build.yml`

**触发方式**：

1. **推送 Git Tag**（推荐）
   ```bash
   # 创建并推送 tag
   git tag -a v2.20.1 -m "版本 v2.20.1"
   git push origin v2.20.1

   # GitHub Actions 会自动触发构建
   ```

2. **手动触发**
   - 访问：https://github.com/Shanw26/xiaobaiAI/actions
   - 选择 "Build Windows" workflow
   - 点击 "Run workflow" → 选择分支 → 点击运行

**构建流程**：
```
1. 检出代码
2. 设置 Node.js 20
3. 安装依赖（npm install）
4. 构建前端（npm run build）
5. 打包 Windows 应用（electron-builder --win）
6. 上传安装包到 GitHub Artifacts
7. 保留 30 天
```

**下载构建产物**：
- 访问：https://github.com/Shanw26/xiaobaiAI/actions/workflows/build.yml
- 点击最新的构建任务
- 在 "Artifacts" 区域下载 `windows-installer`
- 解压后得到 `小白AI Setup 2.20.1.exe`

**输出文件**：
- `小白AI Setup 2.20.1.exe` - NSIS 安装程序

**支持架构**：
- x64 (64位 Intel/AMD)
- arm64 (Windows on ARM)

**优势**：
- ✅ 无需本地 Windows 环境
- ✅ 自动化构建流程
- ✅ 构建日志可追溯
- ✅ 自动上传到 GitHub Artifacts
- ✅ 支持多架构并行构建

### 方式二：本地打包（不推荐）

⚠️ **不推荐本地打包 Windows 版本**，原因：
- 需要本地 Windows 环境
- 无法自动化
- 需要手动上传

如果确实需要本地打包：

```bash
# 构建 Windows 安装包（需要在 Windows 环境）
npm run dist:win
```

**输出文件**：
- `release/小白AI Setup 2.20.1.exe` - NSIS 安装程序
- `release/小白AI-2.20.1.exe` - 绿色版（已废弃）

### Windows 打包配置

**配置位置** (`package.json`):
```json
{
  "build": {
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "installerIcon": "build/icon.ico",
      "uninstallerIcon": "build/icon.ico"
    }
  }
}
```

**说明**：
- `oneClick: false` - 允许用户选择安装目录
- `allowToChangeInstallationDirectory: true` - 用户可自定义安装路径
- `createDesktopShortcut: true` - 创建桌面快捷方式
- `createStartMenuShortcut: true` - 创建开始菜单快捷方式

---

## Linux 打包流程

```bash
# 构建 Linux 安装包
npm run dist:linux
```

**输出文件**：
- `release/小白AI-2.20.1.AppImage` - 通用格式（推荐）
- `release/小白AI_2.20.1_amd64.deb` - Debian/Ubuntu
- `release/小白AI-2.20.1.rpm` - Fedora/RedHat

**支持架构**：
- x64 (amd64)

**配置**:
```json
{
  "build": {
    "linux": {
      "target": ["AppImage", "deb", "rpm"],
      "category": "Utility",
      "maintainer": "晓力"
    }
  }
}
```

---

## 阿里云 OSS 上传

### 上传脚本

**主脚本**: `scripts/upload-to-oss.js`

**功能**：
- 自动上传 DMG/EXE/AppImage 到阿里云 OSS
- 生成 `latest-mac.yml` / `latest-win.yml` 版本文件
- 支持强制更新配置

### 上传命令

```bash
# 上传 macOS 版本到 OSS
npm run upload:oss

# 打包 + 上传（一键完成）
npm run release:oss

# 强制更新上传（设置 FORCE_UPDATE=true）
npm run release:force

# 自定义 Release Notes 上传
RELEASE_NOTES="修复了xxx问题" npm run release:notes
```

### OSS 配置

**存储桶信息**：
- **区域**: oss-cn-hangzhou
- **存储桶**: xiaobai-ai
- **目录结构**:
  ```
  xiaobai-ai/
  ├── mac/
  │   ├── 小白AI-2.20.1.dmg
  │   ├── 小白AI-2.20.1-arm64.dmg
  │   └── latest-mac.yml
  ├── win/
  │   ├── 小白AI Setup 2.20.1.exe
  │   └── latest-win.yml
  └── linux/
      ├── 小白AI-2.20.1.AppImage
      └── latest-linux.yml
  ```

### 自动更新配置

**版本文件示例** (`latest-mac.yml`):
```yaml
version: 2.20.1
files:
  - url: 小白AI-2.20.1.dmg
    sha512: abc123...
    size: 135000000
  - url: 小白AI-2.20.1-arm64.dmg
    sha512: def456...
    size: 130000000
path: 小白AI-2.20.1.dmg
sha512: abc123...
releaseDate: 2026-01-09T12:00:00.000Z
```

**强制更新配置**:
```javascript
// 在上传时设置
const forceUpdate = process.env.FORCE_UPDATE === 'true';
```

---

## 安全检查流程 🔒

### 检查脚本

**主脚本**: `scripts/security-check.js`

**Import 检查**: `scripts/security-check-imports.js`

### 检查内容

1. **敏感信息检查**
   - [ ] 硬编码的 API Key
   - [ ] 硬编码的密码
   - [ ] Service Role Key 泄露
   - [ ] Access Key Secret 泄露

2. **代码安全检查**
   - [ ] 危险的 `eval()` 调用
   - [ ] 不安全的 `innerHTML`
   - [ ] SQL 注入风险
   - [ ] XSS 漏洞

3. **依赖安全检查**
   - [ ] 已知漏洞的依赖包
   - [ ] 过时的依赖版本

### 运行检查

```bash
# 运行完整安全检查
npm run security:check

# 检查 import 语句
npm run security:check-imports

# 检查证书
npm run certs:check
```

### 打包前强制检查

⚠️ **重要**: 打包前必须运行安全检查，确保没有敏感信息泄露

```bash
# 推荐流程
npm run security:check && npm run dist:mac:notarized
```

---

## 打包前检查清单

### 版本号检查

- [ ] `package.json` 版本号已更新
- [ ] `electron/main.js` 版本号已更新
- [ ] `src/config.js` 版本号已更新
- [ ] `vite.config.js` 版本号已更新
- [ ] 所有版本号一致

### 代码质量检查

- [ ] 所有功能已测试
- [ ] 核心功能正常（登录、对话、文件操作）
- [ ] 没有调试用的 `console.log`
- [ ] 没有注释掉的代码
- [ ] 代码已格式化

### 文档更新检查

- [ ] `MEMORY.md` 已记录变更
- [ ] `docs/` 相关文档已更新
- [ ] 版本号已同步到文档

### 安全检查

- [ ] 运行 `npm run security:check` ✅
- [ ] 没有硬编码的密钥
- [ ] `.env` 文件在 `.gitignore` 中
- [ ] 没有敏感日志输出

### 配置文件检查

- [ ] `.env` 文件配置正确
- [ ] Apple 凭证有效（macOS）
- [ ] Supabase 配置正确
- [ ] OSS 配置正确（如果上传）

---

## 打包后验证步骤

### macOS 验证

```bash
# 1. 检查签名
spctl -a -v -t execute release/小白AI.app

# 2. 检查公证
codesign -dvvv release/小白AI.app

# 3. 测试安装
open release/小白AI-2.20.1.dmg
# 拖拽到应用程序文件夹

# 4. 测试启动
open /Applications/小白AI.app

# 5. 检查功能
# - 登录流程
# - 对话功能
# - 文件操作
# - 设置保存
```

### Windows 验证

```bash
# 1. 测试安装
# 双击运行 小白AI Setup 2.20.1.exe

# 2. 检查安装位置
# C:\Users\用户名\AppData\Local\Programs\小白AI

# 3. 测试启动
# 双击桌面快捷方式

# 4. 检查功能
# - 所有核心功能正常
# - 没有白屏问题
# - 路径点击正常
```

### Linux 验证

```bash
# 1. 测试 AppImage
chmod +x release/小白AI-2.20.1.AppImage
./release/小白AI-2.20.1.AppImage

# 2. 测试 deb 安装
sudo dpkg -i release/小白AI_2.20.1_amd64.deb

# 3. 检查功能
# - 启动正常
# - 核心功能正常
```

---

## 常见问题排查 ❓

### macOS 问题

**Q1: 打包后无法打开，提示"已损坏"**

A: 未签名或签名失败，解决方案：
```bash
# 重新使用含签名+公证的脚本
npm run dist:mac:notarized
```

**Q2: 公证失败，超时**

A: 网络问题或 Apple 服务繁忙，解决方案：
```bash
# 1. 检查网络连接
ping 127.0.0.1

# 2. 手动重新公证
# 等待几分钟后重试
```

**Q3: 环境变量未生效**

A: 使用专用脚本，会自动加载 `.env`：
```bash
# ✅ 推荐
npm run dist:mac:notarized

# ❌ 不推荐
npm run dist:mac
```

### Windows 问题

**Q1: 打包后白屏**

A: 已修复（v2.10.16），使用 `loadURL + file://` 协议

**Q2: 杀毒软件报毒**

A: Electron 应用常见问题，解决方案：
1. 使用代码签名证书（需要 EV 证书）
2. 在 GitHub 等可信平台发布
3. 提供用户验证文件完整性的方法

**Q3: 安装包体积过大**

A: 已优化（v2.10.15），移除了绿色版，只保留 NSIS 安装包

### Linux 问题

**Q1: AppImage 无法运行**

A: 添加执行权限：
```bash
chmod +x 小白AI-2.20.1.AppImage
```

**Q2: 依赖缺失**

A: 安装 FUSE：
```bash
sudo apt-get install fuse
```

### 通用问题

**Q1: 版本号不一致**

A: 使用版本号检查命令：
```bash
grep "\"version\"" package.json
grep "APP_VERSION" electron/main.js
grep "APP_VERSION" src/config.js
```

**Q2: 打包后环境变量不可用**

A: 已修复（v2.11.2），在 `src/config.js` 中添加 fallback 值：
```javascript
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cnszooaxwxatezodbbxq.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VwrPo1L5FuCwCYwmveIZoQ_KqEr8oLe';
```

---

## 用户使用指南

### Windows 用户

1. 下载 `小白AI Setup 2.20.1.exe`
2. 双击运行安装程序
3. 选择安装目录（默认：`C:\Users\用户名\AppData\Local\Programs\小白AI`）
4. 完成安装后，从桌面或开始菜单启动

### macOS 用户

1. 下载 `小白AI-2.20.1.dmg`（Intel）或 `小白AI-2.20.1-arm64.dmg`（Apple Silicon）
2. 双击打开 DMG 文件
3. 将"小白AI"拖拽到"应用程序"文件夹
4. 在启动台中找到并打开"小白AI"
5. 如果提示"无法打开因为来自身份不明的开发者"：
   - 右键点击应用 → "打开" → "打开"
   - 或在"系统设置" → "隐私与安全性"中允许

### Linux 用户

**AppImage 版本**：
```bash
chmod +x 小白AI-2.20.1.AppImage
./小白AI-2.20.1.AppImage
```

**Debian/Ubuntu**：
```bash
sudo dpkg -i 小白AI_2.20.1_amd64.deb
# 如果有依赖问题，运行：
sudo apt-get install -f
```

**Fedora/RedHat**：
```bash
sudo rpm -i 小白AI-2.20.1.rpm
```

### 首次启动配置

应用首次启动时，需要配置：

1. **手机号登录**（可选）
   - 输入手机号
   - 获取验证码
   - 验证码登录

2. **API Key 配置**
   - 选择模型提供商（Claude / 智谱 GLM）
   - 输入 API Key
   - 选择模型版本

3. **开始使用**

---

## 📊 版本发布历史

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| v2.20.1 | 2026-01-09 | API Key 加密存储 + 安全增强 |
| v2.11.2 | 2026-01-09 | macOS 签名+公证流程优化 |
| v2.10.16 | 2026-01-08 | 修复 Windows 白屏问题 |
| v2.10.15 | 2026-01-08 | 移除 Windows 绿色版 |

---

## 📝 快速参考

### 打包命令速查

```bash
# macOS 打包（含签名+公证）
npm run dist:mac:notarized

# Windows 打包
npm run dist:win

# Linux 打包
npm run dist:linux

# 上传到 OSS
npm run upload:oss

# 打包 + 上传（一键）
npm run release:oss

# 安全检查
npm run security:check
```

### 版本号更新命令

```bash
# 快速检查版本号
grep "\"version\"" package.json
grep "APP_VERSION" electron/main.js
grep "APP_VERSION" src/config.js
grep "VITE_APP_VERSION" vite.config.js
```

### 验证签名

```bash
# macOS 验证签名
spctl -a -v -t execute /path/to/小白AI.app

# macOS 检查公证
codesign -dvvv /path/to/小白AI.app
```

---

## 🔗 相关文档

- **开发规范**: `docs/09-development-guidelines.md`
- **系统架构**: `docs/07-system-architecture.md`
- **登录系统**: `docs/02-login-system.md`
- **数据库设计**: `docs/03-database-design.md`
- **项目历史**: `MEMORY.md`

---

**最后更新**: 2026-01-09
**维护者**: 晓力
**文档版本**: v2.0
**状态**: 生效中
