/**
 * 从 key.md 读取配置到 .env
 *
 * 用途：自动从同步空间的 key.md 读取敏感信息并更新 .env
 * 使用：node scripts/load-from-key.js
 */

const fs = require('fs');
const path = require('path');

function loadFromKeyMd() {
  console.log('\n' + '='.repeat(60));
  console.log('📥 从 key.md 加载配置');
  console.log('='.repeat(60) + '\n');

  // 1. 定位 key.md 文件
  const syncDir = path.join(
    process.env.HOME || process.env.USERPROFILE,
    'Downloads/同步空间/Claude code'
  );
  const keyMdPath = path.join(syncDir, 'key.md');

  console.log(`📂 查找 key.md: ${keyMdPath}`);

  if (!fs.existsSync(keyMdPath)) {
    console.error('❌ key.md 文件不存在！');
    console.error('\n💡 请确保：');
    console.error('   1. 同步空间已同步到本电脑');
    console.error('   2. key.md 文件存在于: ~/Downloads/同步空间/Claude code/');
    process.exit(1);
  }

  console.log('✅ 找到 key.md\n');

  // 2. 读取 key.md
  const keyMdContent = fs.readFileSync(keyMdPath, 'utf8');

  // 3. 解析阿里云 OSS AccessKey
  console.log('🔍 解析配置...\n');

  let accessKeyId = null;
  let accessKeySecret = null;

  // 精确查找 OSS 部分的 AccessKey（使用字符串操作而非正则，避免截断）
  const ossSectionStart = keyMdContent.indexOf('### 阿里云 OSS（安装包上传）');

  if (ossSectionStart > -1) {
    // 从 OSS 部分开始，找到下一个 "### " 或文件结尾
    let ossSectionEnd = keyMdContent.indexOf('\n### ', ossSectionStart + 1);
    if (ossSectionEnd === -1) {
      ossSectionEnd = keyMdContent.length;
    }

    const ossSection = keyMdContent.substring(ossSectionStart, ossSectionEnd);

    // 在 OSS 部分内查找 AccessKey
    const idMatch = ossSection.match(/AccessKey ID:\s*(LTAI[\w\-]+)/);
    const secretMatch = ossSection.match(/AccessKey Secret:\s*([\w\-]+)/);

    if (idMatch && secretMatch) {
      accessKeyId = idMatch[1];
      accessKeySecret = secretMatch[1];
      console.log('✅ 找到阿里云 OSS 专用 AccessKey');
    } else {
      console.log('⚠️  OSS 部分未找到完整的 AccessKey');
      console.log('💡 请在 key.md 的"阿里云 OSS（安装包上传）"部分添加 AccessKey');
    }
  } else {
    console.log('⚠️  未找到"阿里云 OSS（安装包上传）"部分');
    console.log('💡 请在 key.md 中添加 OSS 配置部分');
  }

  // 4. 提示信息
  if (!accessKeyId) {
    console.log('\n💡 请确保 key.md 中包含以下内容：\n');
    console.log('### 阿里云 OSS（安装包上传）\n');
    console.log('**配置信息**:');
    console.log('```');
    console.log('Bucket: xiaobai-ai-releases');
    console.log('AccessKey ID: LTAI5tXXXXXXXXXXXXXX');
    console.log('AccessKey Secret: XXXXXXXXXXXXXXXXXXXXXXXX');
    console.log('```\n');
  }

  // 5. 读取现有 .env
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('📄 读取现有 .env 文件');
  } else {
    console.log('📄 .env 文件不存在，将创建新文件');
    // 复制 .env.example
    const examplePath = path.join(__dirname, '../.env.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      envContent = fs.readFileSync(envPath, 'utf8');
    }
  }

  // 6. 更新 .env 中的阿里云 OSS 配置
  if (accessKeyId && accessKeySecret) {
    console.log('\n🔄 更新阿里云 OSS 配置...');

    // 移除旧的配置
    envContent = envContent
      .replace(/ALI_OSS_ACCESS_KEY_ID=.*\n?/g, '')
      .replace(/ALI_OSS_ACCESS_KEY_SECRET=.*\n?/g, '');

    // 添加新配置
    const lines = envContent.trimEnd().split('\n');

    // 找到最后一个配置项后添加
    let ossConfig = `\n\n# 阿里云 OSS 配置（从 key.md 加载）\n`;
    ossConfig += `ALI_OSS_ACCESS_KEY_ID=${accessKeyId}\n`;
    ossConfig += `ALI_OSS_ACCESS_KEY_SECRET=${accessKeySecret}\n`;

    envContent = envContent.trimEnd() + ossConfig;

    // 备份旧配置
    if (fs.existsSync(envPath)) {
      const backupPath = envPath + '.backup.' + Date.now();
      fs.copyFileSync(envPath, backupPath);
      console.log(`✅ 已备份旧配置: ${path.basename(backupPath)}`);
    }

    // 写入新配置
    fs.writeFileSync(envPath, envContent, { mode: 0o600 });
    console.log(`✅ 已更新: ${envPath}`);

    console.log('\n📋 配置内容：');
    console.log(`   ALI_OSS_ACCESS_KEY_ID=${accessKeyId}`);
    console.log(`   ALI_OSS_ACCESS_KEY_SECRET=****${accessKeySecret.slice(-4)}`);

  } else {
    console.log('\n⚠️  key.md 中未找到阿里云 AccessKey');
    console.log('💡 请在 key.md 中添加以下配置：');
    console.log('\n### 阿里云 OSS（安装包上传）\n');
    console.log('**类型**: 对象存储\n');
    console.log('**用途**: 上传安装包到阿里云 OSS\n\n');
    console.log('**配置信息**:\n');
    console.log('```');
    console.log('Bucket: xiaobai-ai-releases');
    console.log(`AccessKey ID: LTAI5tXXXXXXXXXXXXXX`);
    console.log(`AccessKey Secret: XXXXXXXXXXXXXXXXXXXXXXXX`);
    console.log('地域: oss-cn-hangzhou');
    console.log('```\n\n');
    console.log('添加后重新运行此脚本\n');
    process.exit(1);
  }

  // 7. 验证配置
  console.log('\n🔍 验证配置...\n');

  const { execSync } = require('child_process');
  try {
    execSync('node scripts/security-check.js', { stdio: 'inherit' });
  } catch (error) {
    console.log('\n⚠️  安全检查未通过，但配置已更新');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 配置加载完成！');
  console.log('='.repeat(60));

  console.log('\n🎯 下一步操作：');
  console.log('   1. 测试 OSS 连接: npm run upload:oss');
  console.log('   2. 查看上传文档: cat scripts/README.md');
  console.log('\n' + '='.repeat(60) + '\n');
}

// 运行
loadFromKeyMd();
