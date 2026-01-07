/**
 * 上传安装包到阿里云 OSS
 *
 * 使用方法:
 *   node scripts/upload-to-oss.js
 *
 * 环境变量:
 *   ALI_OSS_ACCESS_KEY_ID - 阿里云 AccessKey ID
 *   ALI_OSS_ACCESS_KEY_SECRET - 阿里云 AccessKey Secret
 */

// 加载 .env 文件
require('dotenv').config();

const OSS = require('ali-oss');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 阿里云 OSS 配置
const config = {
  region: 'oss-cn-hangzhou',  // 华东1（杭州）
  bucket: 'xiaobai-ai-releases',  // Bucket 名称
  accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
};

// 初始化 OSS 客户端
const ossClient = new OSS(config);

/**
 * 计算文件的 SHA512 哈希值
 */
function calculateFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha512').update(content).digest('base64');
  return hash;
}

/**
 * 上传单个文件到 OSS
 */
async function uploadFile(localPath, remotePath, contentType = 'application/octet-stream') {
  console.log(`📤 上传: ${path.basename(localPath)} → ${remotePath}`);

  try {
    const result = await ossClient.put(remotePath, localPath, {
      headers: {
        'Content-Type': contentType
      }
    });

    console.log(`✅ 上传成功: ${result.url}`);
    return result.url;
  } catch (error) {
    console.error(`❌ 上传失败: ${error.message}`);
    throw error;
  }
}

/**
 * 生成 YAML 格式的 latest-mac.yml
 */
function generateYaml(version, files, baseUrl) {
  const releaseDate = new Date().toISOString();
  const yaml = `version: ${version}
files:
${files.map(f => `  - url: ${baseUrl}/${f.filename}
    sha512: ${f.sha512}
    size: ${f.size}`).join('\n')}
path: ${baseUrl}/${files[0].filename}
sha512: ${files[0].sha512}
size: ${files[0].size}
releaseDate: '${releaseDate}'
`;
  return yaml;
}

/**
 * 上传 latest-mac.yml
 */
async function uploadLatestYml(version, files, platform = 'mac') {
  console.log(`\n📝 生成 latest-${platform}.yml`);

  const baseUrl = `https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/${platform}`;
  const yamlContent = generateYaml(version, files, baseUrl);

  const ymlPath = `${platform}/latest-${platform}.yml`;

  try {
    await ossClient.put(ymlPath, Buffer.from(yamlContent), {
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8'
      }
    });

    console.log(`✅ 更新 ${ymlPath}`);
    return `${baseUrl}/latest-${platform}.yml`;
  } catch (error) {
    console.error(`❌ 更新 YAML 失败: ${error.message}`);
    throw error;
  }
}

/**
 * 主函数：上传 macOS 版本
 */
async function uploadMacVersion(version, releaseDir) {
  console.log(`\n🍎 开始上传 macOS 版本 ${version}`);

  // macOS 文件列表
  const macFiles = [
    `小白AI-${version}.dmg`,
    `小白AI-${version}-arm64.dmg`,
    `小白AI-${version}-mac.zip`,
    `小白AI-${version}-arm64-mac.zip`
  ];

  const uploadedFiles = [];

  for (const filename of macFiles) {
    const localPath = path.join(releaseDir, filename);

    if (!fs.existsSync(localPath)) {
      console.log(`⚠️  文件不存在，跳过: ${filename}`);
      continue;
    }

    const remotePath = `mac/${filename}`;
    const url = await uploadFile(localPath, remotePath);

    const sha512 = calculateFileHash(localPath);
    const size = fs.statSync(localPath).size;

    uploadedFiles.push({
      filename,
      url,
      sha512,
      size
    });
  }

  // 上传 latest-mac.yml
  if (uploadedFiles.length > 0) {
    await uploadLatestYml(version, uploadedFiles, 'mac');
  } else {
    console.log('⚠️  没有上传任何文件，跳过 YAML 更新');
  }

  return uploadedFiles;
}

/**
 * 主函数：上传 Windows 版本
 */
async function uploadWinVersion(version, releaseDir) {
  console.log(`\n🪟 开始上传 Windows 版本 ${version}`);

  const winFiles = [
    `xiaobai-ai Setup ${version}.exe`,
    `xiaobai-ai-${version}-portable.exe`
  ];

  const uploadedFiles = [];

  for (const filename of winFiles) {
    const localPath = path.join(releaseDir, filename);

    if (!fs.existsSync(localPath)) {
      console.log(`⚠️  文件不存在，跳过: ${filename}`);
      continue;
    }

    const remotePath = `win/${filename}`;
    const url = await uploadFile(localPath, remotePath);

    const sha512 = calculateFileHash(localPath);
    const size = fs.statSync(localPath).size;

    uploadedFiles.push({
      filename,
      url,
      sha512,
      size
    });
  }

  if (uploadedFiles.length > 0) {
    await uploadLatestYml(version, uploadedFiles, 'win');
  }

  return uploadedFiles;
}

/**
 * 主入口
 */
async function main() {
  try {
    // 检查环境变量
    if (!config.accessKeyId || !config.accessKeySecret) {
      console.error('❌ 错误: 请设置环境变量 ALI_OSS_ACCESS_KEY_ID 和 ALI_OSS_ACCESS_KEY_SECRET');
      console.log('\n💡 提示: 在 .env 文件中配置：');
      console.log('   ALI_OSS_ACCESS_KEY_ID=your_access_key_id');
      console.log('   ALI_OSS_ACCESS_KEY_SECRET=your_access_key_secret');
      process.exit(1);
    }

    // 读取版本号
    const packagePath = path.join(__dirname, '../package.json');
    const version = require(packagePath).version;

    console.log('='.repeat(60));
    console.log(`🚀 小白AI - 阿里云 OSS 上传工具`);
    console.log(`版本: ${version}`);
    console.log(`Bucket: ${config.bucket}`);
    console.log(`地域: ${config.region}`);
    console.log('='.repeat(60));

    const releaseDir = path.join(__dirname, '../release');

    // 检查 release 目录
    if (!fs.existsSync(releaseDir)) {
      console.error(`❌ 错误: release 目录不存在: ${releaseDir}`);
      console.log('💡 提示: 请先运行 npm run dist:mac 构建安装包');
      process.exit(1);
    }

    // 上传 macOS 版本
    const macFiles = await uploadMacVersion(version, releaseDir);

    // 上传 Windows 版本（如果存在）
    const winFiles = await uploadWinVersion(version, releaseDir);

    // 总结
    const totalFiles = macFiles.length + winFiles.length;
    console.log('\n' + '='.repeat(60));
    console.log(`✅ 上传完成！`);
    console.log(`   macOS: ${macFiles.length} 个文件`);
    console.log(`   Windows: ${winFiles.length} 个文件`);
    console.log(`   总计: ${totalFiles} 个文件`);
    console.log('='.repeat(60));

    console.log('\n📦 下载链接:');
    if (macFiles.length > 0) {
      console.log(`   macOS: https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/mac/`);
    }
    if (winFiles.length > 0) {
      console.log(`   Windows: https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/win/`);
    }

  } catch (error) {
    console.error('\n❌ 上传失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行
main();
