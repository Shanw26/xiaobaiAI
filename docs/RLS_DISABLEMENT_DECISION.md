# RLS禁用决策分析

> **文档版本**: v1.0
> **创建时间**: 2026-01-09
> **相关问题**: SECURITY_AUDIT_DATABASE_v2.11.4.md 风险1

---

## 📋 问题背景

**用户问题**: 检查1（RLS策略完全禁用），当时为什么这么设计？

---

## 🔍 当时的技术困境

### 1. 无限递归错误 (PostgreSQL Error 42P17)

**问题描述**:

在 `004_fix_rls_policies.sql` 中设计了 RLS 策略，但遇到了递归问题：

```sql
-- messages 表的 RLS 策略
CREATE POLICY "Users can view own messages"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations  -- ❌ 子查询引用 conversations
    WHERE user_id = auth.uid()::text
  )
);
```

**错误信息**:
```
ERROR: infinite recursion detected in policies for relation "messages"
```

**递归循环过程**:

```
1. 用户查询 messages 表
   ↓
2. 触发 messages RLS 策略
   ↓
3. 策略需要验证 conversation_id 是否在 conversations 中
   ↓
4. 查询 conversations 表
   ↓
5. 触发 conversations RLS 策略
   ↓
6. conversations RLS 又需要验证 messages
   ↓
7. 回到步骤1，形成无限循环 ♻️
```

---

### 2. 游客模式的复杂性

**设计需求**:

小白AI需要支持**游客模式**（未登录用户），这给 RLS 带来了额外挑战：

```sql
-- 需求1: 游客可以访问自己的数据
SELECT * FROM conversations
WHERE device_id = 'xxx'
  AND user_id IS NULL;  -- 游客数据

-- 需求2: 登录后合并游客数据
UPDATE conversations
SET user_id = 'user-uuid'
WHERE device_id = 'xxx'
  AND user_id IS NULL;

-- 需求3: 登录用户可以访问游客时期的数据
SELECT * FROM conversations
WHERE user_id = 'user-uuid'
  OR device_id = 'xxx';  -- 也要包含游客时期的对话
```

**RLS 难点**:

1. **游客无 auth.uid()**: 未登录用户访问时，`auth.uid()` 返回 NULL
2. **设备ID隔离**: 需要通过 `device_id` 隔离游客数据，但 `device_id` 不在 Auth 上下文中
3. **合并后查询**: 登录用户的对话包含两部分（登录后 + 游客时期），查询复杂

---

### 3. 修复尝试的失败过程

**尝试1: 复杂的子查询策略** (`004_fix_rls_policies.sql`)

```sql
-- SELECT 策略：登录用户查看自己的对话或游客对话
CREATE POLICY "Users can view conversations"
ON conversations FOR SELECT
USING (
  user_id = auth.uid()::text
  OR
  (device_id IN (
    SELECT device_id FROM conversations
    WHERE user_id = auth.uid()::text  -- ❌ 递归！
    LIMIT 1
  ))
);
```

**结果**: ❌ 失败 - 无限递归

---

**尝试2: 使用 SECURITY DEFINER 函数**

```sql
CREATE OR REPLACE FUNCTION get_user_conversations()
RETURNS SETOF conversations
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT * FROM conversations
  WHERE user_id = auth.uid()::text;
END;
$$;
```

**问题**:
- ❌ 函数仍然受 RLS 限制
- ❌ SECURITY DEFINER 只绕过函数本身的权限，不绕过表的 RLS

---

**尝试3: 完全禁用 RLS** (`005_fix_rls_recursion.sql`)

```sql
-- 彻底修复 RLS 递归问题
-- 策略：暂时禁用 RLS，允许所有操作，后续逐步添加安全策略

ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

**结果**: ✅ 成功 - 立即解决了递归问题

---

## 🎯 当时的设计决策

### 决策1: 禁用 RLS（临时方案）

**文件**: `supabase/migrations/005_fix_rls_recursion.sql`

**理由**:

```sql
-- 说明
-- 这个方案暂时禁用了所有 RLS 策略，允许任意读写
-- 优点：可以立即测试游客模式是否工作
-- 缺点：没有数据隔离，任何人都可以查看/修改所有数据
--
-- 后续改进方向：
-- 1. 使用 Supabase 的 service_role key 进行服务端操作
-- 2. 创建 Edge Function 来处理数据操作，绕过 RLS
-- 3. 重新设计 RLS 策略，避免任何子查询
```

**当时考虑的因素**:

| 因素 | 权重 | 说明 |
|-----|------|------|
| **快速迭代** | ⭐⭐⭐⭐⭐ | 产品早期，需要快速验证游客模式 |
| **技术难度** | ⭐⭐⭐⭐ | RLS 递归问题难以解决 |
| **用户体验** | ⭐⭐⭐⭐ | 不想因为安全策略影响功能开发 |
| **安全风险** | ⭐⭐⭐ | 认为可以通过其他方式缓解（API限制） |
| **时间压力** | ⭐⭐⭐⭐ | 需要尽快上线游客模式 |

---

### 决策2: 使用 Service Role Key 绕过 RLS

**设计思路**:

```javascript
// 前端：使用 anon key（权限有限）
import { supabase } from './supabaseClient.js';
const { data } = await supabase
  .from('conversations')
  .select('*');

// 后端（Electron主进程）：使用 service role key（完全权限）
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // 绕过 RLS
);
```

**假设前提**:
1. ✅ 前端代码不会被逆向工程
2. ✅ 攻击者无法获取 anon key
3. ✅ API 访问可以限制频率
4. ✅ Service Role Key 只在服务端使用

**实际问题**:
- ❌ 前端代码完全可以被查看（Chrome DevTools）
- ❌ Anon key 公开在打包后的代码中
- ❌ 没有实现 API 速率限制
- ❌ Service Role Key 被错误地暴露在前端

---

## 📊 决策的时间线

```
v2.5.0 (2025-12-20)
├─ 尝试启用 RLS（004_fix_rls_policies.sql）
├─ ❌ 遇到无限递归错误 (42P17)
├─ ❌ 游客模式无法工作
└─ 🔧 禁用 RLS（005_fix_rls_recursion.sql）

v2.6.0 - v2.10.x (2025-12-21 ~ 2026-01-07)
├─ 游客模式正常工作
├─ 功能快速迭代
└─ ⚠️ RLS 一直禁用（临时方案变成了永久方案）

v2.11.4 (2026-01-09)
├─ 安全审计发现严重风险
├─ RLS 禁用导致数据完全暴露
└─ 🔴 需要立即修复
```

---

## 💡 当时没有考虑到的问题

### 1. Anon Key 的权限被低估

**当时想法**:
> "Anon key 只是公开 key，受 RLS 限制，应该没关系"

**实际情况**:
- ❌ RLS 被禁用后，anon key = 完全访问权限
- ❌ 任何人都可以用 anon key 查询所有数据

**验证**:
```bash
# 攻击者只需要这两行代码
curl "https://your-project.supabase.co/rest/v1/conversations" \
  -H "apikey: sb_publishable_YOUR_ANON_KEY_HERE" \
  -H "Authorization: Bearer sb_publishable_YOUR_ANON_KEY_HERE"

# ❌ 返回所有用户的对话！
```

---

### 2. "临时方案"变成了永久方案

**当时想法**:
> "先禁用 RLS，等功能稳定后再重新设计"

**实际情况**:
- ⚠️ v2.5.0 禁用 RLS（2025-12-20）
- ⚠️ v2.11.4 仍未修复（2026-01-09）
- ⚠️ 临时方案持续了 **20天**
- ⚠️ 期间积累了真实用户数据

---

### 3. 游客模式的复杂度被低估

**当时想法**:
> "游客模式就是简单的 device_id 隔离"

**实际情况**:
- ❌ RLS 策略中无法获取 device_id（不在 Auth 上下文）
- ❌ 需要子查询来关联游客数据和登录数据
- ❌ 子查询导致递归问题
- ❌ 最终只能选择禁用 RLS

---

## 🔧 为什么当时难以修复？

### 技术难点1: PostgreSQL RLS 的限制

**问题**: RLS 策略中无法访问当前请求的上下文信息

```sql
-- ❌ 无法获取 device_id（不在 Auth 上下文中）
CREATE POLICY "Guest can view own conversations"
ON conversations FOR SELECT
USING (device_id = ???);  -- 从哪里获取 device_id？

-- ✅ 只能使用 auth.uid()
USING (user_id = auth.uid());
```

**解决方案**: 需要从前端传递 device_id，但 RLS 策略无法接收参数

---

### 技术难点2: 避免子查询递归

**问题**: 消息表需要通过对话表验证权限

```sql
-- ❌ 这会导致递归
CREATE POLICY "Users can view messages"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations  -- ❌ 递归
    WHERE user_id = auth.uid()
  )
);
```

**可能的解决方案**:
1. 使用 PostgreSQL 触发器（复杂度高）
2. 使用物化视图（维护成本高）
3. 使用应用层权限验证（需要重构所有查询）

---

### 技术难点3: 游客 + 登录混合查询

**场景**: 登录用户需要查询两类数据

```javascript
// 前端需求：加载所有对话（包括游客时期的）
const { data } = await supabase
  .from('conversations')
  .select('*')
  .or(`user_id.eq.${userId},device_id.eq.${deviceId}`);
```

**RLS 难点**:
- ❌ 需要同时验证 `user_id` 和 `device_id`
- ❌ 但 RLS 中 `device_id` 无法从 Auth 上下文获取
- ❌ 只能使用复杂的 `OR` 条件和子查询

---

## ✅ 现在的解决方案

### 方案1: 重新设计 RLS（推荐）

**核心思路**: 避免子查询，使用简单条件

```sql
-- 1. 使用 Security Label 或自定义配置
CREATE TABLE user_contexts (
  user_id UUID PRIMARY KEY,
  device_ids TEXT[]  -- 存储该用户的所有 device_id
);

-- 2. 简化的 RLS 策略
CREATE POLICY "Users can view conversations"
ON conversations FOR SELECT
USING (
  user_id = auth.uid()
  OR device_id = ANY(
    SELECT device_ids FROM user_contexts
    WHERE user_id = auth.uid()
  )
);
```

**优点**:
- ✅ 避免了子查询递归
- ✅ 性能更好（使用数组查找）
- ✅ 易于维护

**缺点**:
- ⚠️ 需要维护 `user_contexts` 表
- ⚠️ 登录/登出时需要更新 `device_ids`

---

### 方案2: 使用 Edge Functions（更安全）

**核心思路**: 所有数据库操作通过 Edge Function

```typescript
// supabase/functions/get-conversations/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // 1. 验证用户身份
  const authHeader = req.headers.get('Authorization')!;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const { data: { user } } = await supabase.auth.getUser(authHeader);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. 从请求中获取 device_id
  const { deviceId } = await req.json();

  // 3. 使用 service role key 查询（绕过 RLS）
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .or(`user_id.eq.${user.id},device_id.eq.${deviceId}`);

  return new Response(JSON.stringify(data));
});
```

**优点**:
- ✅ 完全绕过 RLS 问题
- ✅ 安全性最高（service role key 不暴露）
- ✅ 灵活的权限控制

**缺点**:
- ⚠️ 需要重构所有数据库查询
- ⚠️ 性能略低（额外网络请求）

---

### 方案3: 应用层权限验证（快速修复）

**核心思路**: 前端查询 + 后端验证

```javascript
// 前端：正常查询
const { data } = await supabase
  .from('conversations')
  .select('*');

// 后端（Electron主进程）：验证并过滤
ipcMain.handle('get-conversations', async (event) => {
  const { user, deviceId } = getCurrentContext();

  let query = db.prepare(`
    SELECT * FROM conversations
    WHERE user_id = ? OR device_id = ?
  `);

  return query.all(user.id, deviceId);
});
```

**优点**:
- ✅ 快速实现（2小时）
- ✅ 完全控制权限逻辑
- ✅ 性能好（本地 SQLite）

**缺点**:
- ⚠️ 只适用于 Electron 桌面端
- ⚠️ Web 版本仍需其他方案

---

## 📝 经验教训

### 1. 临时方案不应该成为永久方案

**教训**:
- ⚠️ "暂时禁用 RLS" 很容易变成"一直禁用"
- ⚠️ 应该设置明确的时间线和责任人

**改进**:
```sql
-- ✅ 在迁移文件中添加 TODO 和截止日期
-- TODO: 重新启用 RLS (截止日期: 2026-01-30)
-- 负责人: 晓力
-- 风险: 数据完全暴露
```

---

### 2. 安全问题不能妥协

**教训**:
- ⚠️ 为了快速迭代而牺牲安全是得不偿失的
- ⚠️ 一旦数据泄露，无法挽回

**改进**:
- ✅ 任何涉及数据安全的修改都需要安全审查
- ✅ 重要决策需要记录理由和风险

---

### 3. 复杂的功能需要提前设计安全方案

**教训**:
- ⚠️ 游客模式的设计初期就应该考虑 RLS 如何实现
- ⚠️ 不应该先实现功能，再考虑安全

**改进**:
- ✅ 新功能设计时同步设计安全方案
- ✅ 技术评审包含安全评审

---

## 🎯 下一步行动

### 立即行动（本周）

1. **选择最终方案**:
   - 方案1: 重新设计 RLS（8小时，长期收益高）
   - 方案2: 使用 Edge Functions（16小时，最安全）
   - 方案3: 应用层验证（2小时，快速修复）

2. **临时缓解措施**:
   ```bash
   # 限制 anon key 的访问频率（Supabase Dashboard）
   # 添加 IP 白名单（如果适用）
   # 监控异常查询日志
   ```

3. **数据备份**:
   ```bash
   # 立即导出所有用户数据
   supabase db dump --db-url "$DATABASE_URL" > backup_$(date +%Y%m%d).sql
   ```

---

## 📚 相关文档

- **安全审计报告**: `reports/SECURITY_AUDIT_DATABASE_v2.11.4.md`
- **数据库设计**: `docs/03-database-design.md`
- **RLS 迁移文件**:
  - `supabase/migrations/004_fix_rls_policies.sql`
  - `supabase/migrations/005_fix_rls_recursion.sql`
  - `supabase/migrations/20260107_enable_rls_policies.sql`

---

**文档创建**: 2026-01-09
**创建人**: Claude Code + 晓力
**状态**: ✅ 完整分析了当时的设计决策和困境
