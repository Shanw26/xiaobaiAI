/**
 * 增加用户使用次数
 *
 * 功能：
 * - 游客：记录设备使用次数
 * - 登录用户：记录用户使用次数
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

interface IncrementUsageRequest {
  user_id?: string
  device_id: string
}

serve(async (req) => {
  const FUNCTION_NAME = 'increment-usage'

  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    const { user_id, device_id }: IncrementUsageRequest = await req.json()

    logRequest(FUNCTION_NAME, { user_id, device_id })

    const validation = validateRequired({ device_id }, ['device_id'])
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    let usedCount: number
    let remaining: number

    if (!user_id) {
      // ==================== 游客模式 ====================
      console.log('ℹ️  游客模式，记录设备使用次数')

      // 查询现有记录
      const { data: existing } = await supabase
        .from('guest_usage')
        .select('used_count, remaining')
        .eq('device_id', device_id)
        .is('user_id', null)
        .maybeSingle()

      if (existing) {
        // 更新现有记录
        usedCount = existing.used_count + 1
        remaining = Math.max(0, existing.remaining - 1)

        const { error: updateError } = await supabase
          .from('guest_usage')
          .update({
            used_count: usedCount,
            remaining: remaining,
            last_used_at: new Date().toISOString()
          })
          .eq('device_id', device_id)
          .is('user_id', null)

        if (updateError) {
          logError(FUNCTION_NAME, updateError.message)
          return errorResponse(updateError.message)
        }
      } else {
        // 创建新记录
        usedCount = 1
        remaining = 9

        const { error: createError } = await supabase
          .from('guest_usage')
          .insert({
            user_id: null,
            device_id: device_id,
            used_count: usedCount,
            remaining: remaining,
            last_used_at: new Date().toISOString()
          })

        if (createError) {
          logError(FUNCTION_NAME, createError.message)
          return errorResponse(createError.message)
        }
      }
    } else {
      // ==================== 登录用户 ====================
      console.log('ℹ️  登录用户，记录用户使用次数')

      // 尝试使用数据库函数
      const { data, error } = await supabase.rpc('increment_user_usage', {
        p_user_id: user_id,
        p_device_id: device_id
      })

      if (error) {
        // 函数不存在，手动实现
        const { data: existing } = await supabase
          .from('guest_usage')
          .select('used_count, remaining')
          .eq('user_id', user_id)
          .maybeSingle()

        if (existing) {
          usedCount = existing.used_count + 1
          remaining = Math.max(0, existing.remaining - 1)

          const { error: updateError } = await supabase
            .from('guest_usage')
            .update({
              used_count: usedCount,
              remaining: remaining,
              last_used_at: new Date().toISOString()
            })
            .eq('user_id', user_id)

          if (updateError) {
            logError(FUNCTION_NAME, updateError.message)
            return errorResponse(updateError.message)
          }
        } else {
          usedCount = 1
          remaining = 9

          const { error: createError } = await supabase
            .from('guest_usage')
            .insert({
              user_id: user_id,
              device_id: device_id,
              used_count: usedCount,
              remaining: remaining,
              last_used_at: new Date().toISOString()
            })

          if (createError) {
            logError(FUNCTION_NAME, createError.message)
            return errorResponse(createError.message)
          }
        }
      } else {
        usedCount = data?.used_count || 0
        remaining = data?.remaining || 0
      }
    }

    logSuccess(FUNCTION_NAME, { used_count: usedCount, remaining })

    return successResponse({
      used_count: usedCount,
      remaining: remaining
    })
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message, 500)
  }
})
