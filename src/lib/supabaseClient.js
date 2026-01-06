import { createClient } from '@supabase/supabase-js';

// Supabase 配置
const supabaseUrl = 'https://cnszooaxwxatezodbbxq.supabase.co';
const supabaseAnonKey = 'sb_publishable_yL-VG_zetVGywK__-nGtRw_kjmqP3jQ';

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Personal Access Token（用于服务端操作）
export const supabaseServiceKey = 'sbp_7eb9c71d4c5416a5f776abd29a20334efc49e4cb';

export default supabase;
