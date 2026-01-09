-- ============================================
-- 初始化游客免费次数限制配置
-- 在 Supabase Dashboard 的 SQL Editor 中执行
-- ============================================

-- 插入游客限制配置（如果不存在）
INSERT INTO system_configs (key, value, description, created_at, updated_at)
VALUES
  ('free_usage_limit', '5', '游客免费使用次数限制（可在数据库中动态调整）', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 验证配置
SELECT key, value, description, created_at, updated_at
FROM system_configs
WHERE key = 'free_usage_limit';

-- ============================================
-- 使用说明
-- ============================================
-- 修改游客限制次数（不需要发版）：
-- UPDATE system_configs SET value = '10' WHERE key = 'free_usage_limit';
--
-- 查看当前限制：
-- SELECT * FROM system_configs WHERE key = 'free_usage_limit';
-- ============================================
