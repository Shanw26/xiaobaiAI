/**
 * Supabase Edge Functions - 通用工具模块
 *
 * 功能：
 * 1. 数据库客户端封装（service role 权限）
 * 2. CORS 处理
 * 3. 标准化响应格式
 * 4. 错误处理
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// ==================== 类型定义 ====================

interface SuccessResponse<T = any> {
  success: true
  data: T
}

interface ErrorResponse {
  success: false
  error: string
}

type StandardResponse<T = any> = SuccessResponse<T> | ErrorResponse

interface RequestContext {
  user_id?: string
  device_id?: string
}

// ==================== 数据库客户端 ====================

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('缺少环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * 创建 Supabase 客户端（service role 权限）
 * 用于在 Edge Functions 中操作数据库
 */
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// ==================== CORS 处理 ====================

/**
 * CORS 响应头
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

/**
 * 处理 OPTIONS 预检请求
 */
export function handleOptions(): Response {
  return new Response('ok', { headers: corsHeaders })
}

// ==================== 标准化响应 ====================

/**
 * 成功响应
 */
export function successResponse<T>(data: T, status: number = 200): Response {
  return new Response(
    JSON.stringify({ success: true, data }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

/**
 * 错误响应
 */
export function errorResponse(error: string, status: number = 400): Response {
  console.error('❌ [Edge Function] 错误:', error)
  return new Response(
    JSON.stringify({ success: false, error }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// ==================== 请求验证 ====================

/**
 * 验证请求方法
 */
export function validateMethod(req: Request, allowedMethods: string[]): boolean {
  return allowedMethods.includes(req.method)
}

/**
 * 验证必填字段
 */
export function validateRequired<T extends Record<string, any>>(
  body: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missing?: string } {
  for (const field of requiredFields) {
    if (!body[field]) {
      return { valid: false, missing: String(field) }
    }
  }
  return { valid: true }
}

// ==================== 用户身份识别 ====================

/**
 * 从请求中提取用户身份
 */
export async function extractContext(req: Request): Promise<RequestContext> {
  try {
    const { user_id, device_id } = await req.json()
    return { user_id, device_id }
  } catch {
    return {}
  }
}

// ==================== 数据库操作辅助函数 ====================

/**
 * 游客模式：查询设备数据
 */
export async function queryByDevice<T>(
  table: string,
  deviceId: string,
  columns?: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const query = supabase.from(table).select(columns || '*')
    const { data, error } = await query
      .eq('device_id', deviceId)
      .is('user_id', null)
      .maybeSingle()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

/**
 * 登录用户：查询用户数据
 */
export async function queryByUser<T>(
  table: string,
  userId: string,
  columns?: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const query = supabase.from(table).select(columns || '*')
    const { data, error } = await query
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

/**
 * 智能查询：自动判断游客或登录用户
 */
export async function querySmart<T>(
  table: string,
  userId: string | undefined,
  deviceId: string,
  columns?: string
): Promise<{ data: T | null; error: string | null }> {
  if (userId) {
    return queryByUser<T>(table, userId, columns)
  } else {
    return queryByDevice<T>(table, deviceId, columns)
  }
}

// ==================== 日志辅助函数 ====================

/**
 * 日志前缀
 */
export function logPrefix(functionName: string): string {
  return `⚡ [${functionName}]`
}

/**
 * 记录请求开始
 */
export function logRequest(functionName: string, data?: any): void {
  console.log(`${logPrefix(functionName)} 收到请求`, data ? JSON.stringify(data) : '')
}

/**
 * 记录请求成功
 */
export function logSuccess(functionName: string, data?: any): void {
  console.log(`${logPrefix(functionName)} ✅ 成功`, data ? JSON.stringify(data) : '')
}

/**
 * 记录请求失败
 */
export function logError(functionName: string, error: any): void {
  console.error(`${logPrefix(functionName)} ❌ 失败:`, error)
}
