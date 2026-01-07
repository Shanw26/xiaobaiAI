/**
 * 阿里云 OSS 配置向导
 *
 * 运行方式：node scripts/setup-aliyun.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 阿里云 OSS 配置向导');
  console.log('='.repeat(60));

  console.log('\n📋 请准备以下信息：');
  console.log('   1. AccessKey ID（类似：LTAI5tXXXXXXXXXXXXXX）');
  console.log('   2. AccessKey Secret（类似：XXXXXXXXXXXXXXXXXXXXXXXX）');
  console.log('\n💡 提示：在阿里云 RAM 控制台查看');
  console.log('   https://ram.console.aliyun.com/manage/ak\n');

  // 获取 AccessKey ID
  const accessKeyId = await question('请输入 AccessKey ID: ');

  if (!accessKeyId || accessKeyId.length < 20) {
    console.error('\n❌ AccessKey ID 格式不正确，请检查后重试');
    process.exit(1);
  }

  // 获取 AccessKey Secret
  const accessKeySecret = await question('请输入 AccessKey Secret: ');

  if (!accessKeySecret || accessKeySecret.length < 20) {
    console.error('\n❌ AccessKey Secret 格式不正确，请检查后重试');
    process.exit(1);
  }

  // 检查 .env 文件
  const envPath = path.join(__dirname, '../.env');

  if (!fs.existsSync(envPath)) {
    console.log('\n⚠️  .env 文件不存在，将创建新文件');
    const examplePath = path.join(__dirname, '../.env.example');
    fs.copyFileSync(examplePath, envPath);
  }

  // 读取 .env 文件
  let envContent = fs.readFileSync(envPath, 'utf8');

  // 检查是否已存在配置
  const hasConfig = envContent.includes('ALI_OSS_ACCESS_KEY_ID=');

  if (hasConfig) {
    console.log('\n⚠️  检测到已有配置，将覆盖旧配置');
    const confirm = await question('是否继续？(y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('\n❌ 已取消配置');
      rl.close();
      process.exit(0);
    }

    // 移除旧配置
    envContent = envContent
      .replace(/ALI_OSS_ACCESS_KEY_ID=.*\n?/g, '')
      .replace(/ALI_OSS_ACCESS_KEY_SECRET=.*\n?/g, '');
  }

  // 添加新配置
  envContent = envContent.trimEnd() + '\n\n# 阿里云 OSS 配置\n';
  envContent += `ALI_OSS_ACCESS_KEY_ID=${accessKeyId}\n`;
  envContent += `ALI_OSS_ACCESS_KEY_SECRET=${accessKeySecret}\n`;

  // 写入 .env 文件
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log('\n' + '='.repeat(60));
  console.log('✅ 配置成功！');
  console.log('='.repeat(60));

  console.log('\n📝 已添加到 .env 文件：');
  console.log(`   ALI_OSS_ACCESS_KEY_ID=${accessKeyId}`);
  console.log(`   ALI_OSS_ACCESS_KEY_SECRET=****${accessKeySecret.slice(-4)}`);

  console.log('\n🔒 安全提示：');
  console.log('   ✅ .env 文件已在 .gitignore 中（不会提交到 Git）');
  console.log('   ✅ 请勿分享给他人');

  console.log('\n🎯 下一步操作：');
  console.log('   1. 运行测试命令：npm run upload:oss');
  console.log('   2. 查看详细文档：cat scripts/README.md');

  console.log('\n' + '='.repeat(60) + '\n');

  rl.close();
}

main().catch(error => {
  console.error('\n❌ 配置失败:', error.message);
  rl.close();
  process.exit(1);
});
