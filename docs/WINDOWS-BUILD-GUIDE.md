# Windows 版本 better-sqlite3 错误解决方案

## ❌ 问题描述

```
Error: better_sqlite3.node is not a valid Win32 application.
```

## 🔍 问题根源

**核心问题**：`better-sqlite3` 是原生 C++ 模块，必须为每个平台单独编译。

### 为什么会失败？

1. **当前环境**：你在 macOS 上打包 Windows 版本
2. **问题**：better-sqlite3 的二进制文件是为 macOS 编译的（.dylib/.node）
3. **结果**：Windows 无法运行 macOS 编译的原生模块

虽然 electron-builder 会尝试自动重建，但跨平台编译原生 C++ 模块经常失败。

## ✅ 解决方案

### **方案 1：使用 GitHub Actions 自动打包（推荐）** ⭐

**优点**：
- 每个平台在自己环境中打包
- 完全自动化
- 免费（GitHub 公开仓库）

**步骤**：

1. 创建 `.github/workflows/build.yml`：
```yaml
name: Build

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm install
      - name: Build Windows
        run: npm run dist:win
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: windows-installer
          path: release/*.exe
```

2. 推送代码到 GitHub
3. 在 GitHub Actions 页面手动触发打包
4. 下载生成的安装包

### **方案 2：在 Windows 机器上打包（临时方案）**

**步骤**：

1. **复制项目到 Windows 机器**
   ```bash
   # 方式 1：使用 U 盘/网盘
   # 方式 2：使用 Git（推荐）
   git clone <your-repo-url>
   cd 小白AI
   ```

2. **在 Windows 上安装依赖**
   ```bash
   # 安装 Node.js 20+
   # 安装 Python 3.10+（编译工具需要）
   # 安装 Visual Studio Build Tools（编译工具需要）

   npm install
   ```

3. **打包 Windows 版本**
   ```bash
   npm run dist:win
   ```

### **方案 3：使用 Docker（高级）**

如果你熟悉 Docker，可以创建 Windows 容器：

```bash
# 创建 Windows 容器
docker run --rm -v $(pwd):/app -w /app mcr.microsoft.com/windows:2004 \
  cmd /c "npm install && npm run dist:win"
```

## 📋 检查清单

在 Windows 上打包前，确保：

- [ ] Node.js 版本 >= 18
- [ ] Python 版本 >= 3.10
- [ ] Visual Studio Build Tools 已安装
- [ ] .env 文件已配置
- [ ] 运行 `npm install` 无错误

## 🚀 推荐流程

**长期解决方案（CI/CD）**：

1. 配置 GitHub Actions（方案 1）
2. 推送标签触发打包：`git tag v2.10.13 && git push --tags`
3. GitHub Actions 自动为每个平台打包
4. 在 GitHub Releases 中下载安装包

**临时解决方案（手动打包）**：

1. 找一台 Windows 机器
2. 克隆项目代码
3. 安装依赖和编译工具
4. 运行 `npm run dist:win`

## 📝 技术细节

### better-sqlite3 原生模块

- **位置**：`node_modules/better-sqlite3/build/Release/better_sqlite3.node`
- **类型**：C++ 原生模块
- **编译产物**：
  - macOS: `better_sqlite3.node` (Mach-O 二进制)
  - Windows: `better_sqlite3.node` (PE 二进制)
  - Linux: `better_sqlite3.node` (ELF 二进制)

### electron-builder 重建过程

```javascript
// package.json
"build": {
  "npmRebuild": true,  // ✅ 已添加
  "buildDependenciesFromSource": true  // ✅ 已添加
}
```

重建过程：
1. electron-builder 检测到 better-sqlite3
2. 调用 @electron/rebuild
3. 为目标平台编译 C++ 模块
4. **但在跨平台编译时可能失败** ← 当前问题

## ⚠️ 重要提示

**不要**：
- ❌ 在 macOS 上打包 Windows 版本（会失败）
- ❌ 在 Windows 上打包 macOS 版本（会失败）

**应该**：
- ✅ 在 macOS 上打包 macOS 版本
- ✅ 在 Windows 上打包 Windows 版本
- ✅ 使用 CI/CD 在各平台上分别打包

## 🔗 参考资源

- [electron-builder 跨平台编译](https://www.electron.build/multi-platform-build)
- [better-sqlite3 预编译二进制](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/compilation.md)
- [GitHub Actions for Electron](https://docs.github.com/en/actions/guides/building-and-testing-nodejs)

---

**创建时间**：2025-01-08
**适用版本**：v2.10.13+
