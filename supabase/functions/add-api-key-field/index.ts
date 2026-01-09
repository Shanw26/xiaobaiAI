// Edge Function: 添加 api_key 字段到 user_profiles 表
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    console.log('🔧 开始添加 api_key 字段...');

    // 执行 SQL 添加字段
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS api_key TEXT;
        COMMENT ON COLUMN user_profiles.api_key IS '用户自己的 API Key';
      `
    });

    if (error) {
      console.error('❌ 添加字段失败:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ api_key 字段添加成功');

    return new Response(
      JSON.stringify({ success: true, message: 'api_key 字段已添加' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ 执行异常:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
