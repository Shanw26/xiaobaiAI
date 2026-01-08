const { notarize } = require('@electron/notarize');
const path = require('path');

async function notarizeArm64() {
  const appPath = '/Users/xiaolin/Downloads/小白AI/release/mac-arm64/小白AI.app';

  console.log('🔐 开始公证 arm64 版本...');
  console.log('📦 应用路径:', appPath);

  const appleId = process.env.APPLE_ID || '514660550@qq.com';
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD || 'orab-xgnm-bnrs-agon';
  const appleTeamId = process.env.APPLE_TEAM_ID || '666P8DEX39';

  console.log('📤 正在上传到 Apple 公证服务器...');
  console.log('   Apple ID:', appleId);
  console.log('   Team ID:', appleTeamId);

  try {
    await notarize({
      tool: 'notarytool',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: appleTeamId,
    });

    console.log('');
    console.log('✅ 公证成功！');
    console.log('✨ arm64 版本现在可以直接双击打开了！');
  } catch (error) {
    console.error('');
    console.error('❌ 公证失败:', error.message);
    console.error('');
    console.error('⚠️  arm64 版本已签名，但未公证。用户首次打开需要右键。');
    throw error;
  }
}

notarizeArm64();
