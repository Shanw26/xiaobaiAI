/**
 * 删除对话（软删除）
 *
 * 功能：
 * - 标记对话为已删除（is_deleted = true）
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

interface DeleteConversationRequest {
  conversationId: string
}

serve(async (req) => {
  const FUNCTION_NAME = 'delete-conversation'

  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    const { conversationId }: DeleteConversationRequest = await req.json()

    logRequest(FUNCTION_NAME, { conversationId })

    const validation = validateRequired({ conversationId }, ['conversationId'])
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    const { error } = await supabase
      .from('conversations')
      .update({ is_deleted: true })
      .eq('id', conversationId)

    if (error) {
      logError(FUNCTION_NAME, error.message)
      return errorResponse(error.message)
    }

    logSuccess(FUNCTION_NAME)

    return successResponse({ success: true })
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message, 500)
  }
})
