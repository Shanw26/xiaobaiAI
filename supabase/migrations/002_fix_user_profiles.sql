-- 检查并修复 user_profiles 表结构
-- 如果表存在但结构不对，先删除
DROP TABLE IF EXISTS user_profiles CASCADE;

-- 重新创建 user_profiles 表（注意：id 字段使用 TEXT 类型）
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_phone ON user_profiles(phone);

-- 启用 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (user_id = auth.uid()::text);
