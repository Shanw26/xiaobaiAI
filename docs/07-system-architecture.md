# 系统架构

> **适用版本**: v2.6.3+
> **阅读时间**: 10分钟
> **相关文档**: [快速入门](./01-快速入门.md) | [部署与配置](./07-部署与配置.md)

---

## 整体架构

### 系统分层

```
┌─────────────────────────────────────────────────────┐
│                   用户界面层                          │
│            (React + CSS + Markdown)                 │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                  业务逻辑层                          │
│  - 认证系统 (AuthContext)                           │
│  - 云端服务 (cloudService)                          │
│  - 对话管理 (conversation manager)                  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                  数据访问层                          │
│  - Supabase Client (云端数据库)                     │
│  - Local SQLite (本地缓存)                          │
│  - File System (文件操作)                           │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                  Electron 主进程                     │
│  - IPC 通信管理                                      │
│  - 窗口管理                                          │
│  - 系统调用                                          │
└─────────────────────────────────────────────────────┘
```

---

## 技术栈详解

### 前端技术

| 技术 | 版本 | 用途 |
|-----|------|------|
| **React** | 18.x | UI 框架 |
| **Vite** | 6.x | 构建工具 |
| **CSS** | 3 | 样式（无预处理器） |
| **ReactMarkdown** | latest | Markdown 渲染 |
| **remark-gfm** | latest | GitHub 风格 Markdown |

### 桌面技术

| 技术 | 版本 | 用途 |
|-----|------|------|
| **Electron** | latest | 跨平台桌面框架 |
| **better-sqlite3** | latest | 本地数据库 |
| **opener** | latest | 打开文件/目录 |

### 后端技术

| 技术 | 版本 | 用途 |
|-----|------|------|
| **Supabase** | latest | BaaS 平台 |
| **PostgreSQL** | 15.x | 云端数据库 |
| **Edge Functions** | Deno | serverless 函数 |

### AI 技术

| 技术 | 版本 | 用途 |
|-----|------|------|
| **Claude Agent SDK** | latest | AI 对话能力 |
| **Anthropic API** | latest | Claude API |

---

## 模块划分

### 1. 认证模块 (Auth)

**功能**: 用户认证、状态管理

**文件**: `src/contexts/AuthContext.jsx`

```javascript
// 全局认证状态
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  // 登录
  const login = (user) => {
    setCurrentUser(user);
    localStorage.setItem('xiaobai_user', JSON.stringify(user));
  };

  // 登出
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('xiaobai_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**状态**:
- `currentUser`: 当前登录用户（null 表示游客）
- 持久化: localStorage

---

### 2. 云端服务模块 (CloudService)

**功能**: 与 Supabase 交互的接口封装

**文件**: `src/lib/cloudService.js`

**核心方法**:

| 方法 | 功能 | 使用客户端 |
|-----|------|----------|
| `sendVerificationCode()` | 发送验证码 | supabase |
| `signInWithPhone()` | 手机号登录 | supabaseAdmin |
| `loadConversations()` | 加载对话历史 | supabase |
| `createConversation()` | 创建对话 | supabase |
| `createMessage()` | 创建消息 | supabase |
| `deleteConversation()` | 删除对话 | supabase |
| `mergeGuestConversations()` | 合并游客数据 | supabase.rpc() |

**关键设计**:
- 登录相关操作使用 `supabaseAdmin`（绕过 RLS）
- 普通查询使用 `supabase`（anon key）

---

### 3. 对话管理模块 (Conversation)

**功能**: 对话历史管理、消息流式处理

**文件**: `src/App.jsx`

**状态**:
```javascript
const [conversations, setConversations] = useState([]);
const [currentConversation, setCurrentConversation] = useState(null);
const [messages, setMessages] = useState([]);
```

**操作**:
- 加载对话历史
- 创建新对话
- 切换对话
- 删除对话
- 添加消息

---

### 4. AI 对话模块 (Agent)

**功能**: 与 Claude AI 交互，流式响应

**文件**: `electron/main.js` (Agent 初始化)

```javascript
const { Agent } = require('@anthropic-ai/agent-sdk');

// 初始化 Agent
async function initAgent(config) {
  const agent = new Agent({
    apiKey: config.apiKey,
    model: config.model,
    provider: config.modelProvider
  });

  global.agent = agent;
  return { success: true };
}

// 发送消息
ipcMain.handle('sendMessage', async (event, message) => {
  if (!global.agent) {
    return { success: false, error: 'Agent 未初始化' };
  }

  try {
    const response = await global.agent.sendMessage(message);
    return { success: true, response };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

**流式响应**:
```javascript
// 前端
async function handleSendMessage(content) {
  setIsAgentReady(false);

  const stream = await window.electronAPI.sendMessage(content);

  for await (const chunk of stream) {
    // 追加消息内容
    appendMessage(chunk);
  }

  setIsAgentReady(true);
}
```

---

### 5. 设备识别模块 (Device)

**功能**: 生成唯一设备ID

**文件**: `electron/main.js`

```javascript
function getDeviceId() {
  const os = require('os');
  const crypto = require('crypto');

  const machineInfo = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus().length,
    os.totalmem()
  ].join('|');

  return crypto.createHash('md5').update(machineInfo).digest('hex');
}

ipcMain.handle('getDeviceId', async () => {
  return {
    success: true,
    deviceId: getDeviceId()
  };
});
```

---

## 数据流

### 登录流程

```
用户输入手机号
  ↓
LoginModal 组件
  ↓
cloudService.sendVerificationCode()
  ↓
Edge Function (阿里云短信)
  ↓
用户输入验证码
  ↓
cloudService.signInWithPhone()
  ↓
supabaseAdmin 查询/创建用户
  ↓
AuthContext.login(user)
  ↓
保存到 localStorage
  ↓
App.jsx handleLoginSuccess()
  ↓
mergeGuestConversations()
  ↓
loadConversations()
```

### 对话流程

```
用户输入消息
  ↓
InputArea 组件
  ↓
App.jsx handleSendMessage()
  ↓
window.electronAPI.sendMessage()
  ↓
Electron 主进程
  ↓
Agent.sendMessage()
  ↓
Claude API (流式响应)
  ↓
前端接收流式数据
  ↓
更新 UI (实时显示)
  ↓
保存到云端 (supabase)
```

---

## 进程通信

### Electron IPC 架构

```
┌─────────────────────────────────────────┐
│         渲染进程 (Renderer)             │
│  - React 应用                            │
│  - 用户界面                              │
└────────────┬────────────────────────────┘
             │ contextBridge
┌────────────▼────────────────────────────┐
│         Preload 脚本                     │
│  - 暴露安全的 API                        │
│  - IPC 调用封装                          │
└────────────┬────────────────────────────┘
             │ ipcRenderer.invoke
┌────────────▼────────────────────────────┐
│         主进程 (Main)                    │
│  - 窗口管理                              │
│  - 系统调用                              │
│  - Agent 管理                            │
└─────────────────────────────────────────┘
```

### IPC API 列表

| API | 参数 | 返回值 | 说明 |
|-----|------|-------|------|
| `getDeviceId()` | - | `{success, deviceId}` | 获取设备ID |
| `initAgent(config)` | 配置对象 | `{success}` | 初始化 AI Agent |
| `sendMessage(message)` | 消息内容 | Stream | 发送消息（流式） |
| `openPath(path)` | 文件路径 | `{success}` | 打开文件/目录 |
| `checkGuestUsage()` | - | `{canUse, remaining}` | 检查游客额度 |
| `incrementGuestUsage()` | - | `{success}` | 增加游客使用次数 |

---

## 数据存储架构

### 本地数据 (SQLite)

**位置**:
- macOS: `~/Library/Application Support/xiaobai-ai/xiaobai-ai.db`
- Windows: `%APPDATA%\xiaobai-ai\xiaobai-ai.db`
- Linux: `~/.config/xiaobai-ai/xiaobai-ai.db`

**表结构**:

```sql
-- 配置表
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 游客使用记录
CREATE TABLE guest_usage (
  device_id TEXT PRIMARY KEY,
  usage_count INTEGER DEFAULT 0,
  last_used_at TEXT
);
```

**用途**:
- 用户配置（API Key、模型选择）
- 游客使用统计
- 本地缓存

### 云端数据 (Supabase)

**位置**: https://your-project.supabase.co

**表结构**: 参见 [数据库设计](./03-数据库设计.md)

**用途**:
- 用户资料（`user_profiles`）
- 对话历史（`conversations`, `messages`）
- 验证码（`verification_codes`）
- 游客统计（`guest_usage`）

### 数据同步策略

| 数据类型 | 本地 | 云端 | 同步策略 |
|---------|-----|------|---------|
| 用户配置 | ✅ | ❌ | 仅本地 |
| 对话历史 | ❌ | ✅ | 仅云端 |
| 游客统计 | ✅ | ✅ | 双写 |
| 验证码 | ❌ | ✅ | 仅云端 |

---

## 安全架构

### 认证安全

| 措施 | 说明 |
|-----|------|
| **验证码 5 分钟过期** | 防止重放攻击 |
| **验证码一次性使用** | 使用后标记 `used = true` |
| **不使用密码** | 避免密码泄露风险 |
| **Service Role Key 保护** | 仅在服务端使用 |

### 数据安全

| 措施 | 说明 |
|-----|------|
| **RLS 策略** | 当前已禁用（v2.5.0+） |
| **Service Role Key** | 绕过 RLS，后端操作 |
| **Anon Key** | 前端查询，受环境限制 |
| **敏感数据不落库** | API Key 仅存储在本地 |

### 通信安全

| 措施 | 说明 |
|-----|------|
| **HTTPS** | 所有 API 调用使用 HTTPS |
| **Electron IPC** | 进程间通信，不经过网络 |
| **contextBridge** | 隔离渲染进程和主进程 |

---

## 性能优化

### 前端优化

| 技术 | 说明 |
|-----|------|
| **React.memo** | 组件缓存，避免重渲染 |
| **虚拟列表** | 长列表优化（暂未实现） |
| **懒加载** | 路由懒加载（暂未实现） |
| **流式响应** | AI 回答实时显示 |

### 后端优化

| 技术 | 说明 |
|-----|------|
| **数据库索引** | 加速查询 |
| **软删除** | 避免数据丢失 |
| **分页加载** | 对话历史分页（暂未实现） |
| **缓存策略** | 游客数据本地缓存 |

---

## 扩展性设计

### 插件系统（未实现）

```javascript
// 计划中的插件架构
class Plugin {
  name = 'plugin-name';
  version = '1.0.0';

  init(app) {
    // 插件初始化
  }

  onMessage(message) {
    // 消息拦截
  }

  onCommand(command) {
    // 命令处理
  }
}
```

### 多模型支持（已实现）

```javascript
const modelProviders = {
  claude: {
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    apiKey: 'sk-...'
  },
  zhipu: {
    models: ['glm-4.7', 'glm-4'],
    apiKey: '...'
  }
};
```

---

## 相关文件

| 目录 | 说明 |
|-----|------|
| `src/components/` | React 组件 |
| `src/lib/` | 工具库 |
| `src/contexts/` | Context 状态管理 |
| `electron/` | Electron 主进程 |
| `supabase/migrations/` | 数据库迁移 |

---

**最后更新**: 2026-01-07
**相关文档**: [快速入门](./01-快速入门.md) | [部署与配置](./07-部署与配置.md)
