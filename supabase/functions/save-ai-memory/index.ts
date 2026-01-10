/**
 * 保存AI记忆
 *
 * 功能：
 * - 删除旧记录（避免 UNIQUE 冲突）
 * - 插入新记录
 * - 游客：基于 device_id
 * - 登录用户：基于 user_id
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

interface SaveAiMemoryRequest {
  content: string
  user_id?: string
  device_id: string
}

serve(async (req) => {
  const FUNCTION_NAME = 'save-ai-memory'

  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    const { content, user_id, device_id }: SaveAiMemoryRequest = await req.json()

    logRequest(FUNCTION_NAME, { user_id, device_id, has_content: !!content })

    const validation = validateRequired(
      { content, device_id },
      ['content', 'device_id']
    )
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    // 先尝试删除可能存在的旧记录（避免 UNIQUE 冲突）
    if (user_id) {
      // 登录用户：删除该用户的所有记录
      await supabase
        .from('ai_memory')
        .delete()
        .eq('user_id', user_id)
    } else {
      // 游客：删除该设备的所有记录
      await supabase
        .from('ai_memory')
        .delete()
        .eq('device_id', device_id)
    }

    // 插入新记录
    const insertData = {
      user_id: user_id || null,
      device_id: user_id ? null : device_id,
      content: content,
      updated_at: new Date().toISOString()
    }

    console.log('插入 AI 记忆数据:', insertData)

    const { data, error } = await supabase
      .from('ai_memory')
      .insert(insertData)
      .select()

    if (error) {
      logError(FUNCTION_NAME, error.message)
      return errorResponse(error.message)
    }

    logSuccess(FUNCTION_NAME)

    return successResponse(data)
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message, 500)
  }
})
