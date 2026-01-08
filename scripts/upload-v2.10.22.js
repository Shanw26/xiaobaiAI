const OSS = require('ali-oss');
const fs = require('fs');

const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
  bucket: 'xiaobai-ai-releases',
  timeout: 600000,
});

async function uploadV2_10_22() {
  try {
    const dmgPath = 'release/mac/小白AI-2.10.22-x64.dmg';
    const stats = fs.statSync(dmgPath);
    const size = stats.size;
    const hash = '5e2cfc61adb231976e24dbd0ab0202c5ea8fce7631c400f4b8ec2b82832ff05c362c7873f9d785e688ad521a6f73d2e46219953aeaaa500c7f2916d952d6a1e6';

    console.log('开始上传 DMG 文件...');
    const dmgResult = await client.put('releases/小白AI-2.10.22-x64.dmg', dmgPath);
    console.log('✅ DMG 上传成功!');
    console.log(`📍 下载地址: ${dmgResult.url}`);
    console.log('');

    const updateConfig = `version: 2.10.22
files:
  - url: https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/releases/小白AI-2.10.22-x64.dmg
    sha512: ${hash}
    size: ${size}
path: https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/
sha512: ${hash}
releaseNotes: |
  ## ✨ v2.10.22 - 修复强制更新流程

  ### 🐛 核心修复
  - **修复下载完成后弹窗自动关闭的问题**
  - **下载完成后自动隐藏进度条**
  - 弹窗保持显示直到用户点击"立即重启并安装"

  ### 🎨 样式优化
  - 优化弹窗高度和间距
  - 调整字体大小，更紧凑美观
  - 下载完成后界面更简洁

  ### 📦 更新流程
  1. 显示强制更新弹窗
  2. 点击"立即更新"开始下载
  3. 显示下载进度条
  4. 下载完成后进度条自动隐藏
  5. 点击"立即重启并安装"完成更新
`;

    fs.writeFileSync('release/latest-mac.yml', updateConfig);

    console.log('上传更新配置到根目录...');
    await client.put('latest-mac.yml', 'release/latest-mac.yml');
    console.log('✅ 根目录配置上传成功!');

    console.log('上传更新配置到 /mac/ 目录...');
    await client.put('mac/latest-mac.yml', 'release/latest-mac.yml');
    console.log('✅ /mac/ 目录配置上传成功!');
    console.log('');

    console.log('📱 v2.10.22 已部署！');
    console.log('🔗 更新配置地址:');
    console.log('https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/latest-mac.yml');
    console.log('');
    console.log('✅ 修复说明：');
    console.log('   - 强制更新弹窗不会在下载完成后自动关闭');
    console.log('   - 下载完成后进度条自动隐藏');
    console.log('   - 用户必须点击"立即重启并安装"才能完成更新');
  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    throw error;
  }
}

uploadV2_10_22().catch(console.error);
