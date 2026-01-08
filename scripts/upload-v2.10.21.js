const OSS = require('ali-oss');
const fs = require('fs');

const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
  bucket: 'xiaobai-ai-releases',
  timeout: 600000,
});

async function uploadV2_10_21() {
  try {
    const dmgPath = 'release/mac/小白AI-2.10.21-x64.dmg';
    const stats = fs.statSync(dmgPath);
    const size = stats.size;
    const hash = '1f9b17e5f3a7d7910c9b9197cd02466b636a8854d42216a84756daea286818f063dcdd00a56d72438693dceb5afb76455118702863e48d2a8930e11d3e7ecb0a';

    console.log('开始上传 DMG 文件...');
    const dmgResult = await client.put('releases/小白AI-2.10.21-x64.dmg', dmgPath);
    console.log('✅ DMG 上传成功!');
    console.log(`📍 下载地址: ${dmgResult.url}`);
    console.log('');

    const updateConfig = `version: 2.10.21
files:
  - url: https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/releases/小白AI-2.10.21-x64.dmg
    sha512: ${hash}
    size: ${size}
path: https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/
sha512: ${hash}
releaseNotes: |
  ## ✨ v2.10.21 - 优化弹窗样式

  ### 🎨 样式优化
  - 优化强制更新弹窗高度和间距
  - 调整字体大小，提升阅读体验
  - 压缩内容区域，更紧凑美观

  ### 🔧 技术改进
  - 减小弹窗整体高度约 20%
  - 优化内边距和圆角样式
  - 调整进度条和按钮尺寸

  ### 📦 更新说明
  本次更新优化了强制更新弹窗的视觉效果，
  让界面更加简洁紧凑。
`;

    fs.writeFileSync('release/latest-mac.yml', updateConfig);

    console.log('上传更新配置到根目录...');
    await client.put('latest-mac.yml', 'release/latest-mac.yml');
    console.log('✅ 根目录配置上传成功!');

    console.log('上传更新配置到 /mac/ 目录...');
    await client.put('mac/latest-mac.yml', 'release/latest-mac.yml');
    console.log('✅ /mac/ 目录配置上传成功!');
    console.log('');

    console.log('📱 v2.10.21 已部署！');
    console.log('🔗 更新配置地址:');
    console.log('https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/latest-mac.yml');
  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    throw error;
  }
}

uploadV2_10_21().catch(console.error);
