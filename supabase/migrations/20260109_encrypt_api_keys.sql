-- 🔒 v2.11.7 安全增强：API Key 加密存储
-- 为 user_profiles 表添加加密字段

-- 添加加密相关字段
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS api_key_iv TEXT;

-- 添加注释
COMMENT ON COLUMN user_profiles.api_key_encrypted IS '加密后的 API Key（AES-256-GCM）';
COMMENT ON COLUMN user_profiles.api_key_iv IS '加密初始化向量（IV）';

-- 创建索引（仅对有加密数据的记录）
CREATE INDEX IF NOT EXISTS idx_user_profiles_api_key_encrypted
  ON user_profiles(user_id)
  WHERE api_key_encrypted IS NOT NULL;

-- 注意：旧的 api_key 字段保留用于兼容性
-- 新保存的 API Key 将使用加密字段
-- 旧数据会在用户重新保存时自动迁移到加密格式
