const { notarize } = require('@electron/notarize');
const fs = require('fs');
const path = require('path');

/**
 * Apple 公证脚本
 *
 * 使用方法：
 * 1. 设置环境变量：
 *    export APPLE_ID="your-apple-id@example.com"
 *    export APPLE_ID_PASSWORD="app-specific-password"
 *    export APPLE_TEAM_ID="666P8DEX39"
 *
 * 2. 在 package.json 中配置：
 *    "mac": {
 *      "afterSign": "scripts/notarize.js"
 *    }
 */

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // 只对 macOS 进行公证
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // 获取应用名称
  const appName = context.packager.appInfo.productFilename;

  console.log('🔐 开始公证流程...');
  console.log('📦 应用名称:', appName);
  console.log('📂 输出目录:', appOutDir);

  // 检查环境变量（支持两种密码变量名）
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD || process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const appleTeamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !appleTeamId) {
    console.warn('⚠️  缺少公证所需的环境变量：');
    console.warn('   - APPLE_ID:', appleId ? '✅ 已设置' : '❌ 未设置');
    console.warn('   - APPLE_ID_PASSWORD 或 APPLE_APP_SPECIFIC_PASSWORD:', appleIdPassword ? '✅ 已设置' : '❌ 未设置');
    console.warn('   - APPLE_TEAM_ID:', appleTeamId ? '✅ 已设置' : '❌ 未设置');
    console.warn('');
    console.warn('📝 如何设置环境变量：');
    console.warn('   export APPLE_ID="your-apple-id@example.com"');
    console.warn('   export APPLE_ID_PASSWORD="app-specific-password"');
    console.warn('   export APPLE_TEAM_ID="666P8DEX39"');
    console.warn('');
    console.warn('💡 获取应用专用密码：');
    console.warn('   1. 访问 https://appleid.apple.com');
    console.warn('   2. 登录你的 Apple ID');
    console.warn('   3. 在"安全"部分生成应用专用密码');
    console.warn('');
    console.warn('⚠️  跳过公证（应用已签名，但首次打开需要右键）');
    return;
  }

  const appPath = path.join(appOutDir, `${appName}.app`);

  if (!fs.existsSync(appPath)) {
    console.warn(`⚠️  应用不存在: ${appPath}`);
    return;
  }

  try {
    console.log('📤 正在上传到 Apple 公证服务器...');
    console.log('   Apple ID:', appleId);
    console.log('   Team ID:', appleTeamId);
    console.log('   应用路径:', appPath);

    await notarize({
      tool: 'notarytool',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: appleTeamId,
    });

    console.log('✅ 公证成功！');
    console.log('✨ 用户现在可以直接双击打开应用，无需右键');
  } catch (error) {
    console.error('❌ 公证失败:', error.message);
    console.error('');
    console.error('🔍 常见问题：');
    console.error('   1. APPLE_ID_PASSWORD 必须是应用专用密码，不是 Apple ID 密码');
    console.error('   2. 应用专用密码生成地址: https://appleid.apple.com');
    console.error('   3. 需要开启双重认证才能生成应用专用密码');
    console.error('');
    console.error('⚠️  应用已签名，但未公证。用户首次打开需要右键。');
    throw error;
  }
};
