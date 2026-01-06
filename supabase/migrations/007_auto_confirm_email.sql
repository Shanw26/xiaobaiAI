-- 自动确认新注册用户的邮箱
-- 解决 "Email not confirmed" 错误

-- ============================================
-- 方案1：禁用邮箱确认（推荐）
-- ============================================
-- 步骤：
-- 1. 打开 Supabase Dashboard
-- 2. Authentication → Providers
-- 3. Email provider → Confirm email → OFF
-- 4. Save

-- ============================================
-- 方案2：创建自动确认函数（需要 service_role）
-- ============================================

-- 注意：这个函数需要使用 service_role key 调用
-- 普通的 anon key 无法调用管理员 API

-- 如果您想通过代码自动确认用户，
-- 请在应用初始化时执行以下逻辑（需要 service_role key）：
--
-- import { createClient } from '@supabase/supabase-js'
--
-- const supabaseAdmin = createClient(
--   SUPABASE_URL,
--   SUPABASE_SERVICE_ROLE_KEY  // ⚠️ 只在服务端使用
-- )
--
-- // 注册后自动确认用户
-- await supabaseAdmin.auth.admin.updateUserById(
--   userId,
--   { email_confirm: true }
-- )

-- ============================================
-- 方案3：直接在数据库中更新用户确认状态
-- ============================================

-- 创建一个函数来标记用户已确认邮箱
CREATE OR REPLACE FUNCTION confirm_user_email(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 更新 auth.users 表
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = user_uuid;

  RETURN TRUE;
END;
$$;

-- 授权 authenticated 用户调用此函数
GRANT EXECUTE ON FUNCTION confirm_user_email(UUID) TO authenticated;

-- 说明：
-- 这个函数可以在注册成功后立即调用，
-- 将用户的邮箱标记为已确认
