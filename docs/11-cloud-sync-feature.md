# 云端数据自动同步功能

## 📋 文档信息

- **创建时间**: 2026-01-07
- **版本**: v2.7.8
- **维护者**: 晓力
- **状态**: ✅ 已实施

---

## 1. 功能概述

### 1.1 背景与需求

**问题**: 用户在聊天过程中透露的信息（如姓名、职业、喜好）无法持久化保存，换电脑后 AI 会"失忆"。

**需求**:
- 自动保存对话历史到云端「AI记忆」
- 自动识别并保存用户个人信息到云端「用户信息」
- 换电脑后自动加载历史记忆

**解决方案**:
1. 每次聊天后自动同步对话记录到云端 AI 记忆
2. 智能检测用户消息中的个人信息关键词
3. 打开设置时自动加载云端数据

---

## 2. 技术实现

### 2.1 AI 记忆自动同步

#### 实现位置
`src/App.jsx` - `handleSendMessage()` 函数

#### 核心代码

```javascript
// 每次聊天成功后执行
if (result.success) {
  // 自动更新本地记忆文件
  await updateMemoryFile(content, result.content);

  // 🔄 自动同步 AI 记忆到云端
  try {
    const timestamp = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    // 构建新的记忆条目
    const newEntry = `\n## 对话记录 - ${timestamp}\n\n**用户**: ${content}\n\n**AI**: ${result.content.slice(0, 200)}${result.content.length > 200 ? '...' : ''}\n`;

    // 获取当前云端记忆
    const { getAiMemory } = await import('./lib/cloudService');
    const memoryResult = await getAiMemory();
    let currentMemory = memoryResult.success ? memoryResult.content : '';

    // 追加并保存到云端
    const updatedMemory = currentMemory + newEntry;
    await saveAiMemory(updatedMemory);

    console.log('✅ [App] AI 记忆已同步到云端');
  } catch (error) {
    console.error('❌ [App] 同步 AI 记忆到云端失败（非致命）:', error);
    // 不阻塞聊天流程
  }
}
```

#### 特点
- ✅ **自动触发**: 每次聊天后自动同步，无需用户操作
- ✅ **增量追加**: 只追加新的对话记录，不覆盖历史内容
- ✅ **容错处理**: 同步失败不影响聊天功能
- ✅ **格式规范**: 使用 Markdown 格式记录，支持标题、时间戳

#### 数据格式

```markdown
## 对话记录 - 01/07/26, 20:15

**用户**: 帮我写一个 Python 脚本

**AI**: 好的，我来帮你写一个 Python 脚本...

## 对话记录 - 01/07/26, 20:20

**用户**: 这个脚本怎么运行？

**AI**: 你可以通过以下步骤运行...
```

---

### 2.2 用户信息自动提取与保存

#### 实现位置
`src/App.jsx` - `extractAndSaveUserInfo()` 函数

#### 核心代码

```javascript
/**
 * 自动提取用户个人信息并保存到云端
 * 检测用户消息中是否包含：姓名、职业、所在地、个人简介、其他偏好等信息
 */
const extractAndSaveUserInfo = async (userMessage) => {
  // 定义个人信息关键词模式
  const patterns = {
    name: /我叫|名字是|我是|我叫作|姓名是|我的名字|我的姓名/g,
    occupation: /我是|工作|职业|从事|职位|公司/g,
    location: /我在|住在|位于|所在地|城市/g,
    bio: /介绍|简介|关于我|我是/g,
    preferences: /喜欢|爱好|偏好|喜好|擅长/g
  };

  // 检查是否包含个人信息
  const hasPersonalInfo = Object.values(patterns).some(pattern =>
    pattern.test(userMessage)
  );

  if (!hasPersonalInfo) {
    return; // 没有个人信息，直接返回
  }

  console.log('🔍 [App] 检测到用户消息包含个人信息，准备保存...');

  try {
    // 获取当前云端用户信息
    const { getUserInfo } = await import('./lib/cloudService');
    const userInfoResult = await getUserInfo();
    let currentInfo = userInfoResult.success ? userInfoResult.content : '';

    // 构建新的用户信息条目
    const timestamp = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newEntry = `\n## 更新时间 - ${timestamp}\n${userMessage}\n`;

    // 检查是否已包含相同内容（避免重复）
    if (currentInfo.includes(userMessage)) {
      console.log('ℹ️ [App] 该信息已存在，跳过保存');
      return;
    }

    // 更新并保存到云端
    const updatedInfo = currentInfo + newEntry;
    const saveResult = await saveUserInfo(updatedInfo);

    if (saveResult.success) {
      console.log('✅ [App] 用户信息已保存到云端');
    } else {
      console.error('❌ [App] 保存用户信息失败:', saveResult.error);
    }
  } catch (error) {
    console.error('❌ [App] 提取用户信息异常:', error);
    throw error;
  }
};
```

#### 关键词检测规则

| 类别 | 关键词 | 示例 |
|------|--------|------|
| 姓名 | 我叫、名字是、我是、姓名 | "我叫晓力" |
| 职业 | 工作、职业、从事、职位、公司 | "我是产品经理" |
| 所在地 | 我在、住在、位于、城市 | "我住在北京" |
| 简介 | 介绍、简介、关于我 | "让我介绍一下自己" |
| 喜好 | 喜欢、爱好、偏好、擅长 | "我喜欢滑雪" |

#### 特点
- ✅ **智能检测**: 基于关键词模式匹配
- ✅ **去重机制**: 避免重复保存相同内容
- ✅ **增量保存**: 追加到现有信息，不覆盖
- ✅ **非阻塞**: 检测失败不影响聊天功能

---

### 2.3 设置页面自动加载云端数据

#### 实现位置
`src/components/SettingsModal.jsx` - `useEffect()` hook

#### 核心代码

```javascript
useEffect(() => {
  setLocalConfig({ ...config });

  // 获取用户数据路径
  window.electronAPI.getUserDataPath().then(userDataPath => {
    setUserDataPathDisplay(userDataPath);
  });

  // 获取token使用记录
  window.electronAPI.getTokenUsage().then(result => {
    if (result.success) {
      setTokenUsage(result.data);
    }
  });

  // 🔄 自动加载云端用户信息
  const loadCloudData = async () => {
    try {
      const { getUserInfo, getAiMemory } = await import('../lib/cloudService');

      // 加载用户信息
      const userInfoResult = await getUserInfo();
      if (userInfoResult.success && userInfoResult.content) {
        setUserInfo(userInfoResult.content);
      }

      // 加载 AI 记忆
      const aiMemoryResult = await getAiMemory();
      if (aiMemoryResult.success && aiMemoryResult.content) {
        setAiMemory(aiMemoryResult.content);
      }
    } catch (error) {
      console.error('加载云端数据失败:', error);
    }
  };

  loadCloudData();

  // ... 其他逻辑
}, [config]);
```

#### 特点
- ✅ **自动加载**: 打开设置时自动从云端拉取最新数据
- ✅ **并行加载**: 用户信息和 AI 记忆同时加载
- ✅ **容错处理**: 加载失败不影响设置页面打开

---

### 2.4 Markdown 渲染预览

#### 实现位置
`src/components/SettingsModal.jsx` - `renderAdvancedSettings()`

#### 核心代码

```javascript
{/* 预览模式 */}
{!isEditingUserInfo && (
  <div className="markdown-preview">
    {userInfo ? (
      <MarkdownRenderer content={userInfo} />
    ) : (
      <div className="empty-state">暂无用户信息</div>
    )}
  </div>
)}
```

#### 样式定义

```css
/* Markdown 预览区域 */
.markdown-preview {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  min-height: 100px;
  max-height: 400px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
}

.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3 {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text);
}

.markdown-preview h2 {
  font-size: 16px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}

.markdown-preview code {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #d63384;
}

.markdown-preview blockquote {
  border-left: 4px solid var(--primary);
  padding-left: 12px;
  margin: 12px 0;
  color: var(--text-secondary);
  font-style: italic;
}
```

#### 支持的 Markdown 语法

- ✅ 标题: `# H1`, `## H2`, `### H3`
- ✅ 列表: `- 列表项`, `1. 有序列表`
- ✅ 代码: `` `inline` ``, ```代码块```
- ✅ 引用: `> 引用文本`
- ✅ 粗体/斜体: `**粗体**`, `*斜体*`
- ✅ 链接: `[文本](url)`

---

## 3. 数据流程

### 3.1 用户信息保存流程

```
用户发送消息
    ↓
检测个人信息关键词
    ↓
关键词匹配成功？
    ├─ 是 → 获取云端用户信息
    │        ↓
    │     检查是否重复
    │        ↓
    │     追加新内容
    │        ↓
    │     保存到云端 ✅
    │
    └─ 否 → 结束
```

### 3.2 AI 记忆同步流程

```
用户发送消息
    ↓
AI 回复成功
    ↓
更新本地记忆文件
    ↓
获取云端 AI 记忆
    ↓
追加新对话记录
    ↓
保存到云端 ✅
```

### 3.3 设置页面数据加载流程

```
用户打开设置
    ↓
切换到"高级功能"
    ↓
并行加载数据:
  ├─ getUserInfo() → 用户信息
  └─ getAiMemory() → AI 记忆
    ↓
渲染 Markdown 预览 ✅
```

---

## 4. 云端服务接口

### 4.1 用户信息相关

#### getUserInfo()
```javascript
/**
 * 获取用户信息
 * @returns {Promise<{success: boolean, content?: string, error?: string}>}
 */
export async function getUserInfo()
```

#### saveUserInfo()
```javascript
/**
 * 保存用户信息
 * @param {string} content - 用户信息内容
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveUserInfo(content)
```

### 4.2 AI 记忆相关

#### getAiMemory()
```javascript
/**
 * 获取 AI 记忆
 * @returns {Promise<{success: boolean, content?: string, error?: string}>}
 */
export async function getAiMemory()
```

#### saveAiMemory()
```javascript
/**
 * 保存 AI 记忆
 * @param {string} content - AI 记忆内容
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveAiMemory(content)
```

---

## 5. 使用场景

### 5.1 跨设备同步

**场景**: 用户在 Mac 上和 Windows 上都使用小白AI

**使用流程**:
1. Mac 上聊天，透露个人信息："我叫晓力，是产品经理"
2. 系统自动保存到云端
3. Windows 上打开设置 → 高级功能
4. 自动加载云端数据，看到已保存的信息

### 5.2 AI 个性化回复

**场景**: 用户在聊天中告诉 AI 自己的偏好

**使用流程**:
1. 用户发送："我喜欢简洁的回复"
2. 系统自动检测并保存到云端用户信息
3. 后续对话中 AI 会根据云端记忆提供更个性化的回复

### 5.3 对话历史持久化

**场景**: 用户想查看之前的对话记录

**使用流程**:
1. 打开设置 → 高级功能 → AI 记忆
2. 看到所有历史对话记录（按时间排序）
3. 可以编辑、删除或添加备注

---

## 6. 数据库设计

### 6.1 user_info 表

```sql
CREATE TABLE user_info (
  id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  user_id BIGINT,                    -- 登录用户 ID
  device_id VARCHAR(64),            -- 游客设备 ID
  content TEXT,                     -- 用户信息内容（Markdown）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 约束：用户和设备二选一
ALTER TABLE user_info ADD CONSTRAINT user_info_owner_check
  CHECK (
    (user_id IS NOT NULL AND device_id IS NULL) OR
    (user_id IS NULL AND device_id IS NOT NULL)
  );

-- 索引：加速查询
CREATE INDEX idx_user_info_user ON user_info(user_id);
CREATE INDEX idx_user_info_device ON user_info(device_id);
```

### 6.2 ai_memory 表

```sql
CREATE TABLE ai_memory (
  id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  user_id BIGINT,                    -- 登录用户 ID
  device_id VARCHAR(64),            -- 游客设备 ID
  content TEXT,                     -- AI 记忆内容（Markdown）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 约束：用户和设备二选一
ALTER TABLE ai_memory ADD CONSTRAINT ai_memory_owner_check
  CHECK (
    (user_id IS NOT NULL AND device_id IS NULL) OR
    (user_id IS NULL AND device_id IS NOT NULL)
  );

-- 索引：加速查询
CREATE INDEX idx_ai_memory_user ON ai_memory(user_id);
CREATE INDEX idx_ai_memory_device ON ai_memory(device_id);
```

---

## 7. 性能优化

### 7.1 异步处理

所有云端操作都是异步的，不阻塞聊天流程：

```javascript
try {
  await saveAiMemory(updatedMemory);
} catch (error) {
  console.error('同步失败（非致命）:', error);
  // 不影响聊天功能
}
```

### 7.2 防抖与节流

虽然当前实现是每次聊天后都同步，但未来可以考虑：
- **防抖**: 用户连续快速发送多条消息时，合并同步
- **节流**: 最多每 N 秒同步一次

### 7.3 数据压缩

当前实现只保存 AI 回复的前 200 字：

```javascript
const aiPreview = result.content.slice(0, 200) +
                 (result.content.length > 200 ? '...' : '');
```

这可以：
- 减少存储空间
- 提升加载速度
- 保留关键信息

---

## 8. 安全与隐私

### 8.1 数据加密

- ✅ 所有 HTTPS 传输
- ✅ Supabase 数据库加密
- ✅ Service Role Key 仅在后端使用

### 8.2 权限控制

- ✅ 用户只能读写自己的数据
- ✅ 游客数据通过 device_id 隔离
- ✅ 登录用户数据通过 user_id 隔离

### 8.3 数据最小化

- ✅ 只保存必要的对话摘要（前 200 字）
- ✅ 用户主动透露的信息才保存
- ✅ 不保存敏感数据（密码、API Key 等）

---

## 9. 测试指南

### 9.1 功能测试

#### 测试 1: AI 记忆自动同步

**步骤**:
1. 发送一条消息："帮我写个 Python 脚本"
2. 打开设置 → 高级功能 → AI 记忆
3. 应该看到新的对话记录（带时间戳）

**预期结果**: ✅ 对话记录自动保存到云端

#### 测试 2: 用户信息自动提取

**步骤**:
1. 发送消息："我叫晓力，是产品经理"
2. 打开设置 → 高级功能 → 用户信息
3. 应该看到刚才发送的内容

**预期结果**: ✅ 个人信息自动保存到云端

#### 测试 3: 跨设备同步

**步骤**:
1. 设备 A：聊天并透露信息
2. 设备 B：打开设置 → 高级功能
3. 检查是否能看到设备 A 的数据

**预期结果**: ✅ 数据自动同步

### 9.2 边界测试

#### 测试 1: 重复内容

**步骤**:
1. 发送："我叫晓力"
2. 再次发送："我叫晓力"
3. 检查云端数据

**预期结果**: ✅ 只保存一次（去重机制）

#### 测试 2: 网络异常

**步骤**:
1. 断网
2. 发送消息
3. 检查是否能正常聊天

**预期结果**: ✅ 聊天功能正常（同步失败但不影响聊天）

#### 测试 3: 空数据

**步骤**:
1. 新用户（无云端数据）
2. 打开设置 → 高级功能

**预期结果**: ✅ 显示"暂无用户信息"和"暂无 AI 记忆"

---

## 10. 故障排查

### 10.1 同步失败

**症状**: 聊天后云端数据没有更新

**排查步骤**:
1. 检查网络连接
2. 检查控制台日志
3. 检查 Supabase 服务状态
4. 检查 Service Role Key 是否有效

**常见原因**:
- 网络问题
- Supabase 服务异常
- Service Role Key 过期
- 数据库表权限问题

### 10.2 加载缓慢

**症状**: 打开设置时加载很久

**排查步骤**:
1. 检查网络速度
2. 检查数据量大小
3. 考虑分页加载

**解决方案**:
- 添加加载进度提示
- 限制初始加载数量
- 实现虚拟滚动

### 10.3 Markdown 渲染错误

**症状**: 预览时显示异常

**排查步骤**:
1. 检查 Markdown 语法是否正确
2. 检查 MarkdownRenderer 组件
3. 检查 CSS 样式冲突

**解决方案**:
- 修正 Markdown 语法
- 更新 MarkdownRenderer 组件
- 添加 CSS 隔离

---

## 11. 未来优化

### 11.1 智能提取

当前使用关键词匹配，未来可以：
- 使用 NLP 技术提取结构化信息
- 自动生成用户画像
- 智能归纳和分类

### 11.2 冲突解决

当多个设备同时修改时：
- 实现最后写入优先（当前方案）
- 添加冲突检测和合并
- 支持版本历史

### 11.3 隐私保护

- 添加敏感信息过滤
- 支持数据导出和删除
- 添加数据保留期设置

---

## 12. 相关文档

- [02-login-system.md](./02-login-system.md) - 登录系统
- [03-database-design.md](./03-database-design.md) - 数据库设计
- [modal-component-spec.md](./modal-component-spec.md) - 弹窗组件设计规范

---

## 13. 更新日志

### v2.7.8 (2026-01-07)

#### 新增
- ✨ AI 记忆自动同步到云端
- ✨ 用户信息自动提取与保存
- ✨ 设置页面自动加载云端数据
- ✨ Markdown 渲染预览支持

#### 优化
- 🎨 优化用户信息提取算法
- 🎨 添加去重机制
- 🎨 改进错误处理和容错性

---

**最后更新**: 2026-01-07
**文档版本**: 1.0.0
