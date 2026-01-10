/**
 * 获取AI记忆
 *
 * 功能：
 * - 游客：查询设备的AI记忆
 * - 登录用户：查询用户的AI记忆
 * - 如果不存在，返回空字符串
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

interface GetAiMemoryRequest {
  user_id?: string
  device_id: string
}

serve(async (req) => {
  const FUNCTION_NAME = 'get-ai-memory'

  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    const { user_id, device_id }: GetAiMemoryRequest = await req.json()

    logRequest(FUNCTION_NAME, { user_id, device_id })

    const validation = validateRequired({ device_id }, ['device_id'])
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    let query = supabase.from('ai_memory').select('content')

    if (user_id) {
      query = query.eq('user_id', user_id)
    } else {
      query = query.eq('device_id', device_id)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      logError(FUNCTION_NAME, error.message)
      // 如果记录不存在，返回空字符串
      if (error.code === 'PGRST116') {
        logSuccess(FUNCTION_NAME, { content: '' })
        return successResponse({ content: '' })
      }
      return errorResponse(error.message)
    }

    const content = data?.content || ''
    logSuccess(FUNCTION_NAME, { has_content: !!content })

    return successResponse({ content })
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message, 500)
  }
})
