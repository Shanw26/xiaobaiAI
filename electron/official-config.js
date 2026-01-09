// 官方配置文件
// 用于游客模式的前10次免费使用

const db = require('./database');

// v2.10.27 - 容错机制：防止重复从 Supabase 获取
let isFetchingFromSupabase = false;
let cachedApiKey = null;

module.exports = {
  // 模型提供商：'anthropic' (Claude) 或 'zhipu' (智谱GLM)
  provider: 'zhipu',

  // ✨ v2.10.27 容错机制：如果数据库中没有 API Key，自动从 Supabase 重新获取
  // 官方 API Key 在首次启动时写入数据库（database.js: initOfficialConfig）
  // 之后所有请求都从数据库读取，确保安全性
  get apiKey() {
    // 1. 先尝试从缓存获取
    if (cachedApiKey) {
      return cachedApiKey;
    }

    // 2. 从数据库读取
    const key = db.getOfficialApiKey();

    if (key) {
      cachedApiKey = key;
      return key;
    }

    // 3. 如果数据库中没有，且没有正在获取，启动异步获取
    if (!key && !isFetchingFromSupabase) {
      console.warn('⚠️ 官方 API Key 未找到，尝试从 Supabase 重新获取...');
      isFetchingFromSupabase = true;

      // 异步从 Supabase 获取并写入数据库
      db.fetchOfficialConfigFromSupabase().then(config => {
        if (config && config.apiKey) {
          console.log('✅ 从 Supabase 重新获取官方配置成功');
          // 写入数据库
          db.setSystemConfig('official_api_key', config.apiKey, '官方智谱GLM API Key（游客模式使用）');
          db.setSystemConfig('official_provider', config.provider, '官方模型提供商');
          db.setSystemConfig('official_model', config.model, '官方默认模型');
          db.setSystemConfig('free_usage_limit', config.limit, '游客免费使用次数限制');
          db.setSystemConfig('official_config_initialized', 'true', '配置已初始化标记');
          console.log('✅ 官方配置已写入数据库');
          // 更新缓存
          cachedApiKey = config.apiKey;
        } else {
          console.error('❌ 从 Supabase 获取配置失败');
        }
        isFetchingFromSupabase = false;
      }).catch(error => {
        console.error('❌ 从 Supabase 获取配置出错:', error.message);
        isFetchingFromSupabase = false;
      });

      console.warn('⚠️ 正在从 Supabase 获取配置，请稍后重试...');
    }

    return null;
  },

  // 重置缓存（用于测试或强制刷新）
  resetCache() {
    cachedApiKey = null;
    isFetchingFromSupabase = false;
  },

  // 游客免费使用次数限制（从数据库读取）
  get freeUsageLimit() {
    const limit = db.getSystemConfig('free_usage_limit');
    return limit ? parseInt(limit) : 10;
  },

  // 模型配置
  // 智谱GLM可用模型：glm-4.7, glm-4.5-air, glm-4.5-flash
  // Claude可用模型：claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022
  get defaultModel() {
    return db.getSystemConfig('official_model') || 'glm-4.7';
  },

  // 提示信息
  guestWelcomeMessage: '👋 欢迎使用小白AI！\n\n游客模式可免费使用10次，之后需要登录。\n\n开始你的AI之旅吧！',

  guestLimitReachedMessage: '⚠️ 免费次数已用完\n\n您已使用10次免费额度，请登录后继续使用。\n\n登录后可配置自己的API Key。',

  // 短信服务配置
  // 开发阶段：验证码会显示在应用控制台中（开发工具 -> Console）
  // 生产环境：需要对接短信服务（阿里云、腾讯云等）
  smsService: {
    enabled: false, // 是否启用短信服务
    provider: 'aliyun', // aliyun, tencent, etc.
    // 短信服务配置示例：
    // accessKeyId: 'YOUR_ACCESS_KEY',
    // accessKeySecret: 'YOUR_SECRET_KEY',
    // signName: '你的签名',
    // templateCode: '你的模板代码'
  }
};
