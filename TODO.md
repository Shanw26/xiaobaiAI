# 小白AI - 待办事项

> **最后更新**: 2026-01-07
> **当前版本**: v2.6.9

---

## 🔴 紧急（安全相关）

### 1. 完成数据库安全修复（方案B）⭐⭐⭐

**背景**:
- v2.6.9 已完成方案A（快速修复）
- 但前端仍在使用 `supabaseAdmin`，会绕过 RLS
- 需要将数据库操作隔离到 Electron 主进程

**方案B: Electron 主进程隔离**（推荐，2-3小时）

**步骤**:
1. [ ] 在 `electron/main.js` 中添加 IPC 处理器
   - `get-conversations`
   - `get-messages`
   - `save-conversation`
   - `save-message`
   - `send-verification-code`
   - `sign-in-with-phone`

2. [ ] 创建 `electron/databaseService.js`
   - 封装所有数据库操作
   - 只在主进程中使用 `supabaseAdmin`

3. [ ] 修改前端 `cloudService.js`
   - 移除所有 `supabaseAdmin` 调用
   - 改为通过 `window.electronAPI` 调用

4. [ ] 测试所有功能
   - 登录
   - 发送消息
   - 用户信息
   - AI 记忆

5. [ ] 更新 MEMORY.md

**预期结果**:
- ✅ Service Role Key 只在主进程中使用
- ✅ 前端无法直接访问数据库
- ✅ 安全性大幅提升

**相关文档**:
- `supabase/RLS_FIX_INSTRUCTIONS.md` - 方案说明
- `MEMORY.md` - v2.6.9 记录

---

## 🟡 中优先级

### 2. 优化 RLS 策略
- 当前策略较简单，存在递归风险
- 需要设计更完善的策略

### 3. 输入框优化
- 中文输入法体验

### 4. 性能优化
- 对话历史加载速度

---

## 🟢 低优先级

### 5. 测试覆盖
- 自动化测试

---

## 💡 备忘录

**数据库迁移待应用**:
```bash
# 方案A 的迁移还未应用到生产环境
cd /Users/shawn/Downloads/小白AI
supabase db push
# 或手动在 Supabase Dashboard 执行
```

**环境变量已配置**:
- `.env` 文件已创建
- `.gitignore` 已更新

**版本号**: v2.6.9

---

**下次开发优先级**: 🔴 方案B - 数据库安全修复
