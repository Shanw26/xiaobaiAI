/**
 * 更新消息
 *
 * 功能：
 * - 更新消息的 content 和 thinking
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

interface UpdateMessageRequest {
  conversationId: string
  messageId: string
  updates: {
    content?: string
    thinking?: string
  }
}

serve(async (req) => {
  const FUNCTION_NAME = 'update-message'

  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    const { conversationId, messageId, updates }: UpdateMessageRequest = await req.json()

    logRequest(FUNCTION_NAME, { conversationId, messageId, updates })

    const validation = validateRequired(
      { conversationId, messageId },
      ['conversationId', 'messageId']
    )
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    const updateData: any = {}

    // 只更新提供的字段
    if (updates.content !== undefined) {
      updateData.content = updates.content
    }

    if (updates.thinking !== undefined) {
      updateData.thinking = updates.thinking
    }

    const { error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('id', messageId)
      .eq('conversation_id', conversationId)

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
