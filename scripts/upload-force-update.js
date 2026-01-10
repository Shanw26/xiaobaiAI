const OSS = require('ali-oss');
const fs = require('fs');

const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
  bucket: 'xiaobai-ai-releases',
  timeout: 600000, // 10分钟超时
});

async function uploadForceUpdate() {
  try {
    // 读取文件信息
    const dmgPath = 'release/mac/小白AI-2.10.20-x64.dmg';
    const stats = fs.statSync(dmgPath);
    const size = stats.size;
    const hash = fs.readFileSync('/tmp/x64_hash_2_10_20.txt', 'utf-8').trim();

    // 上传 DMG
    console.log('开始上传 DMG 文件...');
    const dmgResult = await client.put('releases/小白AI-2.10.20-x64.dmg', dmgPath);
    console.log('✅ DMG 上传成功!');
    console.log(`📍 下载地址: ${dmgResult.url}`);
    console.log('');

    // 创建强制更新配置
    const updateConfig = `version: 2.10.20
files:
  - url: https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/releases/小白AI-2.10.20-x64.dmg
    sha512: ${hash}
    size: ${size}
path: https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/
sha512: ${hash}
releaseNotes: |
  ## 🚨 [强制更新] v2.10.20 - 重要更新

  ### ⚠️ 重要通知
  本次为强制更新，为了您的使用体验和数据安全，请立即升级到最新版本。

  ### 🐛 核心修复
  - 修复自动更新功能路径配置错误
  - 修复旧版本无法检测更新的问题
  - 修复更新按钮无响应的问题

  ### ✨ 功能改进
  - 优化更新检查机制
  - 提升下载稳定性
  - 改进用户提示信息

  ### 🔧 技术优化
  - 修正 Feed URL 配置
  - 确保向后兼容性
  - 完善更新日志显示

  ### 📦 更新说明
  应用会自动下载更新并提示您安装。
  更新完成后应用会自动重启。
`;

    // 保存到本地
    fs.writeFileSync('release/latest-mac.yml', updateConfig);

    // 上传到根目录
    console.log('上传更新配置到根目录...');
    await client.put('latest-mac.yml', 'release/latest-mac.yml');
    console.log('✅ 根目录配置上传成功!');

    // 上传到 /mac/ 目录（向后兼容）
    console.log('上传更新配置到 /mac/ 目录...');
    await client.put('mac/latest-mac.yml', 'release/latest-mac.yml');
    console.log('✅ /mac/ 目录配置上传成功!');
    console.log('');

    console.log('📱 用户将会收到强制更新提醒！');
    console.log('🔗 更新配置地址:');
    console.log('https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/latest-mac.yml');
  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    throw error;
  }
}

uploadForceUpdate().catch(console.error);
