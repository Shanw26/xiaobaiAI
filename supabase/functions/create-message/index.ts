/**
 * 创建消息
 *
 * 功能：
 * - 向对话中添加新消息
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

interface CreateMessageRequest {
  conversationId: string
  message: {
    id?: string
    role: string
    content: string
    thinking?: string
    files?: any
    createdAt?: string
  }
}

serve(async (req) => {
  const FUNCTION_NAME = 'create-message'

  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    const { conversationId, message }: CreateMessageRequest = await req.json()

    logRequest(FUNCTION_NAME, { conversationId, message })

    const validation = validateRequired(
      { conversationId, message },
      ['conversationId', 'message']
    )
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        id: message.id || Date.now().toString(),
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        thinking: message.thinking,
        files: message.files ? JSON.stringify(message.files) : null,
        created_at: message.createdAt || new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      logError(FUNCTION_NAME, error.message)
      return errorResponse(error.message)
    }

    logSuccess(FUNCTION_NAME, { message_id: data.id })

    return successResponse(data)
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message, 500)
  }
})
