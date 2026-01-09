/**
 * 加载对话历史
 *
 * 功能：
 * - 游客：加载该设备的对话
 * - 登录用户：加载该用户的对话
 * - 为每个对话加载消息
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

interface LoadConversationsRequest {
  user_id?: string
  device_id: string
}

serve(async (req) => {
  const FUNCTION_NAME = 'load-conversations'

  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    const { user_id, device_id }: LoadConversationsRequest = await req.json()

    logRequest(FUNCTION_NAME, { user_id, device_id })

    const validation = validateRequired({ device_id }, ['device_id'])
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    let conversations
    let conversationsError

    if (user_id) {
      // 登录用户：只查询 user_id 匹配的对话
      console.log('✅ 当前用户ID:', user_id)

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user_id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      conversations = data
      conversationsError = error
    } else {
      // 游客模式：只获取该设备的对话
      console.log('👤 游客模式，加载设备对话')

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('device_id', device_id)
        .is('user_id', null)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      conversations = data
      conversationsError = error
    }

    if (conversationsError) {
      logError(FUNCTION_NAME, conversationsError.message)
      return errorResponse(conversationsError.message)
    }

    console.log(`✅ 找到 ${conversations?.length || 0} 个对话`)

    // 为每个对话获取消息
    const conversationsWithMessages = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true })

        return {
          id: conv.id,
          title: conv.title,
          createdAt: conv.created_at,
          model: conv.model,
          messages: (messages || []).map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            thinking: msg.thinking,
            files: msg.files ? JSON.parse(msg.files) : undefined,
            createdAt: msg.created_at
          }))
        }
      })
    )

    logSuccess(FUNCTION_NAME, { count: conversationsWithMessages.length })

    return successResponse(conversationsWithMessages)
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message, 500)
  }
})
