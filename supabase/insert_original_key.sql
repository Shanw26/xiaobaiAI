-- 插入官方 API Key 到 Supabase
-- 执行时间: 2026-01-08
-- 说明: 暂时使用原来的 Key 测试功能

-- 清空旧数据（如果存在）
DELETE FROM public.system_configs WHERE key IN (
  'official_api_key',
  'official_provider',
  'official_model',
  'free_usage_limit'
);

-- 插入配置
INSERT INTO public.system_configs (key, value, description, is_sensitive)
VALUES
  ('official_api_key', 'c2204ed0321b40a78e7f8b6eda93ff39.h9MOF4P51SCQpPhI', '官方智谱 GLM API Key（游客模式使用）', true),
  ('official_provider', 'zhipu', '官方模型提供商', false),
  ('official_model', 'glm-4.7', '官方默认模型', false),
  ('free_usage_limit', '10', '游客免费使用次数限制', false);

-- 验证插入结果
SELECT
  key,
  LEFT(value, 20) || '...' as value_preview,
  description,
  is_sensitive,
  created_at,
  updated_at
FROM public.system_configs
ORDER BY key;
