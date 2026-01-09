/**
 * 手机号登录
 *
 * 功能：
 * 1. 验证验证码
 * 2. 查询或创建用户
 * 3. 标记验证码已使用
 * 4. 返回用户信息
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

interface SignInRequest {
  phone: string
  code: string
  device_id?: string
}

interface UserProfile {
  id: string
  phone: string
  has_api_key: boolean
  created_at: string
}

serve(async (req) => {
  const FUNCTION_NAME = 'sign-in-phone'

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
    const { phone, code, device_id }: SignInRequest = await req.json()

    logRequest(FUNCTION_NAME, { phone, device_id })

    // 验证必填字段
    const validation = validateRequired({ phone, code }, ['phone', 'code'])
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return errorResponse('手机号格式不正确')
    }

    // ==================== 步骤1: 验证验证码 ====================
    console.log('📋 步骤1: 验证验证码...')

    const { data: codeRecord, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (codeError || !codeRecord) {
      logError(FUNCTION_NAME, codeError?.message || '验证码无效或已过期')
      return errorResponse('验证码无效或已过期')
    }

    console.log('✅ 验证码验证通过')

    // ==================== 步骤2: 查询或创建用户 ====================
    console.log('👤 步骤2: 查询或创建用户...')

    // 查询用户
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    let user: UserProfile

    if (profileError || !profile) {
      // 创建新用户
      console.log('⚠️  用户不存在，创建新用户...')

      const userId = crypto.randomUUID()

      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: userId,
            user_id: userId,
            phone: phone,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (createError) {
        logError(FUNCTION_NAME, createError.message)
        return errorResponse('创建用户失败: ' + createError.message)
      }

      user = newProfile
      console.log('✅ 用户创建成功:', user.id)
    } else {
      user = profile
      console.log('✅ 用户已存在:', user.id)
    }

    // ==================== 步骤3: 标记验证码已使用 ====================
    console.log('✅ 步骤3: 标记验证码已使用...')

    const { error: updateError } = await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', codeRecord.id)

    if (updateError) {
      logError(FUNCTION_NAME, updateError.message)
      // 不影响登录流程，继续执行
    }

    // ==================== 步骤4: 返回用户信息 ====================
    const result = {
      id: user.id,
      phone: user.phone,
      has_api_key: user.has_api_key || false
    }

    logSuccess(FUNCTION_NAME, { user_id: user.id })

    return successResponse(result)
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message || '登录失败', 500)
  }
})
