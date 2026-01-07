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
    execSync(`codesign --force --deep --options runtime --sign "Developer ID Application: Beijing Principle Technology Co., Ltd. (666P8DEX39)" "${appPath}"`, {
      stdio: 'inherit'
    });

    // 验证签名
    execSync(`codesign --verify --deep "${appPath}"`, {
      stdio: 'inherit'
    });

    console.log('✅ 签名完成');
  } catch (error) {
    console.error('❌ 签名失败:', error.message);
    throw error;
  }
};
