# GitHub Actions 自动打包指南

## 📦 功能说明

使用 GitHub Actions 自动为多个平台打包应用，避免跨平台编译问题。

**支持平台：**
- ✅ Windows (NSIS 安装包 + 便携版)
- ✅ macOS (DMG + ZIP)
- ✅ Linux (AppImage + DEB + RPM)

## 🚀 使用方法

### 方法 1：自动触发（推荐）

1. **推送标签触发打包**
   ```bash
   # 更新版本号
   npm version patch  # v2.10.13 -> v2.10.14
   # 或
   npm version minor  # v2.10.13 -> v2.11.0
   # 或
   npm version major  # v2.10.13 -> v3.0.0

   # 推送到 GitHub
   git push --tags
   ```

2. **GitHub Actions 自动开始打包**
   - 访问：`https://github.com/你的用户名/xiaobaiAI/actions`
   - 等待所有平台打包完成（约 10-15 分钟）

3. **下载安装包**
   - 在 Actions 页面下载 artifacts（30 天内有效）
   - 或在 GitHub Releases 页面下载永久链接

### 方法 2：手动触发

1. **访问 GitHub Actions 页面**
   - 进入 `https://github.com/你的用户名/xiaobaiAI/actions`
   - 点击左侧 "Build Multi-Platform"
   - 点击 "Run workflow"

2. **输入版本号**
   - 填写版本号（例如：v2.10.13）
   - 点击 "Run workflow" 开始打包

## 📥 下载安装包

### 从 Actions 页面下载（快速）

1. 访问 Actions 页面
2. 点击成功的 workflow run
3. 在 "Artifacts" 区域下载：
   - `windows-installer` - Windows 安装包
   - `windows-portable` - Windows 便携版
   - `macos-dmg` - macOS DMG
   - `macos-zip` - macOS ZIP
   - `linux-appimage` - Linux AppImage
   - `linux-deb` - Linux DEB
   - `linux-rpm` - Linux RPM

**注意**：Artifacts 保留 30 天

### 从 GitHub Releases 下载（永久）

如果是通过标签触发的打包，会自动创建 GitHub Release：

1. 访问 `https://github.com/你的用户名/xiaobaiAI/releases`
2. 找到对应版本
3. 下载任意平台的安装包

## ☁️ 上传到阿里云 OSS

### 方式 1：手动下载后上传（推荐用于测试）

```bash
# 1. 从 GitHub Actions 下载安装包
# 2. 解压下载的 zip 文件
# 3. 运行上传脚本
node scripts/upload-to-oss.js <下载的文件路径>
```

### 方式 2：修改上传脚本支持多文件（推荐用于正式发布）

创建 `scripts/upload-all-to-oss.js`：

```javascript
const fs = require('fs');
const path = require('path');
const OSS = require('ali-oss');

const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  bucket: 'xiaobai-ai',
});

async function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  const objectKey = `releases/${fileName}`;

  try {
    await client.put(objectKey, filePath);
    console.log(`✅ 上传成功: ${fileName}`);
    console.log(`   下载链接: https://xiaobai-ai.oss-cn-hangzhou.aliyuncs.com/${objectKey}`);
  } catch (error) {
    console.error(`❌ 上传失败: ${fileName}`, error);
  }
}

async function uploadAllFiles(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile() && (file.endsWith('.exe') || file.endsWith('.dmg') || file.endsWith('.zip') || file.endsWith('.AppImage'))) {
      await uploadFile(filePath);
    }
  }
}

// 使用方法
const downloadDir = process.argv[2] || './downloads';
uploadAllFiles(downloadDir);
```

### 方式 3：集成到 GitHub Actions（自动化）

修改 `.github/workflows/build.yml`，添加上传步骤：

```yaml
upload-to-oss:
  needs: [build-windows, build-macos, build-linux]
  runs-on: ubuntu-latest
  steps:
    - name: Download artifacts
      uses: actions/download-artifact@v4
      with:
        path: artifacts

    - name: Upload to Aliyun OSS
      env:
        ALIYUN_ACCESS_KEY_ID: ${{ secrets.ALIYUN_ACCESS_KEY_ID }}
        ALIYUN_ACCESS_KEY_SECRET: ${{ secrets.ALIYUN_ACCESS_KEY_SECRET }}
      run: |
        node scripts/upload-all-to-oss.js artifacts
```

**需要配置 Secrets：**

1. 访问 GitHub 仓库设置
2. Secrets and variables -> Actions
3. 添加以下 secrets：
   - `ALIYUN_ACCESS_KEY_ID` - 阿里云 AccessKey ID
   - `ALIYUN_ACCESS_KEY_SECRET` - 阿里云 AccessKey Secret

## 🔐 配置 Secrets（可选）

如果需要签名或自动上传到阿里云，配置以下 Secrets：

### macOS 签名（可选）

```bash
# 导出证书
base64 -i certificate.p12 > certificate.txt

# 在 GitHub 添加 Secrets：
# APPLE_CERTIFICATES_P12 = certificate.txt 的内容
# APPLE_CERTIFICATES_PASSWORD = 证书密码
# APPLE_ID = 你的 Apple ID
# APPLE_ID_PASSWORD = App-specific password
# APPLE_TEAM_ID = 团队 ID (666P8DEX39)
```

### 阿里云 OSS（可选）

用于自动上传到阿里云：

```bash
# 在 GitHub 添加 Secrets：
# ALIYUN_ACCESS_KEY_ID = 你的 AccessKey ID
# ALIYUN_ACCESS_KEY_SECRET = 你的 AccessKey Secret
```

### 智谱 API Key（可选）

用于游客模式：

```bash
# 在 GitHub 添加 Secrets：
# ZHIPU_OFFICIAL_API_KEY = 你的智谱 API Key
```

## 📝 工作流程

### 开发流程

```bash
# 1. 本地开发测试
npm run dev

# 2. 测试通过后更新版本
npm version patch

# 3. 推送代码和标签
git push && git push --tags

# 4. GitHub Actions 自动打包所有平台

# 5. 下载测试
# 从 Actions 页面下载 Windows 版本测试

# 6. 测试通过后上传到阿里云
node scripts/upload-to-oss.js release/小白AI-Setup-2.10.14.exe
```

### 正式发布流程

```bash
# 1. 更新版本和 CHANGELOG
npm version minor
vim CHANGELOG.md

# 2. 推送触发打包
git push && git push --tags

# 3. GitHub Actions 自动：
#    - 打包所有平台
#    - 创建 GitHub Release
#    - （可选）上传到阿里云 OSS

# 4. 用户从 GitHub Releases 或阿里云 OSS 下载
```

## 🎯 优势

### 为什么使用 GitHub Actions？

1. **✅ 解决跨平台编译问题**
   - Windows 在 Windows 上打包
   - macOS 在 macOS 上打包
   - better-sqlite3 等原生模块正确编译

2. **✅ 完全自动化**
   - 推送标签自动打包
   - 无需本地安装各平台工具
   - 无需手动操作

3. **✅ 免费（公开仓库）**
   - GitHub 提供免费 CI/CD
   - 无需购买 Windows 机器
   - 无需配置 Docker

4. **✅ 可追溯**
   - 每次打包都有记录
   - 可以回溯历史版本
   - 下载链接永久有效

5. **✅ 灵活上传**
   - 可以自动上传到阿里云
   - 也可以手动下载后上传
   - 支持多种上传方式

## ⚠️ 注意事项

1. **首次使用需要配置**
   - 推送代码到 GitHub
   - （可选）配置各种 Secrets

2. **打包时间**
   - 首次约 15-20 分钟
   - 后续约 10-15 分钟

3. **macOS 签名**
   - 不配置证书也可以打包（ad-hoc 签名）
   - 配置证书后用户不会看到"未知开发者"警告

4. **阿里云上传**
   - 可以手动上传（推荐）
   - 也可以集成到 GitHub Actions 自动上传

## 🔗 参考资源

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [electron-builder 文档](https://www.electron.build/)
- [阿里云 OSS SDK](https://help.aliyun.com/document_detail/32068.html)

---

**创建时间**：2026-01-08
**适用版本**：v2.10.14+
