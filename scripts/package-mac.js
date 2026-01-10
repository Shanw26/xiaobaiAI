#!/usr/bin/env node

/**
 * macOS 打包脚本（包含签名和公证）
 *
 * 自动加载 .env 文件中的 Apple 凭证，确保公证流程正常工作
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 读取 .env 文件
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');

  if (!fs.existsSync(envPath)) {
    console.error('❌ .env 文件不存在:', envPath);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    // 跳过注释和空行
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const [key, ...valueParts] = trimmedLine.split('=');
    const value = valueParts.join('=').trim();

    if (key && value) {
      envVars[key] = value;
    }
  });

  return envVars;
}

// 设置环境变量
function setEnvVars(envVars) {
  const appleId = envVars.APPLE_ID;
  const appleIdPassword = envVars.APPLE_ID_PASSWORD;
  const appleTeamId = envVars.APPLE_TEAM_ID;

  // 检查必需的环境变量
  if (!appleId || !appleIdPassword || !appleTeamId) {
    console.error('❌ 缺少必需的环境变量');
    console.error('');
    console.error('请在 .env 文件中设置以下变量：');
    console.error('  APPLE_ID=your-apple-id@example.com');
    console.error('  APPLE_ID_PASSWORD=app-specific-password');
    console.error('  APPLE_TEAM_ID=666P8DEX39');
    process.exit(1);
  }

  // 设置环境变量
  // 注意：electron-builder 需要 APPLE_APP_SPECIFIC_PASSWORD
  process.env.APPLE_ID = appleId;
  process.env.APPLE_ID_PASSWORD = appleIdPassword;
  process.env.APPLE_APP_SPECIFIC_PASSWORD = appleIdPassword; // 🔥 electron-builder 需要这个名称
  process.env.APPLE_TEAM_ID = appleTeamId;

  console.log('✅ 已加载 Apple 凭证:');
  console.log('   Apple ID:', appleId);
  console.log('   Team ID:', appleTeamId);
  console.log('');
}

// 主函数
async function main() {
  console.log('');
  console.log('========================================');
  console.log('🔐 小白AI - macOS 打包脚本（含公证）');
  console.log('========================================');
  console.log('');

  // 1. 加载环境变量
  const envVars = loadEnv();
  setEnvVars(envVars);

  // 2. 清理旧的构建
  console.log('🧹 清理旧的构建...');
  const distPath = path.join(__dirname, '../dist');
  const releasePath = path.join(__dirname, '../release/mac');

  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }
  if (fs.existsSync(releasePath)) {
    fs.rmSync(releasePath, { recursive: true, force: true });
  }
  console.log('✅ 清理完成');
  console.log('');

  // 3. 构建
  console.log('📦 开始构建...');
  try {
    execSync('npm run build', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ 构建完成');
    console.log('');
  } catch (error) {
    console.error('❌ 构建失败');
    process.exit(1);
  }

  // 4. 打包（会自动触发签名和公证）
  console.log('📀 开始打包（包含签名和公证）...');
  console.log('   这可能需要几分钟，请耐心等待...');
  console.log('');

  try {
    execSync('npx electron-builder --mac', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        // 🔥 electron-builder 需要 APPLE_APP_SPECIFIC_PASSWORD
        APPLE_ID: process.env.APPLE_ID,
        APPLE_ID_PASSWORD: process.env.APPLE_ID_PASSWORD,
        APPLE_APP_SPECIFIC_PASSWORD: process.env.APPLE_APP_SPECIFIC_PASSWORD,
        APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
      }
    });
    console.log('');
    console.log('========================================');
    console.log('✅ 打包完成！');
    console.log('========================================');
    console.log('');
    console.log('📂 输出目录:', releasePath);
    console.log('');
    console.log('✨ 应用已签名并公证，用户可以直接打开');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('❌ 打包失败');
    console.error('========================================');
    console.error('');
    console.error('💡 提示：如果公证失败，应用仍然可以使用');
    console.error('   用户首次打开时需要右键 → 打开');
    console.error('');
    process.exit(1);
  }
}

// 运行
main();
