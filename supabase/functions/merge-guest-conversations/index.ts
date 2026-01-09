/**
 * 合并游客对话到登录用户
 *
 * 功能：
 * - 登录后调用，将该设备的游客对话关联到登录用户
 * - 使用数据库函数 merge_guest_conversations_to_user
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

interface MergeGuestConversationsRequest {
  user_id: string
  device_id: string
}

serve(async (req) => {
  const FUNCTION_NAME = 'merge-guest-conversations'

  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    const { user_id, device_id }: MergeGuestConversationsRequest = await req.json()

    logRequest(FUNCTION_NAME, { user_id, device_id })

    const validation = validateRequired(
      { user_id, device_id },
      ['user_id', 'device_id']
    )
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    // 使用数据库函数来合并（避免 RLS 递归问题）
    const { data, error } = await supabase.rpc('merge_guest_conversations_to_user', {
      p_device_id: device_id,
      p_user_id: user_id
    })

    if (error) {
      logError(FUNCTION_NAME, error.message)
      return errorResponse(error.message)
    }

    logSuccess(FUNCTION_NAME, { merged_count: data || 0 })

    return successResponse({ count: data || 0 })
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message, 500)
  }
})
