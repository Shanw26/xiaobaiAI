-- 系统配置表（存储全局配置，如官方 API Key）
-- 创建时间: 2026-01-08
-- 目的: 避免在源代码中硬编码敏感信息

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS public.system_configs (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false,  -- 标记是否为敏感信息
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON public.system_configs(key);

-- 添加注释
COMMENT ON TABLE public.system_configs IS '系统配置表（存储全局配置）';
COMMENT ON COLUMN public.system_configs.key IS '配置键（唯一）';
COMMENT ON COLUMN public.system_configs.value IS '配置值';
COMMENT ON COLUMN public.system_configs.is_sensitive IS '是否为敏感信息（日志中隐藏）';

-- 插入初始配置
INSERT INTO public.system_configs (key, value, description, is_sensitive)
VALUES
  ('official_api_key', 'YOUR_NEW_KEY_HERE', '官方智谱 GLM API Key（游客模式使用）', true),
  ('official_provider', 'zhipu', '官方模型提供商', false),
  ('official_model', 'glm-4.7', '官方默认模型', false),
  ('free_usage_limit', '10', '游客免费使用次数限制', false)
ON CONFLICT (key) DO NOTHING;  -- 如果已存在则不插入

-- 启用 RLS
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

-- RLS 策略：所有人可读，但不能修改
CREATE POLICY "允许所有人读取系统配置"
  ON public.system_configs
  FOR SELECT
  TO public
  USING (true);

-- RLS 策略：禁止任何人通过客户端 API 插入/更新/删除
CREATE POLICY "禁止客户端修改系统配置"
  ON public.system_configs
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_system_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_configs_updated_at
  BEFORE UPDATE ON public.system_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_system_configs_updated_at();

-- 创建获取单个配置的函数（方便查询）
CREATE OR REPLACE FUNCTION get_system_config(p_key TEXT)
RETURNS TABLE (key TEXT, value TEXT, description TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT sc.key, sc.value, sc.description
  FROM public.system_configs sc
  WHERE sc.key = p_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数注释
COMMENT ON FUNCTION get_system_config IS '获取系统配置（安全函数）';

-- 授权给 authenticated 和 anon 角色
GRANT EXECUTE ON FUNCTION get_system_config(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_system_config(TEXT) TO authenticated;
