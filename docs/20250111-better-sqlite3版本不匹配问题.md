# better-sqlite3 原生模块版本不匹配问题

**日期**: 2025年1月11日
**版本**: v2.20.6
**状态**: ✅ 已解决

## 📋 问题描述

用户在启动 v2.20.6 版本时遇到 **Raw Inflate 错误**，页面无法正常加载。

### 错误表现

1. **前端显示**: 页面出现大量乱码文本，包含以下关键词：
   - `lib.RawInflate`
   - `index: input buffer`
   - `blockSize`
   - `bufferType: Zlib.RawInflate.BufferType`
   - `resize`

2. **后端日志**:
```
数据库连接失败: Error: The module '/Users/shawn/Downloads/小白AI/node_modules/better-sqlite3/build/Release/better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 137. This version of Node.js requires
NODE_MODULE_VERSION 130.
```

### 根本原因

**better-sqlite3** 原生模块在编译时使用了错误的 Node.js 版本：

| 项目 | 值 |
|-----|---|
| **编译时使用** | NODE_MODULE_VERSION 137（系统 Node.js v20+） |
| **Electron 需要** | NODE_MODULE_VERSION 130（Electron 33.4.11 内置 Node.js） |
| **结果** | 版本不匹配，模块无法加载 |

## 🔍 原理分析

### 为什么会不匹配？

1. **安装依赖时**: `npm install` 使用系统 Node.js 编译 better-sqlite3
2. **Electron 运行时**: Electron 内置了不同版本的 Node.js
3. **版本号系统**: NODE_MODULE_VERSION 是 Node.js ABI（Application Binary Interface）的版本标识

### NODE_MODULE_VERSION 对照表

| Node.js 版本 | NODE_MODULE_VERSION |
|-------------|-------------------|
| v18.x | 108 |
| v20.x | 137 |
| Electron 33.x (内置 Node.js) | 130 |

## 🛠️ 解决方案

### 方法1: 使用 electron-rebuild（推荐）✅

```bash
npx @electron/rebuild
```

**原理**:
- 自动检测当前 Electron 版本
- 针对正确的 Node.js 版本重新编译所有原生模块
- 确保 NODE_MODULE_VERSION 匹配

**执行结果**:
```bash
- Searching dependency tree
✔ Rebuild Complete
```

### 方法2: 单独重新编译 better-sqlite3

```bash
npm rebuild better-sqlite3
```

**注意**: 这个方法使用的是系统 Node.js，仍可能导致版本不匹配。

### 方法3: 完全重装（不推荐）

```bash
rm -rf node_modules
npm install
npx @electron/rebuild
```

**缺点**: 耗时较长，仅在模块严重损坏时使用。

## ✅ 验证步骤

### 1. 检查编译日志

启动 dev 模式后，应该看到：

```bash
[启动] 初始化数据库...
初始化数据库: /Users/shawn/Library/Application Support/xiaobai-ai/xiaobai-ai.db
✓ 数据库连接成功
数据表创建完成
[启动] ✓ 数据库初始化完成
```

### 2. 检查应用启动

- ✅ 窗口正常显示
- ✅ 没有乱码文本
- ✅ Agent 初始化成功
- ✅ 可以正常发送消息

## 📝 预防措施

### 1. package.json 添加脚本（已完成）

```json
{
  "scripts": {
    "postinstall": "electron-builder install-app-deps"
  }
}
```

**作用**: 每次 `npm install` 后自动重新编译原生模块。

### 2. 使用 electron-builder 的内置工具

在构建应用时，electron-builder 会自动：
```bash
npm run build
electron-builder --mac  # 会自动运行 @electron/rebuild
```

**日志确认**:
```
  • executing @electron/rebuild  electronVersion=33.4.11 arch=arm64 buildFromSource=false appDir=./
  • installing native dependencies  arch=arm64
  • preparing       moduleName=better-sqlite3 arch=arm64
  • finished        moduleName=better-sqlite3 arch=arm64
  • completed installing native dependencies
```

### 3. 团队协作注意事项

当团队成员拉取代码后，首次运行需要：

```bash
# 方法1: 自动重新编译（推荐）
npm install
npx @electron/rebuild

# 方法2: 直接启动（依赖 postinstall）
npm install
npm run dev  # postinstall 会自动运行
```

## 🎯 经验总结

### 为什么之前没遇到？

1. **v2.20.5 及之前**: 可能 Node.js 版本恰好兼容
2. **系统升级**: 用户可能升级了系统 Node.js 版本
3. **全新安装**: 新环境首次安装依赖时遇到

### 何时需要重新编译？

出现以下情况时需要运行 `npx @electron/rebuild`：

1. ✅ 更新 Electron 版本后
2. ✅ 更新 Node.js 版本后
3. ✅ 切换开发机器后
4. ✅ 拉取新代码后首次运行
5. ✅ 出现 `NODE_MODULE_VERSION` 错误时

### 相关命令速查

```bash
# 重新编译所有原生模块
npx @electron/rebuild

# 重新编译特定模块
npx @electron/rebuild -w better-sqlite3

# 强制重新编译
npx @electron/rebuild -f

# 查看已安装的原生模块
npm ls 2>&1 | grep -E "better-sqlite3|UNMET"
```

## 📦 本次版本更新内容

### v2.20.6 新功能

1. **多API Key管理**
   - 支持逗号分隔多个API Key
   - 自动轮换机制
   - UI提示支持多Key

2. **粘贴截图数据流**
   - 前端支持Cmd+V粘贴剪贴板图片
   - 后端支持base64数据处理（file.data字段）
   - 自动将blob转换为base64

3. **3种输入方式**
   - 点击上传按钮选择文件 ✅
   - 点击截图按钮截图 ✅
   - 直接粘贴截图（数据流打通，API限制）⚠️

4. **Bug修复**
   - 修复空文字发送问题（Code 1213）
   - 修复纯图片发送问题（Code 1214）
   - 修复file.path为null的错误

5. **原生模块问题修复**
   - 修复 better-sqlite3 版本不匹配问题
   - 添加自动重新编译机制

## 🔗 相关资源

- [Electron 原生模块文档](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
- [electron-rebuild GitHub](https://github.com/electron/electron-rebuild)
- [better-sqlite3 文档](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/compilation.md)
- [Node.js ABI 版本对照表](https://nodejs.org/en/download/package-manager)

## 📌 注意事项

1. **生产构建**: electron-builder 会自动处理原生模块编译
2. **开发模式**: 需要手动运行 `npx @electron/rebuild`（依赖 postinstall）
3. **跨平台开发**: Windows/Mac/Linux 的原生模块不通用，需要分别编译
4. **CI/CD**: 确保构建脚本包含重新编译步骤

---

**最后更新**: 2025年1月11日
**负责人**: Claude Code
**影响版本**: v2.20.6
**修复状态**: ✅ 已解决并验证
