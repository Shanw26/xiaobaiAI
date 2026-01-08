const OSS = require('ali-oss');
const path = require('path');
const fs = require('fs');

const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
  bucket: 'xiaobai-ai-releases',
});

async function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  const objectKey = `releases/${fileName}`;

  try {
    const result = await client.put(objectKey, filePath);
    const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    console.log(`✅ 上传成功: ${fileName}`);
    console.log(`   文件大小: ${fileSize} MB`);
    console.log(`   下载链接: ${result.url}`);
    return result.url;
  } catch (error) {
    console.error(`❌ 上传失败: ${fileName}`, error.message);
    throw error;
  }
}

async function main() {
  const files = [
    'release/小白AI-2.10.15.dmg',
    'release/小白AI-2.10.15-arm64.dmg'
  ];

  console.log('📤 开始上传 macOS 版本到阿里云 OSS...\n');

  for (const file of files) {
    await uploadFile(file);
    console.log();
  }

  console.log('✅ 所有文件上传完成！');
  console.log('\n📦 用户下载链接:');
  console.log('https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/releases/小白AI-2.10.15.dmg');
  console.log('https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/releases/小白AI-2.10.15-arm64.dmg');
}

main().catch(console.error);
