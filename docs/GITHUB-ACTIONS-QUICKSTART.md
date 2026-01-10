# 🚀 GitHub Actions 快速开始

## 第一次使用（5分钟设置）

### 1. 推送代码到 GitHub

```bash
# 初始化 git 仓库（如果还没有）
git init
git add .
git commit -m "feat: 添加 GitHub Actions 自动打包"

# 添加 GitHub 远程仓库
git remote add origin https://github.com/你的用户名/xiaobaiAI.git

# 推送代码
git push -u origin main
```

### 2. 配置阿里云 OSS（用于上传）

**方式 A：本地环境变量（推荐）**

创建 `.env` 文件：
```bash
ALIYUN_ACCESS_KEY_ID=你的AccessKeyId
ALIYUN_ACCESS_KEY_SECRET=你的AccessKeySecret
```

**方式 B：GitHub Secrets（可选，用于自动上传）**

1. 访问 GitHub 仓库设置
2. Settings → Secrets and variables → Actions
3. 点击 "New repository secret"
4. 添加：
   - Name: `ALIYUN_ACCESS_KEY_ID`
   - Value: 你的 AccessKeyId
5. 重复步骤添加 `ALIYUN_ACCESS_KEY_SECRET`

### 3. 触发打包

**方式 A：推送标签（推荐）**

```bash
# 更新版本号
npm version patch  # v2.10.13 -> v2.10.14

# 推送标签
git push --tags
```

GitHub Actions 会自动开始打包所有平台！

**方式 B：手动触发**

1. 访问：`https://github.com/你的用户名/xiaobaiAI/actions`
2. 点击左侧 "Build Multi-Platform"
3. 点击 "Run workflow"
4. 输入版本号：`v2.10.14`
5. 点击 "Run workflow"

## 下载和上传

### 从 GitHub Actions 下载

1. 访问 Actions 页面
2. 点击成功的 workflow run
3. 在 "Artifacts" 区域下载所有平台安装包

### 上传到阿里云 OSS

```bash
# 解压下载的 artifacts
unzip ~/Downloads/artifacts.zip

# 上传所有安装包
npm run upload:all artifacts -- --recursive

# 或只上传 Windows 版本
npm run upload:all artifacts -- --recursive --platform=windows
```

## 完整工作流程示例

```bash
# 1. 开发新功能
# ... 编写代码 ...

# 2. 测试
npm run dev

# 3. 提交代码
git add .
git commit -m "feat: 新功能"
git push

# 4. 发布新版本
npm version patch
git push --tags

# 5. 等待 GitHub Actions 打包完成（10-15分钟）

# 6. 下载测试
# 从 Actions 页面下载 Windows 版本测试

# 7. 上传到阿里云
npm run upload:all artifacts -- --recursive --platform=windows
```

## 常见问题

### Q: 如何查看打包进度？

A: 访问 `https://github.com/你的用户名/xiaobaiAI/actions`

### Q: 打包需要多长时间？

A:
- 首次：15-20 分钟
- 后续：10-15 分钟

### Q: 可以上传到阿里云吗？

A: 可以！有两种方式：
1. 手动下载后上传（推荐）：`npm run upload:all artifacts -- --recursive`
2. 自动上传：配置 GitHub Secrets 后自动上传

### Q: macOS 需要签名吗？

A: 可选：
- 不配置：可以打包，但用户会看到"未知开发者"警告
- 配置：需要 Apple Developer 证书，配置到 GitHub Secrets

### Q: 如何取消 `.npmignore`？

A: 删除 `.npmignore` 文件即可恢复本地打包：

```bash
rm .npmignore
```

## 下一步

详细文档请查看：
- 📖 [完整使用指南](./GITHUB-ACTIONS-GUIDE.md)
- 🔧 [Windows 打包问题解决](./WINDOWS-BUILD-GUIDE.md)

---

**需要帮助？** 查看文档或提交 Issue
