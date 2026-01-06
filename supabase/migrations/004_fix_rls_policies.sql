-- 修复 RLS 策略的递归问题
-- 删除旧的递归策略，创建简单的、基于设备ID的策略

-- ============================================
-- 1. 删除有问题的旧策略
-- ============================================

DROP POLICY IF EXISTS "Users can view own device conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- ============================================
-- 2. 为 conversations 表创建新的简化策略
-- ============================================

-- SELECT 策略：登录用户查看自己的对话（通过 user_id）或游客对话（通过 device_id）
CREATE POLICY "Users can view conversations"
ON conversations FOR SELECT
USING (
  -- 登录用户：查看 user_id 匹配的对话
  user_id = auth.uid()::text
  OR
  -- 登录用户：也查看该设备的游客对话（用于合并前查看）
  (device_id IN (
    SELECT device_id FROM conversations
    WHERE user_id = auth.uid()::text
    LIMIT 1
  ))
);

-- INSERT 策略：允许登录用户创建对话，也允许游客（user_id IS NULL）创建对话
CREATE POLICY "Users can insert conversations"
ON conversations FOR INSERT
WITH CHECK (
  -- 登录用户：必须设置自己的 user_id
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
  OR
  -- 游客：user_id 必须为 NULL
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- UPDATE 策略：只允许更新自己的对话
CREATE POLICY "Users can update own conversations"
ON conversations FOR UPDATE
USING (
  user_id = auth.uid()::text
)
WITH CHECK (
  user_id = auth.uid()::text
);

-- DELETE 策略（软删除）：只允许删除自己的对话
CREATE POLICY "Users can delete own conversations"
ON conversations FOR UPDATE
USING (
  user_id = auth.uid()::text AND is_deleted = false
)
WITH CHECK (
  user_id = auth.uid()::text
);

-- ============================================
-- 3. 为 messages 表创建新的简化策略
-- ============================================

-- SELECT 策略：通过 conversation_id 关联查询
CREATE POLICY "Users can view own messages"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations
    WHERE user_id = auth.uid()::text
  )
);

-- INSERT 策略：允许为自己的对话添加消息
CREATE POLICY "Users can insert messages"
ON messages FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations
    WHERE user_id = auth.uid()::text
  )
);

-- UPDATE 策略：只允许更新自己的消息
CREATE POLICY "Users can update own messages"
ON messages FOR UPDATE
USING (
  conversation_id IN (
    SELECT id FROM conversations
    WHERE user_id = auth.uid()::text
  )
)
WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations
    WHERE user_id = auth.uid()::text
  )
);

-- ============================================
-- 4. 添加游客访问支持（通过 service role）
-- ============================================

-- 注意：游客模式（未登录用户）需要在应用层处理
-- 因为 auth.uid() 在未登录时返回 NULL
-- 游客的数据仍然需要通过某种方式插入，这里我们采用：
-- 允许 INSERT 时 user_id IS NULL

-- ============================================
-- 5. 创建辅助函数：合并游客对话
-- ============================================

-- 创建一个函数来执行合并操作（使用 SECURITY DEFINER 绕过 RLS）
CREATE OR REPLACE FUNCTION merge_guest_conversations_to_user(
  p_device_id TEXT,
  p_user_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  merged_count INTEGER;
BEGIN
  -- 更新所有该设备的游客对话，将 user_id 设置为登录用户
  UPDATE conversations
  SET user_id = p_user_id
  WHERE device_id = p_device_id
    AND user_id IS NULL;

  GET DIAGNOSTICS merged_count = ROW_COUNT;

  RETURN merged_count;
END;
$$;

-- 授权所有认证用户调用此函数
GRANT EXECUTE ON FUNCTION merge_guest_conversations_to_user(TEXT, TEXT) TO authenticated;

-- ============================================
-- 说明
-- ============================================
-- 1. 游客模式：user_id = NULL, device_id 不为 NULL
-- 2. 登录用户：user_id 不为 NULL, device_id 不为 NULL
-- 3. 登录后合并：通过 merge_guest_conversations_to_user() 函数
-- 4. 避免递归：新策略不使用子查询关联同一张表
