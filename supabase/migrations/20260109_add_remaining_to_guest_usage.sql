-- 为 guest_usage 表添加 remaining 字段
-- 用于跟踪游客/用户剩余使用次数

-- 添加 remaining 列（默认值为 10）
ALTER TABLE guest_usage ADD COLUMN IF NOT EXISTS remaining INTEGER DEFAULT 10;

-- 为现有记录设置初始值
UPDATE guest_usage SET remaining = 10 - used_count WHERE remaining IS NULL;

-- 添加注释
COMMENT ON COLUMN guest_usage.remaining IS '剩余使用次数（游客默认10次，用户登录后重置）';
