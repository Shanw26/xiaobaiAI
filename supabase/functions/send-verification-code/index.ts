/**
 * 发送验证码
 *
 * 功能：
 * 1. 生成6位随机验证码
 * 2. 调用短信 Edge Function 发送验证码
 * 3. 保存验证码到数据库（5分钟有效期）
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  supabase,
  corsHeaders,
  handleOptions,
  successResponse,
  errorResponse,
  validateMethod,
  validateRequired,
  logRequest,
  logSuccess,
  logError
} from '../_shared/_supabaseClient.ts'

interface SendCodeRequest {
  phone: string
}

serve(async (req) => {
  const FUNCTION_NAME = 'send-verification-code'

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    // 验证请求方法
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    // 解析请求体
    const { phone }: SendCodeRequest = await req.json()

    logRequest(FUNCTION_NAME, { phone })

    // 验证必填字段
    const validation = validateRequired({ phone }, ['phone'])
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return errorResponse('手机号格式不正确')
    }

    // ==================== 步骤1: 生成验证码 ====================
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    console.log('✅ 验证码生成成功:', code)

    // ==================== 步骤2: 调用短信服务 ====================
    console.log('📤 调用短信服务...')

    const smsFunctionUrl = `${Deno.env.get('SUPABASE_URL')!.replace('/rest/v1', '')}/functions/v1/send-sms`

    const smsResponse = await fetch(smsFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
      },
      body: JSON.stringify({ phone, code })
    })

    const smsResult = await smsResponse.json()
    console.log('📥 短信服务响应:', smsResult)

    if (!smsResult.success) {
      logError(FUNCTION_NAME, smsResult.error || '发送短信失败')
      return errorResponse(smsResult.error || '发送短信失败')
    }

    // ==================== 步骤3: 保存验证码到数据库 ====================
    console.log('💾 保存验证码到数据库...')

    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        phone,
        code,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5分钟后过期
        used: false
      })

    if (dbError) {
      logError(FUNCTION_NAME, dbError.message)
      return errorResponse('保存验证码失败')
    }

    logSuccess(FUNCTION_NAME)

    // 生产环境不返回验证码
    return successResponse({ message: '验证码已发送' })
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message || '发送失败', 500)
  }
})
