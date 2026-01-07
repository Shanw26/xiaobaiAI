# 小白AI 项目 Memory

## 🤖 AI指令区（AI处理小白AI项目时必读）

**当你读到这个文档时，请按以下顺序执行**：

1. **读取项目开发规范**（必须）⭐：
   - 路径：`Downloads/小白AI/DEVELOPMENT_GUIDELINES.md`
   - 内容：核心原则、开发规范、产品约束、代码质量标准

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

**执行顺序**：读开发规范 → 读记忆 → 读技术文档 → 开始工作

---

> **说明**: 本文件记录小白AI项目的所有重要更新和调整
> **更新频率**: 每次重大变更后立即更新
> **查阅对象**: 所有参与项目的开发者和AI助手

---

## 📅 2026-01-07 (v2.7.3)

### 登录系统完整修复 🔐✅

**核心变更**: 修复登录验证码保存和用户创建的两个关键问题

**问题背景**:
- 用户反馈：登录时提示"Invalid API key"
- 用户反馈：提交验证码后提示"创建用户失败"
- 影响范围：登录功能完全无法使用
- 严重程度：🔴 高（阻塞性问题）

**问题1: Service Role Key 格式错误**

**错误信息**:
```json
{
  "message": "Invalid API key",
  "hint": "Double check your Supabase `anon` or `service_role` API key."
}
```

**根本原因**:
- `.env` 文件中的 `VITE_SUPABASE_SERVICE_ROLE_KEY` 使用了错误的格式
- 之前：`sbp_7eb9c71d4c5416a5f776abd29a20334efc49e4cb`（只是 ID 引用）
- 正确：`eyJhbGci...`（完整的 JWT token）

**修复方案**:
1. 从 Supabase Dashboard 获取完整的 Service Role Key
   - 访问：https://supabase.com/dashboard/project/cnszooaxwxatezodbbxq/settings/api
   - 找到 "Project API keys" → `service_role` 密钥
   - 点击 "Reveal" 复制完整 token（约300-400字符）

2. 更新 `.env` 文件
   ```bash
   # 第12行
   VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**验证结果**:
- ✅ 短信成功发送到手机（Edge Function 工作正常）
- ✅ 验证码成功保存到数据库

---

**问题2: 用户创建缺少必需字段**

**错误信息**:
```
null value in column "id" of relation "user_profiles" violates not-null constraint
```

**根本原因**:
- `user_profiles` 表结构要求 `id` 和 `user_id` 字段
- 之前代码只提供了 `phone` 和 `created_at`

**表结构**（`supabase/migrations/002_fix_user_profiles.sql`）:
```sql
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,          -- ❌ 缺失
  user_id TEXT NOT NULL UNIQUE, -- ❌ 缺失
  phone TEXT NOT NULL,          -- ✅ 已提供
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**修复方案**:
使用 `crypto.randomUUID()` 生成唯一ID

```javascript
// src/lib/cloudService.js - signInWithPhone() 函数

if (profileError || !profile) {
  // 生成用户ID（使用 UUID）
  const userId = crypto.randomUUID();

  // 创建新用户
  const { data: newProfile, error: createError } = await supabaseAdmin
    .from('user_profiles')
    .insert([{
      id: userId,              // ✅ 新增
      user_id: userId,         // ✅ 新增
      phone: phone,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();
}
```

**修改文件**:
- `src/lib/cloudService.js` - 第154-182行
  - 修改 `signInWithPhone()` 函数中的用户创建逻辑
  - 添加 `userId = crypto.randomUUID()` 生成唯一ID
  - 在 `insert()` 中添加 `id` 和 `user_id` 字段

**测试结果**: ✅ 完全通过
- ✅ 发送验证码 → 收到短信
- ✅ 保存验证码 → 数据库成功
- ✅ 验证码登录 → 用户创建成功
- ✅ 登录成功 → 进入应用界面

**技术总结**:
| 问题 | 原因 | 解决方案 | 状态 |
|------|------|----------|------|
| Invalid API key | Service Role Key 格式错误 | 使用完整 JWT token | ✅ 已修复 |
| 创建用户失败 | 缺少 id 和 user_id 字段 | 使用 crypto.randomUUID() | ✅ 已修复 |

**重要经验**:
1. **环境变量格式很重要**: Service Role Key 必须是完整的 JWT token，不能只是 ID 引用
2. **表结构必须严格遵守**: 缺少任何 NOT NULL 字段都会导致插入失败
3. **UUID 生成**: 使用 `crypto.randomUUID()` 比自定义算法更可靠

**相关文档**:
- `docs/02-login-system.md` - 登录系统设计
- `docs/03-database-design.md` - 数据库表结构
- `supabase/migrations/002_fix_user_profiles.sql` - user_profiles 表定义

**版本号更新**:
- `package.json` - 版本号: 2.7.3
- `electron/main.js` - APP_VERSION: 2.7.3
- `src/components/Sidebar.jsx` - 版本号: v2.7.3
- `src/components/SettingsModal.jsx` - 版本号: v2.7.3

---

## 📅 2026-01-07 (v2.7.2)

### 文件路径点击功能 🔗✅

**核心变更**: 修复并完善 AI 回答中文件路径的可点击功能

**问题背景**:
- 之前的实现：路径可以点击，但存在渲染问题
- 用户反馈：路径"一转眼就变成了红色"
- 根本原因：路径被反引号包裹后，被识别为行内代码（inlineCode），而非普通文本（text）

**技术分析**:
```
Markdown: "文件在 `/Users/aaa` 目录"
          ↓
解析为 AST: inlineCode 节点
          ↓
之前的 remark 插件：只处理 text 节点 ❌
          ↓
渲染为：红色行内代码 ❌
```

**实施方案**:
- ✅ 优化路径识别正则：`/(\/|~\/)[^\s<>"'`\n]+/g`
  - 支持空格、中文、特殊字符
  - 支持绝对路径、相对路径、用户目录（~）
- ✅ 新增 `cleanPath()` 函数：自动清理路径末尾的标点符号
- ✅ 扩展 remark 插件：同时处理 `inlineCode` 和 `text` 两种节点
  - 在 AST 阶段将路径转换为 `link` 节点
  - 避免 `code` 组件和 `a` 组件的渲染冲突
- ✅ 移除 code 组件中的重复路径检测逻辑

**修改文件**:
- `src/components/MarkdownRenderer.jsx`
  - 优化 `FILE_PATH_PATTERN` 正则表达式
  - 新增 `cleanPath()` 函数
  - 扩展 `remarkFilePathLinks()` 插件：处理 inlineCode 节点
  - 简化 `code` 组件：移除重复的路径检测逻辑
  - 保留 `a` 组件：处理路径点击事件

**功能特点**:
| 特性 | 说明 |
|------|------|
| 🎨 样式 | 绿色下划线，悬停时背景变绿 |
| 🌐 格式支持 | 绝对路径、相对路径、用户目录（~） |
| 🔤 字符支持 | 中文、空格、括号、常见特殊字符 |
| 🧹 智能清理 | 自动移除路径末尾的标点符号 |
| 📂 打开方式 | 使用系统默认程序（Finder）打开 |
| ✨ 双格式支持 | 纯文本和反引号包裹都能正确识别 |

**支持示例**:
- ✅ `/Users/xiaolin/Downloads/小白AI/`（中文路径）
- ✅ `/Users/name/My Documents/`（带空格）
- ✅ `~/Desktop/文件.txt`（用户目录）
- ✅ `/path/to/file(1).txt`（带括号）
- ✅ `文件在 /Users/aaa/。`（自动清理末尾标点）

**代码统计**:
- 修改文件：1个
- 新增函数：1个（cleanPath）
- 扩展插件：remarkFilePathLinks（inlineCode 节点处理）
- 删除代码：约15行（移除 code 组件重复逻辑）

**测试状态**: ✅ 已通过（用户确认成功）

**重要经验**:
1. **AST 阶段处理优于渲染阶段**：在 remark 插件中转换节点，避免组件渲染冲突
2. **节点类型要全面覆盖**：inlineCode 和 text 都需要处理
3. **正则表达式要灵活**：支持中文、空格、特殊字符
4. **用户体验细节**：自动清理标点符号，提升识别准确率
5. **调试日志很重要**：console.log 帮助快速定位问题

---

## 📅 2026-01-07 (v2.7.1)

### 移除用户信息和AI记忆编辑功能 ❌

**核心变更**: 移除设置面板中的用户信息和AI记忆编辑功能

**原因**:
- 用户反馈：这个功能太复杂，不符合"简单原则"
- 产品定位：小白AI应该专注于核心对话功能，不需要复杂的记忆管理

**实施方案**:
- ✅ 移除"高级功能"分类
- ✅ 删除用户信息和AI记忆的编辑UI
- ✅ 删除相关的state和函数
- ✅ 清理CSS样式
- ✅ 保留应用数据目录和Token统计（移到基础配置）

**修改文件**:
- `src/components/SettingsModal.jsx`
  - 删除 state: userInfo, aiMemory, isEditingUserInfo, isEditingAiMemory, isLoadingUserInfo, isLoadingAiMemory
  - 删除函数: handleEditUserInfo, handleEditAiMemory
  - 删除分类: 'advanced'（从 SETTINGS_CATEGORIES）
  - 删除渲染函数: renderAdvancedSettings
  - 合并基础配置：将应用数据目录和Token统计移到 renderBasicSettings
- `src/components/SettingsModal.css`
  - 删除样式: .form-group.*, .btn-edit, .form-textarea, .form-actions
  - 共删除约100行CSS代码
- `package.json` - 版本号: 2.7.1
- `electron/main.js` - APP_VERSION: 2.7.1
- `src/components/Sidebar.jsx` - 版本号: v2.7.1
- `src/components/SettingsModal.jsx` - 版本号: v2.7.1

**设置面板简化对比**:

| 分类 | v2.7.0 | v2.7.1 |
|------|--------|--------|
| 基础配置 | API Key、模型选择 | API Key、模型选择、应用数据目录、Token统计 |
| 高级功能 | 用户信息、AI记忆、数据目录、Token统计 | ❌ 已移除 |
| 关于 | 版本信息、退出登录 | （保持不变） |

**云端数据库表**:
- ✅ `user_info` 表保留（虽然前端移除了编辑功能，但表已创建）
- ✅ `ai_memory` 表保留（未来可能需要）
- ⚠️ 这些表暂时不会被使用，但保留以备后用

**代码统计**:
- 删除代码行数：约200行
- CSS清理：约100行
- 简化效果：设置面板从3个分类减少到2个

**测试状态**: ✅ 完成

**重要经验**:
1. **简单原则**: 功能越简单越好，不符合核心需求的应该果断移除
2. **用户反馈优先**: 用户觉得复杂就是复杂，不需要解释
3. **数据保留**: 虽然移除功能，但数据库表可以保留，以备将来需要

---

## 📅 2026-01-07 (v2.7.0)

### 用户信息和AI记忆云端存储 + UI简化 🎨☁️

**核心变更**: 用户信息和AI记忆保存到Supabase云端，UI改为极简风格

**原因**:
- 用户反馈：UI太复杂，希望极简
- 产品定位：小白AI是"云端优先"架构，所有数据应保存在云端
- 修复bug：之前保存失败是因为Supabase缺少这两个表

**实施方案**:
- ✅ UI极简化（透明背景、简单边框、小圆角）
- ✅ 恢复云端保存（使用 cloudService.js）
- ✅ 创建Supabase数据库迁移文件
- ✅ 应用数据库迁移到云端

**数据库迁移**:

| 表名 | 用途 | 字段 |
|------|------|------|
| `user_info` | 用户个人信息 | id, user_id, device_id, content, created_at, updated_at |
| `ai_memory` | AI对话记忆 | id, user_id, device_id, content, created_at, updated_at |

**迁移文件**: `supabase/migrations/20260107_add_user_info_and_memory.sql`

**执行方式**（通过Supabase Dashboard）:
1. 打开 https://cnszooaxwxatezodbbxq.supabase.co
2. SQL Editor → New Query
3. 粘贴迁移SQL并执行
4. 验证表创建成功

**修改文件**:
- `src/components/SettingsModal.jsx`
  - 恢复使用 cloudService.js（云端保存）
  - `getUserInfo()`, `saveUserInfo()`, `getAiMemory()`, `saveAiMemory()`
  - UI简化：移除复杂样式，使用极简设计
- `src/components/SettingsModal.css`
  - 移除渐变背景、复杂动画
  - 简化边框、圆角、间距
  - 极简按钮样式（透明背景）
- `应用用户信息和AI记忆表迁移.md` - 迁移操作指南（新建）
- `package.json` - 版本号: 2.7.0
- `electron/main.js` - APP_VERSION: 2.7.0
- `src/components/Sidebar.jsx` - 版本号: v2.7.0
- `src/components/SettingsModal.jsx` - 版本号: v2.7.0

**UI简化对比**:

| 元素 | v2.7.0（复杂版） | v2.7.0（极简版） |
|------|----------------|----------------|
| 容器背景 | 渐变灰色 (#fafafa→#f8f8f8) | 透明 |
| 容器边框 | 1.5px 圆角边框 (16px) | 无 |
| 按钮样式 | 白色背景+图标+阴影 | 透明背景+简单边框 |
| 圆角 | 12-16px | 6-8px |
| 动画 | 复杂hover效果 | 简单过渡 |

**数据存储策略**:
- **登录用户**: 保存到 `user_id` 字段（跨设备同步）
- **游客模式**: 保存到 `device_id` 字段（当前设备）
- **唯一性**: 一个用户/设备只有一条记录（UNIQUE约束）

**Bug修复**:
- ❌ 之前：错误地使用本地数据库保存
- ✅ 现在：正确保存到Supabase云端
- ❌ 之前：Supabase缺少这两个表导致保存失败
- ✅ 现在：已通过迁移创建表

**测试状态**: ✅ 已通过（用户已执行迁移）

**重要经验**:
1. **产品定位优先**: 小白AI是云端优先架构，不能随意改为本地存储
2. **数据库变更必须留档**: 每次表结构变更都要记录迁移文件和执行方式
3. **用户反馈很重要**: 极简比复杂更符合"简单原则"

---

## 📅 2026-01-07 (v2.6.9)

### 数据库安全修复（方案A - 快速修复）🔒

**问题**: 发现严重安全漏洞
- ⚠️ Service Role Key 硬编码在前端代码中
- ⚠️ RLS 完全禁用（v2.5.0 遗留问题）
- ⚠️ 任何人都可以访问所有数据

**实施方案**（方案A - 快速修复）:
- ✅ 创建环境变量配置（`.env`, `.env.example`）
- ✅ 更新 `supabaseClient.js` 使用环境变量
- ✅ 创建 RLS 迁移文件（`20260107_enable_rls_policies.sql`）
- ✅ 启用所有表的 RLS 策略
- ✅ 创建应用指南（`RLS_FIX_INSTRUCTIONS.md`）

**修改文件**:
- `.env` - 环境变量（已添加到 .gitignore）
- `.env.example` - 环境变量模板
- `src/lib/supabaseClient.js` - 使用环境变量读取密钥
- `supabase/migrations/20260107_enable_rls_policies.sql` - RLS 策略
- `supabase/RLS_FIX_INSTRUCTIONS.md` - 应用指南

**安全改进**:
- **之前**: 密钥硬编码在代码中
- **现在**: 密钥存储在 .env 文件中
- **之前**: RLS 完全禁用
- **现在**: RLS 已启用，提供基础安全层

**已知限制**:
- ⚠️ 前端仍在使用 `supabaseAdmin`（会绕过 RLS）
- ⚠️ 需要实施方案B或C才能彻底解决

**测试结果**: ⏳ 待应用迁移到数据库后测试

**相关文档**: `supabase/RLS_FIX_INSTRUCTIONS.md`

---

### ⚠️ 已知问题：登录验证码验证失败

**问题描述**:
- 用户反馈：登录时提示"验证码无效或已过期"
- 影响范围：登录功能无法正常使用
- 严重程度：🔴 高（阻塞性问题）

**可能原因**:
1. **Edge Function 配置问题**
   - Supabase Edge Function (`send-sms`) 未正确配置
   - 阿里云短信服务密钥未设置或已过期
   - Edge Function 返回错误，导致验证码未保存到数据库

2. **数据库查询问题**
   - 验证码表中没有对应记录
   - 验证码已过期（5分钟有效期）
   - 验证码已被使用（`used: true`）

3. **时区问题**
   - `expires_at` 时间比较可能存在时区差异
   - 数据库时间与应用时间不一致

**调试步骤**:
1. 检查浏览器控制台日志（`F12` → Console）
2. 检查 Supabase Dashboard → Edge Functions → Logs
3. 查询 `verification_codes` 表，确认验证码是否存在：
   ```sql
   SELECT * FROM verification_codes
   WHERE phone = '你的手机号'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
4. 检查 Supabase Dashboard → Table Editor → `verification_codes`

**临时解决方案**（开发环境）:
- 修改 `sendVerificationCode()` 在控制台显示验证码
- 修改第85行：`return { success: true, code };` （返回验证码）

**待办事项**:
- [ ] 调试 Edge Function 配置
- [ ] 验证数据库查询逻辑
- [ ] 测试完整的登录流程
- [ ] 如果是配置问题，创建配置指南文档

**相关文件**:
- `src/lib/cloudService.js` - `sendVerificationCode()` 和 `signInWithPhone()` 函数
- `supabase/functions/send-sms/` - Edge Function（需要确认是否存在）

---

### 敏感信息管理优化 🔑

**核心变更**: 统一敏感信息管理，支持多电脑开发

**原因**:
- 之前：每个项目单独维护 `key.md`，容易遗漏和重复
- 之前：路径包含用户名，不支持多电脑
- 目标：集中管理，统一路径，多电脑通用

**实施方案**:
- ✅ 创建全局 `key.md` 文件：`~/Downloads/同步空间/Claude code/key.md`
- ✅ 按项目分类管理敏感信息（小白AI、芦笋AI等）
- ✅ 删除项目本地的 `key.md` 文件
- ✅ 更新所有引用路径为通用格式（使用 `~`）
- ✅ 更新开发规范中的路径说明

**修改文件**:
- `~/Downloads/同步空间/Claude code/key.md` - 全局敏感信息文件（新建）
- `/Users/shawn/Downloads/小白AI/key.md` - 项目key.md（已删除）
- `DEVELOPMENT_GUIDELINES.md` - 更新路径引用（3处）
  - 第468行：记录位置
  - 第506行：安全原则
  - 第961行：快速参考
- `docs/08-development-guidelines.md` - 更新路径引用（3处）
  - 第468行：记录位置
  - 第506行：安全原则
  - 第961行：快速参考

**路径改进**:
- **之前**: `/Users/shawn/Downloads/同步空间/Claude code/key.md`
  - ❌ 包含用户名
  - ❌ 只能在 shawn 电脑使用
- **现在**: `~/Downloads/同步空间/Claude code/key.md`
  - ✅ 使用 `~` 符号
  - ✅ 自动展开为当前用户home目录
  - ✅ 支持多电脑、多用户

**全局key.md结构**:
```markdown
# 敏感信息记录

## 🔑 通用密钥
- GitHub Token

## 🤖 小白AI项目
- Supabase配置
- 阿里云短信服务

## 🎋 芦笋AI项目
- （待添加）
```

**优势**:
- ✅ 集中管理，不会遗漏
- ✅ 按项目分类，清晰明了
- ✅ 多电脑通用，路径一致
- ✅ 方便查找和维护

**使用方式**:
1. 查看密钥：打开 `~/Downloads/同步空间/Claude code/key.md`
2. 添加新密钥：在对应项目分类下添加
3. 多电脑同步：通过 iCloud、Git（私有仓库）等同步全局文件

**测试状态**: ✅ 完成

---

## 📅 2026-01-07 (v2.6.8)

### 用户信息和AI记忆懒加载优化 ⭐

**核心变更**: 从自动加载改为按需加载，提升性能和用户体验

**原因**:
- 之前：打开设置面板时自动从云端数据库加载用户信息和AI记忆
- 问题：即使用户不需要编辑也会加载数据，浪费资源
- 目标：优化性能，按需加载数据

**实施方案**:
- ✅ 移除 `useEffect` 中的自动加载逻辑
- ✅ 添加加载状态管理（`isLoadingUserInfo`, `isLoadingAiMemory`）
- ✅ 添加按需加载函数（`handleEditUserInfo`, `handleEditAiMemory`）
- ✅ 优化UI展示：初始只显示"编辑"按钮
- ✅ 版本号更新: 2.6.7 → 2.6.8

**修改文件**:
- `src/components/SettingsModal.jsx`
  - 添加 loading 状态（第40-41行）
  - 移除自动加载用户信息和AI记忆的代码
  - 添加 `handleEditUserInfo()` 函数（第92-108行）
  - 添加 `handleEditAiMemory()` 函数（第111-128行）
  - 修改用户信息UI（第204-254行）
    - 初始状态：只显示"编辑"按钮
    - 加载中：显示"加载中..."并禁用按钮
    - 编辑模式：显示 textarea 编辑框
  - 修改AI记忆UI（第265-319行）- 同样的懒加载逻辑

**用户体验改进**:
- **之前**: 打开设置 → 自动加载用户信息和记忆（可能不需要）
- **现在**: 打开设置 → 只显示"编辑"按钮 → 点击时才加载
- **优势**:
  - 减少不必要的数据库请求
  - 打开设置面板更快
  - 按需加载，节省资源

**测试状态**: 待测试

---

## 📅 2026-01-07 (v2.6.7)

### 修复导入路径错误 🔧

**问题**: 应用无法加载，报错 `Failed to resolve import "./lib/cloudService"`

**原因**:
- `SettingsModal.jsx` 位于 `src/components/` 目录
- `cloudService.js` 位于 `src/lib/` 目录
- 导入路径错误：`./lib/cloudService` → 应该是 `../lib/cloudService`

**解决方案**:
- ✅ 修复3处导入路径（第58、59、212、275行）
- ✅ 版本号更新: 2.6.6 → 2.6.7

**修改文件**:
- `src/components/SettingsModal.jsx`
  - 第58行：`import('./lib/cloudService')` → `import('../lib/cloudService')`
  - 第59行：`import('./lib/cloudService')` → `import('../lib/cloudService')`
  - 第212行：`import('./lib/cloudService')` → `import('../lib/cloudService')`
  - 第275行：`import('./lib/cloudService')` → `import('../lib/cloudService')`
- `package.json` - 版本号: 2.6.7
- `electron/main.js` - APP_VERSION: 2.6.7
- `src/components/Sidebar.jsx` - 版本号: v2.6.7
- `src/components/SettingsModal.jsx` - 版本号: v2.6.7

**测试结果**: ✅ 修复成功，应用正常运行

---

## 📅 2026-01-07 (v2.6.6)

### 用户信息和AI记忆数据库化 ⭐

**核心变更**: 用户信息和AI记忆从文件存储改为数据库存储，支持在线编辑

**原因**:
- 之前：用户信息和记忆存储为本地文件（`user-info.md`, `memory.md`）
- 问题：需要打开文件编辑，操作复杂
- 目标：简化操作，直接在设置中编辑

**实施方案**:
- ✅ 数据库新增 `user_info` 和 `ai_memory` 表
- ✅ 添加数据库操作函数（`getUserInfo`, `saveUserInfo`, `getAiMemory`, `saveAiMemory`）
- ✅ 修改 IPC handlers（从返回路径改为返回内容）
- ✅ 修改前端组件（添加编辑/保存功能）
- ✅ 版本号更新: 2.6.5 → 2.6.6

**数据库设计**:
```sql
-- 用户信息表
CREATE TABLE user_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI记忆表
CREATE TABLE ai_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**修改文件**:
- `electron/database.js`
  - 添加 `user_info` 和 `ai_memory` 表创建（第106-124行）
  - 添加 `getUserInfo()` / `saveUserInfo()` / `getAiMemory()` / `saveAiMemory()` 函数
  - 提供默认模板（首次访问时使用）
- `electron/main.js`
  - 替换 `get-user-info-file-path` → `get-user-info`（返回内容而非路径）
  - 替换 `get-memory-file-path` → `get-ai-memory`（返回内容而非路径）
  - 添加 `save-user-info-content` 和 `save-ai-memory-content` handlers
- `electron/preload.js`
  - 更新暴露的 API（`getUserInfo`, `saveUserInfo`, `getAiMemory`, `saveAiMemory`）
- `src/components/SettingsModal.jsx`
  - 修改状态管理（存储内容而非路径）
  - 添加编辑状态（`isEditingUserInfo`, `isEditingAiMemory`）
  - 修改渲染逻辑（显示文本区域 + 编辑按钮）
  - 添加保存功能（调用新 API 保存到数据库）
- `src/components/SettingsModal.css`
  - 添加 `.memory-content` 样式（只读显示）
  - 添加 `.form-textarea` 样式（可编辑文本框）
  - 添加 `.form-actions` 样式（按钮组）

**用户体验改进**:
- **之前**: 打开设置 → 显示文件路径 → 点击"打开" → 在编辑器中编辑 → 保存文件
- **现在**: 打开设置 → 显示内容 → 点击"编辑" → 在应用内编辑 → 点击"保存"
- **优势**: 操作更简单，无需离开应用

**默认模板**:
```markdown
# 用户信息
## 基本信息
- 姓名：
- 职业：
- 兴趣爱好：

# AI 记忆
## 对话历史记录
- 重要对话内容
- 用户偏好
- 常见问题
```

**测试结果**: 待测试

---

## 📅 2026-01-07 (v2.6.5)

### 修复 EPIPE 错误 ⭐

**问题**: Electron 主进程频繁报错 `Error: write EPIPE`
- 错误位置: `electron/database.js:279` - `cleanExpiredCodes()` 函数
- 错误原因: 主进程中使用 `console.log` 输出日志，当 stdout 流不可写时导致 EPIPE 错误

**解决方案**:
- ✅ 添加 `safeLog()` 和 `safeError()` 函数，检查流可写性
- ✅ 替换所有 `console.log` 为 `safeLog`（10处）
- ✅ 替换所有 `console.error` 为 `safeError`（3处）
- ✅ 版本号更新: 2.6.4 → 2.6.5

**修改文件**:
- `electron/database.js`
  - 添加 safeLog/safeError 函数（第8-18行）
  - 替换所有 console 调用
- `package.json` - 版本号: 2.6.5
- `electron/main.js` - APP_VERSION: 2.6.5
- `src/components/Sidebar.jsx` - 版本号: v2.6.5
- `src/components/SettingsModal.jsx` - 版本号: v2.6.5

**技术细节**:
```javascript
// 安全的日志输出（检查流可写性）
function safeLog(...args) {
  if (process.stdout.writable) {
    console.log(...args);
  }
}

function safeError(...args) {
  if (process.stderr.writable) {
    console.error(...args);
  }
}
```

**测试结果**: 待测试

---

## 📅 2026-01-07 (v2.6.3)

### 登录系统完全重构 ⭐

**核心变更**: 完全放弃 Supabase Auth，使用纯数据库管理

**原因**:
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

**测试结果**: 待测试

---

### 文档模块化重构

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
└── 07-部署与配置.md
```

**优势**:
- 每个文档聚焦一个主题
- 修改某个功能只需更新对应文档
- 通过 README 快速定位

---

## 📅 2026-01-06 (v2.5.0-v2.5.6)

### v2.5.0 - 游客模式云端存储

**核心功能**: 游客数据也保存到云端，登录后自动合并

**技术实现**:
- 设备ID生成：基于机器特征的 MD5 哈希
- 数据库表 `conversations` 添加 `device_id` 字段
- `user_id` 可为 NULL（允许游客数据）
- 软合并策略：登录后更新 `user_id` 字段

**数据库函数**: `merge_guest_conversations_to_user(p_device_id, p_user_id)`

**问题**: RLS 策略导致无限递归 (42P17)
**解决**: 暂时完全禁用 RLS

---

### v2.5.2 - 修复输入法Bug

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

### v2.5.3-v2.5.6 - Dock 图标优化

**变更**:
- v2.5.3: 优化图标设计，眼睛增大 37.5%
- v2.5.4: 改为方形 Dock 图标
- v2.5.5: 绿色占比优化至 60.9%
- v2.5.6: 绿色背景完全填满 1024×1024

**状态**: macOS 系统限制，效果有限

---

## 📅 2026-01-06 (v2.3.0-v2.4.2)

### v2.3.0 - 在线自动更新系统

**功能**:
- 集成 `electron-updater`
- GitHub Release 作为更新源
- 支持普通更新和强制更新
- 启动时 + 每24小时自动检查

**发布平台**: GitHub Releases

---

### v2.3.1 - 后台静默下载 ⭐

**核心改进**: 用户点击"立即更新"后，后台下载，不阻塞使用

**流程**:
```
点击更新 → 弹窗关闭 → 后台下载 → 下载完成 → 弹窗通知 → 用户选择重启
```

**优势**: 完全不中断用户使用

---

### v2.4.0 - 云端登录系统

**功能**:
- 手机号 + 验证码登录
- Supabase 集成
- 阿里云短信服务
- 对话历史云端同步

**方案**: 使用 Supabase Auth + Email/Password 混合方案（后续被废弃）

---

### v2.4.2 - 修复登录密码Bug

**问题**: 验证码作为密码，每次登录密码不同

**解决方案**: 使用固定密码 `xiaobai_{phone}_auth_password`

---

## 📅 2026-01-05 (v1.8.2 - v2.0.0)

### v2.0.0 - 版本检查机制

**功能**:
- 版本号管理
- 大版本自动清空数据
- 悬浮球引导

---

## 📅 2026-01-05 (v1.0.0)

### 首次发布

**功能**: 一天内完成开发
- Claude Agent SDK 集成
- 基础对话功能
- 文件操作

---

## 🔧 技术栈总结

**前端**: React + Vite + CSS
**桌面**: Electron
**后端**: Supabase (PostgreSQL + Edge Functions)
**AI**: Claude Agent SDK
**本地存储**: SQLite (better-sqlite3)

---

## 🎯 核心设计原则

1. **简单原则**: 专注于一个功能并做到极致
2. **无密码设计**: 只用手机号 + 验证码
3. **游客友好**: 游客数据也保存到云端
4. **云端优先**: 对话历史主要存储在云端

---

## ⚠️ 重要技术决策

### 已废弃方案

| 方案 | 废弃原因 | 废弃时间 |
|-----|---------|---------|
| Supabase Auth | 不匹配产品（无email、无密码） | v2.6.3 |
| 游客数据本地存储 | 数据易丢失 | v2.5.0 |
| RLS 策略 | 无限递归问题 | v2.5.0 |

### 当前方案

| 模块 | 方案 | 说明 |
|-----|------|------|
| 用户认证 | 纯数据库管理 | user_profiles 表 |
| Session 管理 | localStorage | 不使用 Supabase Auth |
| RLS | 完全禁用 | 使用 supabaseAdmin 绕过 |
| 游客数据 | 云端存储 | device_id 识别 |

---

## 📝 待解决问题

### 🔴 高优先级（安全问题）

1. **数据库权限完全隔离** ⭐⭐⭐
   - **当前状态**: v2.6.9 已完成方案A（快速修复），但仍存在安全问题
   - **遗留问题**:
     - 前端 `cloudService.js` 仍在使用 `supabaseAdmin`
     - Service Role Key 虽然在 .env 中，但仍被前端代码引用
     - RLS 策略会被 supabaseAdmin 绕过
   - **后续方案**:
     - **方案B（推荐）**: 将数据库操作移到 Electron 主进程（2-3小时）
       - 前端通过 IPC 调用后端
       - Service Role Key 仅在主进程中使用
       - 符合 Electron 安全最佳实践
     - **方案C（最安全）**: 使用 Edge Functions（4-6小时）
       - 完全前后端分离
       - 便于未来扩展到 Web 版
   - **相关文档**: `supabase/RLS_FIX_INSTRUCTIONS.md`
   - **迁移文件**: `supabase/migrations/20260107_enable_rls_policies.sql`
   - **执行时机**: 下次开发时优先处理

### 🟡 中优先级（体验优化）

2. **RLS 安全策略优化**: 当前方案A的 RLS 策略较简单，需要完善
3. **输入框优化**: 输入法体验仍需改进
4. **性能优化**: 对话历史加载速度

### 🟢 低优先级（功能增强）

5. **测试覆盖**: 自动化测试

---

## 🔗 相关链接

### 多电脑配置

小白AI项目在两台电脑上都有副本，通过用户名区分当前使用的电脑：

| 电脑 | 用户名 | 小白AI路径 | 说明 |
|------|--------|-----------|------|
| 电脑1 | shawn | `/Users/shawn/Downloads/小白AI/` | 主电脑 |
| 电脑2 | xiaolin | `/Users/xiaolin/Downloads/小白AI/` | 副电脑（当前） |

**识别方法**：
- 当前工作路径包含 `/shawn/` → 使用电脑1
- 当前工作路径包含 `/xiaolin/` → 使用电脑2（当前）

**AI 识别规则**：
当处理小白AI项目时，先检查当前工作目录，确定使用的是哪台电脑，然后使用对应的路径。

### 其他链接

- **文档目录**: `docs/`
- **GitHub 仓库**: https://github.com/Shanw26/xiaobaiAI
- **Supabase 项目**: https://cnszooaxwxatezodbbxq.supabase.co

---

**最后更新**: 2026-01-07
**更新人**: Claude Code + 晓力
**当前版本**: v2.6.6
