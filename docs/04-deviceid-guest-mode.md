# 设备ID与游客模式

> **适用版本**: v2.5.0+
> **阅读时间**: 8分钟
> **相关文档**: [登录系统](./02-登录系统.md) | [数据库设计](./03-数据库设计.md)

---

## 概述

小白AI支持两种使用模式：

| 模式 | 说明 | 数据存储 | 免费额度 |
|-----|------|---------|---------|
| **游客模式** | 无需登录，直接使用 | 云端（device_id） | 10次 |
| **登录模式** | 手机号 + 验证码登录 | 云端（user_id） | 无限 |

**核心设计**: 游客数据也保存到云端，登录后自动合并

---

## 为什么需要设备ID?

### 使用场景

1. **游客模式追踪**: 识别同一设备的游客用户
2. **数据合并**: 游客登录后，将之前的对话关联到用户账号
3. **使用统计**: 统计游客使用次数（免费额度）
4. **跨设备识别**: 防止不同设备的游客数据混淆

### 设备ID的要求

- ✅ 唯一性: 同一设备始终返回相同的ID
- ✅ 稳定性: 重启应用、系统重启后ID不变
- ✅ 跨平台: Windows/macOS/Linux 都能生成
- ✅ 降级方案: 非Electron环境也能工作

---

## 设备ID生成算法

### 算法设计

**文件**: `electron/main.js`

```javascript
const os = require('os');
const crypto = require('crypto');

/**
 * 获取设备ID
 * 基于机器特征生成MD5哈希
 */
function getDeviceId() {
  // 收集机器特征
  const machineInfo = [
    os.hostname(),      // 主机名
    os.platform(),      // 操作系统 (darwin/win32/linux)
    os.arch(),          // CPU架构 (x64/arm64)
    os.cpus().length,   // CPU核心数
    os.totalmem()       // 总内存
  ].join('|');

  // MD5哈希生成唯一ID
  return crypto.createHash('md5')
    .update(machineInfo)
    .digest('hex');
}

// 通过 IPC 暴露给渲染进程
ipcMain.handle('getDeviceId', async () => {
  return {
    success: true,
    deviceId: getDeviceId()
  };
});
```

**示例输出**:
```
主机名: MacBook-Pro
平台: darwin
架构: arm64
CPU: 8
内存: 17179869184

机器特征: MacBook-Pro|darwin|arm64|8|17179869184
设备ID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### IPC 暴露

**文件**: `electron/preload.js`

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 获取设备ID
  getDeviceId: () => ipcRenderer.invoke('getDeviceId'),

  // 其他 API...
  openPath: (path) => ipcRenderer.invoke('openPath', path),
  initAgent: (config) => ipcRenderer.invoke('initAgent', config),
  // ...
});
```

### 前端调用

**文件**: `src/lib/cloudService.js`

```javascript
/**
 * 获取设备ID
 * @returns {Promise<string>}
 */
async function getDeviceId() {
  try {
    // 优先使用 Electron API
    const result = await window.electronAPI.getDeviceId();
    if (result.success) {
      return result.deviceId;
    }
    throw new Error(result.error);
  } catch (error) {
    console.error('获取设备ID失败:', error);

    // 降级方案: 基于 localStorage
    let tempDeviceId = localStorage.getItem('temp_device_id');
    if (!tempDeviceId) {
      tempDeviceId = 'temp_' + Date.now() + '_' +
                     Math.random().toString(36).substr(2, 9);
      localStorage.setItem('temp_device_id', tempDeviceId);
    }
    return tempDeviceId;
  }
}
```

**降级方案适用场景**:
- Web 版本（非 Electron 环境）
- Electron API 调用失败
- 开发调试环境

---

## 游客模式数据存储

### 核心思想

> **游客数据也保存到云端，登录后自动合并**

### 对比：之前 vs 现在

| 方面 | 之前的设计 (v2.4.x) | 现在的设计 (v2.5.0+) |
|-----|-------------------|---------------------|
| 游客数据存储 | 本地 SQLite | 云端 PostgreSQL |
| 登录后处理 | 上传历史数据 | 软合并（更新user_id） |
| 数据丢失风险 | ❌ 高（应用卸载） | ✅ 无 |
| 跨设备访问 | ❌ 不支持 | ✅ 支持（登录后） |
| 复杂度 | ❌ 高（需上传） | ✅ 低（仅更新字段） |

### 数据存储逻辑

**游客模式创建对话**:

```javascript
// cloudService.js - createConversation()
export async function createConversation(conversation) {
  const deviceId = await getDeviceId();

  // 获取用户信息（游客模式下 user 为 null）
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 游客模式下 AuthError 是正常的，不应该中断流程
  if (authError) {
    console.log('⚠️ Auth 错误（游客模式正常）:', authError.message);
    // 继续执行，不返回错误
  }

  // 准备插入数据
  const insertData = {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model || 'claude-3-5-sonnet-20241022',
    created_at: conversation.createdAt || new Date().toISOString(),
    device_id: deviceId  // 始终记录设备ID
  };

  // 如果用户已登录，添加 user_id
  if (user) {
    insertData.user_id = user.id;
    console.log('✅ 登录模式，记录 user_id');
  } else {
    console.log('👤 游客模式，user_id 为 NULL');
  }

  // 插入数据库
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert(insertData)
    .select()
    .single();

  return { success: true, data: newConv };
}
```

**数据库状态**:

```
游客对话:
{
  id: "conv-uuid-1",
  title: "你好",
  device_id: "abc123...",
  user_id: NULL,           -- 游客数据
  is_deleted: false
}
```

---

## 数据合并机制

### 合并时机

**游客登录成功后**，自动触发合并。

```javascript
// App.jsx - handleLoginSuccess()
async function handleLoginSuccess(user) {
  console.log('登录成功，用户ID:', user.id);

  // 合并游客对话到登录用户
  const { count } = await mergeGuestConversations(user.id);
  console.log(`✅ 成功合并 ${count} 个游客对话`);

  // 重新加载对话历史（包含游客时期的对话）
  await loadConversations();

  // 更新状态
  setCurrentUser(user);
}
```

### 合并策略

**软合并**：更新 `user_id` 字段，无需复制数据

**数据库函数**: `merge_guest_conversations_to_user(p_device_id, p_user_id)`

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

**SECURITY DEFINER**:
- 使用函数所有者的权限执行（而非调用者）
- 绕过 RLS 限制
- 确保合并操作一定能成功

### 完整流程示例

```
1. 游客使用阶段
   设备ID: abc123...
   user_id: NULL

   对话1: {device_id: abc123, user_id: NULL, title: "你好"}
   对话2: {device_id: abc123, user_id: NULL, title: "帮我写代码"}

2. 用户登录
   输入手机号: 18601043813
   验证码验证通过
   创建用户: {id: user-uuid-xxx, phone: 18601043813}

3. 数据合并
   调用: merge_guest_conversations_to_user('abc123', 'user-uuid-xxx')

   更新:
   对话1: {device_id: abc123, user_id: user-uuid-xxx, title: "你好"}  ← 更新
   对话2: {device_id: abc123, user_id: user-uuid-xxx, title: "帮我写代码"}  ← 更新

4. 后续使用
   新对话: {device_id: abc123, user_id: user-uuid-xxx, title: "新对话"}

   数据完整保留，无需复制！
```

---

## 对话加载逻辑

### 根据用户状态加载

```javascript
// cloudService.js - loadConversations()
export async function loadConversations() {
  const deviceId = await getDeviceId();
  const { data: { user } } = await supabase.auth.getUser();

  let conversations = [];

  if (user) {
    // ========== 登录用户 ==========
    console.log('✅ 当前用户ID:', user.id);

    // 获取 user_id 或 device_id 匹配的对话
    // 这样可以同时获取登录后的对话 + 游客时期的对话
    const { data: userConvs } = await supabase
      .from('conversations')
      .select('*')
      .or(`user_id.eq.${user.id},device_id.eq.${deviceId}`)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    conversations = userConvs;
  } else {
    // ========== 游客模式 ==========
    console.log('👤 游客模式，加载设备对话');

    // 只获取该设备的游客对话
    const { data: guestConvs } = await supabase
      .from('conversations')
      .select('*')
      .eq('device_id', deviceId)
      .is('user_id', null)  // 仅游客数据
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    conversations = guestConvs;
  }

  // 获取每个对话的消息
  const conversationsWithMessages = await Promise.all(
    conversations.map(async (conv) => {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      return {
        id: conv.id,
        title: conv.title,
        createdAt: conv.created_at,
        model: conv.model,
        messages: (messages || []).map(msg => ({...}))
      };
    })
  );

  return { success: true, data: conversationsWithMessages };
}
```

**查询逻辑对比**:

| 用户状态 | WHERE 条件 | 说明 |
|---------|-----------|------|
| **登录** | `user_id = 'xxx' OR device_id = 'abc'` | 获取所有对话（包括游客时期） |
| **游客** | `device_id = 'abc' AND user_id IS NULL` | 仅获取游客对话 |

---

## 游客使用统计

### 统计逻辑

**文件**: `electron/main.js` (主进程)

```javascript
// 检查游客使用次数
ipcMain.handle('checkGuestUsage', async () => {
  const deviceId = getDeviceId();

  // 从本地数据库查询
  const db = getDatabase();
  const usage = db.prepare(`
    SELECT usage_count, last_used_at
    FROM guest_usage
    WHERE device_id = ?
  `).get(deviceId);

  if (!usage) {
    return {
      canUse: true,
      remaining: 10,
      usedCount: 0
    };
  }

  const remaining = Math.max(0, 10 - usage.usage_count);

  return {
    canUse: remaining > 0,
    remaining,
    usedCount: usage.usage_count
  };
});

// 增加使用次数
ipcMain.handle('incrementGuestUsage', async () => {
  const deviceId = getDeviceId();
  const db = getDatabase();

  // 插入或更新
  const existing = db.prepare('SELECT * FROM guest_usage WHERE device_id = ?').get(deviceId);

  if (existing) {
    db.prepare(`
      UPDATE guest_usage
      SET usage_count = usage_count + 1,
          last_used_at = datetime('now')
      WHERE device_id = ?
    `).run(deviceId);
  } else {
    db.prepare(`
      INSERT INTO guest_usage (device_id, usage_count, last_used_at)
      VALUES (?, 1, datetime('now'))
    `).run(deviceId);
  }

  return { success: true };
});
```

### 前端使用

```javascript
// App.jsx
const [guestStatus, setGuestStatus] = useState(null);

// 加载游客状态
useEffect(() => {
  if (!currentUser) {
    loadGuestStatus();
  }
}, [currentUser]);

async function loadGuestStatus() {
  const status = await window.electronAPI.checkGuestUsage();
  setGuestStatus(status);
}

// 发送消息前检查
async function handleSendMessage(message) {
  // 游客模式检查
  if (!currentUser && guestStatus && !guestStatus.canUse) {
    setShowGuestLimitModal(true);
    return;
  }

  // 发送消息...
  if (!currentUser) {
    await window.electronAPI.incrementGuestUsage();
    await loadGuestStatus();
  }
}
```

---

## 常见问题

### Q1: 设备ID会变吗?

**正常情况**: 不会

设备ID基于机器特征（主机名、系统、CPU、内存）生成，这些特征不会改变。

**例外情况**:
- 修改主机名
- 更换硬件（CPU、内存）
- 重装系统

### Q2: 降级方案生成的ID稳定吗?

**基于 localStorage 的临时ID**:
- 优点: 简单可靠
- 缺点: 清除浏览器数据后会重新生成
- 影响: Web版本或开发环境，不影响正常使用

### Q3: 游客数据会丢失吗?

**v2.5.0 之前**: ❌ 会（仅存储在本地）

**v2.5.0 之后**: ✅ 不会（存储在云端）

游客数据保存在云端（`device_id` 有值，`user_id` 为 NULL），登录后自动合并。

### Q4: 合并会重复数据吗?

**不会**。使用软合并策略：

```sql
UPDATE conversations SET user_id = ? WHERE device_id = ? AND user_id IS NULL;
```

仅更新 `user_id` 字段，不复制数据。

### Q5: 跨设备访问游客数据?

**不支持**。游客数据绑定到特定设备（`device_id`）。

**登录后**: 可以跨设备访问（登录后 `user_id` 绑定到账号）。

---

## 优势总结

### 用户体验

| 特性 | 之前 | 现在 |
|-----|------|------|
| 数据丢失 | ❌ 应用卸载丢失 | ✅ 永久保存 |
| 跨设备 | ❌ 不支持 | ✅ 登录后同步 |
| 登录体验 | ❌ 需上传数据 | ✅ 自动合并 |
| 免费额度 | ✅ 10次 | ✅ 10次 |

### 技术实现

| 特性 | 优势 |
|-----|------|
| **云端存储** | 数据永不丢失 |
| **软合并** | 性能高，无数据冗余 |
| **设备ID** | 跨会话识别用户 |
| **降级方案** | Web版本也能工作 |

---

## 相关文件

| 文件 | 说明 |
|-----|------|
| `electron/main.js` | 设备ID生成、游客统计 |
| `electron/preload.js` | IPC 暴露 |
| `src/lib/cloudService.js` | 数据存储、加载逻辑 |
| `src/App.jsx` | 登录后合并 |
| `supabase/migrations/008_merge_function.sql` | 数据合并函数 |

---

**最后更新**: 2026-01-07
**相关文档**: [登录系统](./02-登录系统.md) | [数据库设计](./03-数据库设计.md)
