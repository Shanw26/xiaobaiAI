import { createClient } from '@supabase/supabase-js';

// Supabase 配置（从环境变量读取）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// 调试输出
console.log('🔧 [SupabaseClient] 环境变量加载状态:', {
  hasUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  hasServiceRoleKey: !!supabaseServiceRoleKey,
  urlPrefix: supabaseUrl?.substring(0, 20) + '...',
  anonKeyPrefix: supabaseAnonKey?.substring(0, 20) + '...',
  serviceRoleKeyPrefix: supabaseServiceRoleKey?.substring(0, 20) + '...'
});

// 创建普通 Supabase 客户端（用于前端）
// ⚠️ 前端只能使用 Anon Key，受 RLS 策略限制
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 创建管理员 Supabase 客户端（仅用于 Electron 主进程）
// ⚠️ Service Role Key 绕过 RLS，只能在服务端使用！
// ⚠️ 前端代码禁止使用此客户端！
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 兼容旧的变量名
export const supabaseServiceKey = supabaseAdmin;

export default supabase;
