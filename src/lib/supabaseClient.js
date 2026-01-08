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

// 🔥 v2.10.18 修复：检查环境变量是否存在
// 如果环境变量不存在，返回空客户端（避免应用崩溃）
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ [SupabaseClient] Supabase 环境变量未配置，云功能将不可用');
  console.warn('⚠️ [SupabaseClient] 请设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 环境变量');
}

// 创建普通 Supabase 客户端（用于前端）
// ⚠️ 前端只能使用 Anon Key，受 RLS 策略限制
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// 创建管理员 Supabase 客户端（仅用于 Electron 主进程）
// ⚠️ Service Role Key 绕过 RLS，只能在服务端使用！
// ⚠️ 前端代码禁止使用此客户端！
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// 兼容旧的变量名
export const supabaseServiceKey = supabaseAdmin;

export default supabase;
