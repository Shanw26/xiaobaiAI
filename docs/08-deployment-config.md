# 部署与配置

> **适用版本**: v2.6.3+
> **阅读时间**: 10分钟
> **相关文档**: [快速入门](./01-快速入门.md) | [系统架构](./06-系统架构.md)

---

## 环境配置

### 本地开发环境

#### 前置要求

```bash
# 1. Node.js (推荐 v18+)
node --version

# 2. npm (Node.js 自带)
npm --version

# 3. Git (可选，用于版本控制)
git --version
```

#### 安装依赖

```bash
cd /Users/shawn/Downloads/小白AI
npm install
```

#### 启动开发服务器

```bash
npm run dev
```

**开发模式特点**:
- 热重载（HMR）
- 自动打开 DevTools
- 日志输出到控制台

---

## Supabase 配置

### 项目信息

**项目地址**: https://cnszooaxwxatezodbbxq.supabase.co

**创建时间**: 2026-01-06

### Keys 配置

**文件**: `.env`

```bash
# Supabase 项目 URL
VITE_SUPABASE_URL=https://cnszooaxwxatezodbbxq.supabase.co

# Supabase Anon Key（客户端使用）
VITE_SUPABASE_ANON_KEY=REMOVED

# Supabase Service Role Key（仅服务端使用）
VITE_SUPABASE_SERVICE_ROLE_KEY=REMOVED
```

**Key 说明**:

| Key | 用途 | 格式 | 安全性 |
|-----|------|------|-------|
| **Anon Key** | 前端查询 | JWT (`eyJ` 开头) | 公开，受环境限制 |
| **Service Role Key** | 后端操作 | JWT (`eyJ` 开头) | **机密**，绕过 RLS |

⚠️ **重要提示**:
1. **Service Role Key 必须是 JWT 格式**（`eyJ` 开头），不是 Personal Access Token（`sbp` 开头）
2. Service Role Key 绝不能暴露在客户端代码中！
3. Personal Access Token 仅用于 Supabase CLI，不能用于应用配置

**Key 格式识别**:

| Key 类型 | 前缀 | 用途 |
|---------|------|------|
| Anon Key | `eyJhbGci...` | 客户端查询 |
| Service Role Key | `eyJhbGci...` | 服务端操作，绕过 RLS |
| Personal Access Token | `sbp_...` | Supabase CLI，**不用于应用** |

**如何获取正确的 Key**:
1. 访问: https://supabase.com/dashboard/project/cnszooaxwxatezodbbxq/settings/api
2. 找到 **Project API keys** 部分
3. 复制对应的密钥（注意区分 `anon` 和 `service_role`）
4. **不要复制 Personal Access Token**（用于 CLI，不是应用）

**常见错误**:
- ❌ 错误：使用 Personal Access Token（`sbp_...`）作为 Service Role Key
- ✅ 正确：使用 service_role 密钥（JWT 格式，`eyJ...`）

**错误症状**:
- HTTP 401 Unauthorized
- 错误信息：`Invalid API key`
- 用户信息和 AI 记忆保存失败

**参考文档**:
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
- [更新日志 v2.8.0](./10-changelog.md#2026-01-07---v280-开发版本)

### 数据库迁移

#### 应用迁移

```bash
# 方式1: Supabase CLI
supabase db push

# 方式2: 手动执行
# 在 Supabase Dashboard → SQL Editor 中执行迁移文件
```

#### 迁移文件

```
supabase/migrations/
├── 001_initial_schema.sql
├── 002_add_has_api_key.sql
├── 003_add_device_id.sql
├── 004_fix_rls_policies.sql
├── 005_fix_rls_recursion.sql           -- 禁用RLS
├── 006_allow_null_user_id.sql          -- 允许user_id为NULL
├── 007_auto_confirm_email.sql
└── 008_merge_function.sql              -- 数据合并函数
```

---

## Edge Function 配置

### 部署短信服务

**函数名**: `send-sms`

**文件**: `supabase/functions/send-sms/index.ts`

#### 部署步骤

```bash
# 1. 安装 Supabase CLI
brew install supabase/tap/supabase

# 2. 链接项目
supabase link --project-ref cnszooaxwxatezodbbxq

# 3. 部署函数
supabase functions deploy send-sms
```

#### 配置环境变量

在 **Supabase Dashboard** → **Settings** → **Secrets** 中添加：

```bash
ALIYUN_ACCESS_KEY_ID=your_access_key_id_here
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret_here
ALIYUN_SMS_SIGN_NAME=你的短信签名
ALIYUN_SMS_TEMPLATE_CODE=你的短信模板代码
```

⚠️ **安全**: Access Key Secret 仅存储在云端环境变量，不在客户端代码中。

#### 禁用 JWT 验证

在 **Supabase Dashboard** → **Edge Functions** → **Settings** 中：

- 关闭 **Require JWT verification**
- 允许公开访问 Edge Function

**原因**: 前端直接调用 Edge Function，无需用户认证。

---

## 阿里云短信配置

### 开通短信服务

1. 登录 [阿里云控制台](https://dysms.console.aliyun.com/)
2. 开通短信服务
3. 创建短信签名
4. 创建短信模板

### 短信签名

**名称**: 原则科技

**审核要求**:
- 签名名称
- 应用场景
- 业务说明

### 短信模板

**模板CODE**: `SMS_223880024`

**模板内容**:
```
您的验证码是${code}，5分钟内有效，请勿泄露。
```

**变量**:
- `code`: 验证码（6位数字）

### AccessKey 配置

**创建 AccessKey**:
1. 登录 [RAM 控制台](https://ram.console.aliyun.com/)
2. 创建 AccessKey
3. 保存 AccessKey ID 和 Secret

**配置位置**: Supabase Secrets (见上文)

⚠️ **安全**: AccessKey Secret 仅配置在云端，不在代码中。

---

## Electron 打包配置

### 打包配置文件

**文件**: `electron-builder.yml`

```yaml
appId: com.xiaobai.ai
productName: 小白AI
directories:
  buildResources: build
  output: release

files:
  - dist/**/*
  - electron/**/*
  - package.json

mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch:
        - x64
        - arm64
    - target: zip
      arch:
        - x64
        - arm64

dmg:
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications
```

### 构建命令

```bash
# macOS 构建
npm run dist:mac

# Windows 构建
npm run dist:win

# Linux 构建
npm run dist:linux
```

### 构建产物

**macOS**:
- `xiaobai-ai-2.6.3.dmg` - Intel DMG（推荐）
- `xiaobai-ai-2.6.3-arm64.dmg` - ARM64 DMG（推荐）
- `xiaobai-ai-2.6.3-mac.zip` - Intel ZIP
- `xiaobai-ai-2.6.3-arm64-mac.zip` - ARM64 ZIP

**Windows**:
- `小白AI Setup 2.6.3.exe` - 安装程序
- `小白AI 2.6.3.exe` - 绿色版

---

## macOS 代码签名配置（v2.7.8+）

### 签名概述

小白AI 使用 **Apple Developer 正式签名**，用户可以双击直接打开应用，无需额外操作。

**当前签名状态**:
- ✅ Developer ID Application 证书
- ✅ Hardened Runtime 启用
- ✅ 自动签名流程

### 证书信息

| 项目 | 值 |
|------|-----|
| **证书类型** | Developer ID Application |
| **证书名称** | Developer ID Application: Beijing Principle Technology Co., Ltd. (666P8DEX39) |
| **Team ID** | 666P8DEX39 |
| **Hardened Runtime** | true |

### 自动签名流程

**配置文件**:
1. `package.json` - 签名配置
2. `scripts/afterPack.js` - 自动签名脚本

**工作流程**:
```bash
npm run dist:mac
  ↓
1. 构建前端代码
  ↓
2. 打包 Electron 应用
  ↓
3. 🤖 自动执行签名脚本 ← afterPack.js
  ↓
4. 验证签名
  ↓
5. 生成 DMG 和 ZIP
```

**关键配置** (`package.json`):
```json
{
  "build": {
    "mac": {
      "hardenedRuntime": true,
      "identity": "4E76C4CD7F4ABFA82DF8EED886AA36F117140EDD"
    },
    "afterPack": "scripts/afterPack.js"
  }
}
```

### 验证签名

```bash
# 查看签名信息
codesign -dv --verbose=4 release/mac/小白AI.app

# 查看证书链
codesign -dv --verbose=4 release/mac/小白AI.app | grep Authority
```

**预期输出**:
```
Authority=Developer ID Application: Beijing Principle Technology Co., Ltd. (666P8DEX39)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
TeamIdentifier=666P8DEX39
```

### 配置新电脑

如果您需要在其他电脑上配置相同的签名，请参考：

👉 **[macOS Code Signing 完整指南](./12-macos-code-signing.md)**

该文档包含：
- CSR 生成步骤
- 证书申请流程
- 证书安装方法
- 常见问题排查

### 用户体验提升

| 之前（Ad-hoc 签名） | 现在（正式签名） |
|-------------------|----------------|
| 双击 → "无法验证开发者" → 右键打开 | 双击 → 直接启动 ✅ |
| 用户觉得不安全 | 用户可信任 |

---

## 自动更新配置

### electron-updater

**文件**: `electron/main.js`

```javascript
const { autoUpdater } = require('electron-updater');

// 配置更新服务器
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'Shanw26',
  repo: 'xiaobaiAI'
});

// 检查更新
autoUpdater.checkForUpdatesAndNotify();

// 监听更新事件
autoUpdater.on('update-available', (info) => {
  console.log('发现新版本:', info.version);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('更新已下载');
});
```

### 发布更新

```bash
# 1. 更新版本号
# package.json, electron/main.js

# 2. 构建
npm run dist:mac

# 3. 创建 Git 标签
git tag -a v2.6.4 -m "版本说明"
git push origin v2.6.4

# 4. 创建 GitHub Release
gh release create v2.6.4 \
  --title "小白AI v2.6.4" \
  --notes "更新内容" \
  xiaobai-ai-2.6.4.dmg \
  xiaobai-ai-2.6.4-arm64.dmg \
  latest-mac.yml
```

**重要**:
- `latest-mac.yml` 必须上传到 Release
- 仓库必须是公开的（私有仓库无法自动更新）

---

## 环境变量配置

### 开发环境

**文件**: `.env` (不提交到 Git)

```bash
# Supabase
VITE_SUPABASE_URL=https://cnszooaxwxatezodbbxq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_yL-VG_zetVGywK__-nGtRw_kjmqP3jQ

# 官方 API Key (游客模式使用)
VITE_OFFICIAL_ZHIPU_API_KEY=你的智谱API Key
```

### 生产环境

生产环境不使用 `.env` 文件，配置直接写在代码中（见 `src/lib/supabaseClient.js`）。

---

## 常见问题

### Q1: Edge Function 401 错误

**错误**: `{"code":401,"message":"Invalid JWT"}`

**原因**: JWT 验证未禁用

**解决方案**:
1. 进入 Supabase Dashboard
2. Edge Functions → Settings
3. 关闭 "Require JWT verification"

### Q2: 短信发送失败

**错误**: `Specified signature is not matched`

**原因**: 签名算法错误

**解决方案**:
```typescript
// 正确的签名实现
const canonicalizedQueryString = sortedKeys
  .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
  .join('&');

const signature = ...; // 不再额外编码
```

**不要** `encodeURIComponent(signature)`

### Q3: 数据库连接失败

**检查清单**:
1. Supabase 项目是否暂停
2. 网络连接是否正常
3. URL 和 Key 是否正确
4. 浏览器控制台错误信息

### Q4: 打包后应用无法启动

**排查步骤**:
1. 检查 `package.json` 中的 `main` 字段
2. 检查 `electron-builder.yml` 配置
3. 查看打包日志
4. 尝试在开发环境运行

### Q5: 自动更新失败

**检查清单**:
1. 仓库是否为公开（私有仓库无法自动更新）
2. `latest-mac.yml` 是否上传到 Release
3. 版本号是否正确
4. 网络连接是否正常

---

## 性能优化

### 数据库优化

```sql
-- 1. 创建索引
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- 2. 定期清理过期数据
DELETE FROM verification_codes WHERE expires_at < NOW();

-- 3. 分析查询性能
EXPLAIN ANALYZE
SELECT * FROM conversations WHERE user_id = 'xxx';
```

### 构建优化

```bash
# 清理缓存
rm -rf node_modules/.vite dist

# 重新构建
npm run build
npm run dist:mac
```

---

## 监控与日志

### 前端日志

```javascript
// 开发模式
console.log('用户登录:', user);

// 生产模式（可考虑集成 Sentry）
if (process.env.NODE_ENV === 'production') {
  // 上报错误
  window.addEventListener('error', (e) => {
    // 发送到监控服务
  });
}
```

### 后端日志

```javascript
// electron/main.js
const log = require('electron-log');

log.info('应用启动');
log.error('错误:', error);
```

### Supabase 日志

在 **Supabase Dashboard** → **Logs** 中查看:
- API 请求日志
- Edge Function 日志
- 数据库查询日志

---

## 安全检查清单

### 代码安全

- [ ] Service Role Key 不在客户端代码中
- [ ] Access Key Secret 不在客户端代码中
- [ ] 敏感信息不提交到 Git
- [ ] `.env` 文件在 `.gitignore` 中

### 数据库安全

- [ ] RLS 策略正确配置（当前禁用）
- [ ] 敏感数据加密存储
- [ ] 定期备份（Supabase 自动备份）

### 网络安全

- [ ] 所有 API 使用 HTTPS
- [ ] Edge Function 鉴权配置正确
- [ ] CORS 配置正确

---

## 相关文件

| 文件 | 说明 |
|-----|------|
| `src/lib/supabaseClient.js` | Supabase 客户端配置 |
| `supabase/functions/send-sms/` | Edge Function |
| `electron-builder.yml` | 打包配置 |
| `.gitignore` | Git 忽略文件 |

---

**最后更新**: 2026-01-07
**相关文档**: [快速入门](./01-快速入门.md) | [系统架构](./06-系统架构.md)
