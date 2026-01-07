# 阿里云 OSS + CDN 部署方案

> **目标**: 将软件包从 GitHub Releases 迁移到阿里云 OSS，提升国内下载速度
> **创建时间**: 2026-01-07
> **版本**: v1.0

---

## 📊 当前问题分析

### 现状
- **发布平台**: GitHub Releases
- **自动更新**: electron-updater + GitHub
- **问题**: 国内访问 GitHub 较慢，下载速度不稳定

### 用户影响
- ❌ 下载速度慢（通常 100KB/s - 500KB/s）
- ❌ 有时无法连接
- ❌ 更新体验差

---

## 🎯 解决方案

### 整体架构

```
构建流程:
  npm run dist:mac
    ↓
  生成安装包到 release/ 目录
    ↓
  自动上传到阿里云 OSS (脚本)
    ↓
  生成 latest-mac.yml 并上传
    ↓
  CDN 缓存刷新

用户下载/更新:
  用户请求更新
    ↓
  从阿里云 CDN 获取 latest-mac.yml
    ↓
  从阿里云 CDN 下载安装包（高速）
```

---

## 🛠️ 技术方案

### 1. 阿里云 OSS 配置

#### Bucket 设置
- **Bucket 名称**: `xiaobai-ai-releases`（示例）
- **地域**: 华东1（杭州）- 国内访问快
- **访问权限**: **公共读**（重要！）
- **存储类型**: 标准存储
- **版本控制**: 开启（可选）

#### 目录结构
```
xiaobai-ai-releases/
  ├── mac/
  │   ├── xiaobai-ai-2.7.3.dmg
  │   ├── xiaobai-ai-2.7.3-arm64.dmg
  │   ├── xiaobai-ai-2.7.3-mac.zip
  │   ├── xiaobai-ai-2.7.3-arm64-mac.zip
  │   └── latest-mac.yml
  ├── win/
  │   ├── xiaobai-ai-2.7.3.exe
  │   └── latest.yml
  └── linux/
      ├── xiaobai-ai-2.7.3.AppImage
      └── latest-linux.yml
```

#### CORS 配置
```json
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}
```

---

### 2. CDN 加速配置

#### CDN 设置
- **域名**: `download.xiaobai.ai`（需要备案域名）
- **源站**: 阿里云 OSS Bucket
- **加速区域**: 中国大陆
- **协议**: 支持 HTTPS

#### 缓存配置
- 安装包（.dmg, .zip, .exe）: 缓存 365 天
- YAML 文件（latest-*.yml）: 缓存 5 分钟（重要！保证更新及时）

---

### 3. RAM 子账号权限

创建 RAM 子账号用于自动化上传：

#### 权限策略
```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:PutObjectAcl",
        "oss:DeleteObject",
        "oss:ListObjects"
      ],
      "Resource": [
        "acs:oss:*:*:xiaobai-ai-releases",
        "acs:oss:*:*:xiaobai-ai-releases/*"
      ]
    }
  ]
}
```

#### AccessKey
- **AccessKey ID**: 保存到环境变量
- **AccessKey Secret**: 保存到环境变量

---

## 💻 实现步骤

### Step 1: 安装阿里云 OSS SDK

```bash
npm install --save-dev ali-oss
```

### Step 2: 创建上传脚本

**文件**: `scripts/upload-to-oss.js`

```javascript
const OSS = require('ali-oss');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 阿里云 OSS 配置
const ossClient = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
  bucket: 'xiaobai-ai-releases'
});

// 计算文件 SHA256
function calculateFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('base64');
}

// 上传文件到 OSS
async function uploadFile(localPath, remotePath) {
  console.log(`📤 上传: ${path.basename(localPath)} → ${remotePath}`);

  const result = await ossClient.put(remotePath, localPath, {
    headers: {
      'Content-Type': 'application/octet-stream'
    }
  });

  console.log(`✅ 上传成功: ${result.url}`);
  return result.url;
}

// 更新 latest-mac.yml
async function updateLatestYml(version, files) {
  const ymlContent = {
    version: version,
    files: files.map(file => ({
      url: file.url,
      sha512: file.sha512,
      size: file.size
    })),
    path: file.url,
    sha512: file.sha512,
    size: file.size
  };

  const yaml = require('js-yaml');
  const yamlStr = yaml.dump(ymlContent);

  const ymlPath = `mac/latest-mac.yml`;
  await ossClient.put(ymlPath, Buffer.from(yamlStr), {
    headers: {
      'Content-Type': 'text/yaml'
    }
  });

  console.log(`✅ 更新 ${ymlPath}`);
}

// 主函数
async function main() {
  const version = require('../package.json').version;
  const releaseDir = path.join(__dirname, '../release');

  console.log(`🚀 开始上传版本 ${version} 到阿里云 OSS`);

  // 上传 macOS 安装包
  const macFiles = [
    `xiaobai-ai-${version}.dmg`,
    `xiaobai-ai-${version}-arm64.dmg`,
    `xiaobai-ai-${version}-mac.zip`,
    `xiaobai-ai-${version}-arm64-mac.zip`
  ];

  const uploadedFiles = [];

  for (const file of macFiles) {
    const localPath = path.join(releaseDir, file);
    if (!fs.existsSync(localPath)) {
      console.log(`⚠️ 文件不存在: ${file}`);
      continue;
    }

    const remotePath = `mac/${file}`;
    const url = await uploadFile(localPath, remotePath);
    const sha512 = calculateFileHash(localPath);
    const size = fs.statSync(localPath).size;

    uploadedFiles.push({ url, sha512, size });
  }

  // 更新 latest-mac.yml
  await updateLatestYml(version, uploadedFiles);

  console.log('✅ 上传完成！');
}

main().catch(console.error);
```

### Step 3: 添加 npm 脚本

**package.json**

```json
{
  "scripts": {
    "dist:mac": "npm run build && electron-builder --mac",
    "upload:oss": "node scripts/upload-to-oss.js",
    "release:oss": "npm run dist:mac && npm run upload:oss"
  }
}
```

### Step 4: 配置环境变量

**.env** (不提交到 Git)

```bash
ALI_OSS_ACCESS_KEY_ID=LTAI5tXXXXXXXXXXXXXX
ALI_OSS_ACCESS_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
```

**.env.example**

```bash
ALI_OSS_ACCESS_KEY_ID=your_access_key_id
ALI_OSS_ACCESS_KEY_SECRET=your_access_key_secret
```

---

## 🔧 修改自动更新配置

### electron/main.js

```javascript
// 配置自动更新（使用阿里云 OSS）
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://download.xiaobai.ai/mac/'  // CDN 域名
});
```

### package.json

```json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://download.xiaobai.ai/mac/"
    }
  }
}
```

---

## 📦 完整发布流程

### 开发环境
```bash
# 1. 构建 macOS 安装包
npm run dist:mac

# 2. 上传到阿里云 OSS
npm run upload:oss

# 3. （可选）刷新 CDN 缓存
# 在阿里云 CDN 控制台手动刷新
```

### 一键发布
```bash
npm run release:oss
```

### 持续集成（GitHub Actions）

**文件**: `.github/workflows/release.yml`

```yaml
name: Release to Aliyun OSS

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build and upload
        env:
          ALI_OSS_ACCESS_KEY_ID: ${{ secrets.ALI_OSS_ACCESS_KEY_ID }}
          ALI_OSS_ACCESS_KEY_SECRET: ${{ secrets.ALI_OSS_ACCESS_KEY_SECRET }}
        run: |
          npm run release:oss
```

---

## 💰 成本估算

### OSS 存储成本
- **假设**: 每个版本 500MB，保留 10 个版本
- **总存储**: 500MB × 10 = 5GB
- **标准存储**: ¥0.12/GB/月
- **月成本**: 5GB × ¥0.12 = **¥0.60/月**

### CDN 流量成本
- **假设**: 每月 1000 次下载，每次 150MB
- **总流量**: 1000 × 150MB = 150GB
- **CDN 流量**: ¥0.24/GB（中国大陆）
- **月成本**: 150GB × ¥0.24 = **¥36/月**

### 请求次数成本
- **假设**: 每次 2 个请求（YAML + 安装包）
- **总请求**: 1000 × 2 = 2000 次
- **请求费用**: 免费（前 100 万次/月）

### **总月成本**: ¥36.60 ≈ **¥40/月**

---

## ✅ 测试方案

### 1. 手动测试
```bash
# 上传测试版本
npm run release:oss

# 验证文件可访问
curl -I https://download.xiaobai.ai/mac/latest-mac.yml
curl -I https://download.xiaobai.ai/mac/xiaobai-ai-2.7.3.dmg
```

### 2. 自动更新测试
1. 安装旧版本
2. 打开应用，检查更新
3. 验证能检测到新版本
4. 验证下载速度（应该显著提升）

### 3. 性能对比
| 平台 | 下载速度 | 用户反馈 |
|------|---------|---------|
| GitHub | 100-500 KB/s | 慢 |
| 阿里云 OSS | 5-10 MB/s | 快 ✅ |

---

## 📝 后续优化

### 短期
- [ ] 实现 Windows 版本上传
- [ ] 实现 Linux 版本上传
- [ ] 添加 CDN 自动刷新脚本

### 中期
- [ ] 接入阿里云日志分析（访问统计）
- [ ] 实现分区域下载（国内/国外）
- [ ] 添加下载次数统计

### 长期
- [ ] 考虑使用 P2P 加速（如 BitTorrent）
- [ ] 建立多个 CDN 节点（全球加速）
- [ ] 实现灰度发布

---

## 🚀 快速开始

### 第一次配置

1. **开通阿里云 OSS**
   - 访问 https://oss.console.aliyun.com/
   - 创建 Bucket: `xiaobai-ai-releases`
   - 设置权限为"公共读"

2. **配置 CDN**
   - 访问 https://cdn.console.aliyun.com/
   - 添加域名: `download.xiaobai.ai`
   - 源站设置为 OSS Bucket

3. **创建 RAM 子账号**
   - 访问 https://ram.console.aliyun.com/
   - 创建子账号并获取 AccessKey
   - 配置 OSS 权限策略

4. **本地配置**
   ```bash
   # 安装依赖
   npm install --save-dev ali-oss js-yaml

   # 创建上传脚本
   mkdir scripts
   # 复制上面的 upload-to-oss.js

   # 配置环境变量
   echo "ALI_OSS_ACCESS_KEY_ID=your_key" >> .env
   echo "ALI_OSS_ACCESS_KEY_SECRET=your_secret" >> .env
   ```

5. **测试上传**
   ```bash
   npm run release:oss
   ```

---

## 📞 相关资源

- [阿里云 OSS 文档](https://help.aliyun.com/product/31815.html)
- [阿里云 CDN 文档](https://help.aliyun.com/product/27109.html)
- [ali-oss SDK](https://www.npmjs.com/package/ali-oss)
- [electron-updater 文档](https://www.electron.build/auto-update)

---

**创建时间**: 2026-01-07
**文档版本**: v1.0
**维护人**: Claude Code + 晓力
