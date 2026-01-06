import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// 阿里云短信配置
const ALIYUN_ACCESS_KEY_ID = Deno.env.get('ALIYUN_ACCESS_KEY_ID') || '';
const ALIYUN_ACCESS_KEY_SECRET = Deno.env.get('ALIYUN_ACCESS_KEY_SECRET') || '';
const SIGN_NAME = '原则科技';
const TEMPLATE_CODE = 'SMS_223880024';

interface RequestBody {
  phone: string;
  code: string;
}

// 生成阿里云签名
async function generateSignature(params: Record<string, string>, accessKeySecret: string): Promise<string> {
  // 按字母顺序排序参数
  const sortedKeys = Object.keys(params).sort();

  // 构造规范化查询字符串（参数值需要 URL 编码）
  const canonicalizedQueryString = sortedKeys
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // 构造待签名字符串
  const stringToSign = `GET&%2F&${encodeURIComponent(canonicalizedQueryString)}`;

  // 使用 HMAC-SHA1 生成签名
  const encoder = new TextEncoder();
  const key = encoder.encode(accessKeySecret + '&');
  const message = encoder.encode(stringToSign);

  const signature = await crypto.subtle
    .importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
    .then(key => crypto.subtle.sign('HMAC', key, message))
    .then(signature => btoa(String.fromCharCode(...new Uint8Array(signature))));

  return signature;
}

serve(async (req) => {
  // 添加 CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 只允许 POST 请求
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 解析请求体
    const { phone, code }: RequestBody = await req.json();

    if (!phone || !code) {
      return new Response(JSON.stringify({ error: '手机号和验证码不能为空' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return new Response(JSON.stringify({ error: '手机号格式不正确' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📱 [短信服务] 准备发送验证码');
    console.log('  - 手机号:', phone);
    console.log('  - 验证码:', code);
    console.log('  - 签名:', SIGN_NAME);
    console.log('  - 模板:', TEMPLATE_CODE);

    // 构造阿里云 API 请求参数
    const params: Record<string, string> = {
      Action: 'SendSms',
      Version: '2017-05-25',
      Format: 'JSON',
      AccessKeyId: ALIYUN_ACCESS_KEY_ID,
      SignatureMethod: 'HMAC-SHA1',
      SignatureVersion: '1.0',
      SignatureNonce: Math.random().toString(),
      Timestamp: new Date().toISOString(),
      PhoneNumbers: phone,
      SignName: SIGN_NAME,
      TemplateCode: TEMPLATE_CODE,
      TemplateParam: JSON.stringify({ code }),
    };

    // 生成签名
    const signature = await generateSignature(params, ALIYUN_ACCESS_KEY_SECRET);
    params.Signature = signature;

    // 构造请求 URL（所有参数都需要 URL 编码）
    const url = `http://dysmsapi.aliyuncs.com/?${Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')}`;

    console.log('📤 [短信服务] 请求 URL:', url);

    // 发送请求
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const result = await response.json();

    console.log('📤 [短信服务] 阿里云响应:', result);

    if (result.Code === 'OK') {
      console.log('✅ [短信服务] 验证码发送成功');
      return new Response(
        JSON.stringify({
          success: true,
          message: '验证码发送成功',
          requestId: result.RequestId
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      console.error('❌ [短信服务] 阿里云返回错误:', result.Message);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.Message || '发送失败'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('❌ [短信服务] 异常:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
