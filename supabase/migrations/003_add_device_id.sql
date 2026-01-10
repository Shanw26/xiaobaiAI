-- 为 conversations 表添加 device_id 字段
-- 用于支持游客模式的对话数据，以及游客登录后的数据合并

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_conversations_device_id ON conversations(device_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_device ON conversations(user_id, device_id);

-- 修改 RLS 策略，允许通过 device_id 访问游客对话
CREATE POLICY "Users can view own device conversations"
ON conversations FOR SELECT
USING (
  device_id IN (
    SELECT device_id FROM conversations WHERE user_id = auth.uid()::text LIMIT 1
  )
);

-- 说明：
-- 1. user_id 为 NULL 且 device_id 不为 NULL → 游客对话
-- 2. user_id 不为 NULL → 登录用户对话
-- 3. 游客登录后，会将该 device_id 的所有对话的 user_id 更新为登录用户ID
