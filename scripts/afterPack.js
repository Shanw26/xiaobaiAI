const { execSync } = require('child_process');
const path = require('path');

exports.default = async function (context) {
  const { appOutDir, electronPlatformName } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  console.log('🔐 开始 Apple Developer 签名...');

  const appPath = path.join(appOutDir, '小白AI.app');

  try {
    // 先对整个 .app 包进行深度签名
    // 使用 --options runtime 确保签名满足 hardened runtime 要求
    // 使用 --timestamp 添加时间戳，避免签名验证问题
    // 🔥 使用 package.json 中配置的证书
    execSync(`codesign --force --deep --timestamp --options runtime --sign "4E76C4CD7F4ABFA82DF8EED886AA36F117140EDD" "${appPath}"`, {
      stdio: 'inherit'
    });

    // 验证签名
    execSync(`codesign --verify --deep "${appPath}"`, {
      stdio: 'inherit'
    });

    // 显示详细的签名信息
    console.log('📋 签名信息:');
    execSync(`codesign --display --verbose=4 "${appPath}"`, {
      stdio: 'inherit'
    });

    console.log('✅ 签名完成');
  } catch (error) {
    console.error('❌ 签名失败:', error.message);
    throw error;
  }
};
