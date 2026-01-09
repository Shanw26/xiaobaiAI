-- ============================================
-- 添加 api_key 字段到 user_profiles 表
-- 请在 Supabase Dashboard 的 SQL Editor 中执行
-- ============================================

-- 1. 添加 api_key 字段
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS api_key TEXT;

-- 2. 添加字段注释
COMMENT ON COLUMN user_profiles.api_key IS '用户自己的 API Key（加密存储，支持云端同步）';

-- 3. 创建索引（可选，提升查询性能）
CREATE INDEX IF NOT EXISTS idx_user_profiles_api_key ON user_profiles(user_id) WHERE api_key IS NOT NULL;

-- ============================================
-- 验证字段是否添加成功
-- ============================================

-- 查看表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;
