# 数据库设计

> **适用版本**: v2.6.3+
> **阅读时间**: 10分钟
> **相关文档**: [登录系统](./02-登录系统.md) | [设备ID与游客模式](./04-设备ID与游客模式.md)

---

## 数据库概览

小白AI使用 **Supabase PostgreSQL** 作为云端数据库。

### 数据库特点

- **BaaS 平台**: 无需自建服务器
- **PostgreSQL**: 成熟稳定，支持复杂查询
- **实时订阅**: 支持数据变更实时推送
- **Row Level Security**: 行级安全策略（当前已禁用）

---

## 表结构设计

### 1. user_profiles (用户资料表)

存储用户基本信息，**仅使用手机号作为唯一标识**。

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,           -- 手机号(唯一标识)
  has_api_key BOOLEAN DEFAULT false,    -- 是否配置了API Key
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_user_profiles_phone ON user_profiles(phone);
```

**字段说明**:

| 字段 | 类型 | 说明 | 必填 |
|-----|------|------|------|
| id | UUID | 主键，自动生成 | ✅ |
| phone | TEXT | 手机号，唯一标识 | ✅ |
| has_api_key | BOOLEAN | 是否配置了自己的 API Key | ❌ (默认 false) |
| created_at | TIMESTAMPTZ | 创建时间 | ❌ (自动生成) |

**设计要点**:
- ✅ 不需要 email 字段（小白AI特点）
- ✅ phone 是唯一标识
- ✅ 简单设计，只存储必需字段

---

### 2. verification_codes (验证码表)

存储短信验证码，5分钟有效期。

```sql
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,                  -- 手机号
  code TEXT NOT NULL,                   -- 6位验证码
  used BOOLEAN DEFAULT false,           -- 是否已使用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL       -- 过期时间(5分钟)
);

-- 索引
CREATE INDEX idx_verification_codes_phone_code ON verification_codes(phone, code);
CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);
```

**字段说明**:

| 字段 | 类型 | 说明 | 必填 |
|-----|------|------|------|
| id | UUID | 主键 | ✅ |
| phone | TEXT | 手机号 | ✅ |
| code | TEXT | 6位验证码 | ✅ |
| used | BOOLEAN | 是否已使用 | ❌ (默认 false) |
| created_at | TIMESTAMPTZ | 创建时间 | ❌ |
| expires_at | TIMESTAMPTZ | 过期时间 | ✅ |

**验证码查询**:
```sql
SELECT * FROM verification_codes
WHERE phone = '18601043813'
  AND code = '123456'
  AND used = false                      -- 未使用
  AND expires_at >= NOW()               -- 未过期
ORDER BY created_at DESC
LIMIT 1;
```

---

### 3. conversations (对话表)

存储对话历史，支持游客模式和登录模式。

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,                  -- 对话标题
  model TEXT DEFAULT 'claude-3-5-sonnet-20241022',
  device_id TEXT NOT NULL,              -- 设备ID(始终存在)
  user_id UUID,                         -- 用户ID(游客为NULL)
  is_deleted BOOLEAN DEFAULT false,     -- 软删除标记
  created_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

-- 索引
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_device_id ON conversations(device_id);
CREATE INDEX idx_conversations_is_deleted ON conversations(is_deleted);
```

**字段说明**:

| 字段 | 类型 | 说明 | 必填 |
|-----|------|------|------|
| id | UUID | 对话ID（前端生成） | ✅ |
| title | TEXT | 对话标题 | ✅ |
| model | TEXT | AI 模型名称 | ❌ (默认 claude) |
| device_id | TEXT | 设备ID（始终存在） | ✅ |
| user_id | UUID | 用户ID（游客为NULL） | ❌ |
| is_deleted | BOOLEAN | 软删除标记 | ❌ (默认 false) |
| created_at | TIMESTAMPTZ | 创建时间 | ❌ |

**设计要点**:
- ✅ `device_id` 始终有值（游客模式也记录）
- ✅ `user_id` 可为 NULL（游客数据）
- ✅ 软删除机制（`is_deleted`）

**数据示例**:

```
游客数据:
{ id: uuid-1, title: "你好", device_id: "abc123", user_id: NULL, is_deleted: false }

登录用户数据:
{ id: uuid-2, title: "帮我写代码", device_id: "abc123", user_id: "user-uuid", is_deleted: false }

合并后(游客登录):
{ id: uuid-1, title: "你好", device_id: "abc123", user_id: "user-uuid", is_deleted: false }
```

---

### 4. messages (消息表)

存储对话中的每条消息。

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL,                   -- 'user' 或 'assistant'
  content TEXT NOT NULL,                -- 消息内容
  thinking TEXT,                        -- AI思考过程
  files JSONB,                          -- 附件信息
  created_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- 索引
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
```

**字段说明**:

| 字段 | 类型 | 说明 | 必填 |
|-----|------|------|------|
| id | UUID | 消息ID | ✅ |
| conversation_id | UUID | 所属对话ID | ✅ |
| role | TEXT | 角色（user/assistant） | ✅ |
| content | TEXT | 消息内容 | ✅ |
| thinking | TEXT | AI思考过程 | ❌ |
| files | JSONB | 附件信息（JSON） | ❌ |
| created_at | TIMESTAMPTZ | 创建时间 | ❌ |

**JSONB 示例**:
```json
{
  "name": "report.pdf",
  "type": "application/pdf",
  "size": 1024000,
  "url": "file:///path/to/report.pdf"
}
```

---

### 5. guest_usage (游客使用统计)

统计游客使用次数（免费额度）。

```sql
CREATE TABLE guest_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,       -- 设备ID(唯一)
  usage_count INTEGER DEFAULT 0,        -- 使用次数
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_guest_usage_device_id ON guest_usage(device_id);
```

**字段说明**:

| 字段 | 类型 | 说明 | 必填 |
|-----|------|------|------|
| id | UUID | 主键 | ✅ |
| device_id | TEXT | 设备ID（唯一标识） | ✅ |
| usage_count | INTEGER | 使用次数 | ❌ (默认 0) |
| last_used_at | TIMESTAMPTZ | 最后使用时间 | ❌ |

**使用逻辑**:
- 游客每次发送消息，`usage_count + 1`
- 当 `usage_count >= 10` 时，提示登录
- 登录后不再检查此表

---

## RLS (Row-Level Security) 策略

### 当前状态: 已禁用

**重要决定 (v2.5.0+)**: **完全禁用 RLS**

**原因**:
1. RLS 策略导致无限递归错误 (42P17)
2. 策略复杂度高，维护困难
3. 使用 service role key 可以完全绕过 RLS

### 之前的问题

**无限递归示例**:
```sql
-- messages 表的 RLS 策略
CREATE POLICY messages_policy ON messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations  -- 子查询引用 conversations
      WHERE user_id = auth.uid()
    )
  );

-- conversations 表的 RLS 策略
CREATE POLICY conversations_policy ON conversations
  FOR SELECT
  USING (user_id = auth.uid());

-- 结果: 递归循环!
```

### 解决方案

**文件**: `supabase/migrations/005_fix_rls_recursion.sql`

```sql
-- 完全禁用 RLS
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_usage DISABLE ROW LEVEL SECURITY;
```

### 安全替代方案

| 场景 | 使用客户端 | 说明 |
|-----|-----------|------|
| 前端查询 | `supabase` (anon key) | 受环境限制，只能查询公开数据 |
| 后端操作 | `supabaseAdmin` (service role) | 完全绕过 RLS |
| Edge Function | 环境变量中的 service role key | 云端执行，安全可靠 |

---

## 数据库迁移

### 迁移文件列表

```
supabase/migrations/
├── 001_initial_schema.sql              -- 初始表结构
├── 002_add_has_api_key.sql             -- 添加 has_api_key 字段
├── 003_add_device_id.sql               -- 添加 device_id 字段
├── 004_fix_rls_policies.sql            -- 修复 RLS 策略
├── 005_fix_rls_recursion.sql           -- 禁用 RLS（递归问题）
├── 006_allow_null_user_id.sql          -- 允许 user_id 为 NULL
├── 007_auto_confirm_email.sql          -- 禁用邮箱确认
└── 008_merge_function.sql              -- 数据合并函数
```

### 应用迁移

```bash
# 方式1: Supabase CLI
supabase db push

# 方式2: 手动执行
# 在 Supabase Dashboard → SQL Editor 中执行迁移文件
```

### 关键迁移

#### 006: 允许 user_id 为 NULL

**问题**: 游客数据 `user_id` 为 NULL，但表定义要求 NOT NULL

**错误**:
```
null value in column "user_id" violates not-null constraint
```

**解决方案**:
```sql
-- 006_allow_null_user_id.sql
ALTER TABLE conversations ALTER COLUMN user_id DROP NOT NULL;
```

---

## 数据合并函数

### merge_guest_conversations_to_user

**功能**: 游客登录后，将游客对话关联到用户账号

```sql
-- 008_merge_function.sql
CREATE OR REPLACE FUNCTION merge_guest_conversations_to_user(
  p_device_id TEXT,
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  merged_count INTEGER;
BEGIN
  -- 更新该设备的所有游客对话，关联到登录用户
  UPDATE conversations
  SET user_id = p_user_id
  WHERE device_id = p_device_id
    AND user_id IS NULL        -- 仅游客数据
    AND is_deleted = false;    -- 未删除的对话

  GET DIAGNOSTICS merged_count = ROW_COUNT;
  RETURN merged_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**SECURITY DEFINER 说明**:
- 使用函数所有者的权限执行（而非调用者）
- 绕过 RLS 限制
- 确保合并操作一定能成功

**调用示例**:
```javascript
// cloudService.js
const { data, error } = await supabase.rpc('merge_guest_conversations_to_user', {
  p_device_id: 'abc123...',
  p_user_id: 'user-uuid-xxx'
});

console.log(`成功合并 ${data} 个游客对话`);
```

---

## 常见查询

### 查询用户对话

```sql
-- 登录用户: 获取所有对话（包括游客时期的）
SELECT * FROM conversations
WHERE (user_id = 'user-uuid' OR device_id = 'device-id')
  AND is_deleted = false
ORDER BY created_at DESC;

-- 游客: 仅获取游客对话
SELECT * FROM conversations
WHERE device_id = 'device-id'
  AND user_id IS NULL
  AND is_deleted = false
ORDER BY created_at DESC;
```

### 查询对话消息

```sql
SELECT * FROM messages
WHERE conversation_id = 'conversation-uuid'
ORDER BY created_at ASC;
```

### 统计游客使用次数

```sql
SELECT usage_count, last_used_at
FROM guest_usage
WHERE device_id = 'device-id';
```

### 清理过期验证码

```sql
DELETE FROM verification_codes
WHERE expires_at < NOW();
```

---

## 数据库维护

### 定期清理任务

```sql
-- 1. 清理过期验证码（每天）
DELETE FROM verification_codes WHERE expires_at < NOW();

-- 2. 清理软删除的对话（30天后）
DELETE FROM conversations
WHERE is_deleted = true
  AND created_at < NOW() - INTERVAL '30 days';

-- 3. 清理孤立的消息（对话已删除）
DELETE FROM messages
WHERE conversation_id NOT IN (SELECT id FROM conversations);
```

### 性能优化

```sql
-- 分析查询性能
EXPLAIN ANALYZE
SELECT * FROM conversations
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;

-- 重建索引
REINDEX TABLE conversations;
REINDEX TABLE messages;
```

---

## 相关文件

| 文件 | 说明 |
|-----|------|
| `src/lib/supabaseClient.js` | 客户端配置 |
| `src/lib/cloudService.js` | 数据库操作封装 |
| `supabase/migrations/` | 数据库迁移文件 |

---

**最后更新**: 2026-01-07
**相关文档**: [登录系统](./02-登录系统.md) | [设备ID与游客模式](./04-设备ID与游客模式.md)
