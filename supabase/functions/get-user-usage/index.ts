/**
 * 获取用户使用次数
 *
 * 功能：
 * - 游客：查询设备使用次数
 * - 登录用户：查询用户使用次数
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
  logError,
  querySmart
} from '../_shared/_supabaseClient.ts'

interface GetUsageRequest {
  user_id?: string
  device_id: string
}

serve(async (req) => {
  const FUNCTION_NAME = 'get-user-usage'

  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    const { user_id, device_id }: GetUsageRequest = await req.json()

    logRequest(FUNCTION_NAME, { user_id, device_id })

    const validation = validateRequired({ device_id }, ['device_id'])
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    // 智能查询：游客或登录用户
    const { data, error } = await querySmart<{ used_count: number }>(
      'guest_usage',
      user_id,
      device_id,
      'used_count'
    )

    if (error) {
      // 如果记录不存在，返回 0
      if (error.includes('PGRST116')) {
        logSuccess(FUNCTION_NAME, { used_count: 0 })
        return successResponse({ used_count: 0 })
      }
      logError(FUNCTION_NAME, error)
      return errorResponse(error)
    }

    const usedCount = data?.used_count || 0
    logSuccess(FUNCTION_NAME, { used_count: usedCount })

    return successResponse({ used_count: usedCount })
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message, 500)
  }
})
