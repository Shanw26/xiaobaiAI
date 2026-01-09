# 更新日志

> **说明**: 本文档记录小白AI的所有版本更新和重要变更
> **更新频率**: 每次发布新版本后立即更新
> **当前版本**: v2.10.27

---

## 📅 2026-01-09 - v2.10.27 (系统提示词优化)

### ✨ 新功能

**系统提示词优化：工具优先级规则** ⭐
- **问题**: AI 使用 shell 命令而非专用工具（如 `rm -rf ~/.Trash/*` 清空回收站）
- **解决方案**:
  - ✅ 添加 `empty_trash` 专用工具
  - ✅ 新增"工具使用规则"章节到系统提示词
  - ✅ 明确要求 AI 优先使用专用工具
  - ✅ 提供错误示例对比（❌ 错误 vs ✅ 正确）
  - ✅ 支持跨平台（macOS、Windows、Linux）

**技术实现**:
```javascript
// 新增 empty_trash 工具
{
  name: 'empty_trash',
  description: '清空回收站（删除所有已删除的文件）...',
  input_schema: { type: 'object', properties: {} }
}

// 跨平台实现
async function emptyTrash() {
  if (platform === 'darwin') {
    // macOS: 使用 AppleScript
    await execPromise(`osascript -e 'tell application "Finder" to empty trash'`);
  } else if (platform === 'win32') {
    // Windows: 使用 PowerShell
    await execPromise(`powershell ...`);
  } else {
    // Linux: 清空 ~/.local/share/Trash/
    await execPromise('rm -rf ~/.local/share/Trash/*');
  }
}
```

**系统提示词改进**:
```markdown
## 🛠️ 工具使用规则（重要）

你必须优先使用专用工具，而不是执行 shell 命令：

### 1. 文件系统操作
- **清空回收站** → 调用 `empty_trash` 工具（不要用 rm 命令）
- **删除文件** → 调用 `delete_file` 工具
- **移到回收站** → 调用 `move_to_trash_file` 工具
- **创建目录** → 调用 `create_directory` 工具
- **列出目录** → 调用 `list_directory` 工具
- **读取文件** → 调用 `read_file` 工具
- **写入文件** → 调用 `write_file` 工具

### 2. 何时使用 execute_command
只有在以下情况才使用 `execute_command` 工具：
- 查看系统信息（如：ps aux, top, df -h）
- 查看进程列表
- 查看网络状态
- 执行 git 命令
- 其他无法用专用工具完成的操作

### 3. 常见错误示例
❌ 用户说"清空回收站"，你执行：rm -rf ~/.Trash/*
✅ 用户说"清空回收站"，你调用：empty_trash 工具
```

**优势**:
- 🛡️ **跨平台兼容**：工具自动适配不同操作系统
- ⚡ **操作准确**：避免执行错误的命令
- 📊 **结果可追踪**：结构化的返回结果
- 🎯 **用户体验**：操作更安全、可逆

**修改文件**:
- `electron/agent.js` - 添加 `empty_trash` 工具和优化提示词
- `package.json` - 版本号: 2.10.27
- `electron/main.js` - APP_VERSION: 2.10.27
- `src/components/Sidebar.jsx` - 版本号: v2.10.27
- `src/components/SettingsModal.jsx` - 版本号: v2.10.27

**相关文档**:
- [系统提示词与工具优先级](./v2.10.27-系统提示词与工具优先级.md) - 完整实现说明
- [AI 回复规则](./12-ai-reply-rules.md) - AI 行为准则

---

## 📅 2026-01-09 - v2.10.26 (容错机制版本)

### ✨ 新功能

**官方API Key容错机制** ⭐
- **问题**: 如果数据库中官方API Key丢失或未初始化，游客模式无法使用
- **解决方案**:
  - ✅ 添加三级缓存机制：内存缓存 → 数据库 → Supabase
  - ✅ 自动从Supabase重新获取：当数据库中没有API Key时，自动从云端获取
  - ✅ 自动写入数据库：获取成功后自动保存到本地数据库
  - ✅ 防止重复获取：使用 `isFetchingFromSupabase` 标志避免并发请求
  - ✅ 提供重置方法：`resetCache()` 用于强制刷新缓存

**修改文件**:
- `electron/official-config.js` - 添加容错机制
- `package.json` - 版本号: 2.10.26
- `electron/main.js` - APP_VERSION: 2.10.26
- `src/components/Sidebar.jsx` - 版本号: v2.10.26
- `src/components/SettingsModal.jsx` - 版本号: v2.10.26

**相关文档**:
- [官方API Key容错机制详细说明](./v2.10.26-官方API Key容错机制.md)

---

## 📅 2026-01-07 - v2.8.0 (开发版本)

### 🐛 Bug 修复

**修复 1: Service Role Key 配置错误** ⭐
- ❌ **问题**: Service Role Key 错误地使用了 Personal Access Token（`sbp_` 开头）
- ✅ **解决**: 更新为正确的 Service Role Key（JWT 格式，`eyJ` 开头）
- 📍 **影响范围**: 用户信息和 AI 记忆云端存储功能
- 🔧 **修复文件**:
  - `.env` - 第10行：`VITE_SUPABASE_SERVICE_ROLE_KEY`
  - `key.md` - 第59行：`Service Role Key`

**修复 2: WelcomeModal 保存失败** ⭐
- ❌ **问题**: 悬浮框（WelcomeModal）保存用户信息时报错 "Too few parameter values were provided"
- ✅ **解决**: 统一使用云端保存，与设置页面保持一致
- 📍 **影响范围**: 新用户引导流程中的个人信息收集
- 🔧 **修复文件**:
  - `src/components/WelcomeModal.jsx` - 第55-85行：`handleComplete()` 方法

**错误详情**:

```javascript
// 之前（错误 - 本地保存）
const handleComplete = async () => {
  const result = await window.electronAPI.saveUserInfo(formData);
  // ❌ 错误: 使用本地保存 API，参数格式不匹配
};

// 现在（正确 - 云端保存）
const handleComplete = async () => {
  const { saveUserInfo } = await import('../lib/cloudService');

  // 将表单数据转换为 Markdown 格式
  const content = Object.entries(formData)
    .filter(([_, value]) => value.trim() !== '')
    .map(([key, value]) => {
      const labels = {
        name: '姓名',
        occupation: '职业',
        location: '所在地',
        bio: '简介',
        preferences: '偏好'
      };
      return `**${labels[key]}**: ${value}`;
    })
    .join('\n\n');

  const result = await saveUserInfo(content);
  // ✅ 正确: 使用云端保存 API，与 SettingsModal 保持一致
};
```

**根本原因**:
- WelcomeModal 和 SettingsModal 访问同一份数据（用户信息），但使用了**不同的保存方法**
- WelcomeModal 使用 `window.electronAPI.saveUserInfo()`（本地保存）
- SettingsModal 使用 `cloudService.saveUserInfo()`（云端保存）
- 两个入口的数据格式和保存逻辑不一致，导致保存失败

**数据统一方案**:
- ✅ 两个入口都使用 `cloudService.saveUserInfo()` 云端保存
- ✅ 数据格式统一为 Markdown（SettingsModal 已在使用）
- ✅ WelcomeModal 的表单数据转换为 Markdown 后保存
- ✅ 过滤空值，只保存有内容的字段

**数据流程**:

```
悬浮框 (WelcomeModal)
  ↓ 收集表单数据
  ↓ 转换为 Markdown
  ↓ 调用 cloudService.saveUserInfo()
  ↓
  Supabase 云端数据库 (user_info 表)
  ↓
设置页面 (SettingsModal)
  ↓ 调用 cloudService.getUserInfo()
  ↓
  显示同一份数据
```

**数据格式示例**:

输入（表单数据）:
```javascript
{
  name: '晓力',
  occupation: '产品经理',
  location: '北京',
  bio: '我是一个运营出身的产品经理',
  preferences: '喜欢简洁的回复'
}
```

输出（Markdown 格式）:
```markdown
**姓名**: 晓力

**职业**: 产品经理

**所在地**: 北京

**简介**: 我是一个运营出身的产品经理

**偏好**: 喜欢简洁的回复
```

**经验教训**:
1. ⚠️ 同一份数据的多个入口必须使用**统一的保存方法**
2. ⚠️ 不能一个入口用本地保存，另一个用云端保存
3. ✅ 在设计时要明确数据的来源和去向
4. ✅ 多入口访问同一数据时，要保持数据格式一致
5. ✅ 代码审查时要注意数据流向的一致性

**错误详情**:
```bash
# 错误配置（Personal Access Token）
VITE_SUPABASE_SERVICE_ROLE_KEY=sbp_7eb9c71d4c5416a5f776abd29a20334efc49e4cb

# 正确配置（Service Role Key - JWT 格式）
VITE_SUPABASE_SERVICE_ROLE_KEY=REMOVED
```

**症状**:
- HTTP 401 Unauthorized 错误
- 错误信息：`Invalid API key`
- 用户信息和 AI 记忆保存失败

**根本原因**:
- Personal Access Token 和 Service Role Key 格式混淆
- Personal Access Token 用于 Supabase CLI，格式为 `sbp_...`
- Service Role Key 是 JWT Token，格式为 `eyJ...`
- 两种 key 不能互换使用

**获取正确 Key 的方法**:
1. 登录 Supabase Dashboard: https://supabase.com/dashboard/project/cnszooaxwxatezodbbxq/settings/api
2. 找到 **Project API keys** 部分
3. 复制 **service_role** 密钥（JWT 格式，以 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9` 开头）
4. 更新到 `.env` 文件和 `key.md` 文档

**经验教训**:
- ⚠️ Supabase 有多种类型的 Key，用途各不相同，不能混淆
- ⚠️ 配置错误会导致功能失效，但错误信息可能不够明确
- ✅ 在 `key.md` 中记录正确的 Key 格式和获取方法
- ✅ 配置变更后要同时更新代码和文档

---

## 📅 2026-01-07 - v2.7.8

### ✨ 云端数据自动同步系统 ⭐

**核心功能**: AI 记忆和用户信息自动保存到云端，换电脑后自动恢复

#### 新增功能

**1. AI 记忆自动同步**
- ✅ 每次聊天后自动保存对话记录到云端
- ✅ 使用 Markdown 格式记录（时间戳 + 用户消息 + AI 回复）
- ✅ 换电脑后自动加载历史记忆
- ✅ 异步同步，失败不影响聊天功能
- **技术实现**:
  - 位置: `src/App.jsx` - `handleSendMessage()`
  - 保存内容: 对话时间、用户消息、AI 回复（前 200 字）
  - 云端接口: `saveAiMemory()`, `getAiMemory()`
- **数据格式**:
  ```markdown
  ## 对话记录 - 01/07/26, 20:15

  **用户**: 帮我写一个 Python 脚本

  **AI**: 好的，我来帮你写...
  ```

**2. 用户信息智能提取**
- ✅ 自动检测用户消息中的个人信息关键词
- ✅ 支持的类别：姓名、职业、所在地、简介、喜好
- ✅ 自动保存到云端「用户信息」
- ✅ 去重机制：避免重复保存相同内容
- **关键词规则**:
  - 姓名: 我叫、名字是、我是、姓名是...
  - 职业: 工作、职业、从事、职位、公司...
  - 所在地: 我在、住在、位于、城市...
  - 简介: 介绍、简介、关于我...
  - 喜好: 喜欢、爱好、偏好、擅长...

**3. 设置页面自动加载**
- ✅ 打开设置时自动从云端拉取最新数据
- ✅ 并行加载用户信息和 AI 记忆
- ✅ 懒加载优化：只在打开"高级功能"时加载
- **技术实现**:
  - 位置: `src/components/SettingsModal.jsx` - `useEffect()`
  - 加载时机: 打开设置面板时
  - 加载内容: 用户信息 + AI 记忆

**4. Markdown 渲染预览**
- ✅ 用户信息和 AI 记忆支持 Markdown 预览
- ✅ 支持：标题、列表、代码块、引用、粗体、链接
- ✅ 编辑/预览模式切换
- ✅ 优雅的空状态提示
- **技术实现**:
  - 组件: `MarkdownRenderer`
  - 样式: `.markdown-preview` 类
  - 特性: 代码高亮、引用样式、滚动条

#### 优化改进

**弹窗系统优化**
- 🎨 创建 `ModalBase.css` 统一基础样式库
- 🎨 所有弹窗使用统一的绿色主题（`var(--primary)`）
- 🎨 弹窗代码减少 60-80%
- 🎨 统一按钮类名：`.btn-modal.primary`, `.btn-modal.secondary`
- 🎨 统一 z-index 层级体系（1000/2000/9999）
- 📦 新增组件: `AlertModal`, `ConfirmModal`, `alertService.jsx`
- 🐛 修复: `.btn-edit` 按钮位置错误（去重 CSS）
- 🐛 修复: `alertService.js` 扩展名问题（.js → .jsx）

**用户体验改进**
- 📊 登录用户使用次数显示优化
- 🎨 优化编辑按钮样式和位置
- 🐛 修复：系统弹框替换为自定义组件
- 🐛 修复：所有 `alert()` 和 `confirm()` 替换为统一组件

**macOS 兼容性修复** 🔧
- 🔐 **升级到 Apple Developer 正式签名** ⭐
- ✅ 用户可以双击直接打开应用，无需右键→打开
- ✅ 启用 Hardened Runtime，提供更强的安全保护
- 🎯 支持 Intel (x64) 和 Apple Silicon (ARM64) 两个架构
- 🤖 构建时自动签名，无需手动操作
- **证书信息**:
  - 类型: Developer ID Application
  - 名称: Developer ID Application: Beijing Principle Technology Co., Ltd. (666P8DEX39)
  - Team ID: 666P8DEX39
- **技术细节**:
  - `hardenedRuntime: true` - 启用硬运行时
  - `identity: "证书ID"` - 使用正式证书签名
  - `afterPack` 钩子 - 构建后自动执行签名
  - `--options runtime` - 满足 Hardened Runtime 要求

#### 技术细节

**新增文件**:
- `src/components/ModalBase.css` - 统一弹窗基础样式
- `src/components/AlertModal.jsx` - 警告弹窗
- `src/components/AlertModal.css` - 警告弹窗样式
- `src/components/ConfirmModal.jsx` - 确认弹窗
- `src/components/ConfirmModal.css` - 确认弹窗样式
- `src/lib/alertService.jsx` - 警告服务（动态导入）
- `scripts/afterPack.js` - 构建后自动签名脚本（已更新为正式签名）
- `scripts/sign-mac.sh` - 手动签名脚本
- `docs/modal-component-spec.md` - 弹窗设计规范文档
- `docs/11-cloud-sync-feature.md` - 云端同步功能文档
- `docs/12-macos-code-signing.md` - macOS 签名配置完整指南 ⭐

**修改文件**:
- `package.json` - 添加 Apple Developer 正式签名配置
- `scripts/afterPack.js` - 更新为正式证书签名
- `src/App.jsx` - 添加自动同步逻辑
- `src/components/SettingsModal.jsx` - 自动加载 + Markdown 预览
- `src/components/ToastModal.jsx` - 使用 ModalBase.css
- `src/components/GuestLimitModal.jsx` - 使用 ModalBase.css
- `src/components/LoginModal.jsx` - 使用 ModalBase.css
- `src/components/WelcomeModal.jsx` - 使用 ConfirmModal
- `src/components/Sidebar.jsx` - 使用 ConfirmModal
- 所有弹窗组件 - 样式优化

#### 数据库变更

无数据库结构变更（使用现有 `user_info` 和 `ai_memory` 表）

#### 测试状态

- ✅ AI 记忆自动同步
- ✅ 用户信息自动提取
- ✅ 设置页面自动加载
- ✅ Markdown 渲染预览
- ✅ 弹窗样式统一
- ✅ 跨设备数据同步
- ✅ macOS Apple Developer 正式签名（Intel + ARM64）
- ✅ 用户可以双击直接打开应用

#### 已知限制

- 游客模式：10 次免费额度限制
- 登录用户：无限制使用
- AI 记忆：只保存前 200 字（摘要）
- 用户信息：基于关键词匹配（准确率可优化）
- 证书有效期：1年（到期前需续期）

#### 相关文档
- [11-cloud-sync-feature.md](./11-cloud-sync-feature.md) - 云端同步功能详细文档
- [12-macos-code-signing.md](./12-macos-code-signing.md) - macOS 签名配置完整指南 ⭐
- [modal-component-spec.md](./modal-component-spec.md) - 弹窗设计规范

---

## 📅 2026-01-07 - v2.6.8

### ⚡ 性能优化

**用户信息和AI记忆懒加载** ⭐
- **改进**: 从自动加载改为按需加载，提升性能
- **原因**: 打开设置面板时不一定需要编辑用户信息和记忆
- **解决方案**:
  - 移除 `useEffect` 中的自动加载逻辑
  - 添加 `isLoadingUserInfo` 和 `isLoadingAiMemory` 状态
  - 添加 `handleEditUserInfo()` 和 `handleEditAiMemory()` 函数
  - 初始状态只显示"编辑"按钮，点击时才从云端加载数据
- **用户体验改进**:
  - 打开设置面板更快（无需等待数据库请求）
  - 减少不必要的网络请求
  - 按需加载，节省资源
- **修改文件**:
  - `src/components/SettingsModal.jsx` - 添加懒加载逻辑
- **测试状态**: 待测试

---

## 📅 2026-01-07 - v2.6.7

### 🐛 Bug 修复

**修复导入路径错误** 🔧
- **问题**: 应用无法加载，报错 `Failed to resolve import "./lib/cloudService"`
- **影响**: 应用启动失败，无法使用
- **原因**:
  - `SettingsModal.jsx` 位于 `src/components/` 目录
  - `cloudService.js` 位于 `src/lib/` 目录
  - 导入路径错误：`./lib/cloudService` → 应该是 `../lib/cloudService`
- **解决方案**: 修复3处导入路径（第58、59、212、275行）
- **修改文件**:
  - `src/components/SettingsModal.jsx` - 修复导入路径
- **测试结果**: ✅ 已通过

---

## 📅 2026-01-07 - v2.6.6

### 🐛 Bug 修复

**修复 EPIPE 错误** ⭐
- **问题**: Electron 主进程频繁报错 `Error: write EPIPE`
- **影响**: 应用运行时出现大量错误日志，影响稳定性
- **原因**: 主进程中使用 `console.log` 输出日志，当 stdout 流不可写时导致 EPIPE 错误
- **解决方案**:
  - 在 `electron/main.js` 中添加 `safeLog()` 和 `safeError()` 函数
  - 检查流可写性后再输出日志
  - 替换所有 `console.log` 为 `safeLog`（56处）
  - 替换所有 `console.error` 为 `safeError`（8处）
- **修改文件**:
  - `electron/main.js` - 添加安全日志函数，替换所有 console 调用
  - `electron/database.js` - 已有安全日志函数（v2.6.5）
- **测试结果**: ✅ 已通过

**相关提交**: 修复 EPIPE 错误

---

## 📅 2026-01-07 - v2.6.5

### 🔧 技术改进

**EPIPE 错误修复（部分）**
- **问题**: `electron/database.js:279` 报错 `Error: write EPIPE`
- **解决方案**:
  - 添加 `safeLog()` 和 `safeError()` 函数
  - 替换 database.js 中的 console 调用（10处）
- **状态**: ✅ 完成
- **注意**: `electron/main.js` 仍有类似问题，待 v2.6.6 完全修复

---

## 📅 2026-01-07 - v2.6.4 - v2.6.3

### 🔄 登录系统完全重构 ⭐

**核心变更**: 完全放弃 Supabase Auth，使用纯数据库管理

**变更原因**:
- 小白AI只有验证码登录，**没有密码**
- 用户只有手机号，**没有email**
- Supabase Auth 强制要求 email + password，不匹配产品需求

**实施方案**:
- ✅ 使用 `user_profiles` 表管理用户（仅存储 phone）
- ✅ 创建 `supabaseAdmin` 客户端（使用 service role key）
- ✅ 所有登录操作使用 `supabaseAdmin` 绕过 RLS
- ✅ 使用 localStorage 管理用户状态（不依赖 Supabase Auth session）

**修改文件**:
- `src/lib/supabaseClient.js` - 添加 supabaseAdmin 客户端
- `src/lib/cloudService.js` - 重写 `signInWithPhone()` 方法
  - Step 1: 验证验证码（使用 supabaseAdmin）
  - Step 2: 查询或创建用户（使用 supabaseAdmin）
  - Step 3: 标记验证码已使用（使用 supabaseAdmin）
  - Step 4: 返回用户信息

**测试结果**: ✅ 已通过

**废弃方案**: Supabase Auth（不匹配产品需求）

---

### 📚 文档模块化重构

**变更**: 将单一的大文档拆分为多个模块化小文档

**原因**: 方便维护和查找，避免单文件过大

**文档结构**:
```
docs/
├── README.md (导航)
├── 01-快速入门.md
├── 02-登录系统.md
├── 03-数据库设计.md
├── 04-设备ID与游客模式.md
├── 05-文件路径点击.md
├── 06-系统架构.md
├── 07-部署与配置.md
├── 08-开发规范.md
└── 09-更新日志.md
```

**优势**:
- 每个文档聚焦一个主题
- 修改某个功能只需更新对应文档
- 通过 README 快速定位

---

## 📅 2026-01-06 - v2.5.0 - v2.5.6

### ✨ v2.5.0 - 游客模式云端存储

**核心功能**: 游客数据也保存到云端，登录后自动合并

**技术实现**:
- 设备ID生成：基于机器特征的 MD5 哈希
- 数据库表 `conversations` 添加 `device_id` 字段
- `user_id` 可为 NULL（允许游客数据）
- 软合并策略：登录后更新 `user_id` 字段

**数据库函数**: `merge_guest_conversations_to_user(p_device_id, p_user_id)`

**问题**: RLS 策略导致无限递归 (42P17)
**解决**: 暂时完全禁用 RLS

**相关迁移**:
- `003_add_device_id.sql`
- `005_fix_rls_recursion.sql`
- `006_allow_null_user_id.sql`

---

### 🐛 v2.5.2 - 修复输入法Bug

**问题**: 中文输入法输入过程中，按回车会发送消息

**解决方案**: 检查 `e.nativeEvent.isComposing`

```javascript
const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
    e.preventDefault();
    handleSendMessage();
  }
};
```

---

### 🎨 v2.5.3 - v2.5.6 - Dock 图标优化

**变更**:
- v2.5.3: 优化图标设计，眼睛增大 37.5%
- v2.5.4: 改为方形 Dock 图标
- v2.5.5: 绿色占比优化至 60.9%
- v2.5.6: 绿色背景完全填满 1024×1024

**状态**: macOS 系统限制，效果有限

---

## 📅 2026-01-06 - v2.3.0 - v2.4.2

### ✨ v2.3.0 - 在线自动更新系统

**功能**:
- 集成 `electron-updater`
- GitHub Release 作为更新源
- 支持普通更新和强制更新
- 启动时 + 每24小时自动检查

**发布平台**: GitHub Releases

---

### 🚀 v2.3.1 - 后台静默下载 ⭐

**核心改进**: 用户点击"立即更新"后，后台下载，不阻塞使用

**流程**:
```
点击更新 → 弹窗关闭 → 后台下载 → 下载完成 → 弹窗通知 → 用户选择重启
```

**优势**: 完全不中断用户使用

---

### 🔐 v2.4.0 - 云端登录系统

**功能**:
- 手机号 + 验证码登录
- Supabase 集成
- 阿里云短信服务
- 对话历史云端同步

**方案**: 使用 Supabase Auth + Email/Password 混合方案（后续被废弃）

---

### 🐛 v2.4.2 - 修复登录密码Bug

**问题**: 验证码作为密码，每次登录密码不同

**解决方案**: 使用固定密码 `xiaobai_{phone}_auth_password`

---

## 📅 2026-01-05 - v1.8.2 - v2.0.0

### ✨ v2.0.0 - 版本检查机制

**功能**:
- 版本号管理
- 大版本自动清空数据
- 悬浮球引导

---

## 📅 2026-01-05 - v1.0.0

### 🎉 首次发布

**功能**: 一天内完成开发
- Claude Agent SDK 集成
- 基础对话功能
- 文件操作

---

## 📊 版本统计

**总版本数**: 15+
**开发时间**: 2026-01-05 至今
**主要迭代**:
- v1.x.x: 基础功能开发
- v2.0.x: 版本管理和自动更新
- v2.3.x: 云端登录系统
- v2.4.x: 登录系统优化
- v2.5.x: 游客模式云端存储
- v2.6.x: 登录系统重构 + 稳定性优化

---

## 🔮 未来计划

### v2.7.0（计划中）
- [ ] 重新设计 RLS 安全策略
- [ ] 性能优化（对话历史加载）
- [ ] 自动化测试

### v3.0.0（远期规划）
- [ ] 多模型支持
- [ ] 插件系统
- [ ] 团队协作功能

---

## 📝 版本号规则

**语义化版本** (Semantic Versioning):
- **主版本 (Major)**: 重大架构变更，不兼容的修改 (例: 2.0.0 → 3.0.0)
- **次版本 (Minor)**: 新功能，向后兼容 (例: 2.6.3 → 2.7.0)
- **修订号 (Patch)**: Bug 修复、小的改进 (例: 2.6.3 → 2.6.4)

---

**最后更新**: 2026-01-07
**维护者**: Claude Code + 晓力
**GitHub**: https://github.com/Shanw26/xiaobaiAI
