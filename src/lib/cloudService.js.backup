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
 * 获取用户使用次数（Edge Function 版本）
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
 * 加载所有对话历史（从云端）
 * 支持游客模式（通过 device_id）和登录用户（通过 user_id）
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function loadConversations() {
  try {
    console.log('📥 [云端服务] 加载对话历史...');

    const deviceId = await getDeviceId();
    console.log('📱 [云端服务] 设备ID:', deviceId);

    // 从 localStorage 获取用户信息
    const user = getCurrentUserSync();

    // 获取对话：优先加载登录用户的，其次是该设备的游客对话
    let conversations = [];
    let conversationsError = null;

    if (user) {
      // 🔥 关键修复：登录用户只查询 user_id 匹配的对话
      // 合并后的游客对话已经设置了 user_id，会被查询到
      // 不应该查询 device_id，否则会包含其他用户在该设备上的对话
      console.log('✅ [云端服务] 当前用户ID:', user.id);

      const { data: userConvs, error: error1 } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)  // 只查询 user_id 匹配的对话
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      conversations = userConvs;
      conversationsError = error1;
    } else {
      // 游客模式：只获取该设备的对话
      console.log('👤 [云端服务] 游客模式，加载设备对话');

      const { data: guestConvs, error: error2 } = await supabase
        .from('conversations')
        .select('*')
        .eq('device_id', deviceId)
        .is('user_id', null)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      conversations = guestConvs;
      conversationsError = error2;
    }

    if (conversationsError) {
      console.error('❌ [云端服务] 加载对话失败:', conversationsError);
      console.error('   错误详情:', JSON.stringify(conversationsError, null, 2));
      return { success: false, error: conversationsError.message };
    }

    console.log(`✅ [云端服务] 找到 ${conversations?.length || 0} 个对话`);

    // 为每个对话获取消息
    const conversationsWithMessages = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

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
        };
      })
    );

    console.log(`✅ [云端服务] 成功加载 ${conversationsWithMessages.length} 个对话`);
    return { success: true, data: conversationsWithMessages };
  } catch (error) {
    console.error('❌ [云端服务] 加载对话异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 创建新对话（保存到云端）
 * @param {object} conversation - 对话数据
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function createConversation(conversation) {
  try {
    console.log('📝 [云端服务] 创建新对话:', conversation.title);
    console.log('   对话ID:', conversation.id);

    const deviceId = await getDeviceId();
    console.log('   设备ID:', deviceId);

    // 从 localStorage 获取用户信息
    const user = getCurrentUserSync();

    console.log('   登录状态:', user ? '已登录 (' + user.id + ')' : '游客模式');

    // 准备插入数据
    const insertData = {
      id: conversation.id,
      title: conversation.title,
      model: conversation.model || 'claude-3-5-sonnet-20241022',
      created_at: conversation.createdAt || new Date().toISOString(),
      device_id: deviceId  // 始终记录设备ID
    };

    // 如果用户已登录，添加 user_id
    if (user) {
      insertData.user_id = user.id;
      console.log('✅ [云端服务] 用户ID:', user.id);
    } else {
      console.log('👤 [云端服务] 游客模式，仅记录设备ID');
    }

    console.log('   准备插入数据:', JSON.stringify(insertData, null, 2));

    // 创建对话
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert(insertData)
      .select()
      .single();

    if (convError) {
      console.error('❌ [云端服务] 创建对话失败:', convError);
      console.error('   错误代码:', convError.code);
      console.error('   错误详情:', JSON.stringify(convError, null, 2));
      console.error('   错误提示:', convError.message);
      console.error('   错误提示:', convError.hint);
      return { success: false, error: convError.message };
    }

    console.log('✅ [云端服务] 对话创建成功, ID:', newConv.id);

    // 如果有消息，保存消息
    if (conversation.messages && conversation.messages.length > 0) {
      for (const message of conversation.messages) {
        await createMessage(newConv.id, message);
      }
    }

    return { success: true, data: newConv };
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
      .single();

    if (error) {
      console.error('❌ [云端服务] 创建消息失败:', error);
      console.error('   错误代码:', error.code);
      console.error('   错误详情:', JSON.stringify(error, null, 2));
      console.error('   错误提示:', error.message);
      console.error('   错误提示:', error.hint);
      return { success: false, error: error.message };
    }

    console.log('✅ [云端服务] 消息创建成功, ID:', data.id);
    return { success: true, data };
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
    const updateData = {};

    // 只更新提供的字段
    if (updates.content !== undefined) {
      updateData.content = updates.content;
    }

    if (updates.thinking !== undefined) {
      updateData.thinking = updates.thinking;
    }

    const { error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('id', messageId)
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('❌ [云端服务] 更新消息失败:', error);
      return { success: false, error: error.message };
    }

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

    const { error } = await supabase
      .from('conversations')
      .update({ is_deleted: true })
      .eq('id', conversationId);

    if (error) {
      console.error('❌ [云端服务] 删除对话失败:', error);
      return { success: false, error: error.message };
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

    // 使用数据库函数来合并（避免 RLS 递归问题）
    const { data, error } = await supabase.rpc('merge_guest_conversations_to_user', {
      p_device_id: deviceId,
      p_user_id: userId
    });

    if (error) {
      console.error('❌ [云端服务] 合并游客对话失败:', error);
      console.error('   错误详情:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    console.log(`✅ [云端服务] 成功合并 ${data || 0} 个游客对话`);
    return { success: true, count: data || 0 };
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

    // 🔥 v2.10.27 修复：浏览器端使用 supabase 而不是 supabaseAdmin
    // 从 Supabase 查询
    let query = supabase.from('user_info').select('content');

    if (userId) {
      // 登录用户：查询用户的数据
      query = query.eq('user_id', userId);
    } else {
      // 游客：查询设备的数据
      query = query.eq('device_id', deviceId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('❌ [云端服务] 获取用户信息失败:', error);
      // 如果是记录不存在，返回默认模板
      if (error.code === 'PGRST116') {
        console.log('ℹ️ [云端服务] 用户信息不存在，返回默认模板');
        return { success: true, content: getDefaultUserInfoTemplate() };
      }
      return { success: false, error: error.message };
    }

    if (data && data.content) {
      console.log('✅ [云端服务] 获取用户信息成功');
      return { success: true, content: data.content };
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

    // 🔥 v2.10.27 修复：浏览器端使用 supabase 而不是 supabaseAdmin
    // 先尝试删除可能存在的旧记录（避免 UNIQUE 冲突）
    if (userId) {
      // 登录用户：删除该用户的所有记录
      await supabase
        .from('user_info')
        .delete()
        .eq('user_id', userId);
    } else {
      // 游客：删除该设备的所有记录
      await supabase
        .from('user_info')
        .delete()
        .eq('device_id', deviceId);
    }

    // 插入新记录
    const insertData = {
      user_id: userId || null,
      device_id: userId ? null : deviceId,
      content: content,
      updated_at: new Date().toISOString()
    };

    console.log('📊 [云端服务] 插入数据:', insertData);

    const { data, error } = await supabase
      .from('user_info')
      .insert(insertData)
      .select();

    if (error) {
      console.error('❌ [云端服务] 保存用户信息失败:', error);
      console.error('   错误详情:', JSON.stringify(error, null, 2));
      console.error('   错误代码:', error.code);
      console.error('   错误提示:', error.hint);
      return { success: false, error: error.message };
    }

    console.log('✅ [云端服务] 保存用户信息成功, data:', data);
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

    // 🔥 v2.10.27 修复：浏览器端使用 supabase 而不是 supabaseAdmin
    // 从 Supabase 查询
    let query = supabase.from('ai_memory').select('content');

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('device_id', deviceId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('❌ [云端服务] 获取AI记忆失败:', error);
      // 如果是记录不存在，返回默认模板
      if (error.code === 'PGRST116') {
        console.log('ℹ️ [云端服务] AI记忆不存在，返回默认模板');
        return { success: true, content: getDefaultAiMemoryTemplate() };
      }
      return { success: false, error: error.message };
    }

    if (data && data.content) {
      console.log('✅ [云端服务] 获取AI记忆成功');
      return { success: true, content: data.content };
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

    // 🔥 v2.10.27 修复：浏览器端使用 supabase 而不是 supabaseAdmin
    // 先尝试删除可能存在的旧记录（避免 UNIQUE 冲突）
    if (userId) {
      // 登录用户：删除该用户的所有记录
      await supabase
        .from('ai_memory')
        .delete()
        .eq('user_id', userId);
    } else {
      // 游客：删除该设备的所有记录
      await supabase
        .from('ai_memory')
        .delete()
        .eq('device_id', deviceId);
    }

    // 插入新记录
    const insertData = {
      user_id: userId || null,
      device_id: userId ? null : deviceId,
      content: content,
      updated_at: new Date().toISOString()
    };

    console.log('📊 [云端服务] 插入 AI 记忆数据:', insertData);

    const { data, error } = await supabase
      .from('ai_memory')
      .insert(insertData)
      .select();

    if (error) {
      console.error('❌ [云端服务] 保存AI记忆失败:', error);
      console.error('   错误详情:', JSON.stringify(error, null, 2));
      console.error('   错误代码:', error.code);
      console.error('   错误提示:', error.hint);
      return { success: false, error: error.message };
    }

    console.log('✅ [云端服务] 保存AI记忆成功, data:', data);
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

    // 1. 查询游客时期的用户信息（device_id 有值，user_id 为 null）
    const { data: guestData, error: guestError } = await supabase
      .from('user_info')
      .select('*')
      .eq('device_id', deviceId)
      .is('user_id', null)
      .maybeSingle();

    if (guestError) {
      console.error('❌ [云端服务] 查询游客用户信息失败:', guestError);
      return { success: false, error: guestError.message };
    }

    // 如果没有游客数据，直接返回成功
    if (!guestData) {
      console.log('ℹ️  [云端服务] 没有游客用户信息需要合并');
      return { success: true };
    }

    // 2. 查询登录用户是否已有用户信息（user_id 有值，device_id 为 null）
    const { data: userData, error: userError } = await supabase
      .from('user_info')
      .select('*')
      .eq('user_id', userId)
      .is('device_id', null)
      .maybeSingle();

    if (userError) {
      console.error('❌ [云端服务] 查询登录用户信息失败:', userError);
      return { success: false, error: userError.message };
    }

    if (userData) {
      // 登录用户已有数据，删除游客数据（保留登录用户的）
      console.log('🗑️  [云端服务] 登录用户已有数据，删除游客数据');
      const { error: deleteError } = await supabase
        .from('user_info')
        .delete()
        .eq('id', guestData.id);

      if (deleteError) {
        console.error('❌ [云端服务] 删除游客数据失败:', deleteError);
        return { success: false, error: deleteError.message };
      }
    } else {
      // 登录用户没有数据，将游客数据的 user_id 更新为登录用户
      console.log('🔄 [云端服务] 将游客数据关联到登录用户');
      const { error: updateError } = await supabase
        .from('user_info')
        .update({ user_id: userId, device_id: null })
        .eq('id', guestData.id);

      if (updateError) {
        console.error('❌ [云端服务] 更新游客数据失败:', updateError);
        return { success: false, error: updateError.message };
      }
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

    // 1. 查询游客时期的AI记忆（device_id 有值，user_id 为 null）
    const { data: guestData, error: guestError } = await supabase
      .from('ai_memory')
      .select('*')
      .eq('device_id', deviceId)
      .is('user_id', null)
      .maybeSingle();

    if (guestError) {
      console.error('❌ [云端服务] 查询游客AI记忆失败:', guestError);
      return { success: false, error: guestError.message };
    }

    // 如果没有游客数据，直接返回成功
    if (!guestData) {
      console.log('ℹ️  [云端服务] 没有游客AI记忆需要合并');
      return { success: true };
    }

    // 2. 查询登录用户是否已有AI记忆（user_id 有值，device_id 为 null）
    const { data: userData, error: userError } = await supabase
      .from('ai_memory')
      .select('*')
      .eq('user_id', userId)
      .is('device_id', null)
      .maybeSingle();

    if (userError) {
      console.error('❌ [云端服务] 查询登录用户AI记忆失败:', userError);
      return { success: false, error: userError.message };
    }

    if (userData) {
      // 登录用户已有数据，删除游客数据（保留登录用户的）
      console.log('🗑️  [云端服务] 登录用户已有AI记忆，删除游客数据');
      const { error: deleteError } = await supabase
        .from('ai_memory')
        .delete()
        .eq('id', guestData.id);

      if (deleteError) {
        console.error('❌ [云端服务] 删除游客AI记忆失败:', deleteError);
        return { success: false, error: deleteError.message };
      }
    } else {
      // 登录用户没有数据，将游客数据的 user_id 更新为登录用户
      console.log('🔄 [云端服务] 将游客AI记忆关联到登录用户');
      const { error: updateError } = await supabase
        .from('ai_memory')
        .update({ user_id: userId, device_id: null })
        .eq('id', guestData.id);

      if (updateError) {
        console.error('❌ [云端服务] 更新游客AI记忆失败:', updateError);
        return { success: false, error: updateError.message };
      }
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
