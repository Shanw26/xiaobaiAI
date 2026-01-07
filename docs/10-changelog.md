# 更新日志

> **说明**: 本文档记录小白AI的所有版本更新和重要变更
> **更新频率**: 每次发布新版本后立即更新
> **当前版本**: v2.7.8

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

#### 技术细节

**新增文件**:
- `src/components/ModalBase.css` - 统一弹窗基础样式
- `src/components/AlertModal.jsx` - 警告弹窗
- `src/components/AlertModal.css` - 警告弹窗样式
- `src/components/ConfirmModal.jsx` - 确认弹窗
- `src/components/ConfirmModal.css` - 确认弹窗样式
- `src/lib/alertService.jsx` - 警告服务（动态导入）
- `docs/modal-component-spec.md` - 弹窗设计规范文档
- `docs/11-cloud-sync-feature.md` - 云端同步功能文档

**修改文件**:
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

#### 已知限制

- 游客模式：10 次免费额度限制
- 登录用户：无限制使用
- AI 记忆：只保存前 200 字（摘要）
- 用户信息：基于关键词匹配（准确率可优化）

#### 相关文档
- [11-cloud-sync-feature.md](./11-cloud-sync-feature.md) - 云端同步功能详细文档
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
