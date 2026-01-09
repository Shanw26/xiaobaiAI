import { supabase, supabaseAdmin } from './supabaseClient';

// Edge Function URL 基础路径
const EDGE_FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// Supabase Anon Key（从环境变量读取）
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * 调用 Edge Function 的辅助函数
 * @param {string} functionName - Edge Function 名称
 * @param {object} data - 请求数据
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function callEdgeFunction(functionName, data) {
  try {
    const response = await fetch(`${EDGE_FUNCTIONS_BASE}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return { success: false, error: result.error || `HTTP ${response.status}` };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error(`❌ [Edge Function] ${functionName} 调用失败:`, error);
    return { success: false, error: error.message };
  }
}

// ==================== 辅助函数 ====================

/**
 * 检查 Supabase 是否可用
 * @returns {boolean}
 */
function isSupabaseAvailable() {
  const available = !!(supabase && supabaseAdmin);
  if (!available) {
    console.warn('⚠️ [云端服务] Supabase 未配置，云功能将不可用');
  }
  return available;
}

/**
 * 获取当前登录用户（从 localStorage）
 * @returns {object|null}
 */
function getCurrentUserSync() {
  try {
    const savedUser = localStorage.getItem('xiaobai_user');
    if (savedUser) {
      return JSON.parse(savedUser);
    }
    return null;
  } catch (error) {
    console.error('❌ [云端服务] 获取当前用户失败:', error);
    return null;
  }
}

/**
 * 获取设备ID
 */
async function getDeviceId() {
  try {
    const result = await window.electronAPI.getDeviceId();
    if (result.success) {
      return result.deviceId;
    }
    throw new Error(result.error);
  } catch (error) {
    console.error('获取设备ID失败:', error);
    // 降级方案：生成临时设备ID（基于 localStorage）
    let tempDeviceId = localStorage.getItem('temp_device_id');
    if (!tempDeviceId) {
      tempDeviceId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('temp_device_id', tempDeviceId);
    }
    return tempDeviceId;
  }
}

/**
 * 发送验证码（Edge Function 版本）
 * @param {string} phone - 手机号
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendVerificationCode(phone) {
  try {
    console.log('📱 [云端服务] 开始发送验证码:', phone);

    // 🔥 v2.10.27 Edge Function：调用 send-verification-code
    const result = await callEdgeFunction('send-verification-code', { phone });

    if (!result.success) {
      console.error('❌ [云端服务] 发送验证码失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ [云端服务] 验证码发送成功');
    return { success: true };
  } catch (error) {
    console.error('❌ [云端服务] 发送验证码异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 手机号登录（Edge Function 版本）
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function signInWithPhone(phone, code) {
  try {
    console.log('🔐 [云端服务] 开始登录流程');
    console.log('  - 手机号:', phone);
    console.log('  - 验证码:', code);

    // 🔥 v2.10.27 Edge Function：调用 sign-in-phone
    const result = await callEdgeFunction('sign-in-phone', { phone, code });

    if (!result.success) {
      console.error('❌ [云端服务] 登录失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log('🎉 [云端服务] 登录成功！');
    console.log('  - User ID:', result.data.id);
    console.log('  - Phone:', result.data.phone);

    return {
      success: true,
      user: result.data
    };
  } catch (error) {
    console.error('❌ [云端服务] 登录异常:', error);
    return { success: false, error: '登录失败: ' + error.message };
  }
}

/**
 * 获取当前用户信息
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  try {
    // 从 localStorage 读取用户信息
    const savedUser = localStorage.getItem('xiaobai_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      console.log('✅ [云端服务] 从 localStorage 读取用户信息:', user.phone);
      return user;
    }
    console.log('ℹ️ [云端服务] 未找到登录用户信息');
    return null;
  } catch (error) {
    console.error('❌ [云端服务] 获取当前用户失败:', error);
    return null;
  }
}

/**
 * 退出登录
 * @returns {Promise<boolean>}
 */
export async function signOut() {
  try {
    // 清除 localStorage 中的用户信息
    localStorage.removeItem('xiaobai_user');
    console.log('✅ [云端服务] 已清除登录状态');
    return true;
  } catch (error) {
    console.error('❌ [云端服务] 退出登录失败:', error);
    return false;
  }
}

// ==================== 用户使用次数管理 ====================

/**
 * 获取登录用户每日使用状态（Edge Function 版本）
 * @returns {Promise<{success: boolean, data?: {dailyLimit: number, dailyUsed: number, remaining: number, lastResetDate: string}, error?: string}>}
 */
export async function getDailyUsage() {
  try {
    console.log('📊 [云端服务] 获取登录用户每日使用状态');

    const user = getCurrentUserSync();
    if (!user || !user.id) {
      return { success: false, error: '用户未登录' };
    }

    // 调用 user-daily-usage Edge Function
    const result = await callEdgeFunction('user-daily-usage', {
      action: 'get',
      user_id: user.id
    });

    if (!result.success) {
      console.error('❌ [云端服务] 获取每日使用状态失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log(`✅ [云端服务] 每日使用 ${result.data.dailyUsed}/${result.data.dailyLimit}，剩余 ${result.data.remaining} 次`);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ [云端服务] 获取每日使用状态异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 增加登录用户每日使用次数（Edge Function 版本）
 * @returns {Promise<{success: boolean, data?: {dailyLimit: number, dailyUsed: number, remaining: number, lastResetDate: string}, error?: string}>}
 */
export async function incrementDailyUsage() {
  try {
    console.log('📊 [云端服务] 增加登录用户每日使用次数');

    const user = getCurrentUserSync();
    if (!user || !user.id) {
      return { success: false, error: '用户未登录' };
    }

    // 调用 user-daily-usage Edge Function
    const result = await callEdgeFunction('user-daily-usage', {
      action: 'increment',
      user_id: user.id
    });

    if (!result.success) {
      // 如果是 429 错误（超出限制），返回特殊标识
      if (result.error && result.error.includes('今日使用次数已达上限')) {
        console.log('⚠️ [云端服务] 今日使用次数已达上限');
        return { success: false, error: 'DAILY_LIMIT_REACHED', data: result.data };
      }
      console.error('❌ [云端服务] 增加使用次数失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ [云端服务] 使用次数更新成功');
    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ [云端服务] 增加使用次数异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 检查登录用户是否可以使用（Edge Function 版本）
 * @returns {Promise<{success: boolean, canUse?: boolean, remaining?: number, error?: string}>}
 */
export async function checkDailyUsage() {
  try {
    console.log('📊 [云端服务] 检查登录用户是否可使用');

    const user = getCurrentUserSync();
    if (!user || !user.id) {
      return { success: false, error: '用户未登录' };
    }

    // 调用 user-daily-usage Edge Function
    const result = await callEdgeFunction('user-daily-usage', {
      action: 'check',
      user_id: user.id
    });

    if (!result.success) {
      // 如果是 429 错误（超出限制），返回特殊标识
      if (result.error && result.error.includes('今日使用次数已达上限')) {
        console.log('⚠️ [云端服务] 今日使用次数已达上限');
        return { success: false, error: 'DAILY_LIMIT_REACHED' };
      }
      console.error('❌ [云端服务] 检查使用次数失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log(`✅ [云端服务] 可以使用，剩余 ${result.data.remaining} 次`);
    return { success: true, canUse: result.data.canUse, remaining: result.data.remaining };
  } catch (error) {
    console.error('❌ [云端服务] 检查使用次数异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取用户使用次数（Edge Function 版本）- 游客模式使用
 * @returns {Promise<{success: boolean, usedCount?: number, error?: string}>}
 */
export async function getUserUsageCount() {
  try {
    console.log('📊 [云端服务] 获取用户使用次数');

    const user = getCurrentUserSync();
    const deviceId = await getDeviceId();

    // 🔥 v2.10.27 Edge Function：调用 get-user-usage
    const result = await callEdgeFunction('get-user-usage', {
      user_id: user?.id,
      device_id: deviceId
    });

    if (!result.success) {
      console.error('❌ [云端服务] 获取使用次数失败:', result.error);
      return { success: false, error: result.error };
    }

    const usedCount = result.data.used_count || 0;
    console.log(`✅ [云端服务] 已使用 ${usedCount} 次`);
    return { success: true, usedCount };
  } catch (error) {
    console.error('❌ [云端服务] 获取使用次数异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 增加用户使用次数（Edge Function 版本）
 * @returns {Promise<{success: boolean, usedCount?: number, remaining?: number, error?: string}>}
 */
export async function incrementUserUsage() {
  try {
    console.log('📊 [云端服务] 增加用户使用次数');

    const user = getCurrentUserSync();
    const deviceId = await getDeviceId();

    // 🔥 v2.10.27 Edge Function：调用 increment-usage
    const result = await callEdgeFunction('increment-usage', {
      user_id: user?.id,
      device_id: deviceId
    });

    if (!result.success) {
      console.error('❌ [云端服务] 增加使用次数失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ [云端服务] 使用次数更新成功');
    return {
      success: true,
      usedCount: result.data.used_count,
      remaining: result.data.remaining
    };
  } catch (error) {
    console.error('❌ [云端服务] 增加使用次数异常:', error);
    return { success: false, error: error.message };
  }
}

// ==================== 对话历史云端操作 ====================

/**
 * 加载所有对话历史（Edge Function 版本）
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function loadConversations() {
  try {
    console.log('📥 [云端服务] 加载对话历史...');

    const deviceId = await getDeviceId();
    const user = getCurrentUserSync();

    // 🔥 v2.10.27 Edge Function：调用 load-conversations
    const result = await callEdgeFunction('load-conversations', {
      user_id: user?.id,
      device_id: deviceId
    });

    if (!result.success) {
      console.error('❌ [云端服务] 加载对话失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log(`✅ [云端服务] 成功加载 ${result.data?.length || 0} 个对话`);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ [云端服务] 加载对话异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 创建新对话（Edge Function 版本）
 * @param {object} conversation - 对话数据
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function createConversation(conversation) {
  try {
    console.log('📝 [云端服务] 创建新对话:', conversation.title);
    console.log('   对话ID:', conversation.id);

    const deviceId = await getDeviceId();
    const user = getCurrentUserSync();

    // 🔥 v2.10.27 Edge Function：调用 create-conversation
    const result = await callEdgeFunction('create-conversation', {
      conversation,
      user_id: user?.id,
      device_id: deviceId
    });

    if (!result.success) {
      console.error('❌ [云端服务] 创建对话失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ [云端服务] 对话创建成功, ID:', result.data.id);

    // 如果有消息，保存消息
    if (conversation.messages && conversation.messages.length > 0) {
      for (const message of conversation.messages) {
        await createMessage(result.data.id, message);
      }
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ [云端服务] 创建对话异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 创建消息（保存到云端）
 * @param {string} conversationId - 对话ID
 * @param {object} message - 消息数据
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function createMessage(conversationId, message) {
  try {
    console.log('💬 [云端服务] 创建消息到对话:', conversationId);
    console.log('   消息ID:', message.id);
    console.log('   消息角色:', message.role);
    console.log('   内容长度:', message.content?.length || 0);

    // 🔥 v2.10.27 Edge Function：调用 create-message
    const result = await callEdgeFunction('create-message', {
      conversationId: conversationId,
      message: {
        id: message.id || Date.now().toString(),
        role: message.role,
        content: message.content,
        thinking: message.thinking,
        files: message.files,
        createdAt: message.createdAt || new Date().toISOString()
      }
    });

    if (!result.success) {
      console.error('❌ [云端服务] 创建消息失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ [云端服务] 消息创建成功, ID:', result.data.id);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ [云端服务] 创建消息异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新消息（保存到云端）
 * @param {string} conversationId - 对话ID
 * @param {string} messageId - 消息ID
 * @param {object} updates - 更新数据（可以包含 content 和 thinking）
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateMessage(conversationId, messageId, updates) {
  try {
    console.log('📝 [云端服务] 更新消息:', messageId);

    // 🔥 v2.10.27 Edge Function：调用 update-message
    const result = await callEdgeFunction('update-message', {
      conversationId: conversationId,
      messageId: messageId,
      updates: updates
    });

    if (!result.success) {
      console.error('❌ [云端服务] 更新消息失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ [云端服务] 消息更新成功');
    return { success: true };
  } catch (error) {
    console.error('❌ [云端服务] 更新消息异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 删除对话（软删除，标记 is_deleted = true）
 * @param {string} conversationId - 对话ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteConversation(conversationId) {
  try {
    console.log('🗑️  [云端服务] 删除对话:', conversationId);

    // 🔥 v2.10.27 Edge Function：调用 delete-conversation
    const result = await callEdgeFunction('delete-conversation', {
      conversationId: conversationId
    });

    if (!result.success) {
      console.error('❌ [云端服务] 删除对话失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ [云端服务] 对话删除成功');
    return { success: true };
  } catch (error) {
    console.error('❌ [云端服务] 删除对话异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 合并游客对话到登录用户
 * 登录成功后调用，将该设备的游客对话关联到登录用户
 * @param {string} userId - 登录用户的ID
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export async function mergeGuestConversations(userId) {
  try {
    console.log('🔄 [云端服务] 合并游客对话到用户:', userId);

    // 🔥 v2.10.18 修复：检查 Supabase 是否可用
    if (!isSupabaseAvailable()) {
      return { success: false, error: 'Supabase 未配置', count: 0 };
    }

    const deviceId = await getDeviceId();
    console.log('📱 [云端服务] 设备ID:', deviceId);

    // 🔥 v2.10.27 Edge Function：调用 merge-guest-conversations
    const result = await callEdgeFunction('merge-guest-conversations', {
      user_id: userId,
      device_id: deviceId
    });

    if (!result.success) {
      console.error('❌ [云端服务] 合并游客对话失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log(`✅ [云端服务] 成功合并 ${result.data.count || 0} 个游客对话`);
    return { success: true, count: result.data.count || 0 };
  } catch (error) {
    console.error('❌ [云端服务] 合并游客对话异常:', error);
    return { success: false, error: error.message };
  }
}

// ==================== 用户信息和AI记忆 ====================

/**
 * 获取用户信息
 * @returns {Promise<{success: boolean, content?: string, error?: string}>}
 */
export async function getUserInfo() {
  try {
    console.log('📖 [云端服务] 获取用户信息');

    // 🔥 v2.10.18 修复：检查 Supabase 是否可用
    if (!isSupabaseAvailable()) {
      return { success: false, error: 'Supabase 未配置', content: '' };
    }

    const deviceId = await getDeviceId();
    console.log('📱 [云端服务] 设备ID:', deviceId);

    // 从 localStorage 获取用户信息
    const user = getCurrentUserSync();
    let userId = user?.id;

    // 🔥 v2.10.27 Edge Function：调用 get-user-info
    const result = await callEdgeFunction('get-user-info', {
      user_id: userId,
      device_id: deviceId
    });

    if (!result.success) {
      console.error('❌ [云端服务] 获取用户信息失败:', result.error);
      return { success: false, error: result.error };
    }

    if (result.data && result.data.content) {
      console.log('✅ [云端服务] 获取用户信息成功');
      return { success: true, content: result.data.content };
    }

    console.log('ℹ️ [云端服务] 用户信息为空，返回默认模板');
    return { success: true, content: getDefaultUserInfoTemplate() };
  } catch (error) {
    console.error('❌ [云端服务] 获取用户信息异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 保存用户信息
 * @param {string} content - 用户信息内容
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveUserInfo(content) {
  try {
    console.log('💾 [云端服务] 保存用户信息');

    const deviceId = await getDeviceId();

    // 从 localStorage 获取用户信息
    const user = getCurrentUserSync();
    const userId = user?.id;

    console.log('📊 [云端服务] 当前状态:', { userId, deviceId });

    // 🔥 v2.10.27 Edge Function：调用 save-user-info
    const result = await callEdgeFunction('save-user-info', {
      user_id: userId,
      device_id: deviceId,
      content: content
    });

    if (!result.success) {
      console.error('❌ [云端服务] 保存用户信息失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ [云端服务] 保存用户信息成功');
    return { success: true };
  } catch (error) {
    console.error('❌ [云端服务] 保存用户信息异常:', error);
    console.error('   异常堆栈:', error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * 获取AI记忆
 * @returns {Promise<{success: boolean, content?: string, error?: string}>}
 */
export async function getAiMemory() {
  try {
    console.log('📖 [云端服务] 获取AI记忆');

    // 🔥 v2.10.18 修复：检查 Supabase 是否可用
    if (!isSupabaseAvailable()) {
      return { success: false, error: 'Supabase 未配置', content: '' };
    }

    const deviceId = await getDeviceId();

    // 从 localStorage 获取用户信息
    const user = getCurrentUserSync();
    const userId = user?.id;

    // 🔥 v2.10.27 Edge Function：调用 get-ai-memory
    const result = await callEdgeFunction('get-ai-memory', {
      user_id: userId,
      device_id: deviceId
    });

    if (!result.success) {
      console.error('❌ [云端服务] 获取AI记忆失败:', result.error);
      return { success: false, error: result.error };
    }

    if (result.data && result.data.content) {
      console.log('✅ [云端服务] 获取AI记忆成功');
      return { success: true, content: result.data.content };
    }

    console.log('ℹ️ [云端服务] AI记忆为空，返回默认模板');
    return { success: true, content: getDefaultAiMemoryTemplate() };
  } catch (error) {
    console.error('❌ [云端服务] 获取AI记忆异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 保存AI记忆
 * @param {string} content - AI记忆内容
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveAiMemory(content) {
  try {
    console.log('💾 [云端服务] 保存AI记忆');

    const deviceId = await getDeviceId();

    // 从 localStorage 获取用户信息
    const user = getCurrentUserSync();
    const userId = user?.id;

    console.log('📊 [云端服务] 当前状态:', { userId, deviceId });

    // 🔥 v2.10.27 Edge Function：调用 save-ai-memory
    const result = await callEdgeFunction('save-ai-memory', {
      user_id: userId,
      device_id: deviceId,
      content: content
    });

    if (!result.success) {
      console.error('❌ [云端服务] 保存AI记忆失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ [云端服务] 保存AI记忆成功');
    return { success: true };
  } catch (error) {
    console.error('❌ [云端服务] 保存AI记忆异常:', error);
    console.error('   异常堆栈:', error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * 合并游客用户信息到登录用户
 * 登录成功后调用，将该设备的游客用户信息关联到登录用户
 * @param {string} userId - 登录用户的ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function mergeGuestUserInfo(userId) {
  try {
    console.log('🔄 [云端服务] 合并游客用户信息到用户:', userId);

    const deviceId = await getDeviceId();
    console.log('📱 [云端服务] 设备ID:', deviceId);

    // 🔥 v2.10.27 Edge Function：调用 merge-guest-user-info
    const result = await callEdgeFunction('merge-guest-user-info', {
      user_id: userId,
      device_id: deviceId
    });

    if (!result.success) {
      console.error('❌ [云端服务] 合并游客用户信息失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ [云端服务] 成功合并游客用户信息');
    return { success: true };
  } catch (error) {
    console.error('❌ [云端服务] 合并游客用户信息异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 合并游客AI记忆到登录用户
 * 登录成功后调用，将该设备的游客AI记忆关联到登录用户
 * @param {string} userId - 登录用户的ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function mergeGuestAiMemory(userId) {
  try {
    console.log('🔄 [云端服务] 合并游客AI记忆到用户:', userId);

    const deviceId = await getDeviceId();
    console.log('📱 [云端服务] 设备ID:', deviceId);

    // 🔥 v2.10.27 Edge Function：调用 merge-guest-ai-memory
    const result = await callEdgeFunction('merge-guest-ai-memory', {
      user_id: userId,
      device_id: deviceId
    });

    if (!result.success) {
      console.error('❌ [云端服务] 合并游客AI记忆失败:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ [云端服务] 成功合并游客AI记忆');
    return { success: true };
  } catch (error) {
    console.error('❌ [云端服务] 合并游客AI记忆异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取默认用户信息模板
 */
function getDefaultUserInfoTemplate() {
  return '';
}

/**
 * 获取默认AI记忆模板
 */
function getDefaultAiMemoryTemplate() {
  return '';
}

// ==================== API Key 云端同步 ====================

/**
 * 保存 API Key 到云端
 * @param {string} apiKey - API Key
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveApiKey(apiKey) {
  try {
    const user = getCurrentUserSync();
    if (!user || !user.id) {
      return { success: false, error: '用户未登录' };
    }

    console.log('🔑 [云端服务] 保存 API Key 到云端');

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        api_key: apiKey,
        has_api_key: !!apiKey && apiKey.length > 0
      })
      .eq('user_id', user.id)
      .select();

    if (error) {
      console.error('❌ [云端服务] 保存 API Key 失败:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [云端服务] API Key 已保存到云端');
    return { success: true };
  } catch (error) {
    console.error('❌ [云端服务] 保存 API Key 异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 从云端加载 API Key
 * @returns {Promise<{success: boolean, apiKey?: string, hasApiKey?: boolean, error?: string}>}
 */
export async function loadApiKey() {
  try {
    const user = getCurrentUserSync();
    if (!user || !user.id) {
      return { success: false, error: '用户未登录' };
    }

    console.log('🔑 [云端服务] 从云端加载 API Key');

    const { data, error } = await supabase
      .from('user_profiles')
      .select('api_key, has_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('❌ [云端服务] 加载 API Key 失败:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      console.log('ℹ️ [云端服务] 未找到用户配置');
      return { success: true, apiKey: null, hasApiKey: false };
    }

    console.log(`✅ [云端服务] API Key 加载成功 (hasApiKey: ${data.has_api_key})`);
    return {
      success: true,
      apiKey: data.api_key,
      hasApiKey: data.has_api_key
    };
  } catch (error) {
    console.error('❌ [云端服务] 加载 API Key 异常:', error);
    return { success: false, error: error.message };
  }
}
