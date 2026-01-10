# 登录系统

> **适用版本**: v2.6.3+
> **阅读时间**: 10分钟
> **相关文档**: [数据库设计](./03-数据库设计.md) | [设备ID与游客模式](./04-设备ID与游客模式.md)

---

## 核心设计原则

> **重要**: 小白AI只有验证码登录，**没有密码**。用户只有手机号，**没有email**。

### 为什么这样设计？

1. **简单**: 手机号 + 验证码，无需记忆密码
2. **安全**: 验证码5分钟有效期，一次性使用
3. **便捷**: 符合中国用户习惯（类似微信登录）

---

## 登录流程

### 完整流程图

```
┌─────────────────┐
│ 1. 输入手机号    │
└────────┬────────┘
         │
┌────────▼────────┐
│ 2. 点击"发送验证码"│
└────────┬────────┘
         │
┌────────▼─────────────────────────┐
│ 3. sendVerificationCode()        │
│  - 生成6位随机验证码               │
│  - 调用Edge Function发送短信      │
│  - 保存到数据库 (5分钟有效期)      │
└────────┬─────────────────────────┘
         │
┌────────▼─────────────────────────┐
│ 4. Edge Function (阿里云短信)     │
│  - HMAC-SHA1签名                  │
│  - 调用SMS_API                    │
│  - 发送短信到用户手机              │
└────────┬─────────────────────────┘
         │
┌────────▼────────┐
│ 5. 用户收到短信  │
└────────┬────────┘
         │
┌────────▼────────┐
│ 6. 输入验证码    │
└────────┬────────┘
         │
┌────────▼─────────────────────────┐
│ 7. signInWithPhone()             │
│  - Step 1: 验证验证码             │
│  - Step 2: 查询/创建用户          │
│  - Step 3: 标记验证码已使用        │
│  - Step 4: 返回用户信息           │
└────────┬─────────────────────────┘
         │
┌────────▼────────┐
│ 8. 登录成功      │
│ - 保存到localStorage            │
│ - 更新AuthContext状态            │
│ - 合并游客数据(如果有)            │
└─────────────────┘
```

---

## 核心代码实现

### 1. 发送验证码

**文件**: `src/lib/cloudService.js`

```javascript
/**
 * 发送验证码
 * @param {string} phone - 手机号
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendVerificationCode(phone) {
  try {
    console.log('📱 [云端服务] 开始发送验证码:', phone);

    // 1. 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('✅ [云端服务] 验证码生成成功:', code);

    // 2. 调用 Supabase Edge Function 发送短信
    const EDGE_FUNCTION_URL = 'https://your-project.supabase.co/functions/v1/send-sms';
    const SUPABASE_ANON_KEY = 'sb_publishable_YOUR_ANON_KEY_HERE';

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

    if (!result.success) {
      return { success: false, error: result.error || '发送短信失败' };
    }

    // 3. 保存验证码到数据库
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        phone,
        code,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5分钟
        used: false
      });

    if (dbError) {
      return { success: false, error: '保存验证码失败' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**关键点**:
- 验证码: 6位随机数 (100000-999999)
- 有效期: 5分钟
- 状态: `used = false` 表示未使用

### 2. 验证码登录

**文件**: `src/lib/cloudService.js`

```javascript
import { supabaseAdmin } from './supabaseClient';

/**
 * 手机号登录
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function signInWithPhone(phone, code) {
  try {
    console.log('🔐 [云端服务] 开始登录流程');

    // ==================== Step 1: 验证验证码 ====================
    console.log('📋 [云端服务] 步骤1: 验证验证码...');

    const { data: codeRecord, error: codeError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('used', false)                      // 未使用
      .gte('expires_at', new Date().toISOString()) // 未过期
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError || !codeRecord) {
      console.error('❌ [云端服务] 验证码验证失败');
      return { success: false, error: '验证码无效或已过期' };
    }

    console.log('✅ [云端服务] 验证码验证通过');

    // ==================== Step 2: 查询或创建用户 ====================
    console.log('👤 [云端服务] 步骤2: 查询或创建用户...');

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('phone', phone)
      .single();

    let user;

    if (profileError || !profile) {
      console.log('⚠️  [云端服务] 用户不存在，创建新用户...');

      // 创建新用户
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert([{
          phone: phone,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        return { success: false, error: '创建用户失败: ' + createError.message };
      }

      user = newProfile;
      console.log('✅ [云端服务] 用户创建成功:', user.id);
    } else {
      user = profile;
      console.log('✅ [云端服务] 用户已存在:', user.id);
    }

    // ==================== Step 3: 标记验证码已使用 ====================
    console.log('✅ [云端服务] 步骤3: 标记验证码已使用...');

    await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('id', codeRecord.id);

    // ==================== Step 4: 返回用户信息 ====================
    console.log('🎉 [云端服务] 登录成功！');

    return {
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        hasApiKey: user.has_api_key || false
      }
    };
  } catch (error) {
    console.error('❌ [云端服务] 登录异常:', error);
    return { success: false, error: '登录失败: ' + error.message };
  }
}
```

**关键点**:
- 使用 `supabaseAdmin` 绕过 RLS 策略
- 验证码必须满足: 手机号匹配 + 验证码匹配 + 未使用 + 未过期
- 用户不存在则自动创建
- 验证码一次性使用

---

## 为什么放弃 Supabase Auth?

### 初期方案 (v2.4.0-v2.4.2)

```javascript
// 之前的错误方案
const email = `${phone}@xiaobai.ai`;
const password = `xiaobai_${phone}_auth_password`;

await supabase.auth.signUp({ email, password });
```

### 问题分析

| 问题 | 说明 |
|-----|------|
| **Email 强制要求** | Supabase Auth 必需 email，但小白AI不需要 |
| **密码概念混淆** | 虽然使用固定密码，但仍存在密码概念 |
| **Session 复杂** | 需要处理 JWT token 刷新、过期等 |
| **RLS 耦合** | Auth 与 RLS 深度耦合，修改困难 |

### 最终方案 (v2.6.3+)

**完全放弃 Supabase Auth，使用纯数据库管理**

优势对比：

| 特性 | Supabase Auth | 纯数据库方案 |
|-----|--------------|-------------|
| Email 字段 | ❌ 必需 | ✅ 不需要 |
| 密码概念 | ❌ 有 | ✅ 无密码 |
| Session 管理 | ❌ JWT 复杂 | ✅ localStorage 简单 |
| RLS 策略 | ❌ 深度耦合 | ✅ admin key 绕过 |
| 灵活性 | ❌ 受限 | ✅ 完全自定义 |

---

## Session 管理

### 存储方案

**不使用 Supabase Auth Session，使用 localStorage**

**文件**: `src/contexts/AuthContext.jsx`

```javascript
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // 从 localStorage 读取用户信息
    const savedUser = localStorage.getItem('xiaobai_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (user) => {
    setCurrentUser(user);
    // 保存到 localStorage
    localStorage.setItem('xiaobai_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    // 清除 localStorage
    localStorage.removeItem('xiaobai_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 使用示例

```javascript
// App.jsx
import { useAuth } from './contexts/AuthContext';

function App() {
  const { currentUser, login, logout } = useAuth();

  const handleLoginSuccess = (user) => {
    login(user);  // 保存用户信息
  };

  return (
    <div>
      {currentUser ? (
        <div>欢迎, {currentUser.phone}</div>
      ) : (
        <LoginModal onSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
```

---

## 常见问题

### Q1: 登录失败 "验证码无效或已过期"

**排查步骤**:

```sql
-- 检查数据库中是否有验证码
SELECT * FROM verification_codes
WHERE phone = '13800138000'
  AND code = '123456'
  AND used = false
  AND expires_at >= NOW();
```

**可能原因**:
1. 验证码已使用 (`used = true`)
2. 验证码已过期 (超过 5 分钟)
3. 验证码输入错误
4. 使用了 `supabase` 而非 `supabaseAdmin`

### Q2: 创建用户失败 "RLS 策略违规"

**错误信息**:
```
new row violates row-level security policy for table "user_profiles"
```

**解决方案**:
```javascript
// ❌ 错误: 使用普通客户端 (受 RLS 限制)
import { supabase } from './supabaseClient';
const { data } = await supabase.from('user_profiles').insert({...});

// ✅ 正确: 使用管理员客户端 (绕过 RLS)
import { supabaseAdmin } from './supabaseClient';
const { data } = await supabaseAdmin.from('user_profiles').insert({...});
```

### Q3: Session 丢失

**原因**: 使用 localStorage，清除浏览器数据会丢失

**解决方案**:
- 正常现象，用户需重新登录
- 可以考虑添加"记住登录"功能

---

## Edge Function: 短信发送

**文件**: `supabase/functions/send-sms/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface AliyunSMSRequest {
  phone: string;
  code: string;
}

serve(async (req) => {
  try {
    const { phone, code }: AliyunSMSRequest = await req.json();

    // 阿里云短信配置
    const accessKeyId = Deno.env.get('ALIYUN_ACCESS_KEY_ID');
    const accessKeySecret = Deno.env.get('ALIYUN_ACCESS_KEY_SECRET');
    const signName = Deno.env.get('ALIYUN_SMS_SIGN_NAME');
    const templateCode = Deno.env.get('ALIYUN_SMS_TEMPLATE_CODE');

    // 调用阿里云短信 API
    const response = await fetch(
      `https://dysmsapi.aliyuncs.com/?PhoneNumbers=${phone}&SignName=${signName}&TemplateCode=${templateCode}&TemplateParam=${JSON.stringify({code})}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${generateSignature(accessKeyId, accessKeySecret)}`
        }
      }
    );

    const result = await response.json();

    if (result.Code === 'OK') {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: result.Message }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**部署**:
```bash
supabase functions deploy send-sms
```

---

## 相关文件

| 文件 | 说明 |
|-----|------|
| `src/lib/cloudService.js` | 登录逻辑核心文件 |
| `src/lib/supabaseClient.js` | Supabase 客户端配置 |
| `src/contexts/AuthContext.jsx` | 认证状态管理 |
| `src/components/LoginModal.jsx` | 登录 UI 组件 |
| `supabase/functions/send-sms/index.ts` | 短信发送 Edge Function |

---

**最后更新**: 2026-01-07
**相关文档**: [数据库设计](./03-数据库设计.md) | [设备ID与游客模式](./04-设备ID与游客模式.md)
