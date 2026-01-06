// 官方配置文件
// 用于游客模式的前10次免费使用

const db = require('./database');

module.exports = {
  // 模型提供商：'anthropic' (Claude) 或 'zhipu' (智谱GLM)
  provider: 'zhipu',

  // 官方API Key（从数据库读取，首次启动时会自动写入）
  get apiKey() {
    return db.getOfficialApiKey() || process.env.OFFICIAL_API_KEY || '';
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
