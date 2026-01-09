-- ====================================
-- 修复 guest_usage 表 - 添加 user_id 列
-- ====================================
-- 执行位置：Supabase Dashboard → SQL Editor
-- 创建时间：2026-01-09
-- ====================================

-- 1. 添加 user_id 列（如果不存在）
ALTER TABLE guest_usage
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 2. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_guest_usage_user_id
ON guest_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_guest_usage_device_user
ON guest_usage(device_id, user_id);

-- 3. 添加列注释（可选）
COMMENT ON COLUMN guest_usage.user_id IS '用户ID（登录用户使用，游客模式为NULL）';

-- ====================================
-- 验证步骤（执行后检查）
-- ====================================
-- 执行以下 SQL 检查列是否添加成功：
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'guest_usage'
-- ORDER BY ordinal_position;
--
-- 应该看到 user_id 列在列表中

-- ====================================
-- 说明
-- ====================================
-- 1. user_id 为 NULL 且 device_id 不为 NULL → 游客使用记录
-- 2. user_id 不为 NULL → 登录用户使用记录
-- 3. 游客登录后，会创建新的 user_id 记录
