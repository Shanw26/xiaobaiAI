/**
 * 管理登录用户的每日使用次数限制
 *
 * 功能：
 * - 获取用户每日使用状态
 * - 增加使用次数
 * - 检查是否可以使用
 * - 自动重置每日计数
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  supabase,
  corsHeaders,
  handleOptions,
  successResponse,
  errorResponse,
  validateMethod,
  logRequest,
  logSuccess,
  logError
} from '../_shared/_supabaseClient.ts'

interface DailyUsageRequest {
  action: 'get' | 'increment' | 'check' | 'set-limit'
  user_id: string
  limit?: number // 设置新的限制（仅用于 set-limit）
}

serve(async (req) => {
  const FUNCTION_NAME = 'user-daily-usage'

  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    const { action, user_id, limit }: DailyUsageRequest = await req.json()

    logRequest(FUNCTION_NAME, { action, user_id, limit })

    // 根据不同的 action 执行不同的操作
    switch (action) {
      case 'get':
        return await getDailyUsage(user_id)
      case 'increment':
        return await incrementDailyUsage(user_id)
      case 'check':
        return await checkDailyUsage(user_id)
      case 'set-limit':
        return await setDailyLimit(user_id, limit!)
      default:
        return errorResponse('无效的操作类型', 400)
    }
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message, 500)
  }
})

/**
 * 获取用户每日使用状态
 */
async function getDailyUsage(userId: string) {
  const FUNCTION_NAME = 'user-daily-usage'

  // 先获取或创建用户记录
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('daily_limit, daily_used, last_reset_date, has_api_key')  // 🔥 v2.11.5 新增：查询 has_api_key
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    logError(FUNCTION_NAME, `获取用户信息失败: ${error.message}`)
    return errorResponse(error.message)
  }

  // 如果用户不存在，创建默认记录
  if (!profile) {
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        phone: '', // 占位符，实际应该在注册时设置
        daily_limit: 5,
        daily_used: 0,
        last_reset_date: new Date().toISOString().split('T')[0],
        has_api_key: false  // 🔥 v2.11.5 新增：默认没有 API Key
      })
      .select('daily_limit, daily_used, last_reset_date, has_api_key')  // 🔥 v2.11.5 新增
      .single()

    if (insertError) {
      logError(FUNCTION_NAME, `创建用户记录失败: ${insertError.message}`)
      return errorResponse(insertError.message)
    }

    logSuccess(FUNCTION_NAME, {
      daily_limit: newProfile.daily_limit,
      daily_used: newProfile.daily_used,
      remaining: newProfile.daily_limit
    })

    return successResponse({
      dailyLimit: newProfile.daily_limit,
      dailyUsed: newProfile.daily_used,
      remaining: newProfile.daily_limit,
      lastResetDate: newProfile.last_reset_date,
      has_api_key: newProfile.has_api_key  // 🔥 v2.11.5 新增
    })
  }

  // 检查是否需要重置（跨天）
  const today = new Date().toISOString().split('T')[0]
  let dailyUsed = profile.daily_used
  let lastResetDate = profile.last_reset_date
  const hasApiKey = profile.has_api_key || false  // 🔥 v2.11.5 新增：保存 has_api_key 状态

  if (lastResetDate !== today) {
    // 跨天了，重置计数
    const { data: updated, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        daily_used: 0,
        last_reset_date: today
      })
      .eq('user_id', userId)
      .select('daily_limit, daily_used, last_reset_date, has_api_key')  // 🔥 v2.11.5 新增
      .single()

    if (updateError) {
      logError(FUNCTION_NAME, `重置计数失败: ${updateError.message}`)
      return errorResponse(updateError.message)
    }

    dailyUsed = updated.daily_used
    lastResetDate = updated.last_reset_date

    logSuccess(FUNCTION_NAME, {
      daily_limit: updated.daily_limit,
      daily_used: updated.daily_used,
      remaining: updated.daily_limit,
      reset: true
    })
  } else {
    logSuccess(FUNCTION_NAME, {
      daily_limit: profile.daily_limit,
      daily_used: profile.daily_used,
      remaining: profile.daily_limit - profile.daily_used
    })
  }

  return successResponse({
    dailyLimit: profile.daily_limit,
    dailyUsed: dailyUsed,
    remaining: profile.daily_limit - dailyUsed,
    lastResetDate: lastResetDate,
    has_api_key: hasApiKey  // 🔥 v2.11.5 新增：返回 has_api_key
  })
}

/**
 * 增加使用次数
 */
async function incrementDailyUsage(userId: string) {
  const FUNCTION_NAME = 'user-daily-usage'

  // 先获取当前状态
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('daily_limit, daily_used, last_reset_date')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    logError(FUNCTION_NAME, `获取用户信息失败: ${error.message}`)
    return errorResponse(error.message)
  }

  if (!profile) {
    // 用户不存在，创建新记录并使用一次
    const today = new Date().toISOString().split('T')[0]
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        phone: '',
        daily_limit: 5,
        daily_used: 1,
        last_reset_date: today
      })
      .select('daily_limit, daily_used, last_reset_date')
      .single()

    if (insertError) {
      logError(FUNCTION_NAME, `创建用户记录失败: ${insertError.message}`)
      return errorResponse(insertError.message)
    }

    logSuccess(FUNCTION_NAME, {
      daily_limit: newProfile.daily_limit,
      daily_used: newProfile.daily_used,
      remaining: newProfile.daily_limit - newProfile.daily_used
    })

    return successResponse({
      dailyLimit: newProfile.daily_limit,
      dailyUsed: newProfile.daily_used,
      remaining: newProfile.daily_limit - newProfile.daily_used,
      lastResetDate: newProfile.last_reset_date
    })
  }

  const today = new Date().toISOString().split('T')[0]
  let dailyUsed = profile.daily_used
  let lastResetDate = profile.last_reset_date

  // 检查是否跨天
  if (lastResetDate !== today) {
    // 跨天，重置并设置为1
    const { data: updated, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        daily_used: 1,
        last_reset_date: today
      })
      .eq('user_id', userId)
      .select('daily_limit, daily_used, last_reset_date')
      .single()

    if (updateError) {
      logError(FUNCTION_NAME, `重置并增加计数失败: ${updateError.message}`)
      return errorResponse(updateError.message)
    }

    logSuccess(FUNCTION_NAME, {
      daily_limit: updated.daily_limit,
      daily_used: updated.daily_used,
      remaining: updated.daily_limit - updated.daily_used,
      reset: true
    })

    return successResponse({
      dailyLimit: updated.daily_limit,
      dailyUsed: updated.daily_used,
      remaining: updated.daily_limit - updated.daily_used,
      lastResetDate: updated.last_reset_date
    })
  }

  // 检查是否超出限制
  if (dailyUsed >= profile.daily_limit) {
    logError(FUNCTION_NAME, '超出每日使用限制')
    return errorResponse('今日使用次数已达上限', 429)
  }

  // 增加使用次数
  const { data: updated, error: updateError } = await supabase
    .from('user_profiles')
    .update({
      daily_used: dailyUsed + 1
    })
    .eq('user_id', userId)
    .select('daily_limit, daily_used, last_reset_date')
    .single()

  if (updateError) {
    logError(FUNCTION_NAME, `增加使用次数失败: ${updateError.message}`)
    return errorResponse(updateError.message)
  }

  logSuccess(FUNCTION_NAME, {
    daily_limit: updated.daily_limit,
    daily_used: updated.daily_used,
    remaining: updated.daily_limit - updated.daily_used
  })

  return successResponse({
    dailyLimit: updated.daily_limit,
    dailyUsed: updated.daily_used,
    remaining: updated.daily_limit - updated.daily_used,
    lastResetDate: updated.last_reset_date
  })
}

/**
 * 检查是否可以使用
 */
async function checkDailyUsage(userId: string) {
  const result = await getDailyUsage(userId)

  if (!result.success) {
    return result
  }

  const data = result.data as any

  if (data.remaining <= 0) {
    return errorResponse('今日使用次数已达上限', 429)
  }

  return successResponse({
    canUse: true,
    remaining: data.remaining
  })
}

/**
 * 设置新的每日限制
 */
async function setDailyLimit(userId: string, newLimit: number) {
  const FUNCTION_NAME = 'user-daily-usage'

  if (newLimit < 1 || newLimit > 1000) {
    return errorResponse('限制必须在 1-1000 之间', 400)
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      daily_limit: newLimit
    })
    .eq('user_id', userId)
    .select('daily_limit')
    .single()

  if (error) {
    logError(FUNCTION_NAME, `设置限制失败: ${error.message}`)
    return errorResponse(error.message)
  }

  logSuccess(FUNCTION_NAME, {
    daily_limit: data.daily_limit,
    new_limit: newLimit
  })

  return successResponse({
    dailyLimit: data.daily_limit,
    message: `每日限制已设置为 ${newLimit} 次`
  })
}
