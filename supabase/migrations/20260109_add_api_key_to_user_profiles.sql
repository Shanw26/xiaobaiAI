-- 为 user_profiles 表添加 API Key 字段
-- 用于存储用户自己的 API Key，支持云端同步

-- 添加 api_key 字段
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS api_key TEXT;

-- 添加注释
COMMENT ON COLUMN user_profiles.api_key IS '用户自己的 API Key（加密存储，支持云端同步）';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_api_key ON user_profiles(user_id) WHERE api_key IS NOT NULL;
