# Edge Functions API 文档

## 📋 概述

小白AI 使用 Supabase Edge Functions 提供后端 API 服务，实现数据持久化、用户认证、消息管理等功能。

**重要**: 前后端统一使用 **camelCase**（驼峰命名）风格。

---

## 🔧 命名规范

### 参数命名规则
- ✅ **前端传递**: camelCase（驼峰命名）
  - 例如：`conversationId`, `messageId`, `createdAt`
- ✅ **Edge Function 接收**: camelCase（驼峰命名）
  - 例如：`conversationId`, `messageId`, `createdAt`
- ❌ **不使用**: snake_case（下划线命名）
  - 错误：`conversation_id`, `message_id`, `created_at`

### 数据库字段命名
- 数据库字段使用 snake_case（PostgreSQL 约定）
- Edge Function 负责参数转换
- 示例：
  - 数据库：`conversation_id`, `created_at`
  - API 参数：`conversationId`, `createdAt`

---

## 📡 API 接口列表

### 1. create-conversation

**功能**: 创建新对话

**请求参数**:
```typescript
{
  conversation: {
    id: string              // 对话ID
    title: string           // 对话标题
    model?: string          // AI模型（可选）
    createdAt?: string      // 创建时间（可选，ISO 8601）
  },
  user_id?: string          // 用户ID（登录用户）
  device_id: string         // 设备ID（游客模式）
}
```

**返回结果**:
```typescript
{
  id: string
  title: string
  model: string
  created_at: string
}
```

---

### 2. create-message

**功能**: 创建消息（保存到对话）

**请求参数**:
```typescript
{
  conversationId: string    // ⚠️ 注意：驼峰命名
  message: {
    id?: string             // 消息ID（可选）
    role: string            // 角色：'user' | 'assistant' | 'system'
    content: string         // 消息内容
    thinking?: string       // 思考过程（可选）
    files?: any             // 附件信息（可选，JSON）
    createdAt?: string      // 创建时间（可选，ISO 8601）
  }
}
```

**返回结果**:
```typescript
{
  id: string
  conversation_id: string
  role: string
  content: string
  thinking: string
  created_at: string
}
```

---

### 3. update-message

**功能**: 更新消息内容（主要用于更新 AI 回复）

**请求参数**:
```typescript
{
  conversationId: string    // ⚠️ 注意：驼峰命名
  messageId: string         // ⚠️ 注意：驼峰命名
  updates: {
    content?: string        // 新的内容（可选）
    thinking?: string       // 新的思考过程（可选）
  }
}
```

**返回结果**:
```typescript
{
  success: true
}
```

---

### 4. delete-conversation

**功能**: 删除对话（软删除）

**请求参数**:
```typescript
{
  conversationId: string    // ⚠️ 注意：驼峰命名
}
```

**返回结果**:
```typescript
{
  success: true
}
```

---

### 5. load-conversations

**功能**: 加载对话历史

**请求参数**:
```typescript
{
  user_id?: string          // 用户ID（登录用户）
  device_id: string         // 设备ID（游客模式）
}
```

**返回结果**:
```typescript
[
  {
    id: string
    title: string
    model: string
    created_at: string
    is_deleted: boolean
  }
]
```

---

### 6. increment-usage

**功能**: 增加用户使用次数

**请求参数**:
```typescript
{
  user_id?: string          // 用户ID（登录用户）
  device_id: string         // 设备ID（游客模式）
}
```

**返回结果**:
```typescript
{
  used_count: number        // 已使用次数
  remaining: number         // 剩余次数
}
```

**数据库要求**:
- `guest_usage` 表必须包含 `remaining` 字段
- 类型：`INTEGER`
- 默认值：`10`（游客）

---

### 7. get-user-usage

**功能**: 获取用户使用次数

**请求参数**:
```typescript
{
  user_id?: string          // 用户ID（登录用户）
  device_id: string         // 设备ID（游客模式）
}
```

**返回结果**:
```typescript
{
  usedCount: number         // 已使用次数
  remaining: number         // 剩余次数
}
```

---

### 8. get-user-info

**功能**: 获取用户信息

**请求参数**:
```typescript
{
  user_id?: string          // 用户ID（登录用户）
  device_id: string         // 设备ID（游客模式）
}
```

**返回结果**:
```typescript
{
  id: string
  user_id?: string
  device_id: string
  name: string
  phone: string
  email?: string
  created_at: string
}
```

---

### 9. save-user-info

**功能**: 保存/更新用户信息

**请求参数**:
```typescript
{
  user_id?: string          // 用户ID（登录用户）
  device_id: string         // 设备ID（游客模式）
  userInfo: {
    name?: string
    phone?: string
    email?: string
    company?: string
    position?: string
  }
}
```

**返回结果**:
```typescript
{
  success: true
}
```

---

### 10. get-ai-memory

**功能**: 获取 AI 记忆

**请求参数**:
```typescript
{
  user_id?: string          // 用户ID（登录用户）
  device_id: string         // 设备ID（游客模式）
}
```

**返回结果**:
```typescript
{
  id: string
  user_id?: string
  device_id: string
  memory: string            // JSON 格式的记忆内容
  updated_at: string
}
```

---

### 11. save-ai-memory

**功能**: 保存 AI 记忆

**请求参数**:
```typescript
{
  user_id?: string          // 用户ID（登录用户）
  device_id: string         // 设备ID（游客模式）
  memory: string            // JSON 格式的记忆内容
}
```

**返回结果**:
```typescript
{
  success: true
}
```

---

## 🔐 认证说明

所有 Edge Functions 都使用 Supabase 的 Anon Key 进行认证：

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const response = await fetch(`${supabaseUrl}/functions/v1/create-message`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ conversationId, message })
})
```

---

## ⚠️ 常见错误

### 1. 缺少必填字段

**错误信息**: `缺少必填字段: conversationId`

**原因**: 参数命名使用了 snake_case 而非 camelCase

**解决方案**:
```javascript
// ❌ 错误
{ conversation_id: 'xxx' }

// ✅ 正确
{ conversationId: 'xxx' }
```

### 2. 数据库字段不存在

**错误信息**: `Could not find the 'remaining' column of 'guest_usage'`

**原因**: 数据库 Schema 缺少字段

**解决方案**: 执行迁移文件添加缺失字段

---

## 📝 修改记录

### 2026-01-09
- ✅ 统一所有 API 参数使用 camelCase
- ✅ 修复 `create-message`, `update-message`, `delete-conversation` 参数
- ✅ 添加 `guest_usage.remaining` 字段

---

## 🔗 相关文档

- [Supabase Edge Functions 官方文档](https://supabase.com/docs/guides/functions)
- [数据库迁移指南](./数据库迁移指南.md)
- [项目开发规范](../DEVELOPMENT_GUIDELINES.md)
