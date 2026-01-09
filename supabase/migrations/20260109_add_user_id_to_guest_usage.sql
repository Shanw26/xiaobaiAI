-- 为 guest_usage 表添加 user_id 字段
-- 用于支持登录用户和游客模式的使用次数管理

-- 添加 user_id 列
ALTER TABLE guest_usage ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_guest_usage_user_id ON guest_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_usage_device_user ON guest_usage(device_id, user_id);

-- 添加注释
COMMENT ON COLUMN guest_usage.user_id IS '用户ID（登录用户使用，游客模式为NULL）';
COMMENT ON COLUMN guest_usage.device_id IS '设备ID（游客模式使用，登录用户模式为NULL）';

-- 说明：
-- 1. user_id 为 NULL 且 device_id 不为 NULL → 游客使用记录
-- 2. user_id 不为 NULL 且 device_id 为 NULL → 登录用户使用记录
-- 3. 游客登录后，会创建新的 user_id 记录或迁移旧的使用记录
