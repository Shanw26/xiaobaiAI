# GitHub API Key 泄露事故复盘

> **事故日期**: 2026-01-09
> **事故等级**: 🔴 严重（已解决）
> **影响范围**: GitHub 公开仓库
> **处理状态**: ✅ 已解决

---

## 📋 事故概述

### 事件描述

在准备将小白AI项目代码开源到 GitHub 时，通过代码审查发现 **GitHub 仓库中存在硬编码的敏感信息**：

1. **src/lib/cloudService.js** - 硬编码了 Supabase API Key
2. **.env.example** - 包含真实的 API Keys（而非占位符）
3. **electron/agent.js** - 硬编码了 Supabase URL

### 潜在风险

- ❌ 任何人都可以看到 Supabase API Keys
- ❌ 攻击者可能利用 Keys 访问数据库
- ❌ 可能导致数据泄露或篡改
- ❌ 影响 Supabase 配额和费用

---

## 🔍 问题发现过程

### 发现时间线

**2026-01-09 上午**：

1. **用户请求**: "帮我检查下小白项目的代码，review下，也看看技术文档写的怎样"
2. **代码审查**: 使用 Grep 搜索敏感信息
3. **发现泄露**: 在 `src/lib/cloudService.js:7` 发现硬编码的 API Key
4. **确认影响**: 检查 `.env.example` 也包含真实 Keys
5. **验证 GitHub**: 使用 `curl` 检查 GitHub 上的代码确认泄露

### 检查命令

```bash
# 搜索硬编码的 API Keys
grep -r "eyJhbGc" src/ electron/ --include="*.js"

# 验证 GitHub 上的代码
curl -s "https://raw.githubusercontent.com/Shanw26/xiaobaiAI/main/src/lib/cloudService.js"
```

---

## 🎯 根本原因分析

### 直接原因

1. **硬编码敏感信息**
   ```javascript
   // ❌ 错误做法
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   ```

2. **示例文件包含真实数据**
   ```bash
   # ❌ 错误做法
   # .env.example 包含真实 Keys
   VITE_SUPABASE_ANON_KEY=eyJhbGc...（真实的 Key）
   ```

### 深层原因

| 原因类别 | 具体说明 | 责任人 |
|---------|---------|-------|
| **流程缺失** | 没有代码审查检查清单 | 开发者 |
| **安全意识** | 不了解硬编码的危害 | 开发者 |
| **工具缺失** | 没有自动化敏感信息检测 | 团队 |
| **文档不足** | 开发规范未强调安全检查 | 团队 |

### 为什么会发生？

1. **开发便利性优先**
   - 为了快速测试，直接硬编码 Keys
   - 忘记了在提交前移除

2. **误解示例文件的作用**
   - 认为 `.env.example` 应该包含真实值作为参考
   - 实际应该只包含占位符

3. **缺乏检查流程**
   - 提交前没有检查敏感信息
   - 没有使用工具扫描

---

## 📊 影响评估

### 实际影响

| 影响类型 | 严重程度 | 实际情况 |
|---------|---------|---------|
| **数据安全** | 🟡 中 | Keys 暴露但未发现异常访问 |
| **服务可用性** | 🟢 低 | 服务正常运行 |
| **财务损失** | 🟢 低 | 无额外费用 |
| **声誉影响** | 🟢 低 | 快速发现并修复 |

### 泄露的 Keys

| Key 类型 | 泄露内容 | 状态 |
|---------|---------|------|
| **anon public** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ❌ 已失效 |
| **service_role** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ❌ 已失效 |

### 缓解因素

✅ **积极因素**：
1. 快速发现问题（代码审查阶段）
2. 还没有大量用户使用
3. 旧的 Keys 已立即失效
4. 数据库有 RLS 策略保护

---

## 🛠️ 处理过程

### 时间线（2026-01-09）

| 时间 | 操作 | 耗时 |
|-----|------|------|
| **10:00** | 发现 GitHub 代码泄露 | 10分钟 |
| **10:10** | 修复本地代码（3个文件） | 5分钟 |
| **10:15** | 重新生成 Supabase Keys | 10分钟 |
| **10:25** | 更新本地 `.env` 文件 | 2分钟 |
| **10:27** | 创建 Git 提交 | 3分钟 |
| **10:30** | 推送到 GitHub | 2分钟 |
| **10:32** | 验证修复效果 | 5分钟 |
| **总计** | | **37分钟** |

### 具体操作

#### 1. 修复代码

```javascript
// src/lib/cloudService.js
// ❌ 修复前
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// ✅ 修复后
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

#### 2. 更新 .env.example

```bash
# ❌ 修复前
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ✅ 修复后
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

#### 3. 重新生成 Keys

- 访问：https://supabase.com/dashboard/project/your-project-ref/settings/api
- 切换到 "Publishable and secret API keys" 标签
- 重新生成两个 Keys
- 复制新的 Keys 到本地 `.env`

#### 4. Git 提交和推送

```bash
git add .
git commit -m "security: 修复 API Key 泄露问题，使用环境变量"
git push origin main
```

#### 5. 验证修复

```bash
# 检查 GitHub 上的代码
curl -s "https://raw.githubusercontent.com/Shanw26/xiaobaiAI/main/src/lib/cloudService.js"
```

---

## 💡 经验教训

### 核心教训

#### 1. 永远不要硬编码敏感信息 ⭐⭐⭐

```javascript
// ❌ 错误
const API_KEY = 'sk-1234567890';

// ✅ 正确
const API_KEY = import.meta.env.VITE_API_KEY;
```

#### 2. 示例文件必须使用占位符

```bash
# ❌ 错误
DATABASE_URL=postgres://user:pass@localhost/db

# ✅ 正确
DATABASE_URL=your_database_url_here
```

#### 3. 提交前必须检查

```bash
# 每次提交前运行
git diff --cached | grep -i "key\|secret\|token\|password"
```

#### 4. 使用工具辅助检测

- [git-secrets](https://github.com/awslabs/git-secrets) - 自动检测敏感信息
- [truffleHog](https://github.com/trufflesecurity/trufflehog) - 扫描 Git 历史

---

## 🛡️ 预防措施

### 技术措施

#### 1. 添加 pre-commit hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# 检查是否包含敏感信息
if git diff --cached --name-only | xargs grep -l "sk-\|eyJhb"; then
    echo "❌ 检测到可能的敏感信息！"
    echo "请检查代码中是否包含 API Keys 或密码。"
    exit 1
fi
```

#### 2. 使用 .gitignore 模板

```gitignore
# 敏感信息
.env
.env.local
*.key
*.pem
secrets/
key.md
credentials.json
```

#### 3. 自动化扫描

```bash
# 安装 git-secrets
brew install git-secrets

# 配置扫描规则
git secrets --install
git secrets --register-aws
git secrets --add 'sk-[a-zA-Z0-9]{20,}'
git secrets --add 'eyJ[a-zA-Z0-9_-]{10,}\.eyJ'
```

### 流程措施

#### 1. 代码审查检查清单

每次提交前必须检查：

- [ ] 代码中没有硬编码的密码、Key、Token
- [ ] `.env.example` 只包含占位符
- [ ] `.gitignore` 包含所有敏感文件
- [ ] 运行 `git diff` 检查变更
- [ ] 使用工具扫描敏感信息

#### 2. 分支保护策略

```bash
# 配置 GitHub 分支保护
- 要求 Pull Request 审查
- 禁止直接推送到 main 分支
- 添加状态检查（CI/CD）
```

#### 3. 定期安全审计

- 每月扫描一次 GitHub 仓库
- 使用自动化工具检测泄露
- 监控依赖包漏洞

---

## 📚 相关资源

### 工具

- [git-secrets](https://github.com/awslabs/git-secrets) - AWS 开源的敏感信息检测工具
- [truffleHog](https://github.com/trufflesecurity/trufflehog) - 扫描 Git 历史的密钥
- [gitleaks](https://github.com/zricemanzxc/gitleaks) - Git 密钥检测工具

### 文档

- [Supabase 安全最佳实践](https://supabase.com/docs/guides/security)
- [GitHub 安全最佳实践](https://docs.github.com/en/code-security/securing-your-repository)
- [OWASP 密钥管理检查清单](https://cheatsheetseries.owasp.org/cheatsheets/Secret_Management_Cheat_Sheet.html)

### 内部文档

- [小白AI 开发规范](../DEVELOPMENT_GUIDELINES.md) - 核心原则第5条：安全与隐私
- [小白AI MEMORY.md](../MEMORY.md) - 项目开发历史

---

## 🔄 后续行动

### 必须完成 ✅

- [x] 修复本地代码中的硬编码 Keys
- [x] 更新 `.env.example` 为占位符
- [x] 重新生成 Supabase Keys
- [x] 推送修复到 GitHub
- [x] 验证修复效果
- [x] 创建事故复盘文档
- [ ] 更新开发规范（本文档链接）
- [ ] 安装 git-secrets 工具

### 建议完成 📋

- [ ] 配置 pre-commit hook
- [ ] 清理 Git 历史中的旧 Keys（可选）
- [ ] 添加 CI/CD 安全扫描
- [ ] 定期安全审计计划
- [ ] 团队安全培训

---

## 📝 附录

### A. 检测命令清单

```bash
# 1. 搜索硬编码的 Keys
grep -r "sk-\|eyJhb" . --include="*.js" --include="*.jsx"

# 2. 检查 .env.example
cat .env.example | grep -v "your_\|here"

# 3. 检查 Git 状态
git diff --cached | grep -i "key\|secret"

# 4. 扫描 Git 历史
git log --all --full-history --source -- "**/env.example"
```

### B. 应急响应流程

**发现泄露时**：

1. **立即**: 停止推送代码
2. **5分钟内**: 评估影响范围
3. **15分钟内**: 修复本地代码
4. **30分钟内**: 重新生成 Keys
5. **45分钟内**: 推送修复
6. **1小时内**: 验证和文档

### C. 联系方式

**需要帮助时**：
- Supabase 支持: https://supabase.com/support
- GitHub 安全: https://github.com/security
- 内部安全团队: [待补充]

---

**文档创建**: 2026-01-09
**创建人**: Claude Code + 晓力
**版本**: v1.0
**最后更新**: 2026-01-09

---

## 🎯 一句话总结

> **永远不要在代码中硬编码敏感信息，永远不要在示例文件中使用真实数据，永远在提交前检查是否有 Keys 泄露。**
