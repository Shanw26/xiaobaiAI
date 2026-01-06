import { supabase } from './supabaseClient';
import supabaseServiceKey from './supabaseClient';

// Edge Function URL
const EDGE_FUNCTION_URL = 'https://cnszooaxwxatezodbbxq.supabase.co/functions/v1/send-sms';

// Supabase Anon Key（用于前端调用 Edge Function）
const SUPABASE_ANON_KEY = 'REMOVED';

// ==================== 辅助函数 ====================

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
 * 发送验证码
 * @param {string} phone - 手机号
 * @returns {Promise<{success: boolean, code?: string, error?: string}>}
 */
export async function sendVerificationCode(phone) {
  try {
    console.log('📱 [云端服务] 开始发送验证码:', phone);

    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('✅ [云端服务] 验证码生成成功:', code);

    // 调用 Supabase Edge Function 发送短信
    console.log('📤 [云端服务] 调用阿里云短信服务...');

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ phone, code })
    });

    const result = await response.json();
    console.log('📥 [云端服务] 短信服务响应:', result);

    if (!result.success) {
      console.error('❌ [云端服务] 发送短信失败:', result.error);
      return { success: false, error: result.error || '发送短信失败' };
    }

    // 保存验证码到数据库（验证码表）
    console.log('💾 [云端服务] 保存验证码到数据库...');
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        phone,
        code,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5分钟后过期
        used: false
      });

    if (dbError) {
      console.error('❌ [云端服务] 保存验证码失败:', dbError);
      return { success: false, error: '保存验证码失败' };
    }

    console.log('✅ [云端服务] 验证码发送成功');
    return { success: true }; // 生产环境不返回验证码
  } catch (error) {
    console.error('❌ [云端服务] 发送验证码异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 手机号登录
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function signInWithPhone(phone, code) {
  try {
    console.log('🔐 [云端服务] 开始登录流程');
    console.log('  - 手机号:', phone);
    console.log('  - 验证码:', code);

    // 1. 验证验证码
    console.log('\n📋 [云端服务] 步骤1: 验证验证码...');
    const { data: codeRecord, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError || !codeRecord) {
      console.error('❌ [云端服务] 验证码验证失败');
      console.error('  - 错误:', codeError?.message || '验证码无效或已过期');
      return { success: false, error: '验证码无效或已过期' };
    }

    console.log('✅ [云端服务] 验证码验证通过');

    // 2. 使用固定密码方案（避免验证码作为密码导致的问题）
    console.log('\n🔑 [云端服务] 步骤2: 使用固定密码登录 Supabase Auth...');
    const fixedPassword = `xiaobai_${phone}_auth_password`;
    const email = `${phone}@xiaobai.ai`;

    console.log('  - Email:', email);
    console.log('  - 密码策略: 固定密码（基于手机号）');

    // 先尝试登录
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: fixedPassword
    });

    if (signInError) {
      console.log('⚠️  [云端服务] 用户不存在，尝试注册...');

      // 用户不存在，先注册
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: fixedPassword,
        options: {
          data: {
            phone: phone
          }
        }
      });

      if (signUpError) {
        console.error('❌ [云端服务] 注册失败');
        console.error('  - 错误:', signUpError.message);
        return { success: false, error: '注册失败: ' + signUpError.message };
      }

      console.log('✅ [云端服务] 注册成功');

      // 🔥 关键：注册成功后，重新登录以获取 session
      console.log('🔄 [云端服务] 重新登录以获取 session...');
      const { data: reSignInData, error: reSignInError } = await supabase.auth.signInWithPassword({
        email,
        password: fixedPassword
      });

      if (reSignInError) {
        console.error('❌ [云端服务] 重新登录失败:', reSignInError.message);
        return { success: false, error: '登录失败: ' + reSignInError.message };
      }

      console.log('✅ [云端服务] 重新登录成功');
      signInData = reSignInData;
    } else {
      console.log('✅ [云端服务] 登录成功');
    }

    // 3. 标记验证码已使用
    console.log('\n✅ [云端服务] 步骤3: 标记验证码已使用...');
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', codeRecord.id);

    // 4. 检查用户资料是否存在
    console.log('\n👤 [云端服务] 步骤4: 检查用户资料...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', signInData.user.id)
      .single();

    if (profileError || !profile) {
      console.log('⚠️  [云端服务] 用户资料不存在，创建中...');

      // 创建用户资料
      const { error: createProfileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: signInData.user.id,
          phone: phone,
          created_at: new Date().toISOString()
        });

      if (createProfileError) {
        console.error('❌ [云端服务] 创建用户资料失败:', createProfileError);
      } else {
        console.log('✅ [云端服务] 用户资料创建成功');
      }
    } else {
      console.log('✅ [云端服务] 用户资料已存在');
    }

    console.log('\n🎉 [云端服务] 登录流程完成！');
    console.log('  - User ID:', signInData.user.id);
    console.log('  - Phone:', phone);

    return {
      success: true,
      user: {
        id: signInData.user.id,
        phone: phone,
        email: email
      }
    };
  } catch (error) {
    console.error('❌ [云端服务] 登录异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取当前用户信息
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 获取用户资料
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return {
      id: user.id,
      phone: profile?.phone || user.user_metadata.phone,
      email: user.email
    };
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}

/**
 * 退出登录
 * @returns {Promise<boolean>}
 */
export async function signOut() {
  try {
    await supabase.auth.signOut();
    return true;
  } catch (error) {
    console.error('退出登录失败:', error);
    return false;
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

    // 获取用户信息（游客模式下 user 为 null，这是正常的）
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 游客模式下 authError 是正常的，不应该中断流程
    if (authError) {
      console.log('⚠️  [云端服务] Auth 错误（游客模式正常）:', authError.message);
      // 继续执行，不返回错误
    }

    // 获取对话：优先加载登录用户的，其次是该设备的游客对话
    let conversations = [];
    let conversationsError = null;

    if (user) {
      // 登录用户：获取 user_id 或 device_id 匹配的对话
      console.log('✅ [云端服务] 当前用户ID:', user.id);

      const { data: userConvs, error: error1 } = await supabase
        .from('conversations')
        .select('*')
        .or(`user_id.eq.${user.id},device_id.eq.${deviceId}`)
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

    // 获取用户信息（游客模式下 user 为 null，这是正常的）
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 游客模式下 authError 是正常的，不应该中断流程
    if (authError) {
      console.log('⚠️  [云端服务] Auth 错误（游客模式正常）:', authError.message);
      // 继续执行，不返回错误
    }

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
 * @param {string} content - 消息内容
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateMessage(conversationId, messageId, content) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ content })
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
