# 小白AI安全修复 TODO

> **创建时间**: 2026-01-09
> **优先级**: P0 - 立即修复
> **预计总工时**: 34小时

---

## 🔴 P0 - 立即修复（本周内）

### 1. 删除前端的 supabaseAdmin 导出

**严重程度**: 🔴🔴🔴
**预计工时**: 2小时
**负责**: 待定

**问题**: `src/lib/supabaseClient.js` 在前端代码中导出了使用 Service Role Key 的客户端

**修复步骤**:

- [ ] **步骤1**: 修改 `src/lib/supabaseClient.js`
  ```javascript
  // ❌ 删除这部分（第32-39行）
  export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {...})
    : null;
  ```

- [ ] **步骤2**: 修改 `src/lib/cloudService.js`
  ```javascript
  // ❌ 修改前
  import { supabase, supabaseAdmin } from './supabaseClient';

  function isSupabaseAvailable() {
    const available = !!(supabase && supabaseAdmin);
    return available;
  }

  // ✅ 修改后
  import { supabase } from './supabaseClient';

  function isSupabaseAvailable() {
    return !!supabase;
  }
  ```

- [ ] **步骤3**: 在 Electron 主进程中创建 admin 客户端
  ```javascript
  // electron/main.js
  const { createClient } = require('@supabase/supabase-js');

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  ```

- [ ] **步骤4**: 测试构建
  ```bash
  npm run build
  # 检查打包文件中是否还有 supabaseAdmin
  grep -r "supabaseAdmin" dist/
  ```

- [ ] **步骤5**: 运行应用测试
  ```bash
  npm run dev
  # 测试登录、游客模式等功能
  ```

**验证标准**:
- ✅ `dist/` 目录中不包含 `supabaseAdmin`
- ✅ 应用所有功能正常工作
- ✅ 没有控制台错误

---

### 2. 移除 Service Role Key 的 VITE_ 前缀

**严重程度**: 🔴🔴🔴
**预计工时**: 1小时
**负责**: 待定

**问题**: `VITE_SUPABASE_SERVICE_ROLE_KEY` 会被打包到前端代码

**修复步骤**:

- [ ] **步骤1**: 修改 `.env` 文件
  ```bash
  # ❌ 删除这行
  VITE_SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

  # ✅ 改为（无 VITE_ 前缀）
  SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
  ```

- [ ] **步骤2**: 修改 Electron 主进程读取方式
  ```javascript
  // electron/main.js
  // ❌ 之前
  const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  // ✅ 之后
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  ```

- [ ] **步骤3**: 检查所有使用 Service Role Key 的地方
  ```bash
  grep -r "VITE_SUPABASE_SERVICE_ROLE_KEY" electron/
  # 确保没有遗漏
  ```

- [ ] **步骤4**: 重新构建并验证
  ```bash
  npm run build
  grep -r "sb_secret_" dist/
  # 应该没有输出
  ```

**验证标准**:
- ✅ `.env` 中没有 `VITE_SUPABASE_SERVICE_ROLE_KEY`
- ✅ 打包文件中不包含 Service Role Key
- ✅ Electron 主进程能正确读取密钥

---

### 3. 检查并清理打包文件中的密钥

**严重程度**: 🔴🔴🔴
**预计工时**: 1小时
**负责**: 待定

**问题**: 之前的构建可能已经将密钥打包到 dist/ 中

**修复步骤**:

- [ ] **步骤1**: 构建项目
  ```bash
  npm run build
  ```

- [ ] **步骤2**: 检查打包文件
  ```bash
  # 检查 Service Role Key
  grep -r "sb_secret_" dist/

  # 检查 API Key
  grep -r "API_KEY\|api_key" dist/ | grep -v "node_modules"

  # 检查其他敏感信息
  grep -r "ALI_OSS\|ZHIPU" dist/
  ```

- [ ] **步骤3**: 如果发现泄露
  ```bash
  # 删除打包文件
  rm -rf dist/

  # 1. 轮换 Supabase 密钥
  # Supabase Dashboard → Settings → API → Regenerate service role key

  # 2. 轮换阿里云密钥
  # 阿里云控制台 → AccessKey管理 → 创建新Key

  # 3. 轮换智谱密钥
  # 智谱控制台 → 重新生成API Key

  # 4. 更新 .env 文件

  # 5. 重新构建
  npm run build
  ```

- [ ] **步骤4**: 验证清理结果
  ```bash
  # 再次检查，应该没有输出
  grep -r "sb_secret_\|API_KEY" dist/
  ```

**验证标准**:
- ✅ `dist/` 中不包含任何密钥
- ✅ 所有密钥已轮换（如果之前泄露）
- ✅ `.gitignore` 包含 `.env`

---

### 4. 实现基于 device_id 的 RLS 策略

**严重程度**: 🔴🔴🔴
**预计工时**: 8小时
**负责**: 待定
**详细方案**: `docs/RLS_SOLUTION_WITH_DEVICE_ID.md`

**问题**: RLS 完全禁用，任何人都可以访问所有数据

**修复步骤**:

- [ ] **步骤1**: 创建数据库迁移脚本（1小时）
  ```sql
  -- 文件: sql/add_device_id_to_messages.sql

  ALTER TABLE messages
  ADD COLUMN device_id TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN user_id UUID;

  UPDATE messages m
  SET
    device_id = (SELECT device_id FROM conversations WHERE id = m.conversation_id),
    user_id = (SELECT user_id FROM conversations WHERE id = m.conversation_id);

  CREATE INDEX idx_messages_device_id ON messages(device_id);
  CREATE INDEX idx_messages_user_id ON messages(user_id);
  ```

- [ ] **步骤2**: 应用迁移到测试环境（0.5小时）
  ```bash
  # 备份测试数据库
  supabase db dump --db-url "$TEST_DB_URL" > backup.sql

  # 应用迁移
  psql $TEST_DB_URL -f sql/add_device_id_to_messages.sql
  ```

- [ ] **步骤3**: 验证数据完整性（0.5小时）
  ```sql
  -- 检查是否有 NULL 的 device_id
  SELECT COUNT(*) FROM messages WHERE device_id = 'unknown';

  -- 检查数据一致性
  SELECT COUNT(*) FROM messages m
  LEFT JOIN conversations c ON m.conversation_id = c.id
  WHERE c.id IS NULL;
  ```

- [ ] **步骤4**: 修改前端代码（2小时）
  ```javascript
  // src/lib/cloudService.js
  export async function createMessage(conversationId, role, content) {
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = await getDeviceId();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        device_id: deviceId,      // ✅ 新增
        user_id: user?.id || null // ✅ 新增
      });

    return { data, error };
  }
  ```

- [ ] **步骤5**: 创建 RLS 策略（2小时）
  ```sql
  -- 启用 RLS
  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

  -- 登录用户策略
  CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (user_id = auth.uid()::text);

  CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (user_id = auth.uid()::text);

  -- 游客策略（宽松，前端过滤）
  CREATE POLICY "Guests can view messages"
  ON messages FOR SELECT
  USING (user_id IS NULL);

  CREATE POLICY "Guests can view conversations"
  ON conversations FOR SELECT
  USING (user_id IS NULL);
  ```

- [ ] **步骤6**: 测试 RLS 策略（1小时）
  ```sql
  -- 测试登录用户
  SET ROLE authenticated;
  SET request.jwt.claim.sub = 'test-user-id';
  SELECT * FROM messages LIMIT 10;  -- 应该只返回该用户的

  -- 测试游客
  RESET ROLE;
  SELECT * FROM messages LIMIT 10;  -- 应该返回所有游客数据

  -- 测试插入权限
  INSERT INTO messages (conversation_id, device_id, user_id, role, content)
  VALUES ('test-id', 'test-device', NULL, 'user', 'test');
  -- 应该成功

  -- 测试跨用户访问
  SET ROLE authenticated;
  SET request.jwt.claim.sub = 'other-user-id';
  SELECT * FROM messages WHERE user_id = 'test-user-id';
  -- 应该返回空（RLS 生效）
  ```

- [ ] **步骤7**: 应用到生产环境（1小时）
  ```bash
  # 备份生产数据库
  supabase db dump --db-url "$PROD_DB_URL" > prod_backup_$(date +%Y%m%d).sql

  # 在低峰期应用迁移
  psql $PROD_DB_URL -f sql/add_device_id_to_messages.sql

  # 验证数据
  psql $PROD_DB_URL -c "SELECT COUNT(*) FROM messages WHERE device_id = 'unknown';"
  ```

**验证标准**:
- ✅ messages 表有 device_id 和 user_id 字段
- ✅ 所有历史数据已迁移
- ✅ RLS 策略已启用
- ✅ 登录用户只能访问自己的数据
- ✅ 应用功能正常工作

---

### 5. 添加外键约束

**严重程度**: 🔴🔴
**预计工时**: 2小时
**负责**: 待定

**问题**: 表之间缺少外键约束，可能导致孤儿记录

**修复步骤**:

- [ ] **步骤1**: 创建迁移脚本
  ```sql
  -- 添加外键约束
  ALTER TABLE conversations
  ADD CONSTRAINT fk_conversations_user_id
  FOREIGN KEY (user_id)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;

  ALTER TABLE messages
  ADD CONSTRAINT fk_messages_conversation_id
  FOREIGN KEY (conversation_id)
  REFERENCES conversations(id)
  ON DELETE CASCADE;
  ```

- [ ] **步骤2**: 在测试环境验证
  ```bash
  psql $TEST_DB_URL -f sql/add_foreign_keys.sql
  ```

- [ ] **步骤3**: 检查孤儿记录
  ```sql
  -- 检查是否有孤儿对话
  SELECT COUNT(*) FROM conversations c
  LEFT JOIN user_profiles u ON c.user_id = u.id
  WHERE c.user_id IS NOT NULL AND u.id IS NULL;

  -- 如果有，清理或修复
  ```

- [ ] **步骤4**: 应用到生产环境

**验证标准**:
- ✅ 外键约束已添加
- ✅ 没有孤儿记录
- ✅ 级联删除正常工作

---

### 6. 实现验证码自动清理

**严重程度**: 🔴🔴
**预计工时**: 2小时
**负责**: 待定

**问题**: 验证码记录无限增长

**修复步骤**:

- [ ] **步骤1**: 创建清理函数
  ```sql
  CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
  RETURNS void AS $$
  BEGIN
    DELETE FROM verification_codes
    WHERE expires_at < NOW();
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] **步骤2**: 创建 Edge Function
  ```typescript
  // supabase/functions/cleanup-codes/index.ts
  import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

  serve(async (req) => {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase
      .from('verification_codes')
      .delete()
      .lt('expires_at', new Date().toISOString());

    return new Response(JSON.stringify({ success: !error }));
  });
  ```

- [ ] **步骤3**: 设置定时任务
  ```bash
  # 使用 GitHub Actions 每小时调用一次
  # .github/workflows/cleanup-codes.yml
  ```

- [ ] **步骤4**: 验证清理功能
  ```bash
  # 手动调用测试
  curl -X POST https://xxx.supabase.co/functions/v1/cleanup-codes
  ```

**验证标准**:
- ✅ 清理函数正常工作
- ✅ 定时任务正常运行
- ✅ 过期验证码被删除

---

## 🟠 P1 - 尽快修复（本月内）

### 7. 添加审计日志

**严重程度**: 🟠
**预计工时**: 4小时
**负责**: 待定

**修复步骤**:

- [ ] 创建审计日志表
- [ ] 创建触发器
- [ ] 测试审计功能
- [ ] 添加日志查询界面

---

### 8. 实现 API 速率限制

**严重程度**: 🟠
**预计工时**: 4小时
**负责**: 待定

**修复步骤**:

- [ ] 集成 Upstash Redis
- [ ] 实现速率限制中间件
- [ ] 测试速率限制
- [ ] 添加监控告警

---

## 🟡 P2 - 逐步优化（下个版本）

### 9. 软删除数据定期清理

**严重程度**: 🟡
**预计工时**: 2小时

---

### 10. 备份策略验证

**严重程度**: 🟡
**预计工时**: 4小时

---

### 11. 敏感字段加密

**严重程度**: 🟡
**预计工时**: 4小时

---

## 📋 检查清单

### 修复前

- [ ] 备份生产数据库
- [ ] 备份 .env 文件
- [ ] 通知团队成员

### 修复中

- [ ] 在测试环境验证
- [ ] 运行完整测试套件
- [ ] 代码审查

### 修复后

- [ ] 部署到生产环境
- [ ] 监控错误日志
- [ ] 验证所有功能
- [ ] 更新文档

---

## 📞 紧急联系

**如果修复过程中遇到问题**:

1. **立即回滚**: 恢复数据库备份
2. **联系支持**: Supabase support@supabase.io
3. **通知用户**: 如果影响用户，及时通知

---

## 📊 进度跟踪

| 任务 | 负责人 | 状态 | 完成时间 |
|-----|-------|------|---------|
| 删除 supabaseAdmin 导出 | 待定 | ⏳ 待开始 | - |
| 移除 VITE_ 前缀 | 待定 | ⏳ 待开始 | - |
| 清理打包文件密钥 | 待定 | ⏳ 待开始 | - |
| 实现 device_id RLS | 待定 | ⏳ 待开始 | - |
| 添加外键约束 | 待定 | ⏳ 待开始 | - |
| 验证码自动清理 | 待定 | ⏳ 待开始 | - |
| 添加审计日志 | 待定 | ⏳ 待开始 | - |
| API 速率限制 | 待定 | ⏳ 待开始 | - |

---

## 📝 备注

**优先级说明**:
- **P0**: 严重安全风险，本周内必须修复
- **P1**: 中等风险，本月内修复
- **P2**: 低风险，可以逐步优化

**预计总工时**: 34小时
**建议安排**: 分两周完成
- 第一周: P0 任务（16小时）
- 第二周: P1-P2 任务（18小时）

---

**文档创建**: 2026-01-09
**创建人**: Claude Code + 晓力
**下次更新**: 修复开始后每天更新进度
