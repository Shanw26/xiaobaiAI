# API 参考文档

> **适用版本**: v2.11.4+
> **阅读时间**: 15分钟
> **相关文档**: [设备ID与游客模式](./04-deviceid-guest-mode.md) | [登录系统](./02-登录系统.md)

---

## 概述

小白AI 使用 Electron IPC（进程间通信）机制实现前端（渲染进程）与后端（主进程）之间的通信。

本文档列出所有 IPC API 和事件的详细说明。

---

## IPC 通信架构

### 通信方式

```
┌─────────────────┐         IPC          ┌─────────────────┐
│   前端 (Renderer) │ ◄────────────────────► │   后端 (Main)     │
│  React App      │   invoke / send          │  electron/main.js│
└─────────────────┘                          └─────────────────┘
       │                                              │
       │  window.electronAPI.xxx()                    │
       │                                              │
       └─ preload.js (contextBridge) ─────────────────┘
```

### 两种通信模式

| 模式 | 用途 | 方法 | 示例 |
|-----|------|------|------|
| **双向通信** | 请求-响应 | `ipcRenderer.invoke()` / `ipcMain.handle()` | `getDeviceId()` |
| **单向通信** | 事件通知 | `webContents.send()` / `ipcRenderer.on()` | `guest-usage-updated` |

---

## 核心 API

### 1. sync-login-status

**类型**: 双向通信（invoke/handle）

**版本**: v2.11.4 新增

**用途**: 前端登录成功后，同步登录状态到后端，更新 `isGuestMode` 标志

#### 请求参数

```typescript
{
  id: string;           // 用户 ID (UUID)
  phone: string;        // 手机号
  email?: string;       // 邮箱（可选）
  api_key?: string;     // API 密钥（可选）
}
```

#### 返回结果

```typescript
{
  success: boolean;     // 是否成功
  error?: string;       // 错误信息（失败时）
}
```

#### 使用示例

```javascript
// 前端调用
async function handleLoginSuccess(user) {
  // 同步登录状态到后端
  const result = await window.electronAPI.syncLoginStatus(user);

  if (result.success) {
    console.log('✅ 登录状态已同步到后端');
  } else {
    console.error('❌ 同步失败:', result.error);
  }
}
```

#### 后端实现

**文件**: `electron/main.js:975-992`

```javascript
ipcMain.handle('sync-login-status', async (event, user) => {
  try {
    if (user && user.id) {
      // 设置登录状态
      currentUser = user;
      isGuestMode = false;

      // 在本地数据库创建用户记录
      const existingUser = db.getUserById(user.id);
      if (!existingUser) {
        db.insertUser({
          id: user.id,
          phone: user.phone || '',
          apiKey: user.api_key || null
        });
      }

      return { success: true };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

#### 前端暴露

**文件**: `electron/preload.js:62`

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  syncLoginStatus: (user) => ipcRenderer.invoke('sync-login-status', user),
  // ...
});
```

---

### 2. checkGuestUsage

**类型**: 双向通信（invoke/handle）

**版本**: v2.5.0+

**用途**: 检查游客使用次数和剩余额度

#### 请求参数

无

#### 返回结果

```typescript
{
  canUse: boolean;      // 是否可以继续使用
  remaining: number;    // 剩余次数
  usedCount: number;    // 已使用次数
}
```

#### 使用示例

```javascript
// 前端调用
async function loadGuestStatus() {
  const status = await window.electronAPI.checkGuestUsage();

  console.log(`已使用: ${status.usedCount}次`);
  console.log(`剩余: ${status.remaining}次`);
  console.log(`可继续使用: ${status.canUse}`);

  setGuestStatus(status);
}

// 发送消息前检查
if (!currentUser && guestStatus && !guestStatus.canUse) {
  setShowGuestLimitModal(true);
  return;
}
```

#### 后端实现

**文件**: `electron/main.js`

```javascript
ipcMain.handle('checkGuestUsage', async () => {
  const deviceId = getDeviceId();
  const db = getDatabase();

  // 查询使用记录
  const usage = db.prepare(`
    SELECT usage_count, last_used_at
    FROM guest_usage
    WHERE device_id = ?
  `).get(deviceId);

  if (!usage) {
    return {
      canUse: true,
      remaining: 2,  // 🔧 临时测试：10 -> 2
      usedCount: 0
    };
  }

  const remaining = Math.max(0, 2 - usage.usage_count);

  return {
    canUse: remaining > 0,
    remaining,
    usedCount: usage.usage_count
  };
});
```

---

### 3. incrementGuestUsage

**类型**: 双向通信（invoke/handle）

**版本**: v2.5.0+

**用途**: 增加游客使用次数（通常在发送消息成功后调用）

> **⚠️ 注意**: v2.11.4 之后，前端不应直接调用此 API，由后端 `send-message` 自动调用

#### 请求参数

无

#### 返回结果

```typescript
{
  success: boolean;
  error?: string;
}
```

#### 使用示例

```javascript
// ❌ 不推荐：前端手动调用
// await window.electronAPI.incrementGuestUsage();

// ✅ 推荐：由后端 send-message 自动处理
// 后端会在发送消息时自动增加次数，并通过 IPC 事件通知前端
```

#### 后端实现

**文件**: `electron/main.js`

```javascript
ipcMain.handle('incrementGuestUsage', async () => {
  const deviceId = getDeviceId();
  const db = getDatabase();

  // 插入或更新
  const existing = db.prepare(
    'SELECT * FROM guest_usage WHERE device_id = ?'
  ).get(deviceId);

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

---

## IPC 事件

### guest-usage-updated

**类型**: 单向通信（send/on）

**版本**: v2.11.4 增强

**用途**: 后端在游客使用次数更新后，通知前端更新 UI

#### 事件数据

```typescript
{
  usedCount: number;    // 已使用次数
  remaining: number;    // 剩余次数
}
```

#### 使用示例

```javascript
// 前端监听（App.jsx）
useEffect(() => {
  const unsubscribe = window.electronAPI.onGuestUsageUpdated((data) => {
    console.log('📡 收到游客使用次数更新事件:', data);

    setGuestStatus((prev) => ({
      ...prev,
      usedCount: data.usedCount,
      remaining: data.remaining
    }));
  });

  return () => {
    // 清理监听器
    unsubscribe?.();
  };
}, []);
```

#### 后端发送

**文件**: `electron/main.js:1220-1225`

```javascript
// send-message 处理器
ipcMain.handle('send-message', async (event, message) => {
  // 增加游客使用次数
  db.incrementGuestUsage(deviceId);

  // 通知前端
  const newStatus = db.canGuestUse(deviceId);
  mainWindow.webContents.send('guest-usage-updated', {
    usedCount: newStatus.usedCount,
    remaining: newStatus.remaining
  });

  return { success: true };
});
```

#### 前端暴露

**文件**: `electron/preload.js`

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  onGuestUsageUpdated: (callback) => {
    const handler = (event, data) => callback(data);

    ipcRenderer.on('guest-usage-updated', handler);

    // 返回清理函数
    return () => ipcRenderer.removeListener('guest-usage-updated', handler);
  },
  // ...
});
```

---

## 其他相关 API

### getDeviceId

**类型**: 双向通信（invoke/handle）

**版本**: v2.5.0+

**用途**: 获取设备唯一标识符

#### 返回结果

```typescript
{
  success: boolean;
  deviceId: string;     // MD5 格式的设备 ID
  error?: string;
}
```

#### 使用示例

```javascript
// 调用
const result = await window.electronAPI.getDeviceId();
console.log('设备 ID:', result.deviceId);
// 输出: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

#### 算法

基于机器特征生成 MD5 哈希：

```javascript
function getDeviceId() {
  const machineInfo = [
    os.hostname(),      // 主机名
    os.platform(),      // 操作系统
    os.arch(),          // CPU 架构
    os.cpus().length,   // CPU 核心数
    os.totalmem()       // 总内存
  ].join('|');

  return crypto.createHash('md5')
    .update(machineInfo)
    .digest('hex');
}
```

---

### send-message

**类型**: 双向通信（invoke/handle）

**版本**: v2.0.0+

**用途**: 发送消息给 AI 模型

#### 请求参数

```typescript
{
  message: string;
  conversationId?: string;
  model?: string;
  stream?: boolean;
}
```

#### 返回结果

```typescript
{
  success: boolean;
  response?: string;
  error?: string;
}
```

#### 游客模式处理

**文件**: `electron/main.js`

```javascript
ipcMain.handle('send-message', async (event, message) => {
  // 检查是否游客模式
  if (isGuestMode) {
    const deviceId = getDeviceId();
    const status = db.canGuestUse(deviceId);

    if (!status.canUse) {
      return {
        error: '游客免费次数已用完（2次），请登录后继续使用'
      };
    }

    // 增加使用次数
    db.incrementGuestUsage(deviceId);

    // 通知前端
    mainWindow.webContents.send('guest-usage-updated', {
      usedCount: status.usedCount + 1,
      remaining: status.remaining - 1
    });
  }

  // 发送消息给 AI...
  return { success: true, response: '...' };
});
```

---

## 调试技巧

### 查看所有 IPC 调用

在 `electron/main.js` 添加全局日志：

```javascript
const originalHandle = ipcMain.handle;
ipcMain.handle = function(name, handler) {
  return originalHandle.call(this, name, async (event, ...args) => {
    console.log(`📡 [IPC] 收到请求: ${name}`, args);
    const result = await handler(event, ...args);
    console.log(`📡 [IPC] 返回结果: ${name}`, result);
    return result;
  });
};
```

### 查看所有 IPC 事件

```javascript
const originalSend = mainWindow.webContents.send;
mainWindow.webContents.send = function(name, ...args) {
  console.log(`📡 [IPC] 发送事件: ${name}`, args);
  return originalSend.call(this, name, ...args);
};
```

### 前端调试

```javascript
// 在 App.jsx 添加全局监听
window.electronAPI = {
  // ... 其他 API ...

  // 调试：监听所有事件
  debugLogAllEvents: () => {
    const events = ['guest-usage-updated', 'login-success', 'logout'];

    events.forEach(eventName => {
      ipcRenderer.on(eventName, (event, data) => {
        console.log(`📡 [App] 收到事件: ${eventName}`, data);
      });
    });
  }
};
```

---

## 常见问题

### Q1: 为什么需要 sync-login-status API?

**A**: 前端使用 Supabase Edge Functions 登录，后端无法直接感知。登录后需要同步状态到后端，否则 `isGuestMode` 标志不会更新，导致已登录用户仍被游客限制拦截。

### Q2: guest-usage-updated 事件什么时候触发?

**A**: 在以下时机触发：
1. 游客发送消息成功后（后端 `send-message` 处理器）
2. 每次触发都会包含最新的 `usedCount` 和 `remaining`

### Q3: 如何避免双重计数?

**A**: 遵循以下原则：
1. ✅ 游客使用次数只由后端管理（`send-message` 处理器）
2. ✅ 前端通过 `guest-usage-updated` 事件监听更新
3. ❌ 前端不要手动调用 `incrementGuestUsage`
4. ❌ 前端不要调用云端函数 `incrementUserUsage`（游客模式）

### Q4: IPC 调用失败怎么办?

**A**: 检查以下几点：
1. `preload.js` 是否正确暴露 API
2. `main.js` 是否注册对应的 `handle` 监听器
3. 参数格式是否正确
4. 查看控制台错误信息

---

## 相关文件

| 文件 | 说明 |
|-----|------|
| `electron/preload.js` | IPC API 暴露 |
| `electron/main.js` | IPC 处理器实现 |
| `src/App.jsx` | 前端调用示例 |
| `src/lib/cloudService.js` | 云端服务封装 |

---

## 版本历史

| 版本 | 日期 | 变更 |
|-----|------|------|
| **v2.11.4** | 2026-01-09 | 新增 `sync-login-status` API；增强 `guest-usage-updated` 事件 |
| **v2.5.0** | 2025-12-20 | 新增游客模式相关 API |
| **v2.0.0** | 2025-12-01 | 初始版本 |

---

**最后更新**: 2026-01-09 (v2.11.4)
**相关文档**: [设备ID与游客模式](./04-deviceid-guest-mode.md) | [登录系统](./02-登录系统.md)
