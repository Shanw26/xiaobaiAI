# 数据库设计

> **适用版本**: v2.6.3+ (v2.11.4 更新)
> **阅读时间**: 12分钟
> **相关文档**: [登录系统](./02-登录系统.md) | [设备ID与游客模式](./04-deviceid-guest-mode.md) | [API参考](./05-api-reference.md)

---

## 数据库概览

小白AI使用 **双层数据库架构**：

| 数据库 | 用途 | 位置 | 版本 |
|-------|------|------|------|
| **Supabase PostgreSQL** | 云端数据存储（对话、消息、用户） | 云端 | v2.0.0+ |
| **SQLite** | 本地游客统计（使用次数、用户配置） | 本地 | v2.11.4+ |

### 云端数据库特点

- **BaaS 平台**: 无需自建服务器
- **PostgreSQL**: 成熟稳定，支持复杂查询
- **实时订阅**: 支持数据变更实时推送
- **Row Level Security**: 行级安全策略（当前已禁用）

### 本地数据库特点 (v2.11.4)

- **SQLite**: 轻量级嵌入式数据库
- **游客统计**: 追踪游客使用次数（免费额度）
- **用户配置**: 存储用户 API Key 等配置
- **性能优化**: 避免频繁云端查询

---

## 表结构设计

### 1. user_profiles (用户资料表)

存储用户基本信息，**仅使用手机号作为唯一标识**。

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,              -- 手机号(唯一标识)
  has_api_key BOOLEAN DEFAULT false,       -- 是否配置了API Key
  api_key TEXT,                            -- 🔒 已废弃：明文 API Key（兼容性）
  api_key_encrypted TEXT,                  -- 🔒 v2.11.7：加密后的 API Key
  api_key_iv TEXT,                         -- 🔒 v2.11.7：加密初始化向量
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX idx_user_profiles_api_key_encrypted
  ON user_profiles(user_id)
  WHERE api_key_encrypted IS NOT NULL;
```

**字段说明**:

| 字段 | 类型 | 说明 | 必填 | 版本 |
|-----|------|------|------|------|
| id | UUID | 主键，自动生成 | ✅ | - |
| phone | TEXT | 手机号，唯一标识 | ✅ | - |
| has_api_key | BOOLEAN | 是否配置了自己的 API Key | ❌ (默认 false) | - |
| api_key | TEXT | ⚠️ 已废弃：明文 API Key | ❌ | v2.11.6 及之前 |
| api_key_encrypted | TEXT | 🔒 加密后的 API Key (AES-256-GCM) | ❌ | v2.11.7+ |
| api_key_iv | TEXT | 🔒 加密初始化向量 (IV) | ❌ | v2.11.7+ |
| created_at | TIMESTAMPTZ | 创建时间 | ❌ (自动生成) | - |

**🔒 v2.11.7 安全增强**：
- ✅ API Key 使用 AES-256-GCM 加密存储
- ✅ 每个用户使用独立的加密密钥（基于用户 ID 派生）
- ✅ 保留 `api_key` 字段用于兼容旧数据
- ✅ 新保存的 API Key 自动加密，旧数据在用户重新保存时迁移

**设计要点**:
- ✅ 不需要 email 字段（小白AI特点）
- ✅ phone 是唯一标识
- ✅ 简单设计，只存储必需字段
- ✅ v2.11.7+ API Key 加密存储，提高安全性

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

## 本地数据库设计 (SQLite)

**文件**: `electron/database.js`

**数据库位置**:
- macOS: `~/Library/Application Support/小白AI/database.sqlite`
- Windows: `%APPDATA%/小白AI/database.sqlite`
- Linux: `~/.config/小白AI/database.sqlite`

**特点**:
- WAL 模式（Write-Ahead Logging）：读写并发
- 本地优先：游客统计无需查询云端
- 性能优化：减少网络请求

### 本地表结构

#### 1. users (本地用户表)

存储已登录用户的基本信息。

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                 -- 用户 ID (UUID)
  phone TEXT NOT NULL,                 -- 手机号
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,              -- 最后登录时间
  total_requests INTEGER DEFAULT 0     -- 请求总数
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
```

**字段说明**:

| 字段 | 类型 | 说明 | 必填 |
|-----|------|------|------|
| id | TEXT | 用户 ID（来自 Supabase Auth） | ✅ |
| phone | TEXT | 手机号 | ✅ |
| created_at | DATETIME | 创建时间 | ❌ |
| last_login_at | DATETIME | 最后登录时间 | ❌ |
| total_requests | INTEGER | 请求总数 | ❌ (默认 0) |

**🔒 v2.11.7 安全增强**：
- ✅ **已删除 `api_key` 字段**（不再本地存储敏感数据）
- ✅ API Key 只存储在云端（加密）和内存中（运行时）
- ✅ 本地数据库只存储非敏感信息（手机号、登录时间等）

**用途**：
- 登录后同步用户信息到本地
- 记录用户登录时间和使用次数
- 避免每次查询云端数据库

**使用示例**：

```javascript
// electron/database.js

// 插入用户
function insertUser(user) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO users (id, phone, api_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(user.id, user.phone, user.apiKey || null, new Date().toISOString(), new Date().toISOString());
}

// 查询用户
function getUserById(userId) {
  const stmt = db.prepare(`
    SELECT * FROM users WHERE id = ?
  `);

  return stmt.get(userId);
}

// 查询用户 API Key
function getUserApiKey(userId) {
  const stmt = db.prepare(`
    SELECT api_key FROM users WHERE id = ?
  `);

  const result = stmt.get(userId);
  return result?.api_key || null;
}
```

---

#### 2. guest_usage (游客使用统计)

追踪游客使用次数（免费额度）。

```sql
CREATE TABLE IF NOT EXISTS guest_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL UNIQUE,       -- 设备 ID (唯一)
  usage_count INTEGER DEFAULT 0,        -- 使用次数
  last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_guest_usage_device_id ON guest_usage(device_id);
```

**字段说明**:

| 字段 | 类型 | 说明 | 必填 |
|-----|------|------|------|
| id | INTEGER | 主键（自增） | ✅ |
| device_id | TEXT | 设备 ID（唯一标识） | ✅ |
| usage_count | INTEGER | 使用次数 | ❌ (默认 0) |
| last_used_at | DATETIME | 最后使用时间 | ❌ |

**游客限制配置**：

| 配置项 | 值 | 说明 |
|-------|---|------|
| **正式版本** | 10 次 | 正常免费额度 |
| **测试版本** | 2 次 | 🔧 临时测试配置 |

**使用逻辑**：
- 游客每次发送消息，`usage_count + 1`
- 当 `usage_count >= 2`（测试）/ `usage_count >= 10`（正式）时，提示登录
- 登录后不再检查此表

**使用示例**：

```javascript
// electron/database.js

// 检查游客是否可以使用
function canGuestUse(deviceId) {
  const usage = db.prepare(`
    SELECT usage_count FROM guest_usage WHERE device_id = ?
  `).get(deviceId);

  if (!usage) {
    // 首次使用
    return { canUse: true, remaining: 2, usedCount: 0 };  // 🔧 临时测试：10 -> 2
  }

  const remaining = Math.max(0, 2 - usage.usage_count);  // 🔧 临时测试：10 -> 2
  return {
    canUse: remaining > 0,
    remaining,
    usedCount: usage.usage_count
  };
}

// 增加游客使用次数
function incrementGuestUsage(deviceId) {
  const existing = db.prepare(`
    SELECT * FROM guest_usage WHERE device_id = ?
  `).get(deviceId);

  if (existing) {
    db.prepare(`
      UPDATE guest_usage
      SET usage_count = usage_count + 1,
          last_used_at = CURRENT_TIMESTAMP
      WHERE device_id = ?
    `).run(deviceId);
  } else {
    db.prepare(`
      INSERT INTO guest_usage (device_id, usage_count, last_used_at)
      VALUES (?, 1, CURRENT_TIMESTAMP)
    `).run(deviceId);
  }
}
```

---

### 本地数据库 vs 云端数据库对比

| 场景 | 使用数据库 | 原因 |
|-----|-----------|------|
| **游客使用统计** | SQLite 本地 | 避免频繁云端查询，提高性能 |
| **用户 API Key 查询** | SQLite 本地 | 快速读取，无需网络请求 |
| **对话历史存储** | Supabase 云端 | 跨设备同步，数据持久化 |
| **消息内容存储** | Supabase 云端 | 数据量大，云端存储 |
| **验证码校验** | Supabase 云端 | 安全性高，实时性 |

---

### v2.11.4 重大修复

**问题 1: 双重计数**

游客模式下，使用次数被重复计算：
- 后端 `send-message` 处理器增加本地计数 (+1)
- 前端调用云端函数 `incrementUserUsage` 也增加计数 (+1)
- **结果**：发送 1 条消息，计数增加 2 次

**修复**：
- 删除前端云函数调用
- 只保留后端本地数据库计数
- 通过 IPC 事件 `guest-usage-updated` 通知前端更新 UI

**问题 2: 登录状态未同步**

前端使用 Supabase 登录后，后端 `isGuestMode` 标志未更新：
- 游客次数用完后登录
- 发送消息仍被拦截"次数已用完"

**修复**：三层防护
1. 新增 `sync-login-status` IPC API
2. `init-agent` 自动检查登录状态
3. 前端登录后立即调用同步

**详细说明**: 参考 [04-deviceid-guest-mode.md](./04-deviceid-guest-mode.md) 的 v2.11.4 重大修复章节

---

### 本地数据库维护

#### 备份数据库

```bash
# macOS
cp ~/Library/Application\ Support/小白AI/database.sqlite ~/backup/

# Windows
copy %APPDATA%\小白AI\database.sqlite C:\backup\

# Linux
cp ~/.config/小白AI/database.sqlite ~/backup/
```

#### 重置游客统计

```javascript
// electron/main.js - 调试用
ipcMain.handle('debug-reset-guest-usage', async () => {
  const db = getDatabase();
  db.prepare('DELETE FROM guest_usage').run();
  return { success: true };
});
```

#### 查看数据库内容

```bash
# 使用 sqlite3 命令行工具
sqlite3 ~/Library/Application\ Support/小白AI/database.sqlite

# 查看所有表
.tables

# 查看游客使用记录
SELECT * FROM guest_usage;

# 查看用户记录
SELECT * FROM users;

# 退出
.quit
```

---

### 相关代码文件

| 文件 | 说明 |
|-----|------|
| `electron/database.js` | 本地数据库初始化和操作 |
| `electron/main.js` | IPC 处理器，调用本地数据库 |
| `src/App.jsx` | 前端调用 IPC API |

---

## 云端表结构设计 (Supabase)

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

## 云端 vs 本地数据分布 (v2.11.4)

| 数据类型 | 存储位置 | 原因 |
|---------|---------|------|
| **游客使用统计** | 本地 SQLite | 避免频繁云端查询，提高性能 |
| **用户 API Key** | 本地 SQLite | 快速读取，减少网络请求 |
| **对话历史** | 云端 Supabase | 跨设备同步，数据持久化 |
| **消息内容** | 云端 Supabase | 数据量大，云端存储 |
| **验证码** | 云端 Supabase | 安全性高，实时验证 |
| **用户资料** | 云端 Supabase | 跨设备同步 |

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

**最后更新**: 2026-01-09 (v2.11.4)
**相关文档**: [登录系统](./02-登录系统.md) | [设备ID与游客模式](./04-deviceid-guest-mode.md) | [API参考](./05-api-reference.md)
