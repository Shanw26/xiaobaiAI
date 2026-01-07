# 更新日志

> **说明**: 本文档记录小白AI的所有版本更新和重要变更
> **更新频率**: 每次发布新版本后立即更新
> **当前版本**: v2.6.8

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
