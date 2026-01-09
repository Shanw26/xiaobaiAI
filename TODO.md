# 小白AI 待解决问题

> **最后更新**: 2026-01-09 17:45
> **当前版本**: v2.11.6
> **状态**: 开发中

---

## 🔴 高优先级

### 1. 登录 HTTP 401 错误 ⭐⭐⭐

**状态**: ⏳ 待排查

**现象**:
- 验证码发送成功 ✅
- 控制台显示：`✅ [云端服务] 验证码发送成功`
- 但登录时返回 HTTP 401 ❌
- 错误信息：`❌ [云端服务] 登录失败: HTTP 401`

**日志输出**:
```
[渲染进程 WARN] 📱 [云端服务] 开始发送验证码: 18601043813
[渲染进程 WARN] ✅ [云端服务] 验证码发送成功
[渲染进程 WARN] 🔐 [云端服务] 开始登录流程
  - 手机号: 18601043813
  - 验证码: 772594
[渲染进程 INFO] ❌ [云端服务] 登录失败: HTTP 401
```

**可能原因**:
1. 验证码已过期（默认 5 分钟有效期）
2. 验证码已被使用（一次性验证码）
3. Supabase Anon Key 不正确或已过期
4. Edge Function 认证配置问题
5. Edge Function 代码逻辑错误

**排查步骤**:
- [x] 1. 重新获取验证码并立即登录（测试通过：仍失败）
- [ ] 2. 在 Supabase Dashboard 查看 Edge Function 日志
  - 路径：Edge Functions → sign-in-phone → Logs
  - 查看具体哪一步返回了 401
- [ ] 3. 验证 Anon Key 是否正确
  - 路径：Settings → API → anon key
  - 对比 `.env` 文件中的 `VITE_SUPABASE_ANON_KEY`
- [ ] 4. 检查 Edge Function 代码逻辑
  - 文件：`supabase/functions/sign-in-phone/index.ts`
  - 确认验证码验证逻辑是否正确
- [ ] 5. 重新部署 Edge Function
  ```bash
  npx supabase functions deploy sign-in-phone
  ```

**相关文件**:
- `supabase/functions/sign-in-phone/index.ts` - 登录 Edge Function
- `src/lib/cloudService.js` - 前端调用逻辑（signInWithPhone 函数）
- `.env` - Supabase 环境变量

**临时解决方案**:
- 使用本地 SQLite 登录（绕过 Supabase）

---

## 🟡 中优先级

### 2. 版本升级清空数据问题

**状态**: 已识别，待修复

**问题描述**:
- 每次版本升级都会清空所有数据（包括用户数据）
- 用户体验不好，需要重新登录

**解决方案**:
- 只清理缓存，保留用户数据
- 修改版本升级逻辑，只删除必要文件

**影响范围**:
- `electron/main.js` 版本升级逻辑

---

## 🟢 低优先级

### 3. 代码优化

**状态**: 已记录，暂不处理

**待优化项**:
- 移除硬编码的魔法数字
- 统一错误处理机制
- 添加单元测试
- 优化性能瓶颈

---

## 📋 开发备注

### 下一步计划

1. **优先解决登录 401 错误**
   - 查看日志确认根本原因
   - 修复并测试
   - 部署到生产环境

2. **准备 v2.11.7 发布**
   - 修复所有已知 bug
   - 完整测试
   - 打包上传到 OSS

3. **功能迭代规划**
   - 收集用户反馈
   - 优先级排序
   - 制定开发计划

---

## 🔗 相关文档

- **项目记忆**: `MEMORY.md` (v2.11.6 详细记录)
- **开发规范**: `DEVELOPMENT_GUIDELINES.md`
- **技术文档**: `docs/README.md`
- **数据库设计**: `docs/03-database-design.md`

---

**最后更新**: 2026-01-09 17:45
**记录人**: Claude Code + 晓力
