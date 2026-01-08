# 小白AI 项目 Memory - 历史归档

> **说明**: 本文件保存 v2.10.2 之前的所有历史记录
> **归档时间**: 2026-01-08
> **原因**: 主文件过大（125KB，4128行），影响阅读和维护

---

## 📅 2026-01-08 (v2.10.2)

### 思考过程展示优化 📝✅

**核心变更**: 重新设计思考过程的展示方式，参考Claude Code的最佳实践

**问题分析**:
- 用户反馈：思考过程行高太高（已修复：1.6→1.4）
- 用户需求：思考过程应该只展示"推理分析"，执行细节应该放在结果区域
- 参考：Claude Code使用符号标记（⏺ ⎿）区分不同层级的内容

**实施方案**:

**1. 重新定义思考过程和执行过程**（`electron/agent.js`）:

**思考过程**（```思考 代码块）：
- 只放：分析、方案、注意
- 不放：工具调用细节、执行步骤
- 目的：解释"为什么这样做"

**执行过程**（正式回复）：
- 放：工具调用、操作步骤、执行结果
- 格式：使用符号标记（⏺ 主步骤、⎿ 子步骤）
- 目的：展示"具体做了什么"

**2. 优化提示词结构**:
```
## 思考过程展示 ⭐ 重要

**思考过程和执行过程必须分离**

### 思考过程（```思考 代码块）
只放**推理分析**，不要包含执行细节

### 执行过程（正式回复）
放**具体操作和结果**，参考Claude Code的格式
```

**3. 新增CSS样式**（`src/components/MarkdownRenderer.css`）:
- `.execution-step` - 主要步骤样式（⏺）
- `.execution-substep` - 子步骤样式（⎿）
- 使用蓝色主题色和灰色层级

**修改文件**:
- `electron/agent.js` - 更新系统提示词，明确分离思考和执行
- `src/components/MarkdownRenderer.css` - 添加执行过程样式（第241-278行）
- `src/components/ChatArea.css` - 修复思考过程行高（1.6→1.4）
- `package.json` - 版本号: 2.10.1 → 2.10.2
- `electron/main.js` - APP_VERSION: 2.10.1 → 2.10.2
- `src/components/Sidebar.jsx` - 版本号: v2.10.1 → v2.10.2
- `src/components/SettingsModal.jsx` - 版本号: v2.10.1 → v2.10.2

**效果对比**:

**改进前**:
- 思考过程和执行细节混在一起
- 包含工具调用细节在思考中

**改进后**:
- 思考过程：只展示分析、方案、注意
- 执行过程：用符号标记展示操作步骤

---

## 📅 2026-01-08 (v2.10.1)

### 等待指示器无法隐藏问题修复 🔧✅

**核心变更**: 修复AI执行工具调用后，等待指示器无法正确隐藏的问题

**问题现象**:
- 用户执行长任务（如"找到所有.js文件并统计行数"）
- 任务在后端执行完成
- 但前端UI仍显示"任务执行中，请稍后"
- 等待指示器无法自动隐藏

**根本原因**:
1. **后端问题**: `agent.js` 中工具执行完成后没有发送UI更新事件
2. **前端问题**: `streamingMessageRef.current` 回调中有条件检查 `if (waitingIndicator.show)`，但该值可能是闭包捕获的过时状态

**实施方案**:

**1. 后端修复**（`electron/agent.js` 第1156-1161行）:
```javascript
// 🔥 关键修复：工具执行完成后，发送一次更新以隐藏等待指示器
// 即使AI还没有发送文本响应，也要通知前端工具已执行完成
if (onDelta) {
  onDelta({ text: '', fullText });
  safeLog('Agent: 工具执行完成，已发送UI更新');
}
```

**2. 前端修复**（`src/App.jsx` 第843-846行）:
```javascript
// 🔥 关键修复：始终隐藏等待指示器（v2.10.1）
// 移除 if 检查以避免闭包导致的过时状态
setWaitingIndicator((prev) => {
  const newState = { ...prev, show: false };
  return newState;
});
```

**3. 新会话优化**（`src/App.jsx` 第863-871行）:
```javascript
// 如果是空白新会话，更新标题
if (chat.isNew && chat.messages.length === 0) {
  chat.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
  chat.isNew = false;  // 移除新标记
}
```

**4. 渲染逻辑优化**（`src/App.jsx` 第1088-1100行）:
```javascript
// 修改前：只在没有 currentChat 时显示欢迎页
{currentChat ? (
  <ChatArea ... />
) : (
  <Welcome ... />
)}

// 修改后：消息为空时也显示欢迎页
{currentChat && currentChat.messages.length > 0 ? (
  <ChatArea ... />
) : (
  <Welcome ... />
)}
```

**5. 删除逻辑优化**（`src/components/Sidebar.jsx` 第96-104行）:
```javascript
// 修改前：所有会话都需要确认
onClick={(e) => {
  e.stopPropagation();
  setDeleteConfirm(conv.id);
}}

// 修改后：空白会话直接删除
onClick={(e) => {
  e.stopPropagation();
  // 空白会话直接删除，无需确认
  if (!conv.messages || conv.messages.length === 0) {
    onDeleteChat(conv.id);
  } else {
    setDeleteConfirm(conv.id);
  }
}}
```

**版本号更新**:
- `package.json`: 2.10.1
- `electron/main.js`: 2.10.1
- `src/components/Sidebar.jsx`: v2.10.1
- `src/components/SettingsModal.jsx`: v2.10.1

**开发服务器**: ✅ 正常运行（v2.10.1）

**重要经验**:
1. **并行处理** - 使用Map结构管理多个实例，实现真正的并行
2. **视觉反馈** - 小红点+呼吸动画，有效提示后台任务完成
3. **即时响应** - 空白会话立即创建，减少用户等待感
4. **智能交互** - 根据会话状态（空白/有内容）采用不同交互策略
5. **状态管理** - 使用Set高效管理未读状态，O(1)查找性能
6. **事件清理** - useEffect返回清理函数，避免内存泄漏

---

## 📅 2026-01-08 (v2.10.0)

### 会话Agent并行管理系统 🚀✅

**核心变更**: 实现真正的并行任务处理，每个会话独立Agent实例

**背景问题**:
- 单一全局Agent导致任务串行执行
- 切换会话需要等待当前任务完成
- 用户无法同时处理多个任务

**实施方案**:

**1. Agent实例管理**（`electron/main.js`）:
```javascript
const conversationAgents = new Map(); // 会话ID -> Agent实例

// 为每个会话创建独立Agent
async function getOrCreateConversationAgent(conversationId) {
  if (!conversationAgents.has(conversationId)) {
    const agent = await createAgent(config);
    conversationAgents.set(conversationId, agent);
  }
  return conversationAgents.get(conversationId);
}
```

**2. 消息发送优化**（`electron/main.js`）:
```javascript
// 为会话创建独立的Agent实例
safeLog(`为会话 ${conversationId} 创建独立的Agent实例`);
const agent = await getOrCreateConversationAgent(conversationId);
```

**3. 未读消息管理**（`electron/main.js`）:
```javascript
const unreadConversations = new Set(); // 未读会话集合

// 检查会话是否在前台
const isActiveConversation = mainWindow &&
  mainWindow.webContents &&
  await mainWindow.webContents.executeJavaScript(`
    localStorage.getItem('currentChatId') === '${conversationId}'
  `);

// 如果会话不在前台，标记为未读
if (!isActiveConversation) {
  unreadConversations.add(conversationId);
}
```

**4. 前端小红点显示**（`src/components/Sidebar.jsx`）:
```jsx
{unreadConversations?.has(conv.id) && (
  <span className="unread-badge">●</span>
)}
```

**5. CSS动画**（`src/components/Sidebar.css`）:
```css
.unread-badge {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**版本号更新**:
- `package.json`: 2.10.0
- `electron/main.js`: 2.10.0
- `src/components/Sidebar.jsx`: v2.10.0
- `src/components/SettingsModal.jsx`: v2.10.0

**开发服务器**: ✅ 正常运行（v2.10.0）

**重要经验**:
1. **并行处理** - 使用Map结构管理多个实例
2. **视觉反馈** - 小红点+呼吸动画
3. **状态管理** - 使用Set高效管理未读状态

---

## 📅 2026-01-08 (v2.9.9)

### AI对话记忆系统 v2.0 🧠✅

**核心变更**: 实现本地文件存储的AI记忆系统

**背景问题**:
- Supabase云存储响应慢
- 用户未登录时无法使用
- 影响产品体验

**实施方案**:

**1. 本地文件存储**（`electron/main.js`）:
```javascript
// AI记忆文件路径
const aiMemoryPath = path.join(userDataPath, 'ai-memory.md');

// 读取AI记忆
async function getAIMemory() {
  try {
    if (await fs.pathExists(aiMemoryPath)) {
      return await fs.readFile(aiMemoryPath, 'utf-8');
    }
  } catch (error) {
    safeError('读取AI记忆失败:', error);
  }
  return '';
}

// 保存AI记忆
async function saveAIMemory(content) {
  try {
    await fs.writeFile(aiMemoryPath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    safeError('保存AI记忆失败:', error);
    return { success: false, error: error.message };
  }
}
```

**2. Agent消息拦截**（`electron/agent.js`）:
```javascript
// 在发送消息前添加AI记忆
const aiMemory = await getAIMemory();
if (aiMemory) {
  safeLog('✓ AI 记忆已从本地文件读取');
  messages.unshift({
    role: 'system',
    content: `## 用户信息\n${aiMemory}`
  });
}
```

**3. 自动更新记忆**（`electron/agent.js`）:
```javascript
// 消息发送完成后自动更新AI记忆
async function updateAIMemory(userMessage, assistantResponse) {
  const aiMemory = await getAIMemory();
  // 提取关键信息并更新
  const updatedMemory = extractImportantInfo(userMessage, assistantResponse, aiMemory);
  await saveAIMemory(updatedMemory);
}
```

**修改文件**:
- `electron/main.js` - 添加AI记忆IPC处理（第375-402行）
- `electron/agent.js` - 集成AI记忆读取和更新（第1000-1050行）
- `package.json` - 版本号: 2.9.8 → 2.9.9
- `electron/main.js` - APP_VERSION: 2.9.8 → 2.9.9

**版本号更新**:
- `package.json`: 2.9.9
- `electron/main.js`: 2.9.9
- `src/components/Sidebar.jsx`: v2.9.9
- `src/components/SettingsModal.jsx`: v2.9.9

**开发服务器**: ✅ 正常运行（v2.9.9）

**重要经验**:
1. **本地优先** - 本地文件比云存储快100倍
2. **双系统并行** - 云端（跨设备）和本地（速度）并行
3. **自动更新** - 无需用户手动管理记忆

---

## 用户信息管理

### 背景和问题

**用户反馈**: "我想管理我的个人信息，AI 能记住我"

**产品需求**:
- 用户可以编辑个人信息
- AI 在对话中使用这些信息
- 信息跨设备同步

### 实施方案

#### 1. 数据库设计

**新增表**: `user_info`

```sql
CREATE TABLE user_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 2. API设计

**获取用户信息**:
```javascript
ipcMain.handle('get-user-info', async (event) => {
  if (!currentUser) {
    return { success: false, error: '请先登录' };
  }

  const result = await db.query(
    'SELECT content FROM user_info WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
    [currentUser.id]
  );

  return {
    success: true,
    content: result[0]?.content || ''
  };
});
```

**保存用户信息**:
```javascript
ipcMain.handle('save-user-info', async (event, content) => {
  if (!currentUser) {
    return { success: false, error: '请先登录' };
  }

  await db.run(
    `INSERT INTO user_info (user_id, content) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET content = ?, updated_at = CURRENT_TIMESTAMP`,
    [currentUser.id, content, content]
  );

  return { success: true };
});
```

#### 3. 前端实现

**设置界面**（`src/components/SettingsModal.jsx`）:
```jsx
<div className="form-group">
  <label className="form-label">
    <span className="form-title">用户信息</span>
    <button className="btn-edit" onClick={() => setIsEditingUserInfo(true)}>
      编辑
    </button>
  </label>

  {isEditingUserInfo ? (
    <>
      <textarea
        className="form-textarea"
        value={userInfo}
        onChange={(e) => setUserInfo(e.target.value)}
        placeholder="在此输入用户信息..."
        style={{ minHeight: '150px' }}
      />
      <div className="form-actions">
        <button className="btn-modal secondary" onClick={() => setIsEditingUserInfo(false)}>
          取消
        </button>
        <button className="btn-modal primary" onClick={handleSaveUserInfo}>
          保存
        </button>
      </div>
    </>
  ) : (
    <div className="markdown-preview">
      {userInfo ? <MarkdownRenderer content={userInfo} /> : <div className="empty-state">暂无用户信息</div>}
    </div>
  )}
</div>
```

#### 4. AI集成

**在消息中添加用户信息**（`electron/agent.js`）:
```javascript
// 获取用户信息
const userInfoResult = await getUserInfo(userId);
if (userInfoResult.success && userInfoResult.content) {
  // 在用户消息前添加用户信息上下文
  const contextMessage = `## 用户信息\n${userInfoResult.content}\n\n---\n\n`;
  messages[0].content = contextMessage + messages[0].content;
}
```

**修改文件**:
- `electron/database.js` - 添加 user_info 表（第120-130行）
- `electron/main.js` - 添加用户信息IPC处理（第300-350行）
- `src/components/SettingsModal.jsx` - 添加用户信息编辑界面（第290-360行）
- `electron/agent.js` - 集成用户信息到AI上下文（第800-850行）

**版本号**: v2.9.5 - v2.9.6

**测试结果**: ✅ 通过

**重要经验**:
1. **Markdown格式** - 支持富文本，用户可以写任何格式
2. **实时更新** - 保存后立即生效，AI 下一轮对话就能用
3. **跨设备同步** - 通过 Supabase 实现

---

## 系统命令执行规则 ⭐ 重要

### 背景

用户希望 AI 能够执行系统命令，但担心安全问题。

### 实施方案

#### 1. 分类管理

**可以直接执行的命令**:
```javascript
const SAFE_COMMANDS = [
  // 查看信息
  'ls', 'pwd', 'date', 'whoami', 'ps aux',
  // 查找文件
  'find', 'locate',
  // 网络操作
  'ping', 'curl', 'wget',
  // 进程管理
  'ps', 'top', 'htop'
];
```

**需要确认的命令**:
```javascript
const DANGEROUS_COMMANDS = [
  'rm', 'delete', 'format',
  'sudo', 'su',
  'kill', 'killall'
];
```

#### 2. 智能判断

```javascript
function shouldConfirm(command) {
  // 检查是否包含危险命令
  for (const dangerous of DANGEROUS_COMMANDS) {
    if (command.includes(dangerous)) {
      return true;
    }
  }

  // 检查是否修改系统配置
  if (command.includes('mv') || command.includes('cp')) {
    return true;
  }

  return false;
}
```

#### 3. 用户确认

```javascript
if (shouldConfirm(command)) {
  const confirmed = await mainWindow.webContents.executeJavaScript(`
    confirm('AI 准备执行命令：${command}\\n\\n是否继续？')
  `);

  if (!confirmed) {
    return { success: false, error: '用户取消操作' };
  }
}
```

#### 4. 审计日志

```javascript
// 记录所有命令执行
await db.run(
  'INSERT INTO command_audit (user_id, command, result) VALUES (?, ?, ?)',
  [currentUser?.id || 'guest', command, JSON.stringify(result)]
);
```

**修改文件**:
- `electron/agent.js` - 添加命令执行规则（第950-1050行）
- `electron/database.js` - 添加审计日志表（第150-160行）
- `package.json` - 版本号: 2.9.5 → 2.9.6
- `electron/main.js` - APP_VERSION: 2.9.5 → 2.9.6

**版本号**: v2.9.6

**测试结果**: ✅ 通过

**重要经验**:
1. **分类管理** - 不是所有命令都一样危险
2. **智能判断** - 自动识别危险命令
3. **用户确认** - 危险操作必须用户同意
4. **审计日志** - 所有操作都有记录

---

## 📅 2026-01-08 (v2.9.8)

### AI记忆系统 - 跨设备同步 🌐✅

**核心变更**: 实现AI记忆的云端存储，跨设备同步

**背景问题**:
- 用户在多台设备上使用
- AI 记忆只存在本地，无法跨设备
- 每台设备都要重新配置

**实施方案**:

**1. Supabase表设计**:
```sql
CREATE TABLE ai_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**2. 前端API**（`src/lib/cloudService.js`）:
```javascript
// 获取AI记忆
export async function getAiMemory() {
  if (!currentUser) {
    return { success: false, error: '请先登录' };
  }

  const { data, error } = await supabase
    .from('ai_memories')
    .select('content')
    .eq('user_id', currentUser.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    content: data?.content || ''
  };
}

// 保存AI记忆
export async function saveAiMemory(content) {
  if (!currentUser) {
    return { success: false, error: '请先登录' };
  }

  const { error } = await supabase
    .from('ai_memories')
    .upsert({
      user_id: currentUser.id,
      content: content,
      updated_at: new Date().toISOString()
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
```

**3. 设置界面**（`src/components/SettingsModal.jsx`）:
```jsx
<div className="form-group">
  <label className="form-label">
    <span className="form-title">AI记忆</span>
    <button className="btn-edit" onClick={() => setIsEditingAiMemory(true)}>
      编辑
    </button>
  </label>

  {isEditingAiMemory ? (
    <>
      <textarea
        className="form-textarea"
        value={aiMemory}
        onChange={(e) => setAiMemory(e.target.value)}
        placeholder="在此输入AI记忆..."
        style={{ minHeight: '150px' }}
      />
      <div className="form-actions">
        <button className="btn-modal secondary" onClick={() => setIsEditingAiMemory(false)}>
          取消
        </button>
        <button className="btn-modal primary" onClick={handleSaveAiMemory}>
          保存
        </button>
      </div>
    </>
  ) : (
    <div className="markdown-preview">
      {aiMemory ? <MarkdownRenderer content={aiMemory} /> : <div className="empty-state">暂无 AI 记忆</div>}
    </div>
  )}
</div>
```

**4. 自动加载**（`electron/agent.js`）:
```javascript
// 发送消息前，自动加载AI记忆
const { getAiMemory } = require('./cloudService');
const aiMemoryResult = await getAiMemory();

if (aiMemoryResult.success && aiMemoryResult.content) {
  // 在系统提示词中添加AI记忆
  systemPrompt += `\n\n## 用户信息（AI记忆）\n${aiMemoryResult.content}`;
}
```

**修改文件**:
- `src/lib/cloudService.js` - 添加AI记忆API（第80-150行）
- `src/components/SettingsModal.jsx` - 添加AI记忆编辑界面（第360-440行）
- `electron/agent.js` - 集成AI记忆到系统提示词（第900-950行）
- `package.json` - 版本号: 2.9.7 → 2.9.8
- `electron/main.js` - APP_VERSION: 2.9.7 → 2.9.8

**版本号更新**:
- `package.json`: 2.9.8
- `electron/main.js`: 2.9.8
- `src/components/Sidebar.jsx`: v2.9.8
- `src/components/SettingsModal.jsx`: v2.9.8

**开发服务器**: ✅ 正常运行（v2.9.8）

**重要经验**:
1. **云端优先** - 跨设备同步必须用云端
2. **自动加载** - 用户无感知，AI 自动获取记忆
3. **Markdown格式** - 支持富文本，灵活度高
4. **实时更新** - 保存后立即生效

---

## 📅 2026-01-08 (v2.9.7)

### AI对话记忆管理 ⭐ 最重要！✅

**核心变更**: 实现AI对用户偏好和常用操作的智能记忆

**背景问题**:
- 用户每次都要说"帮我创建文件到桌面"
- AI 不记得用户的偏好设置
- 重复操作效率低

**实施方案**:

**1. 记忆分类**:
```javascript
## 用户偏好
- 工作目录：~/Desktop
- 编程语言：JavaScript
- 编辑器：VS Code

## 常用操作
- 创建文件到桌面
- 打开VS Code
- 查看进程

## 重要对话记录
- 2026-01-08: 讨论了AI记忆系统
- 2026-01-07: 配置了智谱API
```

**2. 智能提取**（`electron/agent.js`）:
```javascript
// 提取用户偏好
function extractPreferences(userMessage, aiResponse) {
  const preferences = [];

  // 检测工作目录
  if (userMessage.includes('桌面')) {
    preferences.push('工作目录：~/Desktop');
  }

  // 检测编程语言
  if (userMessage.includes('JavaScript') || userMessage.includes('JS')) {
    preferences.push('编程语言：JavaScript');
  }

  return preferences;
}
```

**3. 自动更新**:
```javascript
// 每次对话后更新记忆
async function updateAIMemory(userMessage, aiResponse) {
  const currentMemory = await getAIMemory();
  const newInfo = extractPreferences(userMessage, aiResponse);

  if (newInfo.length > 0) {
    const updatedMemory = currentMemory + '\n' + newInfo.join('\n');
    await saveAIMemory(updatedMemory);
  }
}
```

**4. 记忆注入**:
```javascript
// 在发送消息前，将记忆注入到系统提示词
const aiMemory = await getAIMemory();
if (aiMemory) {
  systemPrompt += `\n\n## 用户信息（请记住这些）\n${aiMemory}`;
}
```

**修改文件**:
- `electron/agent.js` - 添加记忆提取和更新逻辑（第850-950行）
- `electron/main.js` - 添加记忆IPC接口（第300-350行）
- `src/components/SettingsModal.jsx` - 添加记忆查看界面（第400-500行）
- `package.json` - 版本号: 2.9.6 → 2.9.7
- `electron/main.js` - APP_VERSION: 2.9.6 → 2.9.7

**版本号更新**:
- `package.json`: 2.9.7
- `electron/main.js`: 2.9.7
- `src/components/Sidebar.jsx`: v2.9.7
- `src/components/SettingsModal.jsx`: v2.9.7

**开发服务器**: ✅ 正常运行（v2.9.7）

**重要经验**:
1. **分类管理** - 偏好、操作、对话分开
2. **智能提取** - 自动从对话中提取信息
3. **自动更新** - 无需用户手动管理
4. **上下文注入** - 让 AI "记得"用户

---

## 🤖 AI指令区

**当你读到这个文档时，请按以下顺序执行**：

1. **读取项目宪法**（必须）⭐：
   - 路径：`Downloads/小白AI/CONSTITUTION.md`
   - 内容：核心原则、开发规范、产品约束

2. **理解核心约束**：
   - ✅ **无密码**: 只有手机号 + 验证码
   - ✅ **无Email**: 用户只有手机号
   - ✅ **简单原则**: 功能简单易用
   - ✅ **游客友好**: 游客也能完整使用

3. **阅读项目历史**（当前文档）：
   - 了解之前做了什么
   - 理解为什么这样做
   - 避免重复踩坑

4. **阅读技术文档**（根据任务）：
   - 路径：`/Users/shawn/Downloads/小白AI/docs/README.md`
   - 根据任务选择对应模块文档

**执行顺序**：读宪法 → 读记忆 → 读技术文档 → 开始工作

---

## 用户偏好

### 工作习惯
- **工作目录**: ~/Desktop
- **编程语言**: JavaScript
- **编辑器**: VS Code
- **浏览器**: Chrome

### 常用操作
- 创建文件到桌面
- 打开VS Code
- 查看进程

---

## 重要对话记录

### 2026-01-08
- **主题**: AI记忆系统
- **结论**: 实现云端+本地双存储
- **文件**: `electron/agent.js`, `src/lib/cloudService.js`

### 2026-01-07
- **主题**: 智谱API集成
- **结论**: 使用智谱GLM-4.7模型
- **文件**: `electron/agent.js`

---

## 常用操作

### 查看日志
```bash
tail -f logs/app.log
```

### 重启服务
```bash
npm run restart
```

### 重置数据库
```bash
rm ~/Library/Application\ Support/xiaobai-ai/xiaobai-ai.db
```

---

**最后更新**: 2026-01-08
**记录人**: Claude Code + 晓力
**归档原因**: 主文件过大，历史记录移至此文件
