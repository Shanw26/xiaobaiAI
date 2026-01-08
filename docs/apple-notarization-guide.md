# Apple 公证配置指南

## 📖 什么是公证？

**公证** 是 Apple 对分发给公网应用的额外安全检查。通过公证后：
- ✅ 用户可以直接双击打开应用
- ✅ 不会显示"无法验证开发者"警告
- ✅ 提升用户信任度
- ✅ 可以公开发布

---

## 🔑 配置步骤

### 1️⃣ 获取 Apple ID 和应用专用密码

#### 前提条件
- ✅ 已有 Apple ID
- ✅ 已开启双重认证（必须）
- ✅ Apple 开发者账号（企业或个人）

#### 生成应用专用密码

1. **访问 Apple ID 管理页面**
   ```
   https://appleid.apple.com
   ```

2. **登录你的 Apple ID**

3. **进入"安全"部分**
   - 找到"应用专用密码"
   - 点击"生成密码"

4. **输入密码标签**
   - 例如：`小白AI公证`
   - 点击"创建"

5. **保存密码** ⚠️ **重要**
   - 复制生成的密码（格式：`abcd-efgh-ijkl-mnop`）
   - **只显示一次**，请妥善保存

---

### 2️⃣ 设置环境变量

#### 方式一：临时设置（推荐用于测试）

在终端中执行：

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="666P8DEX39"
```

然后打包：

```bash
npm run dist:mac
```

#### 方式二：永久设置（推荐用于发布）

**macOS / Linux**:

编辑 `~/.zshrc`（或 `~/.bashrc`）：

```bash
# Apple 公证配置
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="666P8DEX39"
```

然后执行：

```bash
source ~/.zshrc
```

---

### 3️⃣ 验证配置

#### 检查环境变量

```bash
echo $APPLE_ID
echo $APPLE_ID_PASSWORD
echo $APPLE_TEAM_ID
```

应该看到：
```
your-apple-id@example.com
abcd-efgh-ijkl-mnop
666P8DEX39
```

---

## 🚀 打包并公证

### 完整流程

1. **确保环境变量已设置**
   ```bash
   source ~/.zshrc  # 如果使用 zsh
   ```

2. **开始打包**
   ```bash
   npm run dist:mac
   ```

3. **观察输出**
   ```
   🔐 开始公证流程...
   📦 应用名称: 小白AI
   📂 输出目录: release/mac
   📤 正在上传到 Apple 公证服务器...
      Apple ID: your-apple-id@example.com
      Team ID: 666P8DEX39
      应用路径: release/mac/小白AI.app
   ✅ 公证成功！
   ✨ 用户现在可以直接双击打开应用，无需右键
   ```

---

## 🔍 常见问题

### ❌ 问题 1：缺少环境变量

**错误信息**：
```
⚠️  缺少公证所需的环境变量：
   - APPLE_ID: ❌ 未设置
   - APPLE_ID_PASSWORD: ❌ 未设置
   - APPLE_TEAM_ID: ❌ 未设置
```

**解决方案**：
```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="666P8DEX39"
```

---

### ❌ 问题 2：密码错误

**错误信息**：
```
Error: Notarization failed
Error: Incorrect password
```

**可能原因**：
1. 使用了 Apple ID 登录密码，而不是应用专用密码
2. 应用专用密码输入错误

**解决方案**：
- ✅ 使用"应用专用密码"，不是 Apple ID 密码
- ✅ 重新生成应用专用密码
- ✅ 确保没有多余的空格

---

### ❌ 问题 3：未开启双重认证

**错误信息**：
```
Error: Your Apple ID does not have two-factor authentication enabled
```

**解决方案**：
1. 访问 https://appleid.apple.com
2. 登录后进入"安全"部分
3. 开启"双重认证"

---

### ❌ 问题 4：开发者账号无效

**错误信息**：
```
Error: Your Apple Developer account does not have permission
```

**可能原因**：
- 开发者账号已过期
- Team ID 不正确

**解决方案**：
- 检查开发者账号状态
- 确认 Team ID：`666P8DEX39`

---

## 📋 环境变量说明

### APPLE_ID
- **说明**：你的 Apple ID 邮箱地址
- **示例**：`xiaolin@example.com`
- **获取**：你的 Apple ID

### APPLE_ID_PASSWORD
- **说明**：应用专用密码（不是 Apple ID 密码）
- **示例**：`abcd-efgh-ijkl-mnop`
- **获取**：https://appleid.apple.com → 安全 → 应用专用密码

### APPLE_TEAM_ID
- **说明**：开发者团队的 Team ID
- **示例**：`666P8DEX39`
- **获取**：Apple Developer 账户页面

---

## ✅ 验证公证是否成功

### 方法一：使用 spctl 命令

```bash
spctl -a -vv release/mac/小白AI.app
```

**成功输出**：
```
release/mac/小白AI.app: accepted
source=Notarized Developer ID
origin=Developer ID Application: Beijing Principle Technology Co., Ltd. (666P8DEX39)
```

**失败输出**（未公证）：
```
release/mac/小白AI.app: rejected
source=Unnotarized Developer ID
```

### 方法二：实际测试

1. **双击应用**
   - ✅ 应该直接打开，无警告
   - ⚠️ 如果显示警告，说明公证失败

---

## 🎯 对比：未公证 vs 已公证

| 特性 | 未公证 | 已公证 |
|------|--------|--------|
| 首次打开 | ⚠️ 需要右键打开 | ✅ 直接双击 |
| 用户警告 | ⚠️ 显示"无法验证开发者" | ✅ 无警告 |
| 用户体验 | ⚠️ 中等 | ✅ 优秀 |
| 分发范围 | ⚠️ 小范围 | ✅ 公开发布 |
| 配置难度 | ✅ 简单 | ⚠️ 需要配置 |

---

## 🔐 安全建议

### ⚠️ 不要提交到代码仓库

环境变量包含敏感信息，**不要**将以下内容提交到 Git：

```bash
# ❌ 错误：不要这样写
export APPLE_ID="xiaolin@example.com"
export APPLE_ID_PASSWORD="abcd-efgh-ijkl-mnop"
```

**正确做法**：
1. 使用本地环境变量
2. 创建 `.env.local` 文件（添加到 `.gitignore`）
3. 使用 CI/CD 的 secrets 功能

---

## 📚 相关文档

- **Apple 官方文档**：https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution
- **Electron 公证指南**：https://www.electronjs.org/docs/latest/tutorial/code-signing
- **代码签名配置**：`docs/12-macos-code-signing.md`

---

## 🎉 总结

### ✅ 公证配置完成后的效果

1. **代码签名**：✅ 使用 Apple Developer 证书
2. **公证**：✅ 通过 Apple 安全检查
3. **用户体验**：✅ 直接双击打开
4. **分发**：✅ 可公开发布

### 📌 配置清单

- [ ] 已有 Apple ID
- [ ] 已开启双重认证
- [ ] 已生成应用专用密码
- [ ] 已设置环境变量
- [ ] 已安装 @electron/notarize
- [ ] 已配置 afterSign 钩子
- [ ] 已成功测试公证

---

**配置人员**：晓力
**文档更新**：2026-01-08
**Team ID**：666P8DEX39
