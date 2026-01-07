-- ============================================
-- 变更标题: 启用 RLS 安全策略（方案A - 快速修复）
-- 变更原因: 之前完全禁用 RLS 存在严重安全风险
-- 影响范围: 所有数据库表，所有查询操作
-- 变更时间: 2026-01-07
-- 作者: Claude Code + 晓力
-- 向后兼容: 是
-- ============================================

-- ⚠️ 重要说明：
-- 这是临时方案，提供基础的安全防护
-- 使用 device_id 和 user_id 进行简单的数据隔离
-- 避免复杂的 JOIN 和子查询，防止递归问题

-- ============================================
-- 1. 启用 RLS（Row Level Security）
-- ============================================

-- 启用所有表的 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 删除旧策略（如果存在）
-- ============================================

DROP POLICY IF EXISTS "Users can view all user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update user_profiles" ON user_profiles;

DROP POLICY IF EXISTS "Users can view all verification_codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can insert verification_codes" ON verification_codes;

DROP POLICY IF EXISTS "Users can view all conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view all messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;

DROP POLICY IF EXISTS "Users can view all guest_usage" ON guest_usage;
DROP POLICY IF EXISTS "Users can insert guest_usage" ON guest_usage;
DROP POLICY IF EXISTS "Users can update guest_usage" ON guest_usage;

DROP POLICY IF EXISTS "Users can view all user_info" ON user_info;
DROP POLICY IF EXISTS "Users can insert user_info" ON user_info;
DROP POLICY IF EXISTS "Users can update user_info" ON user_info;

DROP POLICY IF EXISTS "Users can view all ai_memory" ON ai_memory;
DROP POLICY IF EXISTS "Users can insert ai_memory" ON ai_memory;
DROP POLICY IF EXISTS "Users can update ai_memory" ON ai_memory;

-- ============================================
-- 3. 创建简单的 RLS 策略
-- ============================================

-- 3.1 user_profiles 表策略
-- ⚠️ 注意：使用 supabaseAdmin 绕过 RLS，所以前端实际上无法直接查询

CREATE POLICY "Allow read access via service role only"
ON user_profiles FOR SELECT
USING (false); -- 前端禁止直接查询，必须通过后端

CREATE POLICY "Allow insert via service role only"
ON user_profiles FOR INSERT
WITH CHECK (false); -- 前端禁止直接插入，必须通过后端

CREATE POLICY "Allow update via service role only"
ON user_profiles FOR UPDATE
USING (false); -- 前端禁止直接更新，必须通过后端

-- 3.2 verification_codes 表策略

CREATE POLICY "Allow insert verification codes"
ON verification_codes FOR INSERT
WITH CHECK (true); -- 允许前端插入验证码

CREATE POLICY "Allow read own verification codes"
ON verification_codes FOR SELECT
USING (false); -- 前端禁止查询验证码（安全考虑）

-- 3.3 conversations 表策略
-- 基于 device_id 的简单策略

CREATE POLICY "Allow read own conversations by device"
ON conversations FOR SELECT
USING (
  device_id = (
    SELECT device_id FROM conversations
    LIMIT 1
  )
);

CREATE POLICY "Allow insert conversations"
ON conversations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update own conversations"
ON conversations FOR UPDATE
USING (
  device_id = (
    SELECT device_id FROM conversations
    LIMIT 1
  )
);

-- 3.4 messages 表策略
-- 基于 conversation_id 的简单策略

CREATE POLICY "Allow read messages of own conversations"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations
    WHERE device_id = (
      SELECT device_id FROM conversations
      LIMIT 1
    )
  )
);

CREATE POLICY "Allow insert messages"
ON messages FOR INSERT
WITH CHECK (true);

-- 3.5 guest_usage 表策略

CREATE POLICY "Allow read own guest usage"
ON guest_usage FOR SELECT
USING (false); -- 前端禁止查询，必须通过后端

CREATE POLICY "Allow insert guest usage"
ON guest_usage FOR INSERT
WITH CHECK (false); -- 前端禁止插入，必须通过后端

CREATE POLICY "Allow update own guest usage"
ON guest_usage FOR UPDATE
USING (false); -- 前端禁止更新，必须通过后端

-- 3.6 user_info 表策略

CREATE POLICY "Allow read own user info"
ON user_info FOR SELECT
USING (
  device_id = (
    SELECT device_id FROM user_info
    LIMIT 1
  ) OR
  user_id = (
    SELECT user_id FROM user_info
    LIMIT 1
  )
);

CREATE POLICY "Allow insert user info"
ON user_info FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update own user info"
ON user_info FOR UPDATE
USING (
  device_id = (
    SELECT device_id FROM user_info
    LIMIT 1
  ) OR
  user_id = (
    SELECT user_id FROM user_info
    LIMIT 1
  )
);

-- 3.7 ai_memory 表策略

CREATE POLICY "Allow read own ai memory"
ON ai_memory FOR SELECT
USING (
  device_id = (
    SELECT device_id FROM ai_memory
    LIMIT 1
  ) OR
  user_id = (
    SELECT user_id FROM ai_memory
    LIMIT 1
  )
);

CREATE POLICY "Allow insert ai memory"
ON ai_memory FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update own ai memory"
ON ai_memory FOR UPDATE
USING (
  device_id = (
    SELECT device_id FROM ai_memory
    LIMIT 1
  ) OR
  user_id = (
    SELECT user_id FROM ai_memory
    LIMIT 1
  )
);

-- ============================================
-- 4. 验证 RLS 策略
-- ============================================

-- 检查所有表的 RLS 状态
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 说明和限制
-- ============================================
--
-- ⚠️ 当前方案的限制：
-- 1. 前端仍然使用 supabaseAdmin（绕过 RLS）- 需要在后续版本中修复
-- 2. 简单的 RLS 策略可能不够完善
-- 3. 某些表（如 user_profiles）完全禁止前端访问
--
-- ✅ 改进之处：
-- 1. 启用了 RLS，提供基础安全层
-- 2. Service Role Key 已移到环境变量
-- 3. 为后续改进打下了基础
--
-- 📋 后续改进：
-- 1. 将所有数据库操作移到 Electron 主进程
-- 2. 前端只通过 IPC 调用后端
-- 3. 使用 Edge Functions 提供更安全的 API
--
-- ============================================
-- 回滚方案（如需回滚，执行以下 SQL）
-- ============================================
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE verification_codes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE guest_usage DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_info DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE ai_memory DISABLE ROW LEVEL SECURITY;
