/**
 * 合并游客用户信息到登录用户
 *
 * 功能：
 * - 登录后调用，将该设备的游客用户信息关联到登录用户
 * - 如果登录用户已有数据，删除游客数据
 * - 如果登录用户没有数据，将游客数据关联到登录用户
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

interface MergeGuestUserInfoRequest {
  user_id: string
  device_id: string
}

serve(async (req) => {
  const FUNCTION_NAME = 'merge-guest-user-info'

  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    if (!validateMethod(req, ['POST'])) {
      return errorResponse('方法不允许', 405)
    }

    const { user_id, device_id }: MergeGuestUserInfoRequest = await req.json()

    logRequest(FUNCTION_NAME, { user_id, device_id })

    const validation = validateRequired(
      { user_id, device_id },
      ['user_id', 'device_id']
    )
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing}`)
    }

    // 1. 查询游客时期的用户信息（device_id 有值，user_id 为 null）
    const { data: guestData, error: guestError } = await supabase
      .from('user_info')
      .select('*')
      .eq('device_id', device_id)
      .is('user_id', null)
      .maybeSingle()

    if (guestError) {
      logError(FUNCTION_NAME, guestError.message)
      return errorResponse(guestError.message)
    }

    // 如果没有游客数据，直接返回成功
    if (!guestData) {
      console.log('ℹ️  没有游客用户信息需要合并')
      return successResponse({ success: true })
    }

    // 2. 查询登录用户是否已有用户信息（user_id 有值，device_id 为 null）
    const { data: userData, error: userError } = await supabase
      .from('user_info')
      .select('*')
      .eq('user_id', user_id)
      .is('device_id', null)
      .maybeSingle()

    if (userError) {
      logError(FUNCTION_NAME, userError.message)
      return errorResponse(userError.message)
    }

    if (userData) {
      // 登录用户已有数据，删除游客数据（保留登录用户的）
      console.log('🗑️  登录用户已有数据，删除游客数据')
      const { error: deleteError } = await supabase
        .from('user_info')
        .delete()
        .eq('id', guestData.id)

      if (deleteError) {
        logError(FUNCTION_NAME, deleteError.message)
        return errorResponse(deleteError.message)
      }
    } else {
      // 登录用户没有数据，将游客数据的 user_id 更新为登录用户
      console.log('🔄 将游客数据关联到登录用户')
      const { error: updateError } = await supabase
        .from('user_info')
        .update({ user_id: user_id, device_id: null })
        .eq('id', guestData.id)

      if (updateError) {
        logError(FUNCTION_NAME, updateError.message)
        return errorResponse(updateError.message)
      }
    }

    logSuccess(FUNCTION_NAME)

    return successResponse({ success: true })
  } catch (error: any) {
    logError(FUNCTION_NAME, error)
    return errorResponse(error.message, 500)
  }
})
