/**
 * 创建对话
 *
 * 功能：
 * - 创建新对话记录
 * - 游客：只记录 device_id
 * - 登录用户：记录 user_id 和 device_id
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

interface CreateConversationRequest {
  conversation: {
    id: string
    title: string
    model?: string
    createdAt?: string
  }
  user_id?: string
  device_id: string
}

serve(async (req) => {
  const FUNCTION_NAME = 'create-conversation'

  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    const { conversation, user_id, device_id }: CreateConversationRequest = await req.json()

    logRequest(FUNCTION_NAME, { conversation, user_id, device_id })

    const validation = validateRequired(
      { conversation, device_id },
      ['conversation', 'device_id']
    )
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    // 准备插入数据
    const insertData: any = {
      id: conversation.id,
      title: conversation.title,
      model: conversation.model || 'claude-3-5-sonnet-20241022',
      created_at: conversation.createdAt || new Date().toISOString(),
      device_id: device_id
    }

    // 如果用户已登录，添加 user_id
    if (user_id) {
      insertData.user_id = user_id
      console.log('✅ 用户ID:', user_id)
    } else {
      console.log('👤 游客模式，仅记录设备ID')
    }

    console.log('准备插入数据:', JSON.stringify(insertData, null, 2))

    // 创建对话
    const { data, error } = await supabase
      .from('conversations')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      logError(FUNCTION_NAME, error.message)
      return errorResponse(error.message)
    }

    logSuccess(FUNCTION_NAME, { conversation_id: data.id })

    return successResponse(data)
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message, 500)
  }
})
