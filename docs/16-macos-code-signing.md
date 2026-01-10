# macOS 代码签名配置指南

## 📖 概述

本文档记录小白AI项目的 macOS 代码签名配置，包括从 Ad-hoc 签名升级到 Apple Developer 正式签名的完整过程。

**配置日期**: 2026-01-07
**证书类型**: Developer ID Application
**当前状态**: ✅ 已配置并测试通过

---

## 🎯 两种签名方案对比

### 方案一：Ad-hoc 签名（临时签名）

**特点**：
- ✅ 免费
- ✅ 无需证书
- ✅ 自动执行
- ⚠️ 用户体验差（需要右键打开）

**配置**：
```json
{
  "mac": {
    "identity": null,
    "hardenedRuntime": false
  }
}
```

**用户体验**：
```
双击 → "无法验证开发者" → 右键打开 → 启动
```

---

### 方案二：Apple Developer 正式签名（当前方案）⭐

**特点**：
- ✅ 用户双击直接打开
- ✅ 专业可信
- ✅ 支持 Hardened Runtime
- 💰 需要 Apple Developer 账号（$99/年）

**配置**：
```json
{
  "mac": {
    "identity": "4E76C4CD7F4ABFA82DF8EED886AA36F117140EDD",
    "hardenedRuntime": true
  }
}
```

**用户体验**：
```
双击 → 直接启动 ✅
```

---

## 🔐 当前签名配置

### 证书信息

| 项目 | 值 |
|------|-----|
| **证书类型** | Developer ID Application |
| **证书名称** | Developer ID Application: Beijing Principle Technology Co., Ltd. (666P8DEX39) |
| **Team ID** | 666P8DEX39 |
| **证书 ID** | 4E76C4CD7F4ABFA82DF8EED886AA36F117140EDD |
| **Hardened Runtime** | true |

### 配置文件

#### 1. package.json

**位置**: `/Users/shawn/Downloads/小白AI/package.json`

**关键配置**：
```json
{
  "build": {
    "mac": {
      "category": "public.app-category.productivity",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "identity": "4E76C4CD7F4ABFA82DF8EED886AA36F117140EDD",
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ]
    },
    "afterPack": "scripts/afterPack.js"
  }
}
```

**配置说明**：
- `hardenedRuntime: true` - 启用硬运行时，提供额外的安全保护
- `identity: "证书ID"` - 指定签名证书
- `entitlements` - 权限配置文件路径
- `afterPack` - 构建后自动执行签名脚本

#### 2. 签名脚本

**位置**: `/Users/shawn/Downloads/小白AI/scripts/afterPack.js`

```javascript
const { execSync } = require('child_process');
const path = require('path');

exports.default = async function (context) {
  const { appOutDir, electronPlatformName } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  console.log('🔐 开始 Apple Developer 签名...');

  const appPath = path.join(appOutDir, '小白AI.app');

  try {
    // 使用 Developer ID Application 证书签名
    execSync(`codesign --force --deep --options runtime --sign "Developer ID Application: Beijing Principle Technology Co., Ltd. (666P8DEX39)" "${appPath}"`, {
      stdio: 'inherit'
    });

    // 验证签名
    execSync(`codesign --verify --deep "${appPath}"`, {
      stdio: 'inherit'
    });

    console.log('✅ 签名完成');
  } catch (error) {
    console.error('❌ 签名失败:', error.message);
    throw error;
  }
};
```

**脚本功能**：
1. 检测平台（仅 macOS）
2. 使用证书对应用进行深度签名
3. 添加 `--options runtime` 满足 Hardened Runtime 要求
4. 验证签名是否成功

---

## 📦 构建产物

每次构建会自动生成 4 个安装包：

| 文件名 | 大小 | 架构 | 说明 |
|--------|------|------|------|
| 小白AI-2.7.8.dmg | ~141M | Intel (x64) | 推荐 Intel 芯片用户使用 |
| 小白AI-2.7.8-arm64.dmg | ~134M | Apple Silicon (ARM64) | 推荐 M1/M2/M3 芯片用户使用 |
| 小白AI-2.7.8-mac.zip | ~136M | Intel (x64) | 备用格式 |
| 小白AI-2.7.8-arm64-mac.zip | ~129M | Apple Silicon (ARM64) | 备用格式 |

**位置**: `/Users/shawn/Downloads/小白AI/release/`

---

## 🚀 使用方法

### 构建应用

```bash
cd /Users/shawn/Downloads/小白AI
npm run dist:mac
```

**自动执行流程**：
1. 构建前端代码
2. 打包 Electron 应用
3. 🤖 自动执行签名脚本
4. 验证签名
5. 生成 DMG 和 ZIP

### 验证签名

```bash
# 查看签名信息
codesign -dv --verbose=4 release/mac/小白AI.app

# 查看证书链
codesign -dv --verbose=4 release/mac/小白AI.app | grep Authority
```

**预期输出**：
```
Authority=Developer ID Application: Beijing Principle Technology Co., Ltd. (666P8DEX39)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
TeamIdentifier=666P8DEX39
```

### 测试应用

```bash
# 双击打开（推荐）
open release/mac/小白AI.app

# 或从 Finder 双击 .app 文件
```

---

## 🛠️ 配置步骤（供参考）

如果您需要在其他电脑配置相同的签名，以下是完整步骤：

### 步骤 1：生成 CSR（证书签名请求）

```bash
# 生成私钥
openssl genrsa -out ~/Desktop/xiaobai_key.key 2048

# 生成 CSR
openssl req -new -key ~/Desktop/xiaobai_key.key -out ~/Desktop/xiaobai_cert.csr \
  -subj "/emailAddress=your-email@example.com/CN=晓力/O=原则科技/C=CN"
```

### 步骤 2：在 Apple Developer 网站创建证书

1. 访问：https://developer.apple.com/account
2. Certificates, Identifiers & Profiles → Certificates
3. 点击 "+" 创建新证书
4. 选择类型：**Developer ID Application**
5. 上传 CSR 文件
6. 下载证书（.cer 文件）

### 步骤 3：安装证书到钥匙串

```bash
# 导入证书
security import /path/to/developerID_application.cer \
  -k ~/Library/Keychains/login.keychain-db \
  -T /usr/bin/codesign

# 导入私钥
security import ~/Desktop/xiaobai_key.key \
  -k ~/Library/Keychains/login.keychain-db \
  -T /usr/bin/codesign
```

### 步骤 4：验证证书

```bash
# 查看已安装的证书
security find-identity -v -p codesigning | grep "Developer ID Application"
```

**预期输出**：
```
1) 4E76C4CD7F4ABFA82DF8EED886AA36F117140EDD "Developer ID Application: Beijing Principle Technology Co., Ltd. (666P8DEX39)"
```

### 步骤 5：修改配置

修改 `package.json`：
```json
{
  "mac": {
    "identity": "您的证书ID",
    "hardenedRuntime": true
  }
}
```

修改 `scripts/afterPack.js`：
```javascript
execSync(`codesign --force --deep --options runtime --sign "您的证书名称" "${appPath}"`)
```

---

## ⚠️ 重要注意事项

### 安全

- ❌ **不要**将私钥文件（.key）上传到 Git
- ❌ **不要**分享证书文件给他人
- ✅ 定期备份钥匙串
- ✅ 使用 `.gitignore` 排除敏感文件

### 证书有效期

- Developer ID Application 证书有效期：**1年**
- 到期前需要在 Apple Developer 网站续期
- 续期后证书 ID 不变，配置无需修改

### 多电脑配置

如果需要在多台电脑上构建：

**方法一：导出/导入证书**
```bash
# 导出证书（在已配置的电脑）
security export certificate -t cert -p ~/Desktop/cert.p12 \
  -k ~/Library/Keychains/login.keychain-db

# 导入证书（在新电脑）
security import ~/Desktop/cert.p12 \
  -k ~/Library/Keychains/login.keychain-db \
  -T /usr/bin/codesign
```

**方法二：重新生成证书**
- 在每台电脑上重复"配置步骤"
- 使用同一个 Apple Developer 账号

### Hardened Runtime

启用 Hardened Runtime 后，应用有以下特性：
- ✅ 更强的安全保护
- ✅ 系统完整性保护
- ⚠️ 某些操作需要额外权限（ entitlements）

**当前权限配置**：
- `build/entitlements.mac.plist` - 定义应用所需的系统权限

---

## 🐛 常见问题

### 问题 1：签名失败 "code object is not signed at all"

**原因**：证书未正确安装或 identity 配置错误

**解决**：
```bash
# 1. 检查证书是否存在
security find-identity -v -p codesigning

# 2. 确认证书 ID 是否匹配
codesign -dv --verbose=4 /path/to/app
```

### 问题 2：用户打开时提示"无法验证开发者"

**原因**：
1. 使用 Ad-hoc 签名（identity: null）
2. 证书过期或被撤销

**解决**：
1. 检查 `package.json` 中的 identity 配置
2. 验证证书有效期：
```bash
security find-certificate -c "Developer ID Application" -p | \
  openssl x509 -noout -dates
```

### 问题 3：构建时找不到证书

**错误信息**：
```
identity=4E76C4CD7F4ABFA82DF8EED886AA36F117140EDD" not found
```

**解决**：
```bash
# 1. 确认证书已安装
security find-identity -v -p codesigning

# 2. 检查钥匙串访问
open ~/Library/Keychains/login.keychain-db

# 3. 重新导入证书
security import /path/to/cert.cer -k ~/Library/Keychains/login.keychain-db
```

### 问题 4：ARM64 版本签名警告

**警告信息**：
```
replacing existing signature
```

**说明**：这是正常的，electron-builder 会先签名，afterPack 脚本再次签名

**解决**：可以忽略，或删除 afterPack 中的签名逻辑（让 electron-builder 自动签名）

---

## 📚 参考资料

### Apple 官方文档

- [About Code Signing](https://developer.apple.com/support/code-signing/)
- [Creating a Developer ID Certificate](https://developer.apple.com/help/account/create-certs/create-a-developer-id-certificate/)
- [Hardened Runtime](https://developer.apple.com/documentation/security/hardened-runtime)

### Electron 文档

- [macOS Code Signing](https://www.electron.build/code-signing)
- [electron-builder macOS Configuration](https://www.electron.build/configuration/mac)

---

## 📝 更新记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-01-07 | v2.7.8 | 从 Ad-hoc 签名升级到 Apple Developer 正式签名 |

---

**文档维护**: Claude Code + 晓力
**最后更新**: 2026-01-07
