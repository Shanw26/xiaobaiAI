const { execSync } = require('child_process');
const path = require('path');

exports.default = async function (context) {
  const { appOutDir, electronPlatformName } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  console.log('🔐 开始 ad-hoc 签名...');

  const appPath = path.join(appOutDir, '小白AI.app');

  try {
    // 使用 ad-hoc 签名（identity 为 "-"）
    execSync(`codesign --force --deep --sign - "${appPath}"`, {
      stdio: 'inherit'
    });
    console.log('✅ 签名完成');
  } catch (error) {
    console.error('❌ 签名失败:', error.message);
    throw error;
  }
};
