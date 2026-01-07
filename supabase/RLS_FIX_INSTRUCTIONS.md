# 数据库安全修复 - 应用指南

## 🚀 方案A：快速修复 - 已完成

### ✅ 已完成的工作

1. **环境变量配置**
   - ✅ 创建 `.env` 文件（包含实际密钥）
   - ✅ 创建 `.env.example` 文件（模板）
   - ✅ 添加到 `.gitignore`（不会泄露）

2. **代码更新**
   - ✅ 更新 `src/lib/supabaseClient.js` 使用环境变量
   - ✅ 添加安全警告注释

3. **RLS 策略**
   - ✅ 创建迁移文件：`supabase/migrations/20260107_enable_rls_policies.sql`
   - ✅ 启用所有表的 RLS
   - ✅ 创建简单的安全策略

---

## 📋 应用步骤（必须执行）

### 步骤1：应用数据库迁移

**方式1：使用 Supabase CLI**（推荐）
```bash
cd /Users/shawn/Downloads/小白AI
supabase db push
```

**方式2：手动执行**（如果没有 CLI）
1. 打开 Supabase Dashboard: https://cnszooaxwxatezodbbxq.supabase.co
2. 进入 SQL Editor
3. 打开文件：`supabase/migrations/20260107_enable_rls_policies.sql`
4. 复制全部内容到 SQL Editor
5. 点击 "Run" 执行

### 步骤2：验证 RLS 策略

执行以下 SQL 验证：

```sql
-- 检查 RLS 是否启用
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 应该看到所有表的 rls_enabled = true
```

### 步骤3：测试应用

```bash
cd /Users/shawn/Downloads/小白AI
npm run dev
```

**测试要点**：
- ✅ 登录功能是否正常
- ✅ 发送消息是否正常
- ✅ 用户信息和 AI 记忆是否正常
- ⚠️ 如果有错误，检查浏览器控制台

---

## ⚠️ 已知限制

1. **前端仍在使用 supabaseAdmin**
   - 前端代码 (`cloudService.js`) 仍然使用 `supabaseAdmin`
   - 这会绕过 RLS 策略
   - **这是临时方案**，需要在后续版本中修复

2. **RLS 策略较简单**
   - 某些表（如 `user_profiles`）完全禁止前端访问
   - 复杂查询可能会有问题

3. **安全风险仍然存在**
   - Service Role Key 仍在前端代码中（虽然已移到 .env）
   - 需要实施方案B或C才能彻底解决

---

## 📊 当前安全状态

| 安全措施 | 状态 | 说明 |
|---------|------|------|
| 环境变量 | ✅ 完成 | 密钥已移到 .env |
| RLS 策略 | ⚠️ 部分完成 | 已启用，但前端绕过 |
| 前端隔离 | ❌ 未完成 | 前端仍使用 supabaseAdmin |
| 整体安全 | 🟡 中等 | 比之前好，但仍需改进 |

---

## 🎯 下一步改进（建议）

### 短期（本周）：
- [ ] 实施方案B：将数据库操作移到 Electron 主进程
- [ ] 前端通过 IPC 调用后端

### 长期（未来）：
- [ ] 实施方案C：使用 Edge Functions
- [ ] 完全隔离数据库访问

---

## 🔄 回滚方案

如果出现问题，执行以下 SQL 回滚：

```sql
-- 禁用所有 RLS
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory DISABLE ROW LEVEL SECURITY;
```

---

**创建时间**: 2026-01-07
**维护者**: Claude Code + 晓力
