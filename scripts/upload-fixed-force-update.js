const OSS = require('ali-oss');
const fs = require('fs');

const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
  bucket: 'xiaobai-ai-releases',
  timeout: 600000,
});

async function uploadFixedVersion() {
  try {
    const dmgPath = 'release/mac/小白AI-2.10.20-x64.dmg';
    const stats = fs.statSync(dmgPath);
    const size = stats.size;
    const hash = '4cbc4efaf3d7cb1e0228eedab097bfa19c4bfec393eed8cc2260cb23f7792107dff300ec569be1d466babfc98f4cd856a5ca82c07879ea63029a8131ccbc19d0';

    console.log('开始上传 DMG 文件...');
    const dmgResult = await client.put('releases/小白AI-2.10.20-x64.dmg', dmgPath);
    console.log('✅ DMG 上传成功!');
    console.log(`📍 下载地址: ${dmgResult.url}`);
    console.log('');

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
  - **修复强制更新弹窗样式和按钮问题**

  ### ✨ 功能改进
  - 优化更新检查机制
  - 提升下载稳定性
  - 改进用户提示信息
  - **添加"立即更新"确认按钮**

  ### 🔧 技术优化
  - 修正 Feed URL 配置
  - 确保向后兼容性
  - 完善更新日志显示

  ### 📦 更新说明
  点击"立即更新"按钮开始下载更新。
  下载完成后点击"立即重启并安装"按钮完成更新。
`;

    fs.writeFileSync('release/latest-mac.yml', updateConfig);

    console.log('上传更新配置到根目录...');
    await client.put('latest-mac.yml', 'release/latest-mac.yml');
    console.log('✅ 根目录配置上传成功!');

    console.log('上传更新配置到 /mac/ 目录...');
    await client.put('mac/latest-mac.yml', 'release/latest-mac.yml');
    console.log('✅ /mac/ 目录配置上传成功!');
    console.log('');

    console.log('📱 强制更新已部署！');
    console.log('🔗 更新配置地址:');
    console.log('https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/latest-mac.yml');
  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    throw error;
  }
}

uploadFixedVersion().catch(console.error);
