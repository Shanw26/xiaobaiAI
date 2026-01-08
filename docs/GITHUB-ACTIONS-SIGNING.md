# GitHub Actions 签名配置指南

## 📋 概述

本文档说明如何为 GitHub Actions 配置 macOS 签名，使打包的应用可以直接安装，无需用户右键打开。

## 🔑 需要的配置

### 方式 1：完全跳过签名（当前状态）✅

**当前 workflow 已经支持无签名打包**：
- 签名步骤会自动跳过（如果证书为空）
- 用户需要右键点击 → 打开 才能运行
- 适合快速测试

### 方式 2：配置完整签名（正式发布推荐）✨

需要配置以下 **GitHub Variables**（不是 Secrets）：

## 📝 配置步骤

### 步骤 1：导出证书（在本地 macOS）

```bash
# 1. 打开钥匙串访问
# 2. 选择 "我的证书"
# 3. 找到 "Developer ID Application: Beijing Principle Technology Co., Ltd."
# 4. 右键 → 导出
# 5. 保存为 certificate.p12
# 6. 设置密码（记住这个密码！）

# 7. 转换为 base64
base64 -i certificate.p12 | pbcopy

# 8. 粘贴到文本文件保存（备用）
```

### 步骤 2：获取 Apple ID 信息

**Apple ID**：你的开发者账号 Apple ID

**App-specific 专用密码**：
1. 访问：https://appleid.apple.com
2. 登录 → 安全 → App-specific 专用密码
3. 创建新密码（用于公证）
4. 复制保存

**Team ID**：
```bash
# 已知：666P8DEX39
# 或者在证书中查看：
security find-identity -v -p codesigning
```

### 步骤 3：在 GitHub 添加 Variables

**重要**：使用 **Variables**，不是 Secrets！（因为 Actions 在证书导入时需要访问）

1. 访问：https://github.com/Shanw26/xiaobaiAI/settings/variables/actions

2. 点击 "New variable" 添加：

   **APPLE_CERTIFICATES_P12**
   - Name: `APPLE_CERTIFICATES_P12`
   - Value: （粘贴步骤 1 的 base64 证书内容）
   - 点击 Add variable

   **APPLE_CERTIFICATES_PASSWORD**
   - Name: `APPLE_CERTIFICATES_PASSWORD`
   - Value: （证书密码）
   - 点击 Add variable

   **APPLE_ID**
   - Name: `APPLE_ID`
   - Value: （你的 Apple ID 邮箱）
   - 点击 Add variable

   **APPLE_APP_SPECIFIC_PASSWORD**
   - Name: `APPLE_APP_SPECIFIC_PASSWORD`
   - Value: （App-specific 专用密码）
   - 点击 Add variable

   **APPLE_TEAM_ID**
   - Name: `APPLE_TEAM_ID`
   - Value: `666P8DEX39`
   - 点击 Add variable

### 步骤 4：（可选）添加 Secrets

如果需要智谱 API Key，添加到 **Secrets**：

1. 访问：https://github.com/Shanw26/xiaobaiAI/settings/secrets/actions

2. 点击 "New repository secret"

   **ZHIPU_OFFICIAL_API_KEY**
   - Name: `ZHIPU_OFFICIAL_API_KEY`
   - Value: （你的智谱 API Key）

### 步骤 5：更新 workflow 并推送

```bash
# workflow 已经更新好签名配置
# 只需要推送即可

git add .github/workflows/build.yml
git commit -m "feat: 添加 macOS 签名配置"
git push origin main

# 触发新打包
git tag v2.10.16
git push origin v2.10.16
```

## ✅ 验证签名

打包完成后：

```bash
# 下载 DMG 并安装
# 检查签名
codesign -dv --verbose=4 /Applications/小白AI.app

# 应该看到：
# Authority=Developer ID Application: Beijing Principle Technology Co., Ltd. (666P8DEX39)
```

## 🎯 签名 vs 无签名对比

### 无签名（当前）
- ✅ 打包快速，无需配置
- ❌ 用户看到"未知开发者"警告
- ❌ 需要右键 → 打开

### 有签名（配置后）
- ✅ 用户直接安装，无警告
- ✅ 应用更可信
- ✅ 支持自动更新
- ✅ 可以发布到 App Store（可选）
- ⚠️ 需要 Apple Developer 账号（$99/年）

## 🔧 故障排除

### 问题 1：证书导入失败

```
Error: The specified P12 file is not valid or the password is incorrect.
```

**解决**：
- 检查 base64 编码是否正确（不能有换行）
- 确认密码正确

### 问题 2：签名失败

```
Error: Code signing failed
```

**解决**：
- 确认证书是 "Developer ID Application" 类型
- 检查 Team ID 是否正确：`666P8DEX39`

### 问题 3：公证失败

```
Error: Notarization failed
```

**解决**：
- 确认 App-specific 专用密码正确
- 确认 Apple ID 正确

## 📝 快速检查清单

在正式发布前，确认：

- [ ] 已导出 .p12 证书文件
- [ ] 已转换为 base64
- [ ] 已在 GitHub 添加 5 个 Variables
- [ ] 本地测试签名成功
- [ ] GitHub Actions 打包成功
- [ ] 下载的 DMG 签名正确

## 🚀 正式发布流程

```bash
# 1. 更新版本号
npm version minor  # v2.10.15 -> v2.11.0

# 2. 推送触发打包
git push && git push --tags

# 3. 等待 GitHub Actions 完成（10-15分钟）

# 4. 从 GitHub Releases 下载所有平台安装包

# 5. 测试各平台安装包

# 6. 上传到阿里云 OSS
npm run upload:all ~/Downloads/artifacts -- --recursive

# 7. 发布 Release Notes
```

---

**配置完成后，所有版本都会自动签名！** ✨

**创建时间**：2026-01-08
**适用版本**：v2.10.16+
