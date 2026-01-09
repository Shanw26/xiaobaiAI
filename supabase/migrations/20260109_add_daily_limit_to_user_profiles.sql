-- 为 user_profiles 表添加每日使用限制字段
-- 用于控制登录用户每天的使用次数

-- 添加字段
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 5;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_used INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;

-- 添加注释
COMMENT ON COLUMN user_profiles.daily_limit IS '每日使用次数限制（默认5次）';
COMMENT ON COLUMN user_profiles.daily_used IS '今日已使用次数';
COMMENT ON COLUMN user_profiles.last_reset_date IS '最后重置日期（用于判断是否需要重置 daily_used）';

-- 创建索引（提高查询性能）
CREATE INDEX IF NOT EXISTS idx_user_profiles_daily_limit ON user_profiles(user_id, last_reset_date);

-- 更新现有用户（设置默认限制）
UPDATE user_profiles
SET daily_limit = 5,
    daily_used = 0,
    last_reset_date = CURRENT_DATE
WHERE daily_limit IS NULL;
